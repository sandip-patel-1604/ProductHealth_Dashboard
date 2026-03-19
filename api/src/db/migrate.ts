import pg from 'pg';
import { config } from '../config.js';
import { DEFAULT_MODES } from '@ph/shared';

/**
 * Run database migrations.
 * Uses raw SQL for simplicity — no migration tool dependency.
 */
async function migrate() {
  const pool = new pg.Pool({ connectionString: config.databaseUrl });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS test_sessions (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        server          TEXT NOT NULL,
        start_time      TIMESTAMPTZ NOT NULL,
        end_time        TIMESTAMPTZ NOT NULL,
        original_filename TEXT NOT NULL UNIQUE,
        release_version TEXT NOT NULL,
        robot_ids       INTEGER[] NOT NULL,
        notes           TEXT NOT NULL DEFAULT '',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS stop_records (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id          UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
        row_index           INTEGER NOT NULL,
        robot_id            INTEGER NOT NULL,
        timestamp           TEXT NOT NULL,
        playback_url        TEXT NOT NULL DEFAULT '',
        robot_id_timestamp  TEXT NOT NULL DEFAULT '',
        l1_stop_reason      TEXT NOT NULL DEFAULT '',
        l2_stop_reason      TEXT NOT NULL DEFAULT '',
        l3_stop_reason      TEXT NOT NULL DEFAULT '',
        stop_location_code  TEXT NOT NULL DEFAULT '',
        pose_x              DOUBLE PRECISION NOT NULL DEFAULT 0,
        pose_y              DOUBLE PRECISION NOT NULL DEFAULT 0,
        stop_duration       DOUBLE PRECISION NOT NULL DEFAULT 0,
        triage_comment      TEXT NOT NULL DEFAULT '',
        support_intervention_made BOOLEAN NOT NULL DEFAULT FALSE,
        pallet_loaded       BOOLEAN NOT NULL DEFAULT FALSE,
        floor               TEXT NOT NULL DEFAULT '',
        client              TEXT NOT NULL DEFAULT '',
        application         TEXT NOT NULL DEFAULT '',
        nexus_sw_version    TEXT NOT NULL DEFAULT '',
        nrv_sw_version      TEXT NOT NULL DEFAULT '',
        vros_sw_version     TEXT NOT NULL DEFAULT '',
        UNIQUE (session_id, row_index)
      );

      CREATE TABLE IF NOT EXISTS patches (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id  UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
        project     TEXT NOT NULL,
        patch_set   TEXT NOT NULL,
        description TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS dashboard_modes (
        id      TEXT PRIMARY KEY,
        label   TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        config  JSONB NOT NULL DEFAULT '{}'
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_sessions_server  ON test_sessions(server);
      CREATE INDEX IF NOT EXISTS idx_sessions_release ON test_sessions(release_version);
      CREATE INDEX IF NOT EXISTS idx_sessions_time    ON test_sessions(start_time);
      CREATE INDEX IF NOT EXISTS idx_stops_session    ON stop_records(session_id);
      CREATE INDEX IF NOT EXISTS idx_stops_robot      ON stop_records(robot_id);
      CREATE INDEX IF NOT EXISTS idx_stops_l1         ON stop_records(l1_stop_reason);
      CREATE INDEX IF NOT EXISTS idx_stops_l2         ON stop_records(l2_stop_reason);
      CREATE INDEX IF NOT EXISTS idx_stops_l3         ON stop_records(l3_stop_reason);
      CREATE INDEX IF NOT EXISTS idx_stops_location   ON stop_records(stop_location_code);
      CREATE INDEX IF NOT EXISTS idx_stops_duration   ON stop_records(stop_duration);
      CREATE INDEX IF NOT EXISTS idx_stops_pose       ON stop_records(pose_x, pose_y);
      CREATE INDEX IF NOT EXISTS idx_patches_session  ON patches(session_id);
    `);

    // ── Athena integration schema evolution ──────────────────────────────
    await client.query(`
      -- New columns on test_sessions for Athena-sourced sessions
      ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS customersitekey TEXT NOT NULL DEFAULT '';
      ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS run_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS tag TEXT NOT NULL DEFAULT '';
      ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS config TEXT NOT NULL DEFAULT '';
      ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS athena_description TEXT NOT NULL DEFAULT '';
      ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'upload';

      -- Make original_filename nullable (was UNIQUE NOT NULL, now optional for Athena sessions)
      ALTER TABLE test_sessions ALTER COLUMN original_filename DROP NOT NULL;

      -- Unique constraint for Athena-sourced sessions (by site + run_id)
      CREATE UNIQUE INDEX IF NOT EXISTS uq_session_site_run
        ON test_sessions(customersitekey, run_id) WHERE run_id != '';

      -- Indexes for new columns
      CREATE INDEX IF NOT EXISTS idx_sessions_site ON test_sessions(customersitekey);
      CREATE INDEX IF NOT EXISTS idx_sessions_run_id ON test_sessions(run_id);

      -- Sync tracking table
      CREATE TABLE IF NOT EXISTS athena_sync_log (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customersitekey   TEXT NOT NULL,
        last_synced_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        rows_fetched      INTEGER NOT NULL DEFAULT 0,
        sessions_created  INTEGER NOT NULL DEFAULT 0,
        sessions_updated  INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_sync_log_site ON athena_sync_log(customersitekey);
    `);

    // ── Stop report lazy-loading schema evolution ──────────────────────
    await client.query(`
      -- Stop count + cache tracking on test_sessions
      ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS stop_count INTEGER;
      ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS stops_cached_at TIMESTAMPTZ;

      -- Alphanumeric robot serial for Athena-sourced stop records
      ALTER TABLE stop_records ADD COLUMN IF NOT EXISTS robot_serial TEXT NOT NULL DEFAULT '';
    `);

    // Drop the old unique constraint on original_filename (idempotent)
    await client.query(`
      DO $$
      BEGIN
        ALTER TABLE test_sessions DROP CONSTRAINT IF EXISTS test_sessions_original_filename_key;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END $$;
    `);

    // Seed default dashboard modes
    for (const mode of DEFAULT_MODES) {
      await client.query(
        `INSERT INTO dashboard_modes (id, label, enabled, config)
         VALUES ($1, $2, $3, '{}')
         ON CONFLICT (id) DO NOTHING`,
        [mode.id, mode.label, mode.enabled]
      );
    }

    await client.query('COMMIT');
    console.log('Migration complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
