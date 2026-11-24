import { describe, expect, it } from 'vitest'
import { countCases, filterCases, handoffIsStale, pickSelected } from './logic'
import type { RepairCase } from '../repair-examples'

const make = (id: string, over: Partial<RepairCase> = {}) => ({
  recordId: id,
  data: {
    caseNumber: 'RC-' + id,
    itemName: 'Item ' + id,
    category: 'Electronics',
    problem: 'Will not start',
    station: 'General bench',
    status: 'received',
    nextStep: '',
    partsNeeded: 'None',
    assigneeId: '',
    assigneeName: 'Available',
    demo: false,
    ...over,
  } as RepairCase,
})

const records = [
  make('1'),
  make('2', { status: 'waiting-parts', itemName: 'Toaster' }),
  make('3', { status: 'ready' }),
  make('4', { status: 'returned' }),
]

describe('filterCases', () => {
  it('open hides returned repairs', () => {
    expect(filterCases(records, 'open', '').map(r => r.recordId)).toEqual(['1', '2', '3'])
  })
  it('parts and ready match one status each', () => {
    expect(filterCases(records, 'parts', '').map(r => r.recordId)).toEqual(['2'])
    expect(filterCases(records, 'ready', '').map(r => r.recordId)).toEqual(['3'])
  })
  it('all shows everything and search narrows it, ignoring case', () => {
    expect(filterCases(records, 'all', '')).toHaveLength(4)
    expect(filterCases(records, 'all', '  TOAST ').map(r => r.recordId)).toEqual(['2'])
  })
})

describe('countCases', () => {
  it('counts each queue view', () => {
    expect(countCases(records)).toEqual({ open: 3, parts: 1, ready: 1, all: 4 })
  })
})

describe('pickSelected', () => {
  it('keeps the chosen case while it is visible', () => {
    expect(pickSelected(records, '3')?.recordId).toBe('3')
  })
  it('falls back to the first visible case when the filter hides it', () => {
    expect(pickSelected(filterCases(records, 'open', ''), '4')?.recordId).toBe('1')
  })
  it('returns undefined for an empty view', () => {
    expect(pickSelected([], '1')).toBeUndefined()
  })
})

describe('handoffIsStale', () => {
  const base = { nextStep: 'a', partsNeeded: 'b' }
  it('is false without unsaved edits, even if the saved text changed', () => {
    expect(handoffIsStale(base, { nextStep: 'x', partsNeeded: 'b' }, false)).toBe(false)
  })
  it('is false when the saved text still matches what the volunteer started from', () => {
    expect(handoffIsStale(base, base, true)).toBe(false)
  })
  it('is true when someone else saved while the volunteer had edits', () => {
    expect(handoffIsStale(base, { nextStep: 'a', partsNeeded: 'new' }, true)).toBe(true)
  })
})
