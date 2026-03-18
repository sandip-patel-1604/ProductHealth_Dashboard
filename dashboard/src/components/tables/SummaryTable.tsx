import { useStore } from '../../store/useStore';
import { useStops, useFilterOptions } from '../../hooks/useStops';
import type { StopRecord } from '../../lib/types';

const COLUMNS: { key: keyof StopRecord; label: string }[] = [
  { key: 'robotId', label: 'Robot' },
  { key: 'timestamp', label: 'Timestamp (EST)' },
  { key: 'l1StopReason', label: 'L1 Reason' },
  { key: 'l2StopReason', label: 'L2 Reason' },
  { key: 'l3StopReason', label: 'L3 Reason' },
  { key: 'stopLocationCode', label: 'Location' },
  { key: 'stopDuration', label: 'Duration (s)' },
];

export function SummaryTable() {
  const activeSessionId = useStore((s) => s.activeSessionId);
  const filters = useStore((s) => s.filters);
  const sort = useStore((s) => s.sort);
  const setSort = useStore((s) => s.setSort);
  const setFilters = useStore((s) => s.setFilters);
  const resetFilters = useStore((s) => s.resetFilters);

  const { data: filterOptions } = useFilterOptions(activeSessionId);

  const { data: stopsResult, isLoading } = useStops(activeSessionId, {
    robotId: filters.robotId,
    l1StopReason: filters.l1StopReason || undefined,
    l2StopReason: filters.l2StopReason || undefined,
    l3StopReason: filters.l3StopReason || undefined,
    stopLocationCode: filters.stopLocationCode || undefined,
    minDuration: filters.minDuration,
    maxDuration: filters.maxDuration,
    sortBy: sort.key,
    sortDir: sort.direction,
    page: 1,
    pageSize: 500,
  });

  const stops = stopsResult?.data ?? [];
  const total = stopsResult?.meta?.total ?? 0;

  const handleSort = (key: keyof StopRecord) => {
    setSort({
      key,
      direction: sort.key === key && sort.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  if (!activeSessionId) {
    return (
      <p className="text-slate-400 text-sm text-center py-8">
        Upload a stop report to view data.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end bg-slate-950/40 border border-slate-700 rounded-xl p-3">
        <FilterSelect
          label="Robot"
          value={filters.robotId !== null ? String(filters.robotId) : ''}
          onChange={(v) => setFilters({ robotId: v ? Number(v) : null })}
          options={(filterOptions?.robotIds ?? []).map(String)}
        />
        <FilterSelect
          label="L1 Reason"
          value={filters.l1StopReason}
          onChange={(v) => setFilters({ l1StopReason: v })}
          options={filterOptions?.l1Reasons ?? []}
        />
        <FilterSelect
          label="L2 Reason"
          value={filters.l2StopReason}
          onChange={(v) => setFilters({ l2StopReason: v })}
          options={filterOptions?.l2Reasons ?? []}
        />
        <FilterSelect
          label="L3 Reason"
          value={filters.l3StopReason}
          onChange={(v) => setFilters({ l3StopReason: v })}
          options={filterOptions?.l3Reasons ?? []}
        />
        <FilterSelect
          label="Location"
          value={filters.stopLocationCode}
          onChange={(v) => setFilters({ stopLocationCode: v })}
          options={filterOptions?.locations ?? []}
        />
        <button
          onClick={resetFilters}
          className="text-xs text-emerald-300 hover:text-emerald-200 underline underline-offset-2 pb-1"
        >
          Clear filters
        </button>
      </div>

      {/* Results count */}
      <p className="text-xs text-slate-400">
        {isLoading ? 'Loading...' : `Showing ${stops.length} of ${total} stops`}
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-950/40">
        <table className="min-w-full text-sm">
          <thead className="bg-emerald-500/10">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-3 py-2 text-left font-medium text-emerald-100 cursor-pointer select-none hover:bg-emerald-500/20 whitespace-nowrap"
                >
                  {col.label}
                  {sort.key === col.key && (
                    <span className="ml-1">
                      {sort.direction === 'asc' ? '\u2191' : '\u2193'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-200">
            {stops.map((stop) => (
              <tr key={stop.id} className="hover:bg-slate-800/70">
                <td className="px-3 py-2 font-mono">{stop.robotId}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {stop.playbackUrl ? (
                    <a
                      href={stop.playbackUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-300 underline decoration-emerald-400/70 underline-offset-2 hover:text-emerald-200"
                    >
                      {stop.timestamp}
                    </a>
                  ) : (
                    stop.timestamp
                  )}
                </td>
                <td className="px-3 py-2">{stop.l1StopReason}</td>
                <td className="px-3 py-2">{stop.l2StopReason}</td>
                <td className="px-3 py-2">{stop.l3StopReason}</td>
                <td className="px-3 py-2">{stop.stopLocationCode}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {stop.stopDuration.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-0.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-slate-600 rounded px-2 py-1 text-sm bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
