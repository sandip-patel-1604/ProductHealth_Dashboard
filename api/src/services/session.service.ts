import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { testSessions, stopRecords, patches } from '../db/schema.js';
import { parseFilename, parseOdsBuffer, parsePatchBuffer } from './parser.service.js';
import type { ParsedStopRow } from './parser.service.js';
import type { SessionSummary } from '@ph/shared';

interface UploadInput {
  odsBuffer: Buffer;
  odsFilename: string;
  patchBuffer?: Buffer;
  patchFilename?: string;
  releaseVersion: string;
  robotIdsText: string;
  notes: string;
}

export async function uploadSession(input: UploadInput): Promise<string> {
  const fileMeta = parseFilename(input.odsFilename);
  const stopRows = parseOdsBuffer(input.odsBuffer);

  // Parse robot IDs from text, or auto-detect from data
  let robotIds = input.robotIdsText
    .split(/[,\s]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));

  if (robotIds.length === 0) {
    robotIds = [...new Set(stopRows.map((s) => s.robotId))].sort((a, b) => a - b);
  }

  // Parse patches if provided
  const patchRecords = input.patchBuffer && input.patchFilename
    ? parsePatchBuffer(input.patchBuffer, input.patchFilename)
    : [];

  // Insert session
  const [session] = await db.insert(testSessions).values({
    server: fileMeta.server,
    startTime: new Date(fileMeta.startTime || new Date().toISOString()),
    endTime: new Date(fileMeta.endTime || new Date().toISOString()),
    originalFilename: fileMeta.originalFilename,
    releaseVersion: input.releaseVersion,
    robotIds,
    notes: input.notes,
  }).returning({ id: testSessions.id });

  // Batch insert stops
  if (stopRows.length > 0) {
    const BATCH_SIZE = 500;
    for (let i = 0; i < stopRows.length; i += BATCH_SIZE) {
      const batch = stopRows.slice(i, i + BATCH_SIZE);
      await db.insert(stopRecords).values(
        batch.map((row: ParsedStopRow, idx: number) => ({
          sessionId: session.id,
          rowIndex: i + idx,
          robotId: row.robotId,
          timestamp: row.timestamp,
          playbackUrl: row.playbackUrl,
          robotIdTimestamp: row.robotIdTimestamp,
          l1StopReason: row.l1StopReason,
          l2StopReason: row.l2StopReason,
          l3StopReason: row.l3StopReason,
          stopLocationCode: row.stopLocationCode,
          poseX: row.poseX,
          poseY: row.poseY,
          stopDuration: row.stopDuration,
          triageComment: row.triageComment,
          supportInterventionMade: row.supportInterventionMade,
          palletLoaded: row.palletLoaded,
          floor: row.floor,
          client: row.client,
          application: row.application,
          nexusSwVersion: row.nexusSwVersion,
          nrvSwVersion: row.nrvSwVersion,
          vrosSwVersion: row.vrosSwVersion,
        }))
      );
    }
  }

  // Insert patches
  if (patchRecords.length > 0) {
    await db.insert(patches).values(
      patchRecords.map((p) => ({
        sessionId: session.id,
        project: p.project,
        patchSet: p.patchSet,
        description: p.description,
      }))
    );
  }

  return session.id;
}

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
      originalFilename: r.originalFilename,
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
      originalFilename: session.originalFilename,
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
