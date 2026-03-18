import { useState, useMemo } from 'react';
import { useAthenaSites, useAthenaPreview, useAthenaSync, useAthenaSyncStatus } from '../../hooks/useSessions';
import { useStore } from '../../store/useStore';
import type { AthenaPreviewRow } from '../../lib/types';

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function getCutoffDefault() {
  const d = new Date();
  d.setDate(d.getDate() - 14);
  return d.toISOString().slice(0, 10);
}

export function AthenaSync() {
  const { selectedSite, setSelectedSite } = useStore();
  const { data: sites = [], isLoading: sitesLoading, error: sitesError } = useAthenaSites();
  const { data: syncStatus, isLoading: syncStatusLoading } = useAthenaSyncStatus(selectedSite);
  const previewMutation = useAthenaPreview();
  const syncMutation = useAthenaSync();

  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [cutoffDate, setCutoffDate] = useState(getCutoffDefault());

  // Preview state
  const [previewRuns, setPreviewRuns] = useState<AthenaPreviewRow[] | null>(null);
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set());
  const [importResult, setImportResult] = useState<{ created: number; updated: number } | null>(null);

  const isFirstSync = !!selectedSite && !syncStatusLoading && syncStatus == null;
  const effectiveStartDate = isFirstSync ? cutoffDate : startDate;

  const newRuns = useMemo(
    () => previewRuns?.filter((r) => r.status === 'new') ?? [],
    [previewRuns],
  );

  const handlePreview = async () => {
    if (!selectedSite) return;
    setPreviewRuns(null);
    setSelectedRunIds(new Set());
    setImportResult(null);

    try {
      const result = await previewMutation.mutateAsync({
        customersitekey: selectedSite,
        startDate: effectiveStartDate,
        endDate,
      });
      setPreviewRuns(result.runs);
      // Auto-select all new runs
      setSelectedRunIds(new Set(result.runs.filter((r) => r.status === 'new').map((r) => r.runId)));
    } catch {
      // error handled by mutation state
    }
  };

  const handleImport = async () => {
    if (!selectedSite || selectedRunIds.size === 0) return;
    setImportResult(null);

    try {
      const result = await syncMutation.mutateAsync({
        customersitekey: selectedSite,
        startDate: effectiveStartDate,
        endDate,
        runIds: [...selectedRunIds],
      });
      setImportResult({ created: result.sessionsCreated, updated: result.sessionsUpdated });

      // Re-run preview to refresh statuses
      const refreshed = await previewMutation.mutateAsync({
        customersitekey: selectedSite,
        startDate: effectiveStartDate,
        endDate,
      });
      setPreviewRuns(refreshed.runs);
      setSelectedRunIds(new Set());
    } catch {
      // error handled by mutation state
    }
  };

  const toggleRunId = (runId: string) => {
    setSelectedRunIds((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) next.delete(runId);
      else next.add(runId);
      return next;
    });
  };

  const toggleAllNew = () => {
    if (selectedRunIds.size === newRuns.length) {
      setSelectedRunIds(new Set());
    } else {
      setSelectedRunIds(new Set(newRuns.map((r) => r.runId)));
    }
  };

  return (
    <div className="space-y-4">
      {/* Site selector */}
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-1">Customer Site</label>
        {sitesLoading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
            <Spinner /> Loading sites from Athena...
          </div>
        ) : sitesError ? (
          <ErrorBox message={sitesError instanceof Error ? sitesError.message : 'Failed to load sites'} />
        ) : (
          <select
            value={selectedSite ?? ''}
            onChange={(e) => { setSelectedSite(e.target.value || null); setPreviewRuns(null); }}
            className="w-full border border-slate-600 bg-slate-950 text-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">Select a site...</option>
            {sites.map((site) => (
              <option key={site} value={site}>{site}</option>
            ))}
          </select>
        )}
      </div>

      {/* Date range + cutoff */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isFirstSync ? (
          <div>
            <label className="block text-sm font-medium text-amber-200 mb-1">
              Don't import before
            </label>
            <input
              type="date"
              value={cutoffDate}
              onChange={(e) => setCutoffDate(e.target.value)}
              className="w-full border border-amber-600/50 bg-slate-950 text-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <p className="text-xs text-amber-400/70 mt-1">First sync — set a cutoff to avoid importing old data</p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-slate-600 bg-slate-950 text-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-slate-600 bg-slate-950 text-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handlePreview}
            disabled={!selectedSite || previewMutation.isPending}
            className="w-full bg-slate-700 text-slate-100 py-2 px-4 rounded-md text-sm font-semibold hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {previewMutation.isPending ? <span className="flex items-center justify-center gap-2"><Spinner />Querying Athena...</span> : 'Preview'}
          </button>
        </div>
      </div>

      {/* Preview error */}
      {previewMutation.isError && (
        <ErrorBox message={previewMutation.error instanceof Error ? previewMutation.error.message : 'Preview failed'} />
      )}

      {/* Preview table */}
      {previewRuns !== null && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-300">
              {previewRuns.length} run{previewRuns.length !== 1 ? 's' : ''} found
              {newRuns.length > 0 && <span className="text-blue-300 ml-1">({newRuns.length} new)</span>}
            </h3>
            {newRuns.length > 0 && (
              <button
                onClick={handleImport}
                disabled={selectedRunIds.size === 0 || syncMutation.isPending}
                className="bg-emerald-500 text-slate-950 py-1.5 px-4 rounded-md text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {syncMutation.isPending ? (
                  <span className="flex items-center gap-2"><Spinner />Importing...</span>
                ) : (
                  `Import Selected (${selectedRunIds.size})`
                )}
              </button>
            )}
          </div>

          {/* Import result toast */}
          {importResult && (
            <div className="text-sm text-emerald-200 bg-emerald-950/40 border border-emerald-800 rounded-md px-3 py-2">
              Imported {importResult.created} session{importResult.created !== 1 ? 's' : ''}
              {importResult.updated > 0 && `, updated ${importResult.updated}`}
            </div>
          )}

          {syncMutation.isError && (
            <ErrorBox message={syncMutation.error instanceof Error ? syncMutation.error.message : 'Import failed'} />
          )}

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/80 text-slate-300">
                <tr>
                  <th className="px-3 py-2 text-left w-8">
                    {newRuns.length > 0 && (
                      <input
                        type="checkbox"
                        checked={selectedRunIds.size === newRuns.length && newRuns.length > 0}
                        onChange={toggleAllNew}
                        className="rounded border-slate-500 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
                      />
                    )}
                  </th>
                  <th className="px-3 py-2 text-left">Run ID</th>
                  <th className="px-3 py-2 text-left">Version</th>
                  <th className="px-3 py-2 text-left">Config</th>
                  <th className="px-3 py-2 text-left">Robots</th>
                  <th className="px-3 py-2 text-left">Date Range</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {previewRuns.map((run) => (
                  <tr
                    key={run.runId}
                    className={`${run.status === 'new' ? 'bg-slate-900/50' : 'bg-slate-900/20 opacity-70'} hover:bg-slate-800/50 transition-colors`}
                  >
                    <td className="px-3 py-2">
                      {run.status === 'new' && (
                        <input
                          type="checkbox"
                          checked={selectedRunIds.has(run.runId)}
                          onChange={() => toggleRunId(run.runId)}
                          className="rounded border-slate-500 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-200">{run.runId}</td>
                    <td className="px-3 py-2 text-slate-300">{run.releaseVersion}</td>
                    <td className="px-3 py-2 text-slate-400">{run.config}</td>
                    <td className="px-3 py-2 text-slate-400 text-xs">{run.robotIds.join(', ')}</td>
                    <td className="px-3 py-2 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(run.startTime).toLocaleDateString()} — {new Date(run.endTime).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-slate-400 text-xs max-w-[200px] truncate" title={run.description}>
                      {run.description}
                    </td>
                    <td className="px-3 py-2">
                      {run.status === 'imported' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Imported
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          New
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {previewRuns !== null && previewRuns.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">
          No test runs found in the selected date range.
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return <div className="h-3.5 w-3.5 rounded-full border-2 border-current/30 border-t-current animate-spin inline-block" />;
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p className="text-sm text-rose-200 bg-rose-950/40 border border-rose-800 rounded-md px-3 py-2">
      {message}
    </p>
  );
}
