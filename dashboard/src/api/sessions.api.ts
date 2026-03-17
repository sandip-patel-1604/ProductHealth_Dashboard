import type { ApiResponse, SessionSummary, TestSession } from '../lib/types';
import { apiFetch, apiUpload } from './client';

export const sessionsApi = {
  list: () =>
    apiFetch<ApiResponse<SessionSummary[]>>('/sessions').then((r) => r.data),

  get: (id: string) =>
    apiFetch<ApiResponse<TestSession>>(`/sessions/${id}`).then((r) => r.data),

  upload: (formData: FormData) =>
    apiUpload<ApiResponse<{ id: string }>>('/sessions/upload', formData).then((r) => r.data),

  delete: (id: string) =>
    apiFetch<ApiResponse<{ deleted: boolean }>>(`/sessions/${id}`, { method: 'DELETE' }).then((r) => r.data),
};
