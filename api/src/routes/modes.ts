import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { dashboardModes } from '../db/schema.js';
import { modeUpdateSchema } from '@ph/shared';
import { validateBody } from '../middleware/validate.js';

const router = Router();

/** GET /modes — List all dashboard modes */
router.get('/', async (_req, res, next) => {
  try {
    const modes = await db.select().from(dashboardModes);
    res.json({ data: modes });
  } catch (err) {
    next(err);
  }
});

/** PUT /modes/:modeId — Update mode settings */
router.put('/:modeId', validateBody(modeUpdateSchema), async (req, res, next) => {
  try {
    const { enabled, config } = req.body;
    const updates: Record<string, unknown> = {};
    if (enabled !== undefined) updates.enabled = enabled;
    if (config !== undefined) updates.config = config;

    const [updated] = await db
      .update(dashboardModes)
      .set(updates)
      .where(eq(dashboardModes.id, req.params.modeId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Mode not found' });
      return;
    }

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
