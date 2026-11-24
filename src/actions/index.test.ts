import { beforeEach, describe, expect, it, vi } from 'vitest'

let role = 'member'
vi.mock('deepspace/worker', () => ({ resolveAppRole: async () => role }))

import { actions } from './index'

type Rec = Record<string, unknown>

/** In-memory stand-in for the record room tools an action receives. */
function fakeTools(seed: Record<string, Record<string, Rec>> = {}) {
  const db: Record<string, Record<string, Rec>> = structuredClone(seed)
  let counter = 0
  const writes: string[] = []
  const tools = {
    async get(collection: string, id: string) {
      const record = db[collection]?.[id]
      return record ? { success: true, data: { record: { recordId: id, data: record } } } : { success: false, error: 'not found' }
    },
    async update(collection: string, id: string, patch: Rec) {
      writes.push(`update ${collection}/${id}`)
      db[collection][id] = { ...db[collection][id], ...patch }
      return { success: true, data: { recordId: id } }
    },
    async create(collection: string, data: Rec, id?: string) {
      const recordId = id ?? `gen-${++counter}`
      writes.push(`create ${collection}/${recordId}`)
      ;(db[collection] ??= {})[recordId] = data
      return { success: true, data: { recordId } }
    },
    async query(collection: string) {
      const records = Object.entries(db[collection] ?? {}).map(([recordId, data]) => ({ recordId, data }))
      return { success: true, data: { records, count: records.length } }
    },
  }
  return { tools, db, writes }
}

const baseCase = {
  caseNumber: 'RC-1',
  itemName: 'Kettle',
  category: 'Small appliance',
  problem: 'No heat',
  station: 'General bench',
  status: 'received',
  nextStep: 'Triage',
  partsNeeded: 'None',
  assigneeId: '',
  assigneeName: 'Available',
  demo: 0,
}

const run = (name: string, userId: string, params: Rec, tools: unknown) =>
  actions[name]({ env: {}, userId, params, tools, callerJwt: 'jwt' } as never)

beforeEach(() => {
  role = 'member'
})

describe('viewers', () => {
  it.each(['add-repair', 'update-status', 'claim-case', 'release-case', 'save-handoff', 'open-handoff-channel', 'seed-examples'])(
    '%s is refused and writes nothing',
    async name => {
      role = 'viewer'
      const { tools, writes } = fakeTools({ 'repair-cases': { c1: baseCase } })
      const result = await run(name, 'viewer-1', { recordId: 'c1', status: 'ready', itemName: 'x', problem: 'y' }, tools)
      expect(result).toMatchObject({ success: false, code: 'forbidden' })
      expect(writes).toEqual([])
    },
  )
})

describe('claim-case', () => {
  it('claims an unheld case and logs it', async () => {
    const { tools, db } = fakeTools({ 'repair-cases': { c1: baseCase } })
    const result = await run('claim-case', 'ana', { recordId: 'c1', expectedHolderId: '', name: 'Ana' }, tools)
    expect(result.success).toBe(true)
    expect(db['repair-cases'].c1).toMatchObject({ assigneeId: 'ana', assigneeName: 'Ana' })
    expect(Object.values(db['repair-events'])[0]).toMatchObject({ caseNumber: 'RC-1', message: 'Ana picked up this repair' })
  })

  it('refuses when someone claimed it since the volunteer looked', async () => {
    const { tools, db, writes } = fakeTools({ 'repair-cases': { c1: { ...baseCase, assigneeId: 'ben', assigneeName: 'Ben' } } })
    const result = await run('claim-case', 'ana', { recordId: 'c1', expectedHolderId: '', name: 'Ana' }, tools)
    expect(result).toMatchObject({ success: false, code: 'conflict' })
    expect(db['repair-cases'].c1.assigneeId).toBe('ben')
    expect(writes).toEqual([])
  })

  it('allows a confirmed take-over of the holder the volunteer saw', async () => {
    const { tools, db } = fakeTools({ 'repair-cases': { c1: { ...baseCase, assigneeId: 'ben', assigneeName: 'Ben' } } })
    const result = await run('claim-case', 'ana', { recordId: 'c1', expectedHolderId: 'ben', name: 'Ana' }, tools)
    expect(result.success).toBe(true)
    expect(db['repair-cases'].c1.assigneeId).toBe('ana')
  })
})

describe('release-case', () => {
  it('only the holder can release', async () => {
    const { tools, db, writes } = fakeTools({ 'repair-cases': { c1: { ...baseCase, assigneeId: 'ben', assigneeName: 'Ben' } } })
    const refused = await run('release-case', 'ana', { recordId: 'c1' }, tools)
    expect(refused).toMatchObject({ success: false, code: 'conflict' })
    expect(writes).toEqual([])
    const released = await run('release-case', 'ben', { recordId: 'c1', name: 'Ben' }, tools)
    expect(released.success).toBe(true)
    expect(db['repair-cases'].c1).toMatchObject({ assigneeId: '', assigneeName: 'Available' })
  })
})

describe('save-handoff', () => {
  const params = { recordId: 'c1', nextStep: 'Order a fuse', partsNeeded: 'Fuse', baseNextStep: 'Triage', basePartsNeeded: 'None' }

  it('saves when the draft started from the saved text', async () => {
    const { tools, db } = fakeTools({ 'repair-cases': { c1: baseCase } })
    expect((await run('save-handoff', 'ana', params, tools)).success).toBe(true)
    expect(db['repair-cases'].c1).toMatchObject({ nextStep: 'Order a fuse', partsNeeded: 'Fuse' })
    expect(Object.values(db['repair-events'])[0]).toMatchObject({ message: 'Handoff updated: Order a fuse' })
  })

  it('refuses a stale save unless the volunteer chose to overwrite', async () => {
    const saved = { ...baseCase, nextStep: 'Ben was here' }
    const { tools, db, writes } = fakeTools({ 'repair-cases': { c1: saved } })
    const refused = await run('save-handoff', 'ana', params, tools)
    expect(refused).toMatchObject({ success: false, code: 'conflict' })
    expect(writes).toEqual([])
    expect(db['repair-cases'].c1.nextStep).toBe('Ben was here')

    const forced = await run('save-handoff', 'ana', { ...params, force: true }, tools)
    expect(forced.success).toBe(true)
    expect(db['repair-cases'].c1.nextStep).toBe('Order a fuse')
  })
})

describe('update-status', () => {
  it('rejects unknown statuses and skips no-op changes', async () => {
    const { tools, writes } = fakeTools({ 'repair-cases': { c1: baseCase } })
    expect(await run('update-status', 'ana', { recordId: 'c1', status: 'bogus' }, tools)).toMatchObject({ success: false, code: 'bad_request' })
    expect((await run('update-status', 'ana', { recordId: 'c1', status: 'received' }, tools)).success).toBe(true)
    expect(writes).toEqual([])
  })

  it('writes the change and its log entry together', async () => {
    const { tools, db } = fakeTools({ 'repair-cases': { c1: baseCase } })
    await run('update-status', 'ana', { recordId: 'c1', status: 'ready' }, tools)
    expect(db['repair-cases'].c1.status).toBe('ready')
    expect(Object.values(db['repair-events'])[0]).toMatchObject({ message: 'Status moved to Ready for pickup', tone: 'green' })
  })
})

describe('fixed-id creates', () => {
  it('register-volunteer upserts one row per user', async () => {
    const { tools, db } = fakeTools()
    await run('register-volunteer', 'ana', { name: 'Ana' }, tools)
    await run('register-volunteer', 'ana', { name: 'Anna' }, tools)
    expect(Object.keys(db.volunteers)).toEqual(['volunteer-ana'])
    expect(db.volunteers['volunteer-ana']).toMatchObject({ userId: 'ana', name: 'Anna' })
  })

  it('open-handoff-channel creates the channel once', async () => {
    const { tools, db, writes } = fakeTools()
    await run('open-handoff-channel', 'ana', {}, tools)
    await run('open-handoff-channel', 'ben', {}, tools)
    expect(Object.keys(db.channels)).toEqual(['benchline-repair-handoff'])
    expect(writes).toHaveLength(1)
  })

  it('seed-examples seeds an empty queue once', async () => {
    const { tools, db } = fakeTools()
    await run('seed-examples', 'ana', {}, tools)
    const first = Object.keys(db['repair-cases']).length
    expect(first).toBe(4)
    await run('seed-examples', 'ben', {}, tools)
    expect(Object.keys(db['repair-cases'])).toHaveLength(first)
  })
})
