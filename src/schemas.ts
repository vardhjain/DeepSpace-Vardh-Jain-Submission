/**
 * Collection Schemas — the app's shared, real-time RecordRoom collections.
 */
import type { CollectionSchema } from 'deepspace/schema'
import {
  CHANNELS_SCHEMA,
  MESSAGES_SCHEMA,
  REACTIONS_SCHEMA,
  CHANNEL_MEMBERS_SCHEMA,
  READ_RECEIPTS_SCHEMA,
} from 'deepspace/schema'
import { usersSchema } from './schemas/users-schema'
import { settingsSchema } from './schemas/admin-schema'
import { missionsSchema, missionTasksSchema, flightEventsSchema } from './schemas/mission-schema'

export const schemas: CollectionSchema[] = [
  usersSchema,
  settingsSchema,
  missionsSchema,
  missionTasksSchema,
  flightEventsSchema,
  CHANNELS_SCHEMA,
  MESSAGES_SCHEMA,
  REACTIONS_SCHEMA,
  CHANNEL_MEMBERS_SCHEMA,
  READ_RECEIPTS_SCHEMA,
]
