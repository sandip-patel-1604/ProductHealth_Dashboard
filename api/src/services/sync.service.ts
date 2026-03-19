import { db } from '../db/client.js';
import { testSessions, athenaSyncLog } from '../db/schema.js';
import { sql } from 'drizzle-orm';
import { parseTag, groupAthenaRows } from './tag-parser.service.js';
import { querySessionRows, queryStopCount } from './athena.service.js';
import type { AWSCredentials } from './sso-auth.service.js';
// credentials are optional — null in dev mode (uses default chain)
import type { AthenaSyncResponse, AthenaPreviewRow, AthenaPreviewResponse } from '@ph/shared';

/**
 * Build preview rows from grouped Athena data, cross-referenced with existing DB sessions.
 */
function buildPreviewRows(
  groups: Map<string, import('@ph/shared').AthenaSessionRow[]>,
  existingRunIds: Map<string, string>, // run_id → session UUID
): AthenaPreviewRow[] {
  const runs: AthenaPreviewRow[] = [];

  for (const [runId, groupRows] of groups) {
    const firstRow = groupRows[0];
    const parsed = parseTag(firstRow.tag);

    const robotIds = groupRows
      .map((r) => parseInt(r.robot_id, 10))
      .filter((n) => !isNaN(n));
    const finalRobotIds = parsed.robotSerials.length > 0 ? parsed.robotSerials : robotIds;

    const starts = groupRows.map((r) => new Date(r.start).getTime()).filter((t) => !isNaN(t));
    const ends = groupRows.map((r) => new Date(r.end).getTime()).filter((t) => !isNaN(t));
    const startTime = starts.length > 0 ? new Date(Math.min(...starts)) : new Date();
    const endTime = ends.length > 0 ? new Date(Math.max(...ends)) : new Date();

    const existingSessionId = existingRunIds.get(runId);

    runs.push({
      runId,
      tag: firstRow.tag,
      releaseVersion: parsed.releaseVersion || 'unknown',
      config: parsed.config,
      description: firstRow.description,
      robotIds: finalRobotIds,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      rowCount: groupRows.length,
      status: existingSessionId ? 'imported' : 'new',
      sessionId: existingSessionId,
    });
  }

  // Sort by start time descending (newest first)
  runs.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  return runs;
}

/**
 * Query existing session run IDs for a site from the DB.
 * Returns a Map of run_id → session UUID.
 */
async function getExistingRunIds(
  site: string,
  runIds: string[],
): Promise<Map<string, string>> {
  if (runIds.length === 0) return new Map();

  const result = await db.execute(sql`
    SELECT run_id, id FROM test_sessions
    WHERE customersitekey = ${site}
      AND run_id IN (${sql.join(runIds.map(id => sql`${id}`), sql`, `)})
  `);

  const map = new Map<string, string>();
  for (const row of (result as any).rows) {
    map.set(row.run_id, row.id);
  }
  return map;
}

/**
 * Preview: query Athena + cross-reference with DB to show imported vs new.
 */
export async function previewSessions(
  credentials: AWSCredentials | null | undefined,
  site: string,
  startDate: string,
  endDate: string,
): Promise<AthenaPreviewResponse> {
  const rows = await querySessionRows(credentials, site, startDate, endDate);

  if (rows.length === 0) {
    return { runs: [], totalAthenaRows: 0 };
  }

  const groups = groupAthenaRows(rows);
  const allRunIds = [...groups.keys()];
  const existingRunIds = await getExistingRunIds(site, allRunIds);

  const runs = buildPreviewRows(groups, existingRunIds);

  return { runs, totalAthenaRows: rows.length };
}

/**
 * Sync test sessions from Athena into local PostgreSQL.
 * When runIds is provided, only sync those specific runs.
 */
export async function syncSessions(
  credentials: AWSCredentials | null | undefined,
  site: string,
  startDate: string,
  endDate: string,
  runIds?: string[],
): Promise<AthenaSyncResponse> {
  const rows = await querySessionRows(credentials, site, startDate, endDate);

  if (rows.length === 0) {
    return { sessionsCreated: 0, sessionsUpdated: 0, totalRows: 0 };
  }

  const groups = groupAthenaRows(rows);

  // Filter to selected run IDs if provided
  const targetGroups = runIds
    ? [...groups].filter(([runId]) => runIds.includes(runId))
    : [...groups];

  let sessionsCreated = 0;
  let sessionsUpdated = 0;
  const importedSessions: { id: string; startTime: string; endTime: string }[] = [];

  for (const [runId, groupRows] of targetGroups) {
    const firstRow = groupRows[0];
    const parsed = parseTag(firstRow.tag);

    const robotIds = groupRows
      .map((r) => parseInt(r.robot_id, 10))
      .filter((n) => !isNaN(n));
    const finalRobotIds = parsed.robotSerials.length > 0 ? parsed.robotSerials : robotIds;

    const starts = groupRows.map((r) => new Date(r.start).getTime()).filter((t) => !isNaN(t));
    const ends = groupRows.map((r) => new Date(r.end).getTime()).filter((t) => !isNaN(t));
    const startTime = starts.length > 0 ? new Date(Math.min(...starts)) : new Date();
    const endTime = ends.length > 0 ? new Date(Math.max(...ends)) : new Date();

    const result = await db.execute(sql`
      INSERT INTO test_sessions (
        server, start_time, end_time, release_version, robot_ids, notes,
        customersitekey, run_id, tag, config, athena_description, source
      ) VALUES (
        ${site},
        ${startTime.toISOString()},
        ${endTime.toISOString()},
        ${parsed.releaseVersion || 'unknown'},
        ${sql`ARRAY[${sql.join(finalRobotIds.map(id => sql`${id}`), sql`, `)}]::integer[]`},
        ${''},
        ${site},
        ${runId},
        ${firstRow.tag},
        ${parsed.config},
        ${firstRow.description},
        ${'athena'}
      )
      ON CONFLICT (customersitekey, run_id) WHERE run_id != ''
      DO UPDATE SET
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        release_version = EXCLUDED.release_version,
        robot_ids = EXCLUDED.robot_ids,
        tag = EXCLUDED.tag,
        config = EXCLUDED.config,
        athena_description = EXCLUDED.athena_description
      RETURNING (xmax = 0) AS is_insert, id, start_time, end_time
    `);

    const row = (result as any).rows?.[0];
    if (row?.is_insert) {
      sessionsCreated++;
    } else {
      sessionsUpdated++;
    }

    if (row?.id) {
      // pg driver returns timestamptz as Date objects — convert to ISO strings for Athena queries
      const st = row.start_time instanceof Date ? row.start_time.toISOString() : String(row.start_time);
      const et = row.end_time instanceof Date ? row.end_time.toISOString() : String(row.end_time);
      importedSessions.push({ id: row.id, startTime: st, endTime: et });
    }
  }

  // Fetch stop counts from Athena for all imported/updated sessions
  for (const session of importedSessions) {
    try {
      const count = await queryStopCount(
        credentials,
        site,
        session.startTime,
        session.endTime,
      );
      await db.execute(sql`
        UPDATE test_sessions SET stop_count = ${count} WHERE id = ${session.id}::uuid
      `);
    } catch (err) {
      // Don't fail the whole sync if stop count query fails
      console.warn(`Failed to fetch stop count for session ${session.id}:`, err);
    }
  }

  await db.insert(athenaSyncLog).values({
    customersitekey: site,
    rowsFetched: rows.length,
    sessionsCreated,
    sessionsUpdated,
  });

  return { sessionsCreated, sessionsUpdated, totalRows: rows.length };
}
