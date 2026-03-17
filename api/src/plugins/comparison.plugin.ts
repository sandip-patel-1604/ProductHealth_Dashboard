import { sql } from 'drizzle-orm';
import { registerMode } from './registry.js';
import { testSessions, stopRecords } from '../db/schema.js';

registerMode({
  id: 'comparison',
  label: 'Compare',
  defaultConfig: {},
  registerRoutes(router, db) {
    /** GET /modes/comparison/data?a=sessionId1&b=sessionId2 */
    router.get('/modes/comparison/data', async (req, res, next) => {
      try {
        const { a, b } = req.query as { a?: string; b?: string };
        if (!a || !b) {
          res.status(400).json({ error: 'Both "a" and "b" session IDs are required' });
          return;
        }

        const sessionIds = [a, b];

        const results = await db
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
          .groupBy(testSessions.id);

        res.json({ data: results });
      } catch (err) {
        next(err);
      }
    });
  },
});
