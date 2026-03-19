import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { testSessions, stopRecords, patches } from '../db/schema.js';
import type { SessionSummary, StopRecord, FetchStopsResponse } from '@ph/shared';
import { queryStopRecords, type AthenaStopRow } from './athena.service.js';
import type { AWSCredentials } from './sso-auth.service.js';
import { config } from '../config.js';

export async function listSessions(): Promise<SessionSummary[]> {
  const rows = await db
    .select({
      id: testSessions.id,
      server: testSessions.server,
      startTime: testSessions.startTime,
      endTime: testSessions.endTime,
      originalFilename: testSessions.originalFilename,
      releaseVersion: testSessions.releaseVersion,
      robotIds: testSessions.robotIds,
      notes: testSessions.notes,
      createdAt: testSessions.createdAt,
      tag: testSessions.tag,
      stopCount: sql<number>`COALESCE(stop_count, (SELECT count(*) FROM stop_records WHERE session_id = "test_sessions"."id")::int, 0)`,
      stopsCachedAt: testSessions.stopsCachedAt,
    })
    .from(testSessions)
    .orderBy(testSessions.createdAt);

  return rows.map((r) => ({
    id: r.id,
    fileMetadata: {
      server: r.server,
      startTime: r.startTime.toISOString(),
      endTime: r.endTime.toISOString(),
      originalFilename: r.originalFilename ?? r.tag ?? null,
    },
    sessionMetadata: {
      releaseVersion: r.releaseVersion,
      robotIds: r.robotIds,
      notes: r.notes,
    },
    stopCount: r.stopCount,
    stopsCached: !!r.stopsCachedAt,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getSession(id: string) {
  const [session] = await db
    .select()
    .from(testSessions)
    .where(eq(testSessions.id, id));

  if (!session) return null;

  const stops = await db
    .select()
    .from(stopRecords)
    .where(eq(stopRecords.sessionId, id))
    .orderBy(stopRecords.timestamp);

  const sessionPatches = await db
    .select()
    .from(patches)
    .where(eq(patches.sessionId, id));

  return {
    id: session.id,
    fileMetadata: {
      server: session.server,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime.toISOString(),
      originalFilename: session.originalFilename ?? session.tag ?? null,
    },
    sessionMetadata: {
      releaseVersion: session.releaseVersion,
      robotIds: session.robotIds,
      notes: session.notes,
      patches: sessionPatches.map((p) => ({
        project: p.project,
        patchSet: p.patchSet,
        description: p.description,
      })),
    },
    stops: stops.map(mapStopRecord),
    stopCount: session.stopCount ?? stops.length,
    stopsCached: !!session.stopsCachedAt,
    createdAt: session.createdAt.toISOString(),
  };
}

export async function deleteSession(id: string): Promise<boolean> {
  const result = await db.delete(testSessions).where(eq(testSessions.id, id)).returning({ id: testSessions.id });
  return result.length > 0;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapStopRecord(s: typeof stopRecords.$inferSelect): StopRecord {
  return {
    id: s.id,
    robotId: s.robotId,
    timestamp: s.timestamp,
    playbackUrl: s.playbackUrl,
    robotIdTimestamp: s.robotIdTimestamp,
    l1StopReason: s.l1StopReason,
    l2StopReason: s.l2StopReason,
    l3StopReason: s.l3StopReason,
    stopLocationCode: s.stopLocationCode,
    poseX: s.poseX,
    poseY: s.poseY,
    stopDuration: s.stopDuration,
    triageComment: s.triageComment,
    supportInterventionMade: s.supportInterventionMade,
    palletLoaded: s.palletLoaded,
    floor: s.floor,
    client: s.client,
    application: s.application,
    nexusSwVersion: s.nexusSwVersion,
    nrvSwVersion: s.nrvSwVersion,
    vrosSwVersion: s.vrosSwVersion,
    robotSerial: s.robotSerial,
  };
}

/** Extract trailing digits from a robot serial string (e.g. 'ACT2EUP2RNJ220' → 220) */
function extractRobotNumber(serial: string): number {
  const match = serial.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

function mapAthenaStopToRecord(row: AthenaStopRow, sessionId: string) {
  return {
    id: row.event_id,
    sessionId,
    // Extract numeric suffix from serial (e.g. 'ACT2EUP2RNJ220' → 220)
    robotId: extractRobotNumber(row.robot_id),
    timestamp: row.date,
    playbackUrl: '',
    robotIdTimestamp: '',
    l1StopReason: row.l1_stop_reason,
    l2StopReason: row.l2_stop_reason,
    l3StopReason: row.l3_stop_reason,
    stopLocationCode: row.stop_location_code,
    poseX: parseFloat(row.pose_x) || 0,
    poseY: parseFloat(row.pose_y) || 0,
    stopDuration: parseFloat(row.stop_duration) || 0,
    triageComment: '',
    supportInterventionMade: row.support_intervention_made === 'true',
    palletLoaded: false,
    floor: '',
    client: '',
    application: '',
    nexusSwVersion: row.nexus_sw_version,
    nrvSwVersion: row.nrv_sw_version,
    vrosSwVersion: row.vros_sw_version,
    robotSerial: row.robot_id,
  };
}

function toStopRecord(dbRow: ReturnType<typeof mapAthenaStopToRecord>): StopRecord {
  return {
    id: dbRow.id,
    robotId: dbRow.robotId,
    timestamp: dbRow.timestamp,
    playbackUrl: dbRow.playbackUrl,
    robotIdTimestamp: dbRow.robotIdTimestamp,
    l1StopReason: dbRow.l1StopReason,
    l2StopReason: dbRow.l2StopReason,
    l3StopReason: dbRow.l3StopReason,
    stopLocationCode: dbRow.stopLocationCode,
    poseX: dbRow.poseX,
    poseY: dbRow.poseY,
    stopDuration: dbRow.stopDuration,
    triageComment: dbRow.triageComment,
    supportInterventionMade: dbRow.supportInterventionMade,
    palletLoaded: dbRow.palletLoaded,
    floor: dbRow.floor,
    client: dbRow.client,
    application: dbRow.application,
    nexusSwVersion: dbRow.nexusSwVersion,
    nrvSwVersion: dbRow.nrvSwVersion,
    vrosSwVersion: dbRow.vrosSwVersion,
    robotSerial: dbRow.robotSerial,
  };
}

// ─── Purge stale cached stop records ──────────────────────────────────────────

/**
 * Delete cached stop records older than stopsCacheDays.
 * Resets stopsCachedAt so the next access re-fetches from Athena.
 * Called on API startup and can be called periodically.
 */
export async function purgeStaleStopCache(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - config.stopsCacheDays);

  // Find sessions with stale caches
  const stale = await db
    .select({ id: testSessions.id })
    .from(testSessions)
    .where(sql`stops_cached_at IS NOT NULL AND stops_cached_at < ${cutoff.toISOString()}`);

  if (stale.length === 0) return 0;

  const staleIds = stale.map((s) => s.id);

  await db.transaction(async (tx) => {
    // Delete stop records for stale sessions
    await tx.execute(sql`
      DELETE FROM stop_records
      WHERE session_id = ANY(${staleIds}::uuid[])
    `);

    // Reset cache timestamp
    await tx.execute(sql`
      UPDATE test_sessions
      SET stops_cached_at = NULL
      WHERE id = ANY(${staleIds}::uuid[])
    `);
  });

  return stale.length;
}

// ─── Lazy-load stop records from Athena ───────────────────────────────────────

const CHUNK_SIZE = 100;

export async function fetchAndCacheStops(
  sessionId: string,
  credentials: AWSCredentials | null | undefined,
): Promise<FetchStopsResponse> {
  // 1. Load session
  const [session] = await db
    .select()
    .from(testSessions)
    .where(eq(testSessions.id, sessionId));
  if (!session) throw new Error('Session not found');

  // 2. If non-Athena session, return existing stops from DB
  if (session.source !== 'athena') {
    const stops = await db
      .select()
      .from(stopRecords)
      .where(eq(stopRecords.sessionId, sessionId))
      .orderBy(stopRecords.timestamp);
    return {
      stopCount: stops.length,
      cached: true,
      stops: stops.map(mapStopRecord),
    };
  }

  // 3. If cached within the last stopsCacheDays, return from local DB
  if (session.stopsCachedAt) {
    const cacheExpiry = new Date();
    cacheExpiry.setDate(cacheExpiry.getDate() - config.stopsCacheDays);

    if (session.stopsCachedAt >= cacheExpiry) {
      const stops = await db
        .select()
        .from(stopRecords)
        .where(eq(stopRecords.sessionId, sessionId))
        .orderBy(stopRecords.timestamp);
      return {
        stopCount: session.stopCount ?? stops.length,
        cached: true,
        stops: stops.map(mapStopRecord),
      };
    }

    // Cache is stale — purge it so we re-fetch from Athena below
    await db.delete(stopRecords).where(eq(stopRecords.sessionId, sessionId));
    await db.execute(sql`
      UPDATE test_sessions
      SET stops_cached_at = NULL
      WHERE id = ${sessionId}::uuid
    `);
  }

  // 4. Fetch from Athena (scoped by site + time window + robot IDs)
  const athenaStops = await queryStopRecords(
    credentials,
    session.customersitekey,
    session.startTime.toISOString(),
    session.endTime.toISOString(),
    session.robotIds,
  );

  const mappedStops = athenaStops.map((r) => mapAthenaStopToRecord(r, sessionId));

  // 5. Always cache Athena results locally
  if (mappedStops.length > 0) {
    await db.transaction(async (tx) => {
      await tx.delete(stopRecords).where(eq(stopRecords.sessionId, sessionId));

      for (let i = 0; i < mappedStops.length; i += CHUNK_SIZE) {
        const chunk = mappedStops.slice(i, i + CHUNK_SIZE);
        await tx.insert(stopRecords).values(chunk);
      }

      await tx.execute(sql`
        UPDATE test_sessions
        SET stops_cached_at = NOW(), stop_count = ${mappedStops.length}
        WHERE id = ${sessionId}::uuid
      `);
    });
  }

  return {
    stopCount: mappedStops.length,
    cached: true,
    stops: mappedStops.map(toStopRecord),
  };
}
