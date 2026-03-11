import { useState } from 'react';
import { Header } from './components/layout/Header';
import { FileUpload } from './components/upload/FileUpload';
import { KPICards } from './components/dashboard/KPICards';
import { SummaryTable } from './components/tables/SummaryTable';
import { useStore } from './store/useStore';

function App() {
  const activeSessionId = useStore((s) => s.activeSessionId);
  const sessions = useStore((s) => s.sessions);
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />

      <main className="max-w-screen-xl mx-auto px-4 py-8 space-y-6">
        {/* Upload section */}
        {(!activeSession || showUpload) && (
          <section className="bg-slate-900/90 rounded-2xl border border-emerald-500/30 p-5 shadow-lg shadow-emerald-950/20 backdrop-blur-sm">
            <h2 className="text-base font-semibold text-emerald-200 mb-3">
              Upload Stop Report
            </h2>
            <FileUpload />
          </section>
        )}

        {activeSession && !showUpload && (
          <button
            onClick={() => setShowUpload(true)}
            className="text-sm text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
          >
            + Upload another session
          </button>
        )}

        {showUpload && activeSession && (
          <button
            onClick={() => setShowUpload(false)}
            className="text-sm text-slate-400 hover:text-slate-200 underline underline-offset-2"
          >
            Hide upload form
          </button>
        )}

        {/* Session info banner */}
        {activeSession && (
          <div className="bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-sm shadow-lg shadow-slate-950/30">
            <span>
              <span className="text-slate-400">Server:</span>{' '}
              <span className="font-medium text-emerald-200">
                {activeSession.fileMetadata.server}
              </span>
            </span>
            <span>
              <span className="text-slate-400">Window:</span>{' '}
              {activeSession.fileMetadata.startTime} &mdash;{' '}
              {activeSession.fileMetadata.endTime}
            </span>
            {activeSession.sessionMetadata.releaseVersion && (
              <span>
                <span className="text-slate-400">Release:</span>{' '}
                {activeSession.sessionMetadata.releaseVersion}
              </span>
            )}
            <span>
              <span className="text-slate-400">Robots:</span>{' '}
              {activeSession.sessionMetadata.robotIds.join(', ')}
            </span>
          </div>
        )}

        {/* KPIs */}
        <KPICards />

        {/* Summary table */}
        <section className="bg-slate-900/90 rounded-2xl border border-slate-700 p-5 shadow-lg shadow-slate-950/30">
          <h2 className="text-base font-semibold text-emerald-200 mb-3">
            Stop Records
          </h2>
          <SummaryTable />
        </section>
      </main>
    </div>
  );
}

export default App;
