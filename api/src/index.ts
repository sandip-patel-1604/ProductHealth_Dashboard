import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { errorHandler } from './middleware/error-handler.js';

// Routes
import sessionsRouter from './routes/sessions.js';
import stopsRouter from './routes/stops.js';
import aggregationsRouter from './routes/aggregations.js';
import patchesRouter from './routes/patches.js';
import modesRouter from './routes/modes.js';
import authRouter from './routes/auth.js';
import athenaRouter from './routes/athena.js';

// Load plugins (side-effect: registers mode plugins)
import './plugins/overview.plugin.js';
import './plugins/trend.plugin.js';
import './plugins/heatmap.plugin.js';
import './plugins/comparison.plugin.js';

import { getModes } from './plugins/registry.js';
import { db } from './db/client.js';

const app = express();

app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes (no auth required)
app.use('/api/v1/auth', authRouter);

// Athena routes (requires auth)
app.use('/api/v1/athena', athenaRouter);

// Core routes (requires auth — skipped in dev, enforced in prod)
import { requireAuth } from './middleware/require-auth.js';
app.use('/api/v1/sessions', requireAuth, sessionsRouter);
app.use('/api/v1/sessions', requireAuth, stopsRouter);
app.use('/api/v1/sessions', requireAuth, aggregationsRouter);
app.use('/api/v1/sessions', requireAuth, patchesRouter);
app.use('/api/v1/modes', requireAuth, modesRouter);

// Register plugin routes
const pluginRouter = express.Router();
for (const plugin of getModes()) {
  plugin.registerRoutes(pluginRouter, db);
}
app.use('/api/v1', pluginRouter);

// Error handling
app.use(errorHandler);

app.listen(config.port, '0.0.0.0', () => {
  console.log(`API server listening on port ${config.port}`);
});

export default app;
