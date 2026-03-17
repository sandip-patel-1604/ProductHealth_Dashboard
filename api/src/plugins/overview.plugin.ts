import { registerMode } from './registry.js';

registerMode({
  id: 'overview',
  label: 'Session Overview',
  defaultConfig: {},
  registerRoutes() {
    // Overview mode uses the core aggregation routes (kpis, stops-by-robot, etc.)
    // No additional routes needed — the core API covers this mode.
  },
});
