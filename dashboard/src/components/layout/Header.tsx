import { useStore } from '../../store/useStore';

export function Header() {
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const setActiveSession = useStore((s) => s.setActiveSession);
  const removeSession = useStore((s) => s.removeSession);

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">
          ProductHealth Dashboard
        </h1>

        {sessions.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Session:</label>
            <select
              value={activeSessionId ?? ''}
              onChange={(e) => setActiveSession(e.target.value || null)}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="text-xs text-red-500 hover:text-red-700"
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
