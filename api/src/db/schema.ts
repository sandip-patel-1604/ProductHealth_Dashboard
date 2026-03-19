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
  originalFilename: text('original_filename'),
  releaseVersion: text('release_version').notNull(),
  robotIds: integer('robot_ids').array().notNull(),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // Athena integration columns
  customersitekey: text('customersitekey').notNull().default(''),
  runId: text('run_id').notNull().default(''),
  tag: text('tag').notNull().default(''),
  config: text('config').notNull().default(''),
  athenaDescription: text('athena_description').notNull().default(''),
  source: text('source').notNull().default('upload'),
  // Stop report metadata (populated from Athena fact_stop_reports)
  stopCount: integer('stop_count'),
  stopsCachedAt: timestamp('stops_cached_at', { withTimezone: true }),
}, (table) => [
  index('idx_sessions_server').on(table.server),
  index('idx_sessions_release').on(table.releaseVersion),
  index('idx_sessions_time').on(table.startTime),
  index('idx_sessions_site').on(table.customersitekey),
  index('idx_sessions_run_id').on(table.runId),
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
  // Athena-sourced stops may have alphanumeric robot serial instead of numeric ID
  robotSerial: text('robot_serial').notNull().default(''),
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

export const athenaSyncLog = pgTable('athena_sync_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  customersitekey: text('customersitekey').notNull(),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull().defaultNow(),
  rowsFetched: integer('rows_fetched').notNull().default(0),
  sessionsCreated: integer('sessions_created').notNull().default(0),
  sessionsUpdated: integer('sessions_updated').notNull().default(0),
}, (table) => [
  index('idx_sync_log_site').on(table.customersitekey),
]);

export const dashboardModes = pgTable('dashboard_modes', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  config: jsonb('config').notNull().default({}),
});
