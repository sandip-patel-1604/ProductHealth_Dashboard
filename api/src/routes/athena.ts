import { Router } from 'express';
import { athenaSyncSchema, athenaPreviewSchema } from '@ph/shared';
import { requireAuth } from '../middleware/require-auth.js';
import { queryDistinctSites } from '../services/athena.service.js';
import { previewSessions, syncSessions } from '../services/sync.service.js';
import { db } from '../db/client.js';
import { athenaSyncLog } from '../db/schema.js';
import { desc, eq } from 'drizzle-orm';

const router = Router();

// All athena routes require authentication
router.use(requireAuth);

/** GET /athena/sites — list distinct customer site keys */
router.get('/sites', async (req, res, next) => {
  try {
    const sites = await queryDistinctSites(req.awsCredentials!);
    res.json({ data: sites });
  } catch (err) {
    next(err);
  }
});

/** POST /athena/preview — preview Athena runs with import status */
router.post('/preview', async (req, res, next) => {
  try {
    const parsed = athenaPreviewSchema.parse(req.body);
    const result = await previewSessions(
      req.awsCredentials!,
      parsed.customersitekey,
      parsed.startDate,
      parsed.endDate,
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

/** POST /athena/sync — sync sessions from Athena for a site + date range */
router.post('/sync', async (req, res, next) => {
  try {
    const parsed = athenaSyncSchema.parse(req.body);
    const result = await syncSessions(
      req.awsCredentials!,
      parsed.customersitekey,
      parsed.startDate,
      parsed.endDate,
      parsed.runIds,
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

/** GET /athena/sync-status/:site — last sync time for a site */
router.get('/sync-status/:site', async (req, res, next) => {
  try {
    const { site } = req.params;
    const [latest] = await db
      .select()
      .from(athenaSyncLog)
      .where(eq(athenaSyncLog.customersitekey, site))
      .orderBy(desc(athenaSyncLog.lastSyncedAt))
      .limit(1);

    res.json({
      data: latest
        ? {
            lastSyncedAt: latest.lastSyncedAt.toISOString(),
            rowsFetched: latest.rowsFetched,
            sessionsCreated: latest.sessionsCreated,
            sessionsUpdated: latest.sessionsUpdated,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
