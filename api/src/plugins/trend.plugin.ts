import { sql } from 'drizzle-orm';
import { registerMode } from './registry.js';
import { testSessions, stopRecords } from '../db/schema.js';

registerMode({
  id: 'trend',
  label: 'Trends',
  defaultConfig: { metric: 'totalStops' },
  registerRoutes(router, db) {
    /** GET /modes/trend/data?sessionIds=id1,id2,id3 */
    router.get('/modes/trend/data', async (req, res, next) => {
      try {
        const sessionIds = ((req.query.sessionIds as string) || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        if (sessionIds.length === 0) {
          res.status(400).json({ error: 'sessionIds query parameter is required' });
          return;
        }

        const trends = await db
          .select({
            sessionId: testSessions.id,
            server: testSessions.server,
            startTime: testSessions.startTime,
            releaseVersion: testSessions.releaseVersion,
            totalStops: sql<number>`count(${stopRecords.id})::int`,
            totalDuration: sql<number>`coalesce(sum(${stopRecords.stopDuration}), 0)::float`,
            avgDuration: sql<number>`coalesce(avg(${stopRecords.stopDuration}), 0)::float`,
            robotCount: sql<number>`count(distinct ${stopRecords.robotId})::int`,
          })
          .from(testSessions)
          .leftJoin(stopRecords, sql`${stopRecords.sessionId} = ${testSessions.id}`)
          .where(sql`${testSessions.id} = ANY(${sessionIds}::uuid[])`)
          .groupBy(testSessions.id)
          .orderBy(testSessions.startTime);

        res.json({ data: trends });
      } catch (err) {
        next(err);
      }
    });
  },
});
