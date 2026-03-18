import { Router } from 'express';
import {
  getKPIs,
  getStopsByRobot,
  getReasonDistribution,
  getHeatmapData,
} from '../services/aggregation.service.js';
import { param } from '../middleware/params.js';

const router = Router();

/** GET /sessions/:id/kpis */
router.get('/:id/kpis', async (req, res, next) => {
  try {
    const kpis = await getKPIs(param(req.params.id));
    if (!kpis) {
      res.status(404).json({ error: 'No data for this session' });
      return;
    }
    res.json({ data: kpis });
  } catch (err) {
    next(err);
  }
});

/** GET /sessions/:id/stops-by-robot */
router.get('/:id/stops-by-robot', async (req, res, next) => {
  try {
    const data = await getStopsByRobot(param(req.params.id));
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/** GET /sessions/:id/reason-distribution?level=l2 */
router.get('/:id/reason-distribution', async (req, res, next) => {
  try {
    const level = (req.query.level as string) || 'l2';
    if (!['l1', 'l2', 'l3'].includes(level)) {
      res.status(400).json({ error: 'level must be l1, l2, or l3' });
      return;
    }
    const data = await getReasonDistribution(param(req.params.id), level as 'l1' | 'l2' | 'l3');
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/** GET /sessions/:id/heatmap */
router.get('/:id/heatmap', async (req, res, next) => {
  try {
    const data = await getHeatmapData(param(req.params.id));
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export default router;
