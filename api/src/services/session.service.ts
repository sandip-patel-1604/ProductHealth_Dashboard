import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { testSessions, stopRecords, patches } from '../db/schema.js';
import type { SessionSummary } from '@ph/shared';

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
      stopCount: sql<number>`(SELECT count(*) FROM stop_records WHERE session_id = ${testSessions.id})::int`,
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
    .orderBy(stopRecords.rowIndex);

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
    stops: stops.map((s) => ({
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
    })),
    createdAt: session.createdAt.toISOString(),
  };
}

export async function deleteSession(id: string): Promise<boolean> {
  const result = await db.delete(testSessions).where(eq(testSessions.id, id)).returning({ id: testSessions.id });
  return result.length > 0;
}
