import { useQuery } from '@tanstack/react-query';
import { aggregationsApi } from '../api/aggregations.api';

export function useKPIs(sessionId: string | null) {
  return useQuery({
    queryKey: ['kpis', sessionId],
    queryFn: () => aggregationsApi.kpis(sessionId!),
    enabled: !!sessionId,
  });
}

export function useStopsByRobot(sessionId: string | null) {
  return useQuery({
    queryKey: ['stops-by-robot', sessionId],
    queryFn: () => aggregationsApi.stopsByRobot(sessionId!),
    enabled: !!sessionId,
  });
}

export function useReasonDistribution(sessionId: string | null, level: 'l1' | 'l2' | 'l3') {
  return useQuery({
    queryKey: ['reason-distribution', sessionId, level],
    queryFn: () => aggregationsApi.reasonDistribution(sessionId!, level),
    enabled: !!sessionId,
  });
}

export function useHeatmapData(sessionId: string | null) {
  return useQuery({
    queryKey: ['heatmap', sessionId],
    queryFn: () => aggregationsApi.heatmap(sessionId!),
    enabled: !!sessionId,
  });
}

export function usePatches(sessionId: string | null) {
  return useQuery({
    queryKey: ['patches', sessionId],
    queryFn: () => aggregationsApi.patches(sessionId!),
    enabled: !!sessionId,
  });
}
