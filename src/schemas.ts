/** Collection schemas for Benchline's shared repair-room records. */
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
import { repairCasesSchema, repairEventsSchema } from './schemas/repair-schema'

export const schemas: CollectionSchema[] = [
  usersSchema,
  settingsSchema,
  repairCasesSchema,
  repairEventsSchema,
  CHANNELS_SCHEMA,
  MESSAGES_SCHEMA,
  REACTIONS_SCHEMA,
  CHANNEL_MEMBERS_SCHEMA,
  READ_RECEIPTS_SCHEMA,
]