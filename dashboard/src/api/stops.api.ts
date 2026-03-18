import type { StopRecord, PaginatedResponse } from '../lib/types';
import { apiFetch } from './client';

export interface StopQueryParams {
  robotId?: number | null;
  l1StopReason?: string;
  l2StopReason?: string;
  l3StopReason?: string;
  stopLocationCode?: string;
  minDuration?: number | null;
  maxDuration?: number | null;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export const stopsApi = {
  query: (sessionId: string, params: StopQueryParams = {}) => {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== '') {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    return apiFetch<PaginatedResponse<StopRecord[]>>(
      `/sessions/${sessionId}/stops${qs ? `?${qs}` : ''}`
    );
  },

  filterOptions: (sessionId: string) =>
    apiFetch<{
      data: {
        robotIds: number[];
        l1Reasons: string[];
        l2Reasons: string[];
        l3Reasons: string[];
        locations: string[];
      };
    }>(`/sessions/${sessionId}/filter-options`).then((r) => r.data),
};
