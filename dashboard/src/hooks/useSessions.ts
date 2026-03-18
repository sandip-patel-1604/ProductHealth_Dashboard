import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsApi } from '../api/sessions.api';

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

export function useUploadSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sessionsApi.upload,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
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
