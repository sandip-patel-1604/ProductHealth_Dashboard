import { useState, useCallback, useRef } from 'react';
import { parseFilename, parseOdsFile, parsePatchFile } from '../../lib/parser';
import type { TestSession, SessionMetadata } from '../../lib/types';
import { useStore } from '../../store/useStore';

const REQUIRE_MANUAL_RELEASE_VERSION = true;

export function FileUpload() {
  const addSession = useStore((s) => s.addSession);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [patchFile, setPatchFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<SessionMetadata>({
    releaseVersion: '',
    robotIds: [],
    notes: '',
    patches: [],
  });
  const [robotIdsText, setRobotIdsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const odsFiles = Array.from(newFiles).filter((f) =>
      f.name.toLowerCase().endsWith('.ods')
    );
    if (odsFiles.length === 0) {
      setError('Please select .ods files only.');
      return;
    }
    setFiles(odsFiles);
    setError('');
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('Please select at least one .ods file.');
      return;
    }

    const releaseVersion = metadata.releaseVersion.trim();
    if (REQUIRE_MANUAL_RELEASE_VERSION && !releaseVersion) {
      setError('Release version is required before importing a test run.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Parse robot IDs from comma-separated text
      const robotIds = robotIdsText
        .split(/[,\s]+/)
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));

      const patches = patchFile ? await parsePatchFile(patchFile) : [];

      for (const file of files) {
        const fileMetadata = parseFilename(file.name);
        const stops = await parseOdsFile(file);

        // Auto-detect robot IDs from data if not provided
        const detectedRobotIds =
          robotIds.length > 0
            ? robotIds
            : [...new Set(stops.map((s) => s.robotId))].sort((a, b) => a - b);

        const session: TestSession = {
          id: crypto.randomUUID(),
          fileMetadata,
          sessionMetadata: {
            ...metadata,
            releaseVersion,
            robotIds: detectedRobotIds,
            patches,
          },
          stops,
          createdAt: new Date().toISOString(),
        };

        // Await so any backend rejection (validation, DB error, duplicate session)
        // is caught by the outer catch block and shown to the user.
        await addSession(session);
      }

      // Reset form only after ALL sessions have been saved successfully.
      setFiles([]);
      setPatchFile(null);
      setMetadata({ releaseVersion: '', robotIds: [], notes: '', patches: [] });
      setRobotIdsText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(
        `Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-emerald-400 bg-emerald-500/10'
            : 'border-slate-600 hover:border-emerald-400/70 bg-slate-950/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".ods"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <p className="text-slate-300 text-sm">
          {files.length > 0 ? (
            <span className="font-medium text-emerald-200">
              {files.map((f) => f.name).join(', ')}
            </span>
          ) : (
            <>
              <span className="font-medium text-emerald-200">Click to upload</span> or drag and
              drop .ods stop report files
            </>
          )}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-1">
          Patch Spreadsheet (optional: .csv, .ods, .xlsx)
        </label>
        <input
          type="file"
          accept=".csv,.ods,.xlsx,.xls"
          onChange={(e) => setPatchFile(e.target.files?.[0] ?? null)}
          className="w-full border border-slate-600 bg-slate-950 text-slate-100 rounded-md px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-950"
        />
        {patchFile && (
          <p className="text-xs text-slate-400 mt-1">Selected patch file: {patchFile.name}</p>
        )}
      </div>

      {/* Metadata fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">
            Release Version
            {REQUIRE_MANUAL_RELEASE_VERSION && (
              <span className="text-rose-300"> *</span>
            )}
          </label>
          <input
            type="text"
            value={metadata.releaseVersion}
            onChange={(e) =>
              setMetadata((m) => ({ ...m, releaseVersion: e.target.value }))
            }
            placeholder="e.g. v2.3.1"
            className="w-full border border-slate-600 bg-slate-950 text-slate-100 rounded-md px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          {REQUIRE_MANUAL_RELEASE_VERSION && (
            <p className="mt-1 text-xs text-slate-400">
              Required for manual imports. Disable this when release version is auto-populated.
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">
            Robot IDs (comma-separated, or auto-detected)
          </label>
          <input
            type="text"
            value={robotIdsText}
            onChange={(e) => setRobotIdsText(e.target.value)}
            placeholder="e.g. 220, 221, 310"
            className="w-full border border-slate-600 bg-slate-950 text-slate-100 rounded-md px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-1">
          Notes
        </label>
        <textarea
          value={metadata.notes}
          onChange={(e) =>
            setMetadata((m) => ({ ...m, notes: e.target.value }))
          }
          placeholder="Optional notes about this test session"
          rows={2}
          className="w-full border border-slate-600 bg-slate-950 text-slate-100 rounded-md px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {error && (
        <p className="text-sm text-rose-200 bg-rose-950/40 border border-rose-800 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || files.length === 0}
        className="w-full bg-emerald-500 text-slate-950 py-2.5 px-4 rounded-md text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Parsing...' : 'Upload & Parse'}
      </button>
    </form>
  );
}
