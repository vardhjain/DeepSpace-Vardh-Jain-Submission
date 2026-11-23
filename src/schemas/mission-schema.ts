import type { CollectionSchema } from 'deepspace/schema'

const teamPermissions = {
  viewer: { read: true, create: false, update: false, delete: false },
  member: { read: true, create: true, update: true, delete: true },
  admin: { read: true, create: true, update: true, delete: true },
} as const

export const missionsSchema: CollectionSchema = {
  name: 'missions',
  columns: [
    { name: 'callsign', storage: 'text', interpretation: 'plain' },
    { name: 'destination', storage: 'text', interpretation: 'plain' },
    { name: 'active', storage: 'number', interpretation: { kind: 'boolean' } },
  ],
  permissions: teamPermissions,
}

export const missionTasksSchema: CollectionSchema = {
  name: 'mission-tasks',
  columns: [
    { name: 'taskKey', storage: 'text', interpretation: 'plain' },
    { name: 'title', storage: 'text', interpretation: 'plain' },
    { name: 'groupName', storage: 'text', interpretation: 'plain' },
    { name: 'done', storage: 'number', interpretation: { kind: 'boolean' } },
  ],
  permissions: teamPermissions,
}

export const flightEventsSchema: CollectionSchema = {
  name: 'flight-events',
  columns: [
    { name: 'message', storage: 'text', interpretation: 'plain' },
    { name: 'tone', storage: 'text', interpretation: 'plain' },
  ],
  permissions: teamPermissions,
}

