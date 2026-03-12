import { useState } from 'react';
import { Header } from './components/layout/Header';
import { FileUpload } from './components/upload/FileUpload';
import { KPICards } from './components/dashboard/KPICards';
import { SummaryTable } from './components/tables/SummaryTable';
import { useStore } from './store/useStore';

const buildGerritPatchUrl = (project: string, patchSet: string) => {
  const normalizedProject = project.trim().toLowerCase();
  const normalizedPatchSet = patchSet.trim();

  if (!normalizedProject || !normalizedPatchSet) {
    return null;
  }

  const [changeNumber, patchSetNumber] = normalizedPatchSet.split('/');

  if (!changeNumber || !patchSetNumber) {
    return null;
  }

  return `https://git.vecnarobotics.local/c/${normalizedProject}/+/${changeNumber}/${patchSetNumber}`;
};

function App() {
  const activeSessionId = useStore((s) => s.activeSessionId);
  const sessions = useStore((s) => s.sessions);
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const [showUpload, setShowUpload] = useState(false);
  const activePatches = activeSession?.sessionMetadata.patches ?? [];

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

        {activeSession && (
          <details className="bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 shadow-lg shadow-slate-950/30">
            <summary className="cursor-pointer text-sm font-medium text-emerald-200">
              Patches in this test session ({activePatches.length})
            </summary>
            {activePatches.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[560px]">
                  <thead className="text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="py-2 pr-4">Project</th>
                      <th className="py-2 pr-4">Patch set</th>
                      <th className="py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePatches.map((patch, index) => {
                      const gerritPatchUrl = buildGerritPatchUrl(
                        patch.project,
                        patch.patchSet,
                      );

                      return (
                        <tr
                          key={`${patch.project}-${patch.patchSet}-${index}`}
                          className="border-b border-slate-800/80"
                        >
                          <td className="py-2 pr-4 text-slate-200">{patch.project}</td>
                          <td className="py-2 pr-4 text-slate-300">
                            {gerritPatchUrl ? (
                              <a
                                href={gerritPatchUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center rounded-md bg-emerald-600/25 px-2 py-0.5 text-emerald-200 underline decoration-emerald-300/60 underline-offset-2 hover:bg-emerald-500/35 hover:text-emerald-100"
                              >
                                {patch.patchSet}
                              </a>
                            ) : (
                              patch.patchSet
                            )}
                          </td>
                          <td className="py-2 text-slate-300">{patch.description}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">
                No patch spreadsheet was attached to this session.
              </p>
            )}
          </details>
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
