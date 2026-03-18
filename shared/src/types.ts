/** A single parsed stop record from an .ods file */
export interface StopRecord {
  id: string;
  robotId: number;
  timestamp: string; // "Logs timestamp EST"
  playbackUrl: string;
  robotIdTimestamp: string; // video filename
  l1StopReason: string;
  l2StopReason: string;
  l3StopReason: string;
  stopLocationCode: string;
  poseX: number;
  poseY: number;
  stopDuration: number; // seconds
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

/** Metadata extracted from the .ods filename or Athena session */
export interface FileMetadata {
  server: string;
  startTime: string; // ISO-ish string from filename
  endTime: string;
  originalFilename: string | null;
}

/** A patch record from a patch spreadsheet */
export interface PatchRecord {
  project: string;
  patchSet: string;
  description: string;
}

/** User-provided metadata for a test session */
export interface SessionMetadata {
  releaseVersion: string;
  robotIds: number[];
  notes: string;
  patches: PatchRecord[];
}

/** A complete test session: file metadata + user metadata + parsed stops */
export interface TestSession {
  id: string;
  fileMetadata: FileMetadata;
  sessionMetadata: SessionMetadata;
  stops: StopRecord[];
  createdAt: string; // ISO date
}

/** Session summary (without stops array — for list endpoints) */
export interface SessionSummary {
  id: string;
  fileMetadata: FileMetadata;
  sessionMetadata: Omit<SessionMetadata, 'patches'>;
  stopCount: number;
  createdAt: string;
}

/** Sort direction for table columns */
export type SortDirection = 'asc' | 'desc';

/** Column sorting state */
export interface SortConfig {
  key: keyof StopRecord;
  direction: SortDirection;
}

/** Filter state for the summary table */
export interface FilterState {
  robotId: number | null;
  l1StopReason: string;
  l2StopReason: string;
  l3StopReason: string;
  stopLocationCode: string;
  minDuration: number | null;
  maxDuration: number | null;
}

export const EMPTY_FILTERS: FilterState = {
  robotId: null,
  l1StopReason: '',
  l2StopReason: '',
  l3StopReason: '',
  stopLocationCode: '',
  minDuration: null,
  maxDuration: null,
};

/** KPI data returned by the aggregation API */
export interface KPIData {
  totalStops: number;
  totalDuration: number;
  avgDuration: number;
  robotCount: number;
  stopsPerRobot: number;
  worstRobot: number;
  worstCount: number;
  topL2: string;
  topL2Count: number;
}

/** Paginated response envelope */
export interface PaginatedResponse<T> {
  data: T;
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

/** Standard API response envelope */
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

/** Dashboard mode definition */
export interface DashboardMode {
  id: string;
  label: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

// ─── Athena Integration Types ─────────────────────────────────────────

/** A single row from the qa.fact_date_range Athena table */
export interface AthenaSessionRow {
  customersitekey: string;
  tag: string;
  description: string;
  start: string;
  end: string;
  robot_id: string;
}

/** Result of parsing the tag field from fact_date_range */
export interface ParsedTag {
  runId: string;          // e.g. "T1361"
  config: string;         // e.g. "30p-AG"
  releaseVersion: string; // e.g. "2.23.0-VC3"
  hasPatches: boolean;
  robotSerials: number[]; // e.g. [220, 225, 481]
  date: string;           // e.g. "2026/3/16"
  rawTag: string;
}

/** Request body for POST /athena/sync */
export interface AthenaSyncRequest {
  customersitekey: string;
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string;   // ISO date YYYY-MM-DD
  runIds?: string[]; // When provided, only sync these run IDs
}

/** A single run in the preview view */
export interface AthenaPreviewRow {
  runId: string;
  tag: string;
  releaseVersion: string;
  config: string;
  description: string;
  robotIds: number[];
  startTime: string;  // ISO
  endTime: string;    // ISO
  rowCount: number;
  status: 'imported' | 'new';
  sessionId?: string; // Existing session UUID if imported
}

/** Response from POST /athena/preview */
export interface AthenaPreviewResponse {
  runs: AthenaPreviewRow[];
  totalAthenaRows: number;
}

/** Response from POST /athena/sync */
export interface AthenaSyncResponse {
  sessionsCreated: number;
  sessionsUpdated: number;
  totalRows: number;
}

/** Auth status response */
export interface AuthStatus {
  authenticated: boolean;
  expiresAt?: string;
}

/** SSO start response */
export interface SSOStartResponse {
  verificationUri: string;
  deviceCode: string;
  interval: number;
  expiresIn: number;
}

/** SSO poll response */
export interface SSOPollResponse {
  authenticated: boolean;
  pending?: boolean;
}
