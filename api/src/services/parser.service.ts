import * as XLSX from 'xlsx';
import type { FileMetadata, PatchRecord } from '@ph/shared';

/**
 * Extract server name, start time, and end time from the .ods filename.
 *
 * Expected format: {server}_{startTime}_{endTime}_stops.ods
 * Example: b023_2026_03_10T17_42_2026_03_10T19_46_stops.ods
 */
export function parseFilename(filename: string): FileMetadata {
  const base = filename.replace(/^.*[\\/]/, '');
  const withoutSuffix = base.replace(/_stops\.ods$/i, '');

  const match = withoutSuffix.match(
    /^(.+?)_(\d{4}_\d{2}_\d{2}T\d{2}_\d{2})_(\d{4}_\d{2}_\d{2}T\d{2}_\d{2})$/
  );

  if (!match) {
    return { server: withoutSuffix, startTime: '', endTime: '', originalFilename: base };
  }

  const [, server, rawStart, rawEnd] = match;

  const toIso = (s: string) => {
    const [datePart, timePart] = s.split('T');
    const date = datePart.replace(/_/g, '-');
    const time = timePart.replace(/_/g, ':');
    return `${date}T${time}`;
  };

  return { server, startTime: toIso(rawStart), endTime: toIso(rawEnd), originalFilename: base };
}

/** Parsed row from the ODS file */
export interface ParsedStopRow {
  robotId: number;
  timestamp: string;
  playbackUrl: string;
  robotIdTimestamp: string;
  l1StopReason: string;
  l2StopReason: string;
  l3StopReason: string;
  stopLocationCode: string;
  poseX: number;
  poseY: number;
  stopDuration: number;
  triageComment: string;
  supportInterventionMade: boolean;
  palletLoaded: boolean;
  floor: string;
  client: string;
  application: string;
  nexusSwVersion: string;
  nrvSwVersion: string;
  vrosSwVersion: string;
}

function parseRow(
  row: Record<string, unknown>,
  playbackUrl: string,
): Omit<ParsedStopRow, 'robotIdTimestamp'> & { robotIdTimestamp: string } {
  const str = (v: unknown) => (v != null ? String(v) : '');
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const bool = (v: unknown) => String(v).toLowerCase() === 'true';

  return {
    robotId: num(row['RobotId']),
    timestamp: str(row['Logs timestamp EST']),
    playbackUrl,
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

function extractHyperlinkUrl(cell: XLSX.CellObject | undefined): string {
  if (!cell) return '';
  if (cell.l?.Target) return String(cell.l.Target);
  if (typeof cell.f === 'string') {
    const match = cell.f.match(/^HYPERLINK\((?:"|')([^"']+)(?:"|')/i);
    if (match) return match[1];
  }
  return '';
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** Parse an ODS buffer and return stop rows */
export function parseOdsBuffer(buffer: Buffer): ParsedStopRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellFormula: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1');
  let shortPerryColumn: number | null = null;

  for (let c = range.s.c; c <= range.e.c; c += 1) {
    const headerAddress = XLSX.utils.encode_cell({ r: range.s.r, c });
    const headerCell = sheet[headerAddress] as XLSX.CellObject | undefined;
    const headerValue = normalizeHeader(String(headerCell?.v ?? ''));
    if (headerValue === normalizeHeader('Short perry ctrl+click')) {
      shortPerryColumn = c;
      break;
    }
  }

  return rows.map((row, i) => {
    const sheetRow = i + 2;
    const cellAddress = shortPerryColumn !== null
      ? XLSX.utils.encode_cell({ r: sheetRow - 1, c: shortPerryColumn })
      : '';
    const cell = cellAddress ? (sheet[cellAddress] as XLSX.CellObject | undefined) : undefined;
    const playbackUrl = extractHyperlinkUrl(cell);
    return parseRow(row, playbackUrl);
  });
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

/** Parse a patch spreadsheet buffer */
export function parsePatchBuffer(buffer: Buffer, filename: string): PatchRecord[] {
  const ext = filename.toLowerCase().split('.').pop();
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    ...(ext === 'csv' ? { raw: true } : {}),
  });

  const records: PatchRecord[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    for (const row of rows) {
      const project = getValueByHeader(row, 'Project');
      const patchSet = getValueByHeader(row, 'Patch set');
      const description = getValueByHeader(row, 'Description');
      if (!project || !patchSet || !description) continue;
      records.push({ project, patchSet, description });
    }
  }

  return records;
}
