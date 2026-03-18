import { useState, useEffect, useRef, useCallback } from 'react';
import { useSSOStart, useSSOPoll } from '../../hooks/useAuth';

export function SSOLogin() {
  const ssoStart = useSSOStart();
  const ssoPoll = useSSOPoll();

  const [phase, setPhase] = useState<'idle' | 'waiting' | 'error'>('idle');
  const [deviceCode, setDeviceCode] = useState('');
  const [error, setError] = useState('');
  const pollTimerRef = useRef<ReturnType<typeof setInterval>>();

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = undefined;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => stopPolling, [stopPolling]);

  const handleSignIn = async () => {
    setError('');
    setPhase('idle');
    stopPolling();

    try {
      const result = await ssoStart.mutateAsync({});

      setDeviceCode(result.deviceCode);
      setPhase('waiting');

      // Open AWS SSO URL in new tab
      window.open(result.verificationUri, '_blank');

      // Start polling
      const interval = (result.interval || 5) * 1000;
      pollTimerRef.current = setInterval(async () => {
        try {
          const pollResult = await ssoPoll.mutateAsync(result.deviceCode);
          if (pollResult.authenticated) {
            stopPolling();
            // Auth status query will auto-refresh and AuthGate will show dashboard
          }
        } catch (err) {
          stopPolling();
          setPhase('error');
          setError(err instanceof Error ? err.message : 'Polling failed');
        }
      }, interval);

      // Auto-stop after expiry
      setTimeout(() => {
        stopPolling();
        if (phase === 'waiting') {
          setPhase('error');
          setError('SSO authorization timed out. Please try again.');
        }
      }, (result.expiresIn || 600) * 1000);
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : 'Failed to start SSO flow');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Product Health Dashboard</h1>
          <p className="text-slate-400 text-sm">
            Sign in with AWS SSO to access Athena data
          </p>
        </div>

        {phase === 'idle' && (
          <button
            onClick={handleSignIn}
            disabled={ssoStart.isPending}
            className="w-full bg-emerald-500 text-slate-950 py-3 px-4 rounded-lg text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {ssoStart.isPending ? 'Starting...' : 'Sign in with AWS SSO'}
          </button>
        )}

        {phase === 'waiting' && (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
              <span className="text-emerald-200 text-sm font-medium">
                Waiting for authorization...
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              A browser tab has opened for AWS SSO sign-in.
              Approve the request there, then this page will update automatically.
            </p>
            <button
              onClick={() => {
                stopPolling();
                setPhase('idle');
                setDeviceCode('');
              }}
              className="text-slate-500 text-xs hover:text-slate-300 underline"
            >
              Cancel
            </button>
          </div>
        )}

        {phase === 'error' && (
          <div className="space-y-4">
            <p className="text-sm text-rose-200 bg-rose-950/40 border border-rose-800 rounded-md px-3 py-2">
              {error}
            </p>
            <button
              onClick={handleSignIn}
              className="w-full bg-emerald-500 text-slate-950 py-3 px-4 rounded-lg text-sm font-semibold hover:bg-emerald-400 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
