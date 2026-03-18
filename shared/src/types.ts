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

/** Metadata extracted from the .ods filename */
export interface FileMetadata {
  server: string;
  startTime: string; // ISO-ish string from filename
  endTime: string;
  originalFilename: string;
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
