import { resolveAppRole, type ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import { exampleCases } from '../repair-examples'

/**
 * Seed the example repair queue exactly once.
 *
 * This runs on the server instead of in the browser because the browser can
 * only see "the queue looks empty right now": two volunteers opening a fresh
 * room at the same moment would both seed it and duplicate every case. Here
 * each example has a fixed record id, and a create with a known id is an
 * upsert, so concurrent seeds write the same four rows instead of eight.
 *
 * Actions run with record-level RBAC off (see src/server/action-routes.ts), so
 * the caller's role is checked here: viewers are read-only and may not seed.
 */
const seedExamples: ActionHandler<Env> = async ({ env, userId, tools }) => {
  const role = await resolveAppRole(env, userId)
  if (role === 'viewer') return { success: false, error: 'Viewers cannot change the repair queue' }

  const existing = await tools.query('repair-cases', { limit: 1 })
  if (!existing.success) return existing
  if (existing.data.records.length > 0) return { success: true, data: { seeded: 0 } }

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

export const actions: Record<string, ActionHandler<Env>> = {
  'seed-examples': seedExamples,
}
