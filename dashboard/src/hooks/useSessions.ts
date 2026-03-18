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
