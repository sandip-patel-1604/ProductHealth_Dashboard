export default function ComparisonMode() {
  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-700 p-8 shadow-lg shadow-slate-950/30 text-center">
      <h2 className="text-xl font-semibold text-emerald-200 mb-3">Session Comparison</h2>
      <p className="text-slate-400">
        Compare two test sessions side-by-side to evaluate release quality.
      </p>
      <p className="text-slate-500 text-sm mt-4">
        Select two sessions (different releases or same release on different servers)
        and view comparative metrics.
      </p>
      <div className="mt-6 inline-block px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 text-sm">
        Coming soon — data endpoint ready at /api/v1/modes/comparison/data
      </div>
    </div>
  );
}
