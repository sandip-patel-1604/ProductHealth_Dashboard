import { useQuery } from '@tanstack/react-query';
import { stopsApi, type StopQueryParams } from '../api/stops.api';

export function useStops(sessionId: string | null, params: StopQueryParams = {}) {
  return useQuery({
    queryKey: ['stops', sessionId, params],
    queryFn: () => stopsApi.query(sessionId!, params),
    enabled: !!sessionId,
  });
}

export function useFilterOptions(sessionId: string | null) {
  return useQuery({
    queryKey: ['filter-options', sessionId],
    queryFn: () => stopsApi.filterOptions(sessionId!),
    enabled: !!sessionId,
  });
}
