export default function HeatmapMode() {
  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-700 p-8 shadow-lg shadow-slate-950/30 text-center">
      <h2 className="text-xl font-semibold text-emerald-200 mb-3">Spatial Heatmap</h2>
      <p className="text-slate-400">
        Visualize stop locations using POSE_X / POSE_Y coordinates to identify hotspots.
      </p>
      <p className="text-slate-500 text-sm mt-4">
        Overlay stops on a 2D floor plan, color-coded by L1 stop type or robot.
        Click points to inspect details.
      </p>
      <div className="mt-6 inline-block px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 text-sm">
        Coming soon — data endpoint ready at /api/v1/sessions/:id/heatmap
      </div>
    </div>
  );
}
