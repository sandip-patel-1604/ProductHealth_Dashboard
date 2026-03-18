import { useState } from 'react';
import { Header } from './components/layout/Header';
import { AthenaSync } from './components/athena/AthenaSync';
import { ModeRouter } from './modes/ModeRouter';
import { useStore } from './store/useStore';
import { useSessions } from './hooks/useSessions';
import { useLogout, useAuthStatus } from './hooks/useAuth';

function App() {
  const activeSessionId = useStore((s) => s.activeSessionId);
  const { data: sessions = [] } = useSessions();
  const hasActiveSession = !!activeSessionId && sessions.some((s) => s.id === activeSessionId);
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

        {/* Active mode content */}
        {hasActiveSession && <ModeRouter />}
      </main>
    </div>
  );
}

export default App;
