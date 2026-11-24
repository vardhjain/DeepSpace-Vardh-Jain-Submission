/** Pure shiftboard helpers, kept free of React so they can be unit tested. */
import type { RepairCase, RepairStatus } from '../repair-examples'

export type QueueFilter = 'open' | 'parts' | 'ready' | 'all'
export type CaseRecord = { recordId: string; data: RepairCase }

export const statuses: { value: RepairStatus; label: string }[] = [
  { value: 'received', label: 'New intake' },
  { value: 'diagnosing', label: 'On the bench' },
  { value: 'waiting-parts', label: 'Waiting on parts' },
  { value: 'ready', label: 'Ready for pickup' },
  { value: 'returned', label: 'Returned' },
]
export const categories = ['Bicycle', 'Small appliance', 'Clothing & textiles', 'Electronics', 'Other']
export const stations = ['Bike stand', 'Electronics bench', 'Textile table', 'General bench']

export function statusLabel(status: string) {
  return statuses.find(item => item.value === status)?.label ?? status
}

export function shortTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function matchesFilter(data: RepairCase, filter: QueueFilter) {
  switch (filter) {
    case 'all':
      return true
    case 'open':
      return data.status !== 'returned'
    case 'parts':
      return data.status === 'waiting-parts'
    case 'ready':
      return data.status === 'ready'
  }
}

export function matchesSearch(data: RepairCase, search: string) {
  const term = search.trim().toLowerCase()
  if (!term) return true
  return [data.caseNumber, data.itemName, data.category, data.problem, data.station].some(value =>
    value.toLowerCase().includes(term),
  )
}

export function filterCases<T extends { data: RepairCase }>(records: T[], filter: QueueFilter, search: string) {
  return records.filter(item => matchesFilter(item.data, filter) && matchesSearch(item.data, search))
}

export function countCases(records: { data: RepairCase }[]) {
  return {
    open: records.filter(item => item.data.status !== 'returned').length,
    parts: records.filter(item => item.data.status === 'waiting-parts').length,
    ready: records.filter(item => item.data.status === 'ready').length,
    all: records.length,
  }
}

/**
 * The detail panel stays on the chosen case when the current filter still
 * shows it, and otherwise falls back to the first visible case.
 */
export function pickSelected<T extends { recordId: string }>(visible: T[], selectedId: string) {
  return visible.find(item => item.recordId === selectedId) ?? visible[0]
}

/**
 * Whether a remote change to a case should be flagged against the volunteer's
 * unsaved handoff: only when they have edits and the saved text moved away
 * from the version they started from.
 */
export function handoffIsStale(
  base: { nextStep: string; partsNeeded: string },
  saved: { nextStep: string; partsNeeded: string },
  dirty: boolean,
) {
  return dirty && (saved.nextStep !== base.nextStep || saved.partsNeeded !== base.partsNeeded)
}
