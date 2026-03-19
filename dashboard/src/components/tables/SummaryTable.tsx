import { useState, useRef, useEffect } from 'react';
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

  // If any filter is an empty array [], nothing can match → skip the query
  const hasEmptyFilter = [filters.robotIds, filters.l1StopReasons, filters.l2StopReasons, filters.l3StopReasons, filters.stopLocationCodes]
    .some((f) => f !== null && f.length === 0);

  const { data: stopsResult, isLoading } = useStops(hasEmptyFilter ? null : activeSessionId, {
    robotIds: filters.robotIds?.length ? filters.robotIds : undefined,
    l1StopReasons: filters.l1StopReasons?.length ? filters.l1StopReasons : undefined,
    l2StopReasons: filters.l2StopReasons?.length ? filters.l2StopReasons : undefined,
    l3StopReasons: filters.l3StopReasons?.length ? filters.l3StopReasons : undefined,
    stopLocationCodes: filters.stopLocationCodes?.length ? filters.stopLocationCodes : undefined,
    minDuration: filters.minDuration,
    maxDuration: filters.maxDuration,
    sortBy: sort.key,
    sortDir: sort.direction,
    page: 1,
    pageSize: 500,
  });

  const stops = hasEmptyFilter ? [] : (stopsResult?.data ?? []);
  const total = hasEmptyFilter ? 0 : (stopsResult?.meta?.total ?? 0);

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
        <MultiSelectFilter
          label="Robot"
          selected={filters.robotIds?.map(String) ?? null}
          onChange={(vals) => setFilters({ robotIds: vals === null ? null : vals.map(Number) })}
          options={(filterOptions?.robotIds ?? []).map(String)}
        />
        <MultiSelectFilter
          label="L1 Reason"
          selected={filters.l1StopReasons}
          onChange={(vals) => setFilters({ l1StopReasons: vals })}
          options={filterOptions?.l1Reasons ?? []}
        />
        <MultiSelectFilter
          label="L2 Reason"
          selected={filters.l2StopReasons}
          onChange={(vals) => setFilters({ l2StopReasons: vals })}
          options={filterOptions?.l2Reasons ?? []}
        />
        <MultiSelectFilter
          label="L3 Reason"
          selected={filters.l3StopReasons}
          onChange={(vals) => setFilters({ l3StopReasons: vals })}
          options={filterOptions?.l3Reasons ?? []}
        />
        <MultiSelectFilter
          label="Location"
          selected={filters.stopLocationCodes}
          onChange={(vals) => setFilters({ stopLocationCodes: vals })}
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
                <td className="px-3 py-2 font-mono">{stop.robotId || stop.robotSerial || '—'}</td>
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

// ─── Multi-select checkbox dropdown ─────────────────────────────────────────

/**
 * Multi-select checkbox dropdown (Excel-style).
 * selected = null  → no filter, all items shown (Select All checked)
 * selected = []    → nothing selected, 0 results
 * selected = [...]  → only those items
 */
function MultiSelectFilter({
  label,
  selected,
  onChange,
  options,
}: {
  label: string;
  selected: string[] | null;
  onChange: (vals: string[] | null) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const isAll = selected === null;
  const checkedSet = new Set(selected ?? []);
  const allChecked = isAll || checkedSet.size === options.length;
  const noneChecked = !isAll && checkedSet.size === 0;
  const indeterminate = !isAll && checkedSet.size > 0 && checkedSet.size < options.length;

  const summary = isAll
    ? 'All'
    : checkedSet.size === 0
      ? 'None'
      : checkedSet.size === 1
        ? [...checkedSet][0]
        : `${checkedSet.size} selected`;

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs text-slate-400 mb-0.5">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 border border-slate-600 rounded px-2 py-1 text-sm bg-slate-900 text-slate-100 min-w-[80px] max-w-[180px] focus:outline-none focus:ring-2 focus:ring-emerald-400"
      >
        <span className="truncate flex-1 text-left">{summary}</span>
        <svg className="w-3 h-3 shrink-0 text-slate-400" viewBox="0 0 12 12" fill="none">
          <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && options.length > 0 && (
        <div className="absolute z-50 mt-1 w-max min-w-full max-h-60 overflow-y-auto rounded border border-slate-600 bg-slate-900 shadow-xl">
          {/* (Select All) toggle */}
          <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 cursor-pointer text-sm text-emerald-300 font-medium whitespace-nowrap border-b border-slate-700">
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => { if (el) el.indeterminate = indeterminate; }}
              onChange={() => onChange(allChecked ? [] : null)}
              className="accent-emerald-400 rounded"
            />
            (Select All)
          </label>

          {/* Individual options */}
          {options.map((opt) => {
            const checked = isAll || checkedSet.has(opt);
            return (
              <label
                key={opt}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 cursor-pointer text-sm text-slate-200 whitespace-nowrap"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (isAll) {
                      // Was "All" → uncheck this one item
                      onChange(options.filter((o) => o !== opt));
                    } else if (checked) {
                      onChange(selected!.filter((v) => v !== opt));
                    } else {
                      const next = [...selected!, opt];
                      // If all are now selected, reset to null (= All)
                      onChange(next.length === options.length ? null : next);
                    }
                  }}
                  className="accent-emerald-400 rounded"
                />
                {opt}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
