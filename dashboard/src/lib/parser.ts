import * as XLSX from 'xlsx';
import type { FileMetadata, PatchRecord, StopRecord } from './types';

/**
 * Extract server name, start time, and end time from the .ods filename.
 *
 * Expected format: {server}_{startTime}_{endTime}_stops.ods
 * Example: b023_2026_03_10T17_42_2026_03_10T19_46_stops.ods
 *
 * The timestamps use underscores instead of colons/dashes:
 *   2026_03_10T17_42 → 2026-03-10T17:42
 */
export function parseFilename(filename: string): FileMetadata {
  // Strip directory path if present
  const base = filename.replace(/^.*[\\/]/, '');

  // Remove _stops.ods suffix
  const withoutSuffix = base.replace(/_stops\.ods$/i, '');

  // Pattern: server_YYYY_MM_DDThh_mm_YYYY_MM_DDThh_mm
  const match = withoutSuffix.match(
    /^(.+?)_(\d{4}_\d{2}_\d{2}T\d{2}_\d{2})_(\d{4}_\d{2}_\d{2}T\d{2}_\d{2})$/
  );

  if (!match) {
    return {
      server: withoutSuffix,
      startTime: '',
      endTime: '',
      originalFilename: base,
    };
  }

  const [, server, rawStart, rawEnd] = match;

  const toIso = (s: string) => {
    // 2026_03_10T17_42 → 2026-03-10T17:42
    const [datePart, timePart] = s.split('T');
    const date = datePart.replace(/_/g, '-');
    const time = timePart.replace(/_/g, ':');
    return `${date}T${time}`;
  };

  return {
    server,
    startTime: toIso(rawStart),
    endTime: toIso(rawEnd),
    originalFilename: base,
  };
}

/** Parse a single row from the spreadsheet into a StopRecord */
function parseRow(row: Record<string, unknown>, index: number): StopRecord {
  const str = (v: unknown) => (v != null ? String(v) : '');
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const bool = (v: unknown) => String(v).toLowerCase() === 'true';

  return {
    id: str(row['id']) || `row-${index}`,
    robotId: num(row['RobotId']),
    timestamp: str(row['Logs timestamp EST']),
    robotIdTimestamp: str(row['RobotId_timestamp']),
    l1StopReason: str(row['L1_STOP_REASON']),
    l2StopReason: str(row['L2_STOP_REASON']),
    l3StopReason: str(row['L3_STOP_REASON']),
    stopLocationCode: str(row['STOP_LOCATION_CODE']),
    poseX: num(row['POSE_X']),
    poseY: num(row['POSE_Y']),
    stopDuration: num(row['STOP_DURATION']),
    triageComment: str(row['Triage comment']),
    supportInterventionMade: bool(row['SUPPORT_INTERVENTION_MADE']),
    palletLoaded: bool(row['PALLET_LOADED']),
    floor: str(row['FLOOR']),
    client: str(row['CLIENT']),
    application: str(row['APPLICATION']),
    nexusSwVersion: str(row['NEXUS_SW_VERSION']),
    nrvSwVersion: str(row['NRV_SW_VERSION']),
    vrosSwVersion: str(row['VROS_SW_VERSION']),
  };
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function getValueByHeader(row: Record<string, unknown>, expected: string): string {
  const expectedHeader = normalizeHeader(expected);
  for (const [key, value] of Object.entries(row)) {
    if (normalizeHeader(key) === expectedHeader) {
      return value != null ? String(value).trim() : '';
    }
  }
  return '';
}

/** Parse an optional patch spreadsheet (.csv/.ods/.xlsx) */
export async function parsePatchFile(file: File): Promise<PatchRecord[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const patches: PatchRecord[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });

    for (const row of rows) {
      const project = getValueByHeader(row, 'Project');
      const patchSet = getValueByHeader(row, 'Patch set');
      const description = getValueByHeader(row, 'Description');

      if (!project || !patchSet || !description) {
        continue;
      }

      patches.push({
        project,
        patchSet,
        description,
      });
    }
  }

  return patches;
}

/** Parse an .ods File object and return the stop records */
export async function parseOdsFile(file: File): Promise<StopRecord[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  return rows.map((row, i) => parseRow(row, i));
}
