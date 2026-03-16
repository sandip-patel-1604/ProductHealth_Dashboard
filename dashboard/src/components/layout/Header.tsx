import { useStore } from '../../store/useStore';

export function Header() {
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const setActiveSession = useStore((s) => s.setActiveSession);
  const removeSession = useStore((s) => s.removeSession);

  return (
    <header className="bg-slate-900/95 border-b border-emerald-500/25 px-4 py-4 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-wide text-white">
          ProductHealth Dashboard
        </h1>

        {sessions.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-300">Session:</label>
            <select
              value={activeSessionId ?? ''}
              onChange={(e) => setActiveSession(e.target.value || null)}
              className="border border-slate-600 rounded-md px-2 py-1.5 text-sm bg-slate-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fileMetadata.server} | {s.fileMetadata.startTime} (
                  {s.stops.length} stops)
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (activeSessionId) removeSession(activeSessionId);
              }}
              className="text-xs text-rose-300 hover:text-rose-200"
              title="Remove session"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
