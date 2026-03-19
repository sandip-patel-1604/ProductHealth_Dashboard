import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsApi, athenaApi } from '../api/sessions.api';
import type { AthenaSyncRequest } from '../lib/types';

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: sessionsApi.list,
  });
}

export function useSession(id: string | null) {
  return useQuery({
    queryKey: ['session', id],
    queryFn: () => sessionsApi.get(id!),
    enabled: !!id,
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sessionsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

// ─── Athena Hooks ─────────────────────────────────────────

export function useAthenaPreview() {
  return useMutation({
    mutationFn: (body: { customersitekey: string; startDate: string; endDate: string }) =>
      athenaApi.preview(body),
  });
}

export function useAthenaSites() {
  return useQuery({
    queryKey: ['athena-sites'],
    queryFn: athenaApi.listSites,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

export function useAthenaSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AthenaSyncRequest) => athenaApi.sync(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useAthenaSyncStatus(site: string | null) {
  return useQuery({
    queryKey: ['athena-sync-status', site],
    queryFn: () => athenaApi.syncStatus(site!),
    enabled: !!site,
    staleTime: 30_000,
  });
}

export function useFetchStops() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sessionsApi.fetchStops,
    onSuccess: (_data, sessionId) => {
      // Invalidate the session query so it re-fetches with cached stops
      qc.invalidateQueries({ queryKey: ['session', sessionId] });
      // Also refresh the session list to update stopsCached status
      qc.invalidateQueries({ queryKey: ['sessions'] });
      // Invalidate all queries that depend on stop data
      qc.invalidateQueries({ queryKey: ['stops', sessionId] });
      qc.invalidateQueries({ queryKey: ['filter-options', sessionId] });
      qc.invalidateQueries({ queryKey: ['kpis', sessionId] });
      qc.invalidateQueries({ queryKey: ['stops-by-robot', sessionId] });
      qc.invalidateQueries({ queryKey: ['reason-distribution', sessionId] });
      qc.invalidateQueries({ queryKey: ['heatmap', sessionId] });
    },
  });
}

/**
 * Auto-fetches stop records from Athena when a session is selected
 * and stops haven't been cached yet.
 */
export function useAutoFetchStops(sessionId: string | null) {
  const { data: sessions = [] } = useSessions();
  const fetchStops = useFetchStops();
  // Track which session IDs we've already triggered a fetch for to prevent duplicates
  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!sessionId) return;
    if (fetchedRef.current.has(sessionId)) return;

    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    if (!session.stopsCached && !fetchStops.isPending) {
      fetchedRef.current.add(sessionId);
      fetchStops.mutate(sessionId);
    }
  }, [sessionId, sessions]);

  return fetchStops;
}
