import type { ApiResponse, SessionSummary, TestSession, AthenaSyncRequest, AthenaSyncResponse, AthenaPreviewResponse } from '../lib/types';
import { apiFetch } from './client';

export const sessionsApi = {
  list: () =>
    apiFetch<ApiResponse<SessionSummary[]>>('/sessions').then((r) => r.data),

  get: (id: string) =>
    apiFetch<ApiResponse<TestSession>>(`/sessions/${id}`).then((r) => r.data),

  delete: (id: string) =>
    apiFetch<ApiResponse<{ deleted: boolean }>>(`/sessions/${id}`, { method: 'DELETE' }).then((r) => r.data),
};

export const athenaApi = {
  listSites: () =>
    apiFetch<ApiResponse<string[]>>('/athena/sites').then((r) => r.data),

  preview: (body: { customersitekey: string; startDate: string; endDate: string }) =>
    apiFetch<ApiResponse<AthenaPreviewResponse>>('/athena/preview', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((r) => r.data),

  sync: (body: AthenaSyncRequest) =>
    apiFetch<ApiResponse<AthenaSyncResponse>>('/athena/sync', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((r) => r.data),

  syncStatus: (site: string) =>
    apiFetch<ApiResponse<{
      lastSyncedAt: string;
      rowsFetched: number;
      sessionsCreated: number;
      sessionsUpdated: number;
    } | null>>(`/athena/sync-status/${encodeURIComponent(site)}`).then((r) => r.data),
};
