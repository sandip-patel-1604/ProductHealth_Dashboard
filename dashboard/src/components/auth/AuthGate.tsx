import type { ReactNode } from 'react';
import { useAuthStatus } from '../../hooks/useAuth';
import { SSOLogin } from './SSOLogin';

interface AuthGateProps {
  children: ReactNode;
}

/**
 * Wraps the entire app — shows SSOLogin if not authenticated,
 * renders children (dashboard) if authenticated.
 */
export function AuthGate({ children }: AuthGateProps) {
  const { data, isLoading, isError } = useAuthStatus();

  // Initial load — show a minimal loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex items-center gap-2 text-slate-400">
          <div className="h-4 w-4 rounded-full border-2 border-slate-600 border-t-emerald-400 animate-spin" />
          <span className="text-sm">Checking authentication...</span>
        </div>
      </div>
    );
  }

  // Backend unreachable or auth check failed — show login
  if (isError || !data?.authenticated) {
    return <SSOLogin />;
  }

  return <>{children}</>;
}
