import { Router } from 'express';
import { stopQuerySchema } from '@ph/shared';
import { queryStops, getFilterOptions } from '../services/aggregation.service.js';
import { validateQuery } from '../middleware/validate.js';

const router = Router();

/** GET /sessions/:id/stops — Query stops with filters + sort + pagination */
router.get('/:id/stops', validateQuery(stopQuerySchema), async (req, res, next) => {
  try {
    const result = await queryStops(req.params.id, req.query as Record<string, string>);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** GET /sessions/:id/filter-options — Get unique values for filter dropdowns */
router.get('/:id/filter-options', async (req, res, next) => {
  try {
    const options = await getFilterOptions(req.params.id);
    res.json({ data: options });
  } catch (err) {
    next(err);
  }
});

export default router;
