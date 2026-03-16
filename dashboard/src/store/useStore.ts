import { create } from 'zustand';
import type { TestSession, FilterState, SortConfig } from '../lib/types';
import { EMPTY_FILTERS } from '../lib/types';

const API_URL = 'http://localhost:8080/api';

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

export const useStore = create<DashboardState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  filters: { ...EMPTY_FILTERS },
  sort: { key: 'timestamp', direction: 'asc' },
  isLoading: false,
  error: null,

  fetchSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/sessions`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const sessions: TestSession[] = await response.json();
      set({
        sessions,
        isLoading: false,
        activeSessionId:
          get().activeSessionId && sessions.find((s) => s.id === get().activeSessionId)
            ? get().activeSessionId
            : sessions.length > 0
              ? sessions[0].id
              : null,
      });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  addSession: async (session) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to save session');
      }

      const savedSession: TestSession = await response.json();
      set((state) => ({
        sessions: [...state.sessions, savedSession],
        activeSessionId: savedSession.id,
        isLoading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  removeSession: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/sessions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete session');

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
          isLoading: false,
        };
      });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  setActiveSession: (id) => set({ activeSessionId: id }),

  setFilters: (partial) =>
    set((state) => ({
      filters: { ...state.filters, ...partial },
    })),

  resetFilters: () => set({ filters: { ...EMPTY_FILTERS } }),

  setSort: (sort) => set({ sort }),
}));
