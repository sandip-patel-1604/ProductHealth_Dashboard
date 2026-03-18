import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import type { ApiResponse, AuthStatus, SSOStartResponse, SSOPollResponse } from '../lib/types';

const AUTH_QUERY_KEY = ['auth-status'];

export function useAuthStatus() {
  return useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: () => apiFetch<ApiResponse<AuthStatus>>('/auth/status').then((r) => r.data),
    refetchInterval: 30_000, // Heartbeat: check every 30s
    retry: false,
    staleTime: 10_000,
  });
}

export function useSSOStart() {
  return useMutation({
    mutationFn: (body?: { ssoStartUrl?: string; ssoRegion?: string }) =>
      apiFetch<ApiResponse<SSOStartResponse>>('/auth/sso/start', {
        method: 'POST',
        body: JSON.stringify(body ?? {}),
      }).then((r) => r.data),
  });
}

export function useSSOPoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deviceCode: string) =>
      apiFetch<ApiResponse<SSOPollResponse>>('/auth/sso/poll', {
        method: 'POST',
        body: JSON.stringify({ deviceCode }),
      }).then((r) => r.data),
    onSuccess: (data) => {
      if (data.authenticated) {
        qc.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      }
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<ApiResponse<{ ok: boolean }>>('/auth/logout', { method: 'POST' }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
  });
}
