import { resolveAppRole, type ActionHandler, type ActionResult, type ActionTools } from 'deepspace/worker'
import type { Env } from '../../worker'
import { exampleCases, type RepairCase, type RepairStatus } from '../repair-examples'

/**
 * Server actions for the repair queue.
 *
 * Every case change used to be two browser requests (update the case, then log
 * an activity entry). Here each change is one request, so the activity entry
 * cannot go missing after a failure, and the server can refuse a write that was
 * based on stale state (claims and handoffs) instead of trusting the browser.
 *
 * Actions run with record-level RBAC off (see src/server/action-routes.ts), so
 * each handler checks the caller's role itself: viewers are read-only.
 *
 * Note: a read followed by a write is two calls to the record room, so these
 * checks shrink the race window to a few milliseconds; they are not a lock.
 */

const STATUSES: RepairStatus[] = ['received', 'diagnosing', 'waiting-parts', 'ready', 'returned']
const STATUS_LABELS: Record<RepairStatus, string> = {
  received: 'New intake',
  diagnosing: 'On the bench',
  'waiting-parts': 'Waiting on parts',
  ready: 'Ready for pickup',
  returned: 'Returned',
}
const HANDOFF_CHANNEL_ID = 'benchline-repair-handoff'

type Tone = 'blue' | 'green'
type Ctx = { env: Env; userId: string; params: Record<string, unknown>; tools: ActionTools }

const fail = (error: string, code?: string): ActionResult => ({ success: false, error, ...(code ? { code } : {}) })
const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

async function requireWriter(env: Env, userId: string): Promise<ActionResult | null> {
  const role = await resolveAppRole(env, userId)
  return role === 'viewer' ? fail('Viewers cannot change the repair queue', 'forbidden') : null
}

async function loadCase(tools: ActionTools, recordId: string) {
  if (!recordId) return { error: fail('Missing repair id', 'bad_request') }
  const found = await tools.get<RepairCase>('repair-cases', recordId)
  if (!found.success) return { error: fail('That repair no longer exists', 'not_found') }
  return { item: found.data.record.data }
}

/** Case first, then the log line: a failure can lose a log line, never the change. */
async function writeCase(
  tools: ActionTools,
  recordId: string,
  patch: Partial<RepairCase>,
  caseNumber: string,
  message: string,
  tone: Tone,
): Promise<ActionResult> {
  const updated = await tools.update<RepairCase>('repair-cases', recordId, patch)
  if (!updated.success) return updated
  await tools.create('repair-events', { caseNumber, message, tone })
  return { success: true, data: { recordId } }
}

const seedExamples: ActionHandler<Env> = async ({ env, userId, tools }) => {
  const denied = await requireWriter(env, userId)
  if (denied) return denied

  const existing = await tools.query('repair-cases', { limit: 1 })
  if (!existing.success) return existing
  if (existing.data.records.length > 0) return { success: true, data: { seeded: 0 } }

  // Fixed record ids make a create an upsert, so concurrent seeds write the
  // same four rows instead of eight.
  let seeded = 0
  for (const item of exampleCases) {
    const result = await tools.create('repair-cases', { ...item }, 'example-' + item.caseNumber.toLowerCase())
    if (result.success) seeded++
  }
  if (seeded > 0) {
    await tools.create(
      'repair-events',
      { caseNumber: 'RC-024', message: 'Example queue loaded for the repair café shift.', tone: 'blue' },
      'example-queue-loaded',
    )
  }
  return { success: true, data: { seeded } }
}

const addRepair: ActionHandler<Env> = async ({ env, userId, params, tools }: Ctx) => {
  const denied = await requireWriter(env, userId)
  if (denied) return denied
  const itemName = text(params.itemName, 80)
  const problem = text(params.problem, 500)
  if (!itemName || !problem) return fail('Item and problem are required', 'bad_request')

  const caseNumber = 'RC-' + crypto.randomUUID().slice(0, 5).toUpperCase()
  const created = await tools.create('repair-cases', {
    caseNumber,
    itemName,
    category: text(params.category, 40) || 'Other',
    problem,
    station: text(params.station, 40) || 'General bench',
    status: 'received',
    nextStep: 'Triage the issue and agree on a safe next step.',
    partsNeeded: 'None identified',
    assigneeId: '',
    assigneeName: 'Available',
    demo: false,
  })
  if (!created.success) return created
  await tools.create('repair-events', { caseNumber, message: 'Repair accepted into the queue', tone: 'blue' })
  return { success: true, data: { recordId: created.data.recordId, caseNumber } }
}

const updateStatus: ActionHandler<Env> = async ({ env, userId, params, tools }: Ctx) => {
  const denied = await requireWriter(env, userId)
  if (denied) return denied
  const status = params.status as RepairStatus
  if (!STATUSES.includes(status)) return fail('Unknown status', 'bad_request')
  const recordId = text(params.recordId, 100)
  const { item, error } = await loadCase(tools, recordId)
  if (error) return error
  if (item.status === status) return { success: true, data: { recordId, unchanged: true } }
  return writeCase(tools, recordId, { status }, item.caseNumber, 'Status moved to ' + STATUS_LABELS[status], status === 'ready' ? 'green' : 'blue')
}

/**
 * Compare-and-set claim. The browser says who it believes holds the case
 * (`expectedHolderId`, '' for nobody); if someone claimed or released it since,
 * the claim is refused so nobody takes a case over without having seen it.
 */
const claimCase: ActionHandler<Env> = async ({ env, userId, params, tools }: Ctx) => {
  const denied = await requireWriter(env, userId)
  if (denied) return denied
  const recordId = text(params.recordId, 100)
  const { item, error } = await loadCase(tools, recordId)
  if (error) return error
  const expected = text(params.expectedHolderId, 100)
  if (item.assigneeId !== expected) {
    return fail((item.assigneeName || 'Another volunteer') + ' just changed who holds this repair. Check it and try again.', 'conflict')
  }
  const name = text(params.name, 40) || 'Volunteer'
  return writeCase(tools, recordId, { assigneeId: userId, assigneeName: name }, item.caseNumber, name + ' picked up this repair', 'green')
}

const releaseCase: ActionHandler<Env> = async ({ env, userId, params, tools }: Ctx) => {
  const denied = await requireWriter(env, userId)
  if (denied) return denied
  const recordId = text(params.recordId, 100)
  const { item, error } = await loadCase(tools, recordId)
  if (error) return error
  if (item.assigneeId !== userId) return fail('Only the volunteer holding this repair can release it', 'conflict')
  const name = text(params.name, 40) || 'Volunteer'
  return writeCase(tools, recordId, { assigneeId: '', assigneeName: 'Available' }, item.caseNumber, name + ' released this repair', 'blue')
}

/**
 * Handoff save with a server-side stale check. The browser sends the values it
 * started editing from; if the saved case differs and the volunteer has not
 * chosen to overwrite (`force`), the save is refused with code `conflict`.
 */
const saveHandoff: ActionHandler<Env> = async ({ env, userId, params, tools }: Ctx) => {
  const denied = await requireWriter(env, userId)
  if (denied) return denied
  const recordId = text(params.recordId, 100)
  const { item, error } = await loadCase(tools, recordId)
  if (error) return error
  const stale =
    item.nextStep !== String(params.baseNextStep ?? '') || item.partsNeeded !== String(params.basePartsNeeded ?? '')
  if (stale && params.force !== true) {
    return fail('Another volunteer updated this handoff while you were editing.', 'conflict')
  }
  const nextStep = text(params.nextStep, 1000)
  const partsNeeded = text(params.partsNeeded, 300) || 'None'
  return writeCase(
    tools,
    recordId,
    { nextStep, partsNeeded },
    item.caseNumber,
    'Handoff updated: ' + (nextStep || 'No next step added'),
    'blue',
  )
}

/** Fixed ids turn both creates into upserts, so concurrent calls cannot duplicate rows. */
const registerVolunteer: ActionHandler<Env> = async ({ userId, params, tools }: Ctx) => {
  const name = text(params.name, 40) || 'Volunteer'
  return tools.create('volunteers', { userId, name }, 'volunteer-' + userId)
}

const openHandoffChannel: ActionHandler<Env> = async ({ env, userId, tools }: Ctx) => {
  const denied = await requireWriter(env, userId)
  if (denied) return denied
  const existing = await tools.get('channels', HANDOFF_CHANNEL_ID)
  if (existing.success) return { success: true, data: { recordId: HANDOFF_CHANNEL_ID } }
  return tools.create(
    'channels',
    {
      name: 'benchline-repair-handoff',
      type: 'public',
      description: 'Volunteer shift handoffs for the community repair café',
      createdBy: userId,
      archived: false,
    },
    HANDOFF_CHANNEL_ID,
  )
}

export const actions: Record<string, ActionHandler<Env>> = {
  'seed-examples': seedExamples,
  'add-repair': addRepair,
  'update-status': updateStatus,
  'claim-case': claimCase,
  'release-case': releaseCase,
  'save-handoff': saveHandoff,
  'register-volunteer': registerVolunteer,
  'open-handoff-channel': openHandoffChannel,
}
