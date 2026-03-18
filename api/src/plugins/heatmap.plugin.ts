import { registerMode } from './registry.js';

registerMode({
  id: 'heatmap',
  label: 'Heatmap',
  defaultConfig: { colorBy: 'l1StopReason' },
  registerRoutes() {
    // Heatmap mode uses the core /sessions/:id/heatmap endpoint.
    // Additional endpoints can be added here as the mode evolves.
  },
});
