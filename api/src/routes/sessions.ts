import { Router } from 'express';
import { listSessions, getSession, deleteSession, fetchAndCacheStops } from '../services/session.service.js';
import { param } from '../middleware/params.js';

const router = Router();

/** GET /sessions — List all sessions */
router.get('/', async (_req, res, next) => {
  try {
    const sessions = await listSessions();
    res.json({ data: sessions });
  } catch (err) {
    next(err);
  }
});

/** GET /sessions/:id — Get full session with stops */
router.get('/:id', async (req, res, next) => {
  try {
    const session = await getSession(param(req.params.id));
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ data: session });
  } catch (err) {
    next(err);
  }
});

/** DELETE /sessions/:id — Delete a session */
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await deleteSession(param(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

/** POST /sessions/:id/fetch-stops — Fetch stop records (from cache or Athena) */
router.post('/:id/fetch-stops', async (req, res, next) => {
  try {
    const result = await fetchAndCacheStops(
      param(req.params.id),
      (req as any).awsCredentials,
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
