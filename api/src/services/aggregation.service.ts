import { eq, sql, and, gte, lte, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { stopRecords } from '../db/schema.js';
import type { KPIData, StopQueryInput } from '@ph/shared';

export async function getKPIs(sessionId: string): Promise<KPIData | null> {
  const [result] = await db
    .select({
      totalStops: sql<number>`count(*)::int`,
      totalDuration: sql<number>`coalesce(sum(${stopRecords.stopDuration}), 0)::float`,
      avgDuration: sql<number>`coalesce(avg(${stopRecords.stopDuration}), 0)::float`,
      robotCount: sql<number>`count(distinct ${stopRecords.robotId})::int`,
    })
    .from(stopRecords)
    .where(eq(stopRecords.sessionId, sessionId));

  if (!result || result.totalStops === 0) return null;

  const stopsPerRobot = result.robotCount > 0 ? result.totalStops / result.robotCount : 0;

  // Worst robot(s) (most stops — may be a tie)
  const robotCounts = await db
    .select({
      robotId: stopRecords.robotId,
      count: sql<number>`count(*)::int`,
    })
    .from(stopRecords)
    .where(eq(stopRecords.sessionId, sessionId))
    .groupBy(stopRecords.robotId)
    .orderBy(sql`count(*) desc`);

  const maxCount = robotCounts[0]?.count ?? 0;
  const worstRobots = robotCounts.filter((r) => r.count === maxCount);

  // Top L2 reason (exclude WAITING_FOR_RZ — expected fleet behavior, not actionable)
  const [topL2] = await db
    .select({
      reason: stopRecords.l2StopReason,
      count: sql<number>`count(*)::int`,
    })
    .from(stopRecords)
    .where(and(
      eq(stopRecords.sessionId, sessionId),
      sql`${stopRecords.l3StopReason} != 'WAITING_FOR_RZ'`,
    ))
    .groupBy(stopRecords.l2StopReason)
    .orderBy(sql`count(*) desc`)
    .limit(1);

  return {
    totalStops: result.totalStops,
    totalDuration: result.totalDuration,
    avgDuration: result.avgDuration,
    robotCount: result.robotCount,
    stopsPerRobot,
    worstRobot: worstRobots.length === 1
      ? worstRobots[0].robotId
      : worstRobots.map((r) => r.robotId).join(', '),
    worstCount: maxCount,
    topL2: topL2?.reason ?? '',
    topL2Count: topL2?.count ?? 0,
  };
}

export async function queryStops(sessionId: string, query: StopQueryInput) {
  const conditions = [eq(stopRecords.sessionId, sessionId)];

  if (query.robotIds?.length) conditions.push(inArray(stopRecords.robotId, query.robotIds));
  if (query.l1StopReasons?.length) conditions.push(inArray(stopRecords.l1StopReason, query.l1StopReasons));
  if (query.l2StopReasons?.length) conditions.push(inArray(stopRecords.l2StopReason, query.l2StopReasons));
  if (query.l3StopReasons?.length) conditions.push(inArray(stopRecords.l3StopReason, query.l3StopReasons));
  if (query.stopLocationCodes?.length) conditions.push(inArray(stopRecords.stopLocationCode, query.stopLocationCodes));
  if (query.minDuration != null) conditions.push(gte(stopRecords.stopDuration, query.minDuration));
  if (query.maxDuration != null) conditions.push(lte(stopRecords.stopDuration, query.maxDuration));

  const where = and(...conditions);

  // Get total count
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(stopRecords)
    .where(where);

  // Map sortBy to actual column
  const sortColumn = getSortColumn(query.sortBy);
  const direction = query.sortDir === 'desc' ? sql`desc` : sql`asc`;

  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select()
    .from(stopRecords)
    .where(where)
    .orderBy(sql`${sortColumn} ${direction}`)
    .limit(query.pageSize)
    .offset(offset);

  const data = rows.map((s) => ({
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
  }));

  return {
    data,
    meta: { page: query.page, pageSize: query.pageSize, total },
  };
}

function getSortColumn(sortBy: string) {
  const columnMap: Record<string, ReturnType<typeof sql>> = {
    robotId: sql`${stopRecords.robotId}`,
    timestamp: sql`${stopRecords.timestamp}`,
    l1StopReason: sql`${stopRecords.l1StopReason}`,
    l2StopReason: sql`${stopRecords.l2StopReason}`,
    l3StopReason: sql`${stopRecords.l3StopReason}`,
    stopLocationCode: sql`${stopRecords.stopLocationCode}`,
    stopDuration: sql`${stopRecords.stopDuration}`,
  };
  return columnMap[sortBy] ?? sql`${stopRecords.timestamp}`;
}

export async function getStopsByRobot(sessionId: string) {
  return db
    .select({
      robotId: stopRecords.robotId,
      count: sql<number>`count(*)::int`,
      totalDuration: sql<number>`sum(${stopRecords.stopDuration})::float`,
    })
    .from(stopRecords)
    .where(eq(stopRecords.sessionId, sessionId))
    .groupBy(stopRecords.robotId)
    .orderBy(sql`count(*) desc`);
}

export async function getReasonDistribution(sessionId: string, level: 'l1' | 'l2' | 'l3') {
  const column = level === 'l1' ? stopRecords.l1StopReason
    : level === 'l2' ? stopRecords.l2StopReason
    : stopRecords.l3StopReason;

  return db
    .select({
      robotId: stopRecords.robotId,
      reason: column,
      count: sql<number>`count(*)::int`,
    })
    .from(stopRecords)
    .where(eq(stopRecords.sessionId, sessionId))
    .groupBy(stopRecords.robotId, column)
    .orderBy(sql`count(*) desc`);
}

export async function getHeatmapData(sessionId: string) {
  return db
    .select({
      id: stopRecords.id,
      robotId: stopRecords.robotId,
      poseX: stopRecords.poseX,
      poseY: stopRecords.poseY,
      l1StopReason: stopRecords.l1StopReason,
      stopDuration: stopRecords.stopDuration,
      stopLocationCode: stopRecords.stopLocationCode,
    })
    .from(stopRecords)
    .where(eq(stopRecords.sessionId, sessionId));
}

export async function getFilterOptions(sessionId: string) {
  const [robotIds, l1Reasons, l2Reasons, l3Reasons, locations] = await Promise.all([
    db.selectDistinct({ value: stopRecords.robotId })
      .from(stopRecords).where(eq(stopRecords.sessionId, sessionId))
      .orderBy(stopRecords.robotId),
    db.selectDistinct({ value: stopRecords.l1StopReason })
      .from(stopRecords).where(eq(stopRecords.sessionId, sessionId))
      .orderBy(stopRecords.l1StopReason),
    db.selectDistinct({ value: stopRecords.l2StopReason })
      .from(stopRecords).where(eq(stopRecords.sessionId, sessionId))
      .orderBy(stopRecords.l2StopReason),
    db.selectDistinct({ value: stopRecords.l3StopReason })
      .from(stopRecords).where(eq(stopRecords.sessionId, sessionId))
      .orderBy(stopRecords.l3StopReason),
    db.selectDistinct({ value: stopRecords.stopLocationCode })
      .from(stopRecords).where(eq(stopRecords.sessionId, sessionId))
      .orderBy(stopRecords.stopLocationCode),
  ]);

  return {
    robotIds: robotIds.map((r) => r.value),
    l1Reasons: l1Reasons.map((r) => r.value).filter(Boolean),
    l2Reasons: l2Reasons.map((r) => r.value).filter(Boolean),
    l3Reasons: l3Reasons.map((r) => r.value).filter(Boolean),
    locations: locations.map((r) => r.value).filter(Boolean),
  };
}
