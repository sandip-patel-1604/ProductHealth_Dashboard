import { useState, useCallback, useRef } from 'react';
import { parseFilename, parseOdsFile } from '../../lib/parser';
import type { TestSession, SessionMetadata } from '../../lib/types';
import { useStore } from '../../store/useStore';

export function FileUpload() {
  const addSession = useStore((s) => s.addSession);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [metadata, setMetadata] = useState<SessionMetadata>({
    releaseVersion: '',
    robotIds: [],
    notes: '',
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

    setLoading(true);
    setError('');

    try {
      // Parse robot IDs from comma-separated text
      const robotIds = robotIdsText
        .split(/[,\s]+/)
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));

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
            robotIds: detectedRobotIds,
          },
          stops,
          createdAt: new Date().toISOString(),
        };

        addSession(session);
      }

      // Reset form
      setFiles([]);
      setMetadata({ releaseVersion: '', robotIds: [], notes: '' });
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
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
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
        <p className="text-gray-600 text-sm">
          {files.length > 0 ? (
            <span className="font-medium text-gray-900">
              {files.map((f) => f.name).join(', ')}
            </span>
          ) : (
            <>
              <span className="font-medium">Click to upload</span> or drag and
              drop .ods stop report files
            </>
          )}
        </p>
      </div>

      {/* Metadata fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Release Version
          </label>
          <input
            type="text"
            value={metadata.releaseVersion}
            onChange={(e) =>
              setMetadata((m) => ({ ...m, releaseVersion: e.target.value }))
            }
            placeholder="e.g. v2.3.1"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Robot IDs (comma-separated, or auto-detected)
          </label>
          <input
            type="text"
            value={robotIdsText}
            onChange={(e) => setRobotIdsText(e.target.value)}
            placeholder="e.g. 220, 221, 310"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={metadata.notes}
          onChange={(e) =>
            setMetadata((m) => ({ ...m, notes: e.target.value }))
          }
          placeholder="Optional notes about this test session"
          rows={2}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || files.length === 0}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Parsing...' : 'Upload & Parse'}
      </button>
    </form>
  );
}
