/** Default dashboard modes available out of the box */
export const DEFAULT_MODES = [
  { id: 'overview', label: 'Overview', enabled: true },
  { id: 'trend', label: 'Trends', enabled: true },
  { id: 'heatmap', label: 'Heatmap', enabled: true },
  { id: 'comparison', label: 'Compare', enabled: true },
] as const;

/** API version prefix */
export const API_PREFIX = '/api/v1';
