export default function TrendMode() {
  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-700 p-8 shadow-lg shadow-slate-950/30 text-center">
      <h2 className="text-xl font-semibold text-emerald-200 mb-3">Trend Analysis</h2>
      <p className="text-slate-400">
        Compare KPIs across multiple test sessions to spot trends and regressions.
      </p>
      <p className="text-slate-500 text-sm mt-4">
        Select multiple sessions and view day-over-day trend lines for total stops,
        stop duration, and stops per robot.
      </p>
      <div className="mt-6 inline-block px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 text-sm">
        Coming soon — plugin endpoint ready at /api/v1/modes/trend/data
      </div>
    </div>
  );
}
