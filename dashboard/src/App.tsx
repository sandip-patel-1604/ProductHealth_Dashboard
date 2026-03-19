import { useState } from 'react';
import { Header } from './components/layout/Header';
import { AthenaSync } from './components/athena/AthenaSync';
import { ModeRouter } from './modes/ModeRouter';
import { useStore } from './store/useStore';
import { useSessions, useAutoFetchStops } from './hooks/useSessions';
import { useLogout, useAuthStatus } from './hooks/useAuth';

function App() {
  const activeSessionId = useStore((s) => s.activeSessionId);
  const { data: sessions = [] } = useSessions();
  const hasActiveSession = !!activeSessionId && sessions.some((s) => s.id === activeSessionId);
  const { isPending: isFetchingStops } = useAutoFetchStops(hasActiveSession ? activeSessionId : null);
  const [showSync, setShowSync] = useState(false);
  const logout = useLogout();
  const { data: authData } = useAuthStatus();
  const isDevMode = (authData as any)?.mode === 'dev';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header
        onLogout={isDevMode ? undefined : () => logout.mutate()}
        isLoggingOut={logout.isPending}
      />

      <main className="max-w-screen-xl mx-auto px-4 py-8 space-y-6">
        {/* Athena sync section */}
        {(!hasActiveSession || showSync) && (
          <section className="bg-slate-900/90 rounded-2xl border border-emerald-500/30 p-5 shadow-lg shadow-emerald-950/20 backdrop-blur-sm">
            <h2 className="text-base font-semibold text-emerald-200 mb-3">
              Sync Test Sessions from Athena
            </h2>
            <AthenaSync />
          </section>
        )}

        {hasActiveSession && !showSync && (
          <button
            onClick={() => setShowSync(true)}
            className="text-sm text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
          >
            + Sync more sessions
          </button>
        )}

        {showSync && hasActiveSession && (
          <button
            onClick={() => setShowSync(false)}
            className="text-sm text-slate-400 hover:text-slate-200 underline underline-offset-2"
          >
            Hide sync panel
          </button>
        )}

        {/* Loading indicator while fetching stops from Athena */}
        {isFetchingStops && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-200 flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading stop records...
          </div>
        )}

        {/* Active mode content */}
        {hasActiveSession && <ModeRouter />}
      </main>
    </div>
  );
}

export default App;
