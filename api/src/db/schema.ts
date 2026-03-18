import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  doublePrecision,
  boolean,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const testSessions = pgTable('test_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  server: text('server').notNull(),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  originalFilename: text('original_filename').notNull().unique(),
  releaseVersion: text('release_version').notNull(),
  robotIds: integer('robot_ids').array().notNull(),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_sessions_server').on(table.server),
  index('idx_sessions_release').on(table.releaseVersion),
  index('idx_sessions_time').on(table.startTime),
]);

export const stopRecords = pgTable('stop_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => testSessions.id, { onDelete: 'cascade' }),
  rowIndex: integer('row_index').notNull(),
  robotId: integer('robot_id').notNull(),
  timestamp: text('timestamp').notNull(),
  playbackUrl: text('playback_url').notNull().default(''),
  robotIdTimestamp: text('robot_id_timestamp').notNull().default(''),
  l1StopReason: text('l1_stop_reason').notNull().default(''),
  l2StopReason: text('l2_stop_reason').notNull().default(''),
  l3StopReason: text('l3_stop_reason').notNull().default(''),
  stopLocationCode: text('stop_location_code').notNull().default(''),
  poseX: doublePrecision('pose_x').notNull().default(0),
  poseY: doublePrecision('pose_y').notNull().default(0),
  stopDuration: doublePrecision('stop_duration').notNull().default(0),
  triageComment: text('triage_comment').notNull().default(''),
  supportInterventionMade: boolean('support_intervention_made').notNull().default(false),
  palletLoaded: boolean('pallet_loaded').notNull().default(false),
  floor: text('floor').notNull().default(''),
  client: text('client').notNull().default(''),
  application: text('application').notNull().default(''),
  nexusSwVersion: text('nexus_sw_version').notNull().default(''),
  nrvSwVersion: text('nrv_sw_version').notNull().default(''),
  vrosSwVersion: text('vros_sw_version').notNull().default(''),
}, (table) => [
  uniqueIndex('uq_stop_per_session').on(table.sessionId, table.rowIndex),
  index('idx_stops_session').on(table.sessionId),
  index('idx_stops_robot').on(table.robotId),
  index('idx_stops_l1').on(table.l1StopReason),
  index('idx_stops_l2').on(table.l2StopReason),
  index('idx_stops_l3').on(table.l3StopReason),
  index('idx_stops_location').on(table.stopLocationCode),
  index('idx_stops_duration').on(table.stopDuration),
  index('idx_stops_pose').on(table.poseX, table.poseY),
]);

export const patches = pgTable('patches', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => testSessions.id, { onDelete: 'cascade' }),
  project: text('project').notNull(),
  patchSet: text('patch_set').notNull(),
  description: text('description').notNull(),
}, (table) => [
  index('idx_patches_session').on(table.sessionId),
]);

export const dashboardModes = pgTable('dashboard_modes', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  config: jsonb('config').notNull().default({}),
});
