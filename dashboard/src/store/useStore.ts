import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TestSession, FilterState, SortConfig } from '../lib/types';
import { EMPTY_FILTERS } from '../lib/types';

interface DashboardState {
  sessions: TestSession[];
  activeSessionId: string | null;
  filters: FilterState;
  sort: SortConfig;

  // Actions
  addSession: (session: TestSession) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  setSort: (sort: SortConfig) => void;
}

export const useStore = create<DashboardState>()(
  persist(
    (set) => ({
      sessions: [],
      activeSessionId: null,
      filters: { ...EMPTY_FILTERS },
      sort: { key: 'timestamp', direction: 'asc' },

      addSession: (session) =>
        set((state) => ({
          sessions: [...state.sessions, session],
          activeSessionId: session.id,
        })),

      removeSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          activeSessionId:
            state.activeSessionId === id ? null : state.activeSessionId,
        })),

      setActiveSession: (id) => set({ activeSessionId: id }),

      setFilters: (partial) =>
        set((state) => ({
          filters: { ...state.filters, ...partial },
        })),

      resetFilters: () => set({ filters: { ...EMPTY_FILTERS } }),

      setSort: (sort) => set({ sort }),
    }),
    {
      name: 'product-health-dashboard',
    }
  )
);
