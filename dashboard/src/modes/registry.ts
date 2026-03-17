import { lazy, type ComponentType } from 'react';

export interface FrontendMode {
  id: string;
  label: string;
  component: React.LazyExoticComponent<ComponentType>;
}

/**
 * Dashboard mode registry.
 * To add a new mode, create a directory under modes/ with a default export component,
 * then add an entry here.
 */
export const modes: FrontendMode[] = [
  {
    id: 'overview',
    label: 'Overview',
    component: lazy(() => import('./overview/OverviewMode')),
  },
  {
    id: 'trend',
    label: 'Trends',
    component: lazy(() => import('./trend/TrendMode')),
  },
  {
    id: 'heatmap',
    label: 'Heatmap',
    component: lazy(() => import('./heatmap/HeatmapMode')),
  },
  {
    id: 'comparison',
    label: 'Compare',
    component: lazy(() => import('./comparison/ComparisonMode')),
  },
];
