import { useEffect, useMemo, useState, type MouseEvent, type PropsWithChildren } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { StopRecord } from '../../lib/types';
import { useStore } from '../../store/useStore';

export function KPICards() {
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const [modalOpen, setModalOpen] = useState(false);
  const [closingModal, setClosingModal] = useState(false);
  const [cardOrigin, setCardOrigin] = useState<DOMRect | null>(null);
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const stops = activeSession?.stops;
  const stableStops = useMemo(() => stops ?? [], [stops]);

  const kpis = useMemo(() => {
    if (stableStops.length === 0) return null;

    const totalStops = stableStops.length;
    const totalDuration = stableStops.reduce((sum, s) => sum + s.stopDuration, 0);
    const avgDuration = totalDuration / totalStops;

    const robotIds = [...new Set(stableStops.map((s) => s.robotId))];
    const stopsPerRobot = totalStops / robotIds.length;

    // Robot with most stops
    const robotCounts = new Map<number, number>();
    for (const s of stableStops) {
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
    for (const s of stableStops) {
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
  }, [stableStops]);

  if (!kpis) {
    return null;
  }

  const openBreakdownModal = (event: MouseEvent<HTMLButtonElement>) => {
    setCardOrigin(event.currentTarget.getBoundingClientRect());
    setModalOpen(true);
    setClosingModal(false);
  };

  const closeBreakdownModal = () => {
    if (!modalOpen || closingModal) return;
    setClosingModal(true);
    window.setTimeout(() => {
      setModalOpen(false);
      setClosingModal(false);
    }, 380);
  };

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
      {cards.map((card, index) => {
        const isMostStopsCard = card.label === 'Most Stops';

        if (isMostStopsCard) {
          return (
            <button
              key={card.label}
              type="button"
              onClick={openBreakdownModal}
              className="rounded-xl p-3 border shadow-md text-left transition-transform hover:-translate-y-0.5 cursor-pointer bg-slate-900/90 border-slate-700 shadow-slate-950/30 hover:border-emerald-400/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            >
              <p className="text-xs text-slate-400 mb-1">{card.label}</p>
              <p className="text-lg font-semibold text-slate-100 truncate">
                {card.value}
              </p>
              {card.sub && (
                <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
              )}
              <p className="mt-2 text-[11px] text-emerald-300/90">
                Open interactive bar charts ↗
              </p>
            </button>
          );
        }

        return (
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
        );
      })}

      {modalOpen && (
        <RobotStopsBreakdownModal
          stops={stableStops}
          origin={cardOrigin}
          isClosing={closingModal}
          onClose={closeBreakdownModal}
        />
      )}
    </div>
  );
}

function RobotStopsBreakdownModal({
  stops,
  origin,
  isClosing,
  onClose,
}: {
  stops: Pick<StopRecord, 'robotId' | 'l2StopReason' | 'l3StopReason'>[];
  origin: DOMRect | null;
  isClosing: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const robotCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const stop of stops) {
      counts.set(stop.robotId, (counts.get(stop.robotId) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([robotId, count]) => ({ robot: `Robot ${robotId}`, count }));
  }, [stops]);

  const l2Data = useMemo(
    () => buildReasonDistributionByRobot(stops, 'l2StopReason'),
    [stops],
  );
  const l3Data = useMemo(
    () => buildReasonDistributionByRobot(stops, 'l3StopReason'),
    [stops],
  );

  const transitionClasses = isClosing
    ? 'opacity-0 scale-[0.18]'
    : 'opacity-100 scale-100';

  const fromCardTranslate = origin
    ? {
        x: origin.x + origin.width / 2 - window.innerWidth / 2,
        y: origin.y + origin.height / 2 - window.innerHeight / 2,
      }
    : { x: 0, y: 0 };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Robot stop breakdown charts">
      <button
        type="button"
        className={`absolute inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={onClose}
        aria-label="Close stop breakdown"
      />

      <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8 pointer-events-none">
        <div
          className={`pointer-events-auto w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl border border-emerald-300/25 bg-slate-900/95 p-5 md:p-7 shadow-2xl shadow-emerald-950/40 transition-all duration-350 ${transitionClasses}`}
          style={{
            transform: `translate(${isClosing ? `${fromCardTranslate.x}px, ${fromCardTranslate.y}px` : '0px, 0px'}) scale(${isClosing ? 0.2 : 1})`,
            transformOrigin: origin
              ? `${origin.x + origin.width / 2}px ${origin.y + origin.height / 2}px`
              : 'center',
          }}
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-emerald-200">
                Robot stop breakdown for this session
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Compare robots by total stops and inspect L2/L3 reason distributions.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600"
            >
              Close
            </button>
          </div>

          <section className="space-y-6">
            <ChartSection
              title="Total stops by robot"
              description="Hover a bar to inspect precise stop counts."
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={robotCounts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="robot" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: '#020617', border: '1px solid #334155' }}
                    cursor={{ fill: 'rgba(16, 185, 129, 0.18)' }}
                  />
                  <Bar dataKey="count" name="Stops" fill="#34d399" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartSection>

            <ReasonDistributionSection
              title="L2 stop reason distribution per robot"
              description="Stacked bars show how each robot's L2 stops split across key reasons."
              data={l2Data.rows}
              reasonKeys={l2Data.reasonKeys}
            />

            <ReasonDistributionSection
              title="L3 stop reason distribution per robot"
              description="Use legend toggles and tooltips to compare deeper reason patterns."
              data={l3Data.rows}
              reasonKeys={l3Data.reasonKeys}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function ChartSection({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description: string }>) {
  return (
    <section className="rounded-xl border border-slate-700/80 bg-slate-950/55 p-4">
      <h4 className="text-sm md:text-base font-medium text-slate-100">{title}</h4>
      <p className="text-xs text-slate-400 mb-3">{description}</p>
      {children}
    </section>
  );
}

function ReasonDistributionSection({
  title,
  description,
  data,
  reasonKeys,
}: {
  title: string;
  description: string;
  data: Array<Record<string, number | string>>;
  reasonKeys: string[];
}) {
  return (
    <ChartSection title={title} description={description}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="robot" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <Tooltip contentStyle={{ background: '#020617', border: '1px solid #334155' }} />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }} />
          {reasonKeys.map((reason, index) => (
            <Bar
              key={reason}
              dataKey={reason}
              name={reason === AGGREGATED_OTHER_REASON_KEY ? 'Other' : reason}
              stackId="reasons"
              fill={CHART_COLORS[index % CHART_COLORS.length]}
              radius={index === reasonKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartSection>
  );
}

const CHART_COLORS = [
  '#34d399',
  '#22d3ee',
  '#818cf8',
  '#f472b6',
  '#f59e0b',
  '#a3e635',
  '#fb7185',
];

const AGGREGATED_OTHER_REASON_KEY = '__aggregated_other_reason__';

function buildReasonDistributionByRobot(
  stops: Pick<StopRecord, 'robotId' | 'l2StopReason' | 'l3StopReason'>[],
  field: 'l2StopReason' | 'l3StopReason',
) {
  const globalReasonCounts = new Map<string, number>();

  for (const stop of stops) {
    const reason = stop[field] || 'unknown';
    globalReasonCounts.set(reason, (globalReasonCounts.get(reason) ?? 0) + 1);
  }

  const sortedReasons = [...globalReasonCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason]) => reason);

  const reasonKeys = sortedReasons.slice(0, 6);
  const hasOther = sortedReasons.length > reasonKeys.length;

  const byRobot = new Map<number, Record<string, number | string>>();

  for (const stop of stops) {
    if (!byRobot.has(stop.robotId)) {
      byRobot.set(stop.robotId, { robot: `Robot ${stop.robotId}` });
    }

    const row = byRobot.get(stop.robotId);
    if (!row) continue;

    const rawReason = stop[field] || 'unknown';
    const normalizedReason = reasonKeys.includes(rawReason)
      ? rawReason
      : AGGREGATED_OTHER_REASON_KEY;
    row[normalizedReason] = ((row[normalizedReason] as number) ?? 0) + 1;
  }

  const rows = [...byRobot.values()].sort((a, b) => {
    const robotA = Number(String(a.robot).replace('Robot ', ''));
    const robotB = Number(String(b.robot).replace('Robot ', ''));
    return robotA - robotB;
  });

  for (const row of rows) {
    for (const reason of reasonKeys) {
      row[reason] = (row[reason] as number) ?? 0;
    }
    if (hasOther) {
      row[AGGREGATED_OTHER_REASON_KEY] =
        (row[AGGREGATED_OTHER_REASON_KEY] as number) ?? 0;
    }
  }

  return {
    rows,
    reasonKeys: hasOther
      ? [...reasonKeys, AGGREGATED_OTHER_REASON_KEY]
      : reasonKeys,
  };
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
