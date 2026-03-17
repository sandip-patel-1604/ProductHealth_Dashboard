import type { ApiResponse, KPIData, PatchRecord } from '../lib/types';
import { apiFetch } from './client';

export const aggregationsApi = {
  kpis: (sessionId: string) =>
    apiFetch<ApiResponse<KPIData>>(`/sessions/${sessionId}/kpis`).then((r) => r.data),

  stopsByRobot: (sessionId: string) =>
    apiFetch<ApiResponse<Array<{ robotId: number; count: number; totalDuration: number }>>>(
      `/sessions/${sessionId}/stops-by-robot`
    ).then((r) => r.data),

  reasonDistribution: (sessionId: string, level: 'l1' | 'l2' | 'l3') =>
    apiFetch<ApiResponse<Array<{ robotId: number; reason: string; count: number }>>>(
      `/sessions/${sessionId}/reason-distribution?level=${level}`
    ).then((r) => r.data),

  heatmap: (sessionId: string) =>
    apiFetch<ApiResponse<Array<{
      id: string;
      robotId: number;
      poseX: number;
      poseY: number;
      l1StopReason: string;
      stopDuration: number;
      stopLocationCode: string;
    }>>>(`/sessions/${sessionId}/heatmap`).then((r) => r.data),

  patches: (sessionId: string) =>
    apiFetch<ApiResponse<PatchRecord[]>>(`/sessions/${sessionId}/patches`).then((r) => r.data),
};
