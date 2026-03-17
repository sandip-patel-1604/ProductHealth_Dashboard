import { useState } from 'react';
import { Header } from './components/layout/Header';
import { FileUpload } from './components/upload/FileUpload';
import { ModeRouter } from './modes/ModeRouter';
import { useStore } from './store/useStore';
import { useSessions } from './hooks/useSessions';

function App() {
  const activeSessionId = useStore((s) => s.activeSessionId);
  const { data: sessions = [] } = useSessions();
  const hasActiveSession = !!activeSessionId && sessions.some((s) => s.id === activeSessionId);
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />

      <main className="max-w-screen-xl mx-auto px-4 py-8 space-y-6">
        {/* Upload section */}
        {(!hasActiveSession || showUpload) && (
          <section className="bg-slate-900/90 rounded-2xl border border-emerald-500/30 p-5 shadow-lg shadow-emerald-950/20 backdrop-blur-sm">
            <h2 className="text-base font-semibold text-emerald-200 mb-3">
              Upload Stop Report
            </h2>
            <FileUpload />
          </section>
        )}

        {hasActiveSession && !showUpload && (
          <button
            onClick={() => setShowUpload(true)}
            className="text-sm text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
          >
            + Upload another session
          </button>
        )}

        {showUpload && hasActiveSession && (
          <button
            onClick={() => setShowUpload(false)}
            className="text-sm text-slate-400 hover:text-slate-200 underline underline-offset-2"
          >
            Hide upload form
          </button>
        )}

        {/* Active mode content */}
        {hasActiveSession && <ModeRouter />}
      </main>
    </div>
  );
}

export default App;
