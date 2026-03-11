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
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {/* Upload section */}
        {(!activeSession || showUpload) && (
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Upload Stop Report
            </h2>
            <FileUpload />
          </section>
        )}

        {activeSession && !showUpload && (
          <button
            onClick={() => setShowUpload(true)}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            + Upload another session
          </button>
        )}

        {showUpload && activeSession && (
          <button
            onClick={() => setShowUpload(false)}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Hide upload form
          </button>
        )}

        {/* Session info banner */}
        {activeSession && (
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>
              <span className="text-gray-500">Server:</span>{' '}
              <span className="font-medium">
                {activeSession.fileMetadata.server}
              </span>
            </span>
            <span>
              <span className="text-gray-500">Window:</span>{' '}
              {activeSession.fileMetadata.startTime} &mdash;{' '}
              {activeSession.fileMetadata.endTime}
            </span>
            {activeSession.sessionMetadata.releaseVersion && (
              <span>
                <span className="text-gray-500">Release:</span>{' '}
                {activeSession.sessionMetadata.releaseVersion}
              </span>
            )}
            <span>
              <span className="text-gray-500">Robots:</span>{' '}
              {activeSession.sessionMetadata.robotIds.join(', ')}
            </span>
          </div>
        )}

        {/* KPIs */}
        <KPICards />

        {/* Summary table */}
        <section className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Stop Records
          </h2>
          <SummaryTable />
        </section>
      </main>
    </div>
  );
}

export default App;
