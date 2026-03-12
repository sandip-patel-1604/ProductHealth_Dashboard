import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import type { StopRecord, SortConfig, FilterState } from '../../lib/types';
import { EMPTY_FILTERS } from '../../lib/types';

function applyFilters(stops: StopRecord[], filters: FilterState): StopRecord[] {
  return stops.filter((s) => {
    if (filters.robotId !== null && s.robotId !== filters.robotId) return false;
    if (filters.l1StopReason && s.l1StopReason !== filters.l1StopReason)
      return false;
    if (filters.l2StopReason && s.l2StopReason !== filters.l2StopReason)
      return false;
    if (filters.l3StopReason && s.l3StopReason !== filters.l3StopReason)
      return false;
    if (
      filters.stopLocationCode &&
      s.stopLocationCode !== filters.stopLocationCode
    )
      return false;
    if (filters.minDuration !== null && s.stopDuration < filters.minDuration)
      return false;
    if (filters.maxDuration !== null && s.stopDuration > filters.maxDuration)
      return false;
    return true;
  });
}

function applySort(stops: StopRecord[], sort: SortConfig): StopRecord[] {
  const sorted = [...stops];
  sorted.sort((a, b) => {
    const aVal = a[sort.key];
    const bVal = b[sort.key];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
    }
    const aStr = String(aVal);
    const bStr = String(bVal);
    return sort.direction === 'asc'
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr);
  });
  return sorted;
}


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
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const filters = useStore((s) => s.filters);
  const sort = useStore((s) => s.sort);
  const setSort = useStore((s) => s.setSort);
  const setFilters = useStore((s) => s.setFilters);
  const resetFilters = useStore((s) => s.resetFilters);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const allStops = activeSession?.stops ?? [];

  // Derive unique values for each filter dropdown using cascading logic:
  // each dropdown's options come from data filtered by all OTHER active filters,
  // so selecting one filter narrows down the choices in the remaining filters.
  const uniqueValues = useMemo(() => {
    // Returns allStops filtered by every filter EXCEPT the named key
    const stopsExcluding = (key: keyof FilterState) =>
      applyFilters(allStops, { ...filters, [key]: EMPTY_FILTERS[key] });

    const unique = (stops: StopRecord[], fn: (s: StopRecord) => string | number) =>
      [...new Set(stops.map(fn))].sort();

    return {
      robotIds: unique(stopsExcluding('robotId'), (s) => s.robotId) as number[],
      l1: unique(stopsExcluding('l1StopReason'), (s) => s.l1StopReason) as string[],
      l2: unique(stopsExcluding('l2StopReason'), (s) => s.l2StopReason) as string[],
      l3: unique(stopsExcluding('l3StopReason'), (s) => s.l3StopReason) as string[],
      locations: unique(stopsExcluding('stopLocationCode'), (s) => s.stopLocationCode) as string[],
    };
  }, [allStops, filters]);

  const filtered = useMemo(
    () => applyFilters(allStops, filters),
    [allStops, filters]
  );
  const sorted = useMemo(() => applySort(filtered, sort), [filtered, sort]);

  const handleSort = (key: keyof StopRecord) => {
    setSort({
      key,
      direction: sort.key === key && sort.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  if (!activeSession) {
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
          options={uniqueValues.robotIds.map(String)}
        />
        <FilterSelect
          label="L1 Reason"
          value={filters.l1StopReason}
          onChange={(v) => setFilters({ l1StopReason: v })}
          options={uniqueValues.l1}
        />
        <FilterSelect
          label="L2 Reason"
          value={filters.l2StopReason}
          onChange={(v) => setFilters({ l2StopReason: v })}
          options={uniqueValues.l2}
        />
        <FilterSelect
          label="L3 Reason"
          value={filters.l3StopReason}
          onChange={(v) => setFilters({ l3StopReason: v })}
          options={uniqueValues.l3}
        />
        <FilterSelect
          label="Location"
          value={filters.stopLocationCode}
          onChange={(v) => setFilters({ stopLocationCode: v })}
          options={uniqueValues.locations}
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
        Showing {sorted.length} of {allStops.length} stops
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
            {sorted.map((stop) => (
              <tr key={stop.id} className="hover:bg-slate-800/70">
                <td className="px-3 py-2 font-mono">{stop.robotId}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {stop.perryLink ? (
                    <a
                      href={stop.perryLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
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
