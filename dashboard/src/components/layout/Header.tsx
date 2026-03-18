import { useStore } from '../../store/useStore';
import { useSessions, useDeleteSession } from '../../hooks/useSessions';
import { modes } from '../../modes/registry';

export function Header() {
  const activeSessionId = useStore((s) => s.activeSessionId);
  const setActiveSession = useStore((s) => s.setActiveSession);
  const activeMode = useStore((s) => s.activeMode);
  const setActiveMode = useStore((s) => s.setActiveMode);

  const { data: sessions = [] } = useSessions();
  const deleteMutation = useDeleteSession();

  const handleRemove = () => {
    if (!activeSessionId) return;
    deleteMutation.mutate(activeSessionId, {
      onSuccess: () => {
        const remaining = sessions.filter((s) => s.id !== activeSessionId);
        setActiveSession(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
      },
    });
  };

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
                  {s.stopCount} stops)
                </option>
              ))}
            </select>
            <button
              onClick={handleRemove}
              disabled={deleteMutation.isPending}
              className="text-xs text-rose-300 hover:text-rose-200 disabled:opacity-50"
              title="Remove session"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Mode tabs */}
      {sessions.length > 0 && activeSessionId && (
        <nav className="max-w-screen-xl mx-auto flex gap-1 mt-3">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveMode(m.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeMode === m.id
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {m.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
