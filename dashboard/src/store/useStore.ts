import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TestSession, FilterState, SortConfig } from '../lib/types';
import { EMPTY_FILTERS } from '../lib/types';

interface DashboardState {
  sessions: TestSession[];
  activeSessionId: string | null;
  filters: FilterState;
  sort: SortConfig;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSessions: () => Promise<void>;
  addSession: (session: TestSession) => Promise<void>;
  removeSession: (id: string) => Promise<void>;
  setActiveSession: (id: string | null) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  setSort: (sort: SortConfig) => void;
}

export const useStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      filters: { ...EMPTY_FILTERS },
      sort: { key: 'timestamp', direction: 'asc' },
      isLoading: false,
      error: null,

      fetchSessions: async () => {
        // Sessions are loaded from localStorage via persist middleware — no-op.
      },

      addSession: async (session) => {
        set((state) => ({
          sessions: [...state.sessions, session],
          activeSessionId: session.id,
        }));
      },

      removeSession: async (id) => {
        set((state) => {
          const remaining = state.sessions.filter((s) => s.id !== id);
          return {
            sessions: remaining,
            activeSessionId:
              state.activeSessionId === id
                ? remaining.length > 0
                  ? remaining[remaining.length - 1].id
                  : null
                : state.activeSessionId,
          };
        });
      },

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
      // Only persist sessions and activeSessionId; keep UI state ephemeral.
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    }
  )
);
