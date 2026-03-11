import { useMemo } from 'react';
import { useStore } from '../../store/useStore';

export function KPICards() {
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const stops = activeSession?.stops ?? [];

  const kpis = useMemo(() => {
    if (stops.length === 0) return null;

    const totalStops = stops.length;
    const totalDuration = stops.reduce((sum, s) => sum + s.stopDuration, 0);
    const avgDuration = totalDuration / totalStops;

    const robotIds = [...new Set(stops.map((s) => s.robotId))];
    const stopsPerRobot = totalStops / robotIds.length;

    // Robot with most stops
    const robotCounts = new Map<number, number>();
    for (const s of stops) {
      robotCounts.set(s.robotId, (robotCounts.get(s.robotId) ?? 0) + 1);
    }
    let worstRobot = robotIds[0];
    let worstCount = 0;
    for (const [id, count] of robotCounts) {
      if (count > worstCount) {
        worstRobot = id;
        worstCount = count;
      }
    }

    // Most common L2 reason
    const l2Counts = new Map<string, number>();
    for (const s of stops) {
      l2Counts.set(s.l2StopReason, (l2Counts.get(s.l2StopReason) ?? 0) + 1);
    }
    let topL2 = '';
    let topL2Count = 0;
    for (const [reason, count] of l2Counts) {
      if (count > topL2Count) {
        topL2 = reason;
        topL2Count = count;
      }
    }

    return {
      totalStops,
      totalDuration,
      avgDuration,
      robotCount: robotIds.length,
      stopsPerRobot,
      worstRobot,
      worstCount,
      topL2,
      topL2Count,
    };
  }, [stops]);

  if (!kpis) {
    return null;
  }

  const cards = [
    { label: 'Total Stops', value: kpis.totalStops },
    {
      label: 'Total Stop Time',
      value: formatDuration(kpis.totalDuration),
    },
    {
      label: 'Avg Duration',
      value: `${kpis.avgDuration.toFixed(1)}s`,
    },
    {
      label: 'Stops / Robot',
      value: kpis.stopsPerRobot.toFixed(1),
    },
    {
      label: 'Most Stops',
      value: `Robot ${kpis.worstRobot}`,
      sub: `${kpis.worstCount} stops`,
    },
    {
      label: 'Top L2 Reason',
      value: kpis.topL2.replace(/_/g, ' '),
      sub: `${kpis.topL2Count} occurrences`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className={`rounded-xl p-3 border shadow-md transition-transform hover:-translate-y-0.5 ${
            index % 3 === 0
              ? 'bg-emerald-500/15 border-emerald-500/35 shadow-emerald-950/30'
              : 'bg-slate-900/90 border-slate-700 shadow-slate-950/30'
          }`}
        >
          <p className="text-xs text-slate-400 mb-1">{card.label}</p>
          <p className="text-lg font-semibold text-slate-100 truncate">
            {card.value}
          </p>
          {card.sub && (
            <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}
