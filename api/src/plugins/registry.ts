import type { Router } from 'express';
import type { Database } from '../db/client.js';

/** Interface for dashboard mode plugins */
export interface DashboardModePlugin {
  id: string;
  label: string;
  /** Register mode-specific API routes */
  registerRoutes(router: Router, db: Database): void;
  /** Default configuration for this mode */
  defaultConfig: Record<string, unknown>;
}

const modeRegistry = new Map<string, DashboardModePlugin>();

/** Register a new dashboard mode plugin */
export function registerMode(plugin: DashboardModePlugin) {
  modeRegistry.set(plugin.id, plugin);
}

/** Get all registered mode plugins */
export function getModes(): DashboardModePlugin[] {
  return [...modeRegistry.values()];
}

/** Get a specific mode plugin by ID */
export function getMode(id: string): DashboardModePlugin | undefined {
  return modeRegistry.get(id);
}
