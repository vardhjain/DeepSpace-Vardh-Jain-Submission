import type { CollectionSchema } from 'deepspace/schema'

const repairTeamPermissions = {
  viewer: { read: true, create: false, update: false, delete: false },
  member: { read: true, create: true, update: true, delete: true },
  admin: { read: true, create: true, update: true, delete: true },
} as const

export const repairCasesSchema: CollectionSchema = {
  name: 'repair-cases',
  columns: [
    { name: 'caseNumber', storage: 'text', interpretation: 'plain' },
    { name: 'itemName', storage: 'text', interpretation: 'plain' },
    { name: 'category', storage: 'text', interpretation: 'plain' },
    { name: 'problem', storage: 'text', interpretation: 'plain' },
    { name: 'station', storage: 'text', interpretation: 'plain' },
    { name: 'status', storage: 'text', interpretation: 'plain' },
    { name: 'nextStep', storage: 'text', interpretation: 'plain' },
    { name: 'partsNeeded', storage: 'text', interpretation: 'plain' },
    { name: 'assigneeId', storage: 'text', interpretation: 'plain' },
    { name: 'assigneeName', storage: 'text', interpretation: 'plain' },
    { name: 'demo', storage: 'number', interpretation: { kind: 'boolean' } },
  ],
  permissions: repairTeamPermissions,
}

/**
 * Public display names for the crew. The users collection is read-own (it
 * holds emails), so other volunteers' names in chat come from here instead:
 * each volunteer writes only their own first name.
 */
export const volunteersSchema: CollectionSchema = {
  name: 'volunteers',
  columns: [
    { name: 'userId', storage: 'text', interpretation: 'plain' },
    { name: 'name', storage: 'text', interpretation: 'plain' },
  ],
  permissions: {
    viewer: { read: true, create: true, update: 'own', delete: false },
    member: { read: true, create: true, update: 'own', delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

export const repairEventsSchema: CollectionSchema = {
  name: 'repair-events',
  columns: [
    { name: 'caseNumber', storage: 'text', interpretation: 'plain' },
    { name: 'message', storage: 'text', interpretation: 'plain' },
    { name: 'tone', storage: 'text', interpretation: 'plain' },
  ],
  permissions: repairTeamPermissions,
}