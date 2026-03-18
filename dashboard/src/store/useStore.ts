import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FilterState, SortConfig } from '../lib/types';
import { EMPTY_FILTERS } from '../lib/types';

interface DashboardState {
  // Session & mode selection (persisted)
  activeSessionId: string | null;
  activeMode: string;
  selectedSite: string | null;

  // UI state (ephemeral)
  filters: FilterState;
  sort: SortConfig;

  // Actions
  setActiveSession: (id: string | null) => void;
  setActiveMode: (mode: string) => void;
  setSelectedSite: (site: string | null) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  setSort: (sort: SortConfig) => void;
}

export const useStore = create<DashboardState>()(
  persist(
    (set) => ({
      activeSessionId: null,
      activeMode: 'overview',
      selectedSite: null,
      filters: { ...EMPTY_FILTERS },
      sort: { key: 'timestamp', direction: 'asc' },

      setActiveSession: (id) => set({ activeSessionId: id }),

      setActiveMode: (mode) => set({ activeMode: mode }),

      setSelectedSite: (site) => set({ selectedSite: site }),

      setFilters: (partial) =>
        set((state) => ({
          filters: { ...state.filters, ...partial },
        })),

      resetFilters: () => set({ filters: { ...EMPTY_FILTERS } }),

      setSort: (sort) => set({ sort }),
    }),
    {
      name: 'product-health-dashboard',
      partialize: (state) => ({
        activeSessionId: state.activeSessionId,
        activeMode: state.activeMode,
        selectedSite: state.selectedSite,
      }),
    }
  )
);
