import {
  AthenaClient,
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  type QueryExecutionState,
} from '@aws-sdk/client-athena';
import { config } from '../config.js';
import type { AWSCredentials } from './sso-auth.service.js';
import type { AthenaSessionRow } from '@ph/shared';

/**
 * Create an Athena client.
 * - In dev: uses default credential chain (~/.aws/credentials)
 * - In prod: uses the user's temporary SSO credentials
 */
function getAthenaClient(credentials?: AWSCredentials | null): AthenaClient {
  if (credentials) {
    return new AthenaClient({
      region: config.awsRegion,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });
  }
  // Default credential chain — reads ~/.aws/credentials, env vars, etc.
  return new AthenaClient({ region: config.awsRegion });
}

/**
 * Poll until a query execution completes.
 * Uses exponential backoff: 500ms → 1s → 2s → ... → max 5s, timeout 120s.
 */
async function waitForQuery(
  client: AthenaClient,
  queryExecutionId: string,
): Promise<void> {
  let delay = 500;
  const maxDelay = 5_000;
  const startTime = Date.now();
  const timeout = 120_000;

  while (Date.now() - startTime < timeout) {
    const resp = await client.send(
      new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId }),
    );

    const state = resp.QueryExecution?.Status?.State as QueryExecutionState;

    if (state === 'SUCCEEDED') return;
    if (state === 'FAILED') {
      const reason = resp.QueryExecution?.Status?.StateChangeReason ?? 'Unknown';
      throw new Error(`Athena query failed: ${reason}`);
    }
    if (state === 'CANCELLED') {
      throw new Error('Athena query was cancelled');
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 2, maxDelay);
  }

  throw new Error('Athena query timed out after 120 seconds');
}

/**
 * Fetch all result rows from a completed query, handling pagination.
 */
async function fetchAllResults(
  client: AthenaClient,
  queryExecutionId: string,
): Promise<Record<string, string>[]> {
  const rows: Record<string, string>[] = [];
  let nextToken: string | undefined;
  let isFirstPage = true;

  do {
    const resp = await client.send(
      new GetQueryResultsCommand({
        QueryExecutionId: queryExecutionId,
        NextToken: nextToken,
      }),
    );

    const resultSet = resp.ResultSet;
    if (!resultSet?.Rows || !resultSet?.ResultSetMetadata?.ColumnInfo) break;

    const columns = resultSet.ResultSetMetadata.ColumnInfo.map((c) => c.Name ?? '');
    const startIdx = isFirstPage ? 1 : 0; // Skip header row on first page

    for (let i = startIdx; i < resultSet.Rows.length; i++) {
      const row = resultSet.Rows[i];
      const record: Record<string, string> = {};
      for (let j = 0; j < columns.length; j++) {
        record[columns[j]] = row.Data?.[j]?.VarCharValue ?? '';
      }
      rows.push(record);
    }

    nextToken = resp.NextToken;
    isFirstPage = false;
  } while (nextToken);

  return rows;
}

/**
 * Execute a query and return all rows.
 */
async function executeQuery(
  client: AthenaClient,
  sql: string,
  params?: string[],
): Promise<Record<string, string>[]> {
  const command = new StartQueryExecutionCommand({
    QueryString: sql,
    QueryExecutionContext: { Database: config.athenaDatabase },
    WorkGroup: config.athenaWorkgroup,
    ...(config.athenaOutputBucket
      ? {
          ResultConfiguration: {
            OutputLocation: config.athenaOutputBucket,
          },
        }
      : {}),
    ...(params?.length
      ? { ExecutionParameters: params }
      : {}),
  });

  const startResp = await client.send(command);
  const queryExecutionId = startResp.QueryExecutionId;
  if (!queryExecutionId) {
    throw new Error('Athena did not return a QueryExecutionId');
  }

  await waitForQuery(client, queryExecutionId);
  return fetchAllResults(client, queryExecutionId);
}

/**
 * Query distinct customer site keys from fact_date_range.
 */
export async function queryDistinctSites(
  credentials?: AWSCredentials | null,
): Promise<string[]> {
  const client = getAthenaClient(credentials);
  const rows = await executeQuery(
    client,
    'SELECT DISTINCT customersitekey FROM fact_date_range ORDER BY customersitekey',
  );
  return rows.map((r) => r.customersitekey).filter(Boolean);
}

/**
 * Query session rows filtered by site and date range.
 */
export async function querySessionRows(
  credentials: AWSCredentials | null | undefined,
  site: string,
  startDate: string,
  endDate: string,
): Promise<AthenaSessionRow[]> {
  const client = getAthenaClient(credentials);

  // Athena ExecutionParameters don't support CAST/TIMESTAMP with ?,
  // so we use simple string comparison (works because timestamp format is ISO-sortable)
  const safeSite = site.replace(/'/g, "''");
  const safeStart = startDate.replace(/'/g, "''");
  const safeEnd = endDate.replace(/'/g, "''");

  const sql = `
    SELECT customersitekey, tag, description, start, "end", robot_id
    FROM fact_date_range
    WHERE customersitekey = '${safeSite}'
      AND start >= TIMESTAMP '${safeStart} 00:00:00'
      AND start <= TIMESTAMP '${safeEnd} 23:59:59'
    ORDER BY start
  `;

  const rows = await executeQuery(client, sql);

  return rows.map((r) => ({
    customersitekey: r.customersitekey ?? '',
    tag: r.tag ?? '',
    description: r.description ?? '',
    start: r.start ?? '',
    end: r.end ?? '',
    robot_id: r.robot_id ?? '',
  }));
}

/**
 * A single row from fact_stop_reports.
 */
export interface AthenaStopRow {
  customersitekey: string;
  code: string;
  event_id: string;
  date: string;
  pose_x: string;
  pose_y: string;
  robot_id: string;
  stop_location_code: string;
  l1_stop_reason: string;
  l2_stop_reason: string;
  l3_stop_reason: string;
  nexus_sw_version: string;
  nrv_sw_version: string;
  vros_sw_version: string;
  stop_duration: string;
  support_intervention_made: string;
  pallet_loaded: string;
}

/**
 * Query the total count of stop records for a site within a time window.
 */
export async function queryStopCount(
  credentials: AWSCredentials | null | undefined,
  site: string,
  startTime: string,
  endTime: string,
): Promise<number> {
  const client = getAthenaClient(credentials);

  const safeSite = site.replace(/'/g, "''");
  const safeStart = startTime.replace(/'/g, "''");
  const safeEnd = endTime.replace(/'/g, "''");

  const sql = `
    SELECT COUNT(*) as cnt
    FROM ${config.athenaStopsTable}
    WHERE customersitekey = '${safeSite}'
      AND date >= TIMESTAMP '${safeStart}'
      AND date <= TIMESTAMP '${safeEnd}'
  `;

  const rows = await executeQuery(client, sql);
  const raw = rows[0]?.cnt ?? '0';
  return parseInt(raw, 10) || 0;
}

/**
 * Query all stop records from fact_stop_reports for a site within a time window.
 */
export async function queryStopRecords(
  credentials: AWSCredentials | null | undefined,
  site: string,
  startTime: string,
  endTime: string,
): Promise<AthenaStopRow[]> {
  const client = getAthenaClient(credentials);

  const safeSite = site.replace(/'/g, "''");
  const safeStart = startTime.replace(/'/g, "''");
  const safeEnd = endTime.replace(/'/g, "''");

  const sql = `
    SELECT
      customersitekey,
      code,
      event_id,
      date,
      pose_x,
      pose_y,
      robot_id,
      stop_location_code,
      l1_stop_reason,
      l2_stop_reason,
      l3_stop_reason,
      nexus_sw_version,
      nrv_sw_version,
      vros_sw_version,
      stop_duration,
      support_intervention_made,
      pallet_loaded
    FROM ${config.athenaStopsTable}
    WHERE customersitekey = '${safeSite}'
      AND date >= TIMESTAMP '${safeStart}'
      AND date <= TIMESTAMP '${safeEnd}'
    ORDER BY date
  `;

  const rows = await executeQuery(client, sql);

  return rows.map((r) => ({
    customersitekey: r.customersitekey ?? '',
    code: r.code ?? '',
    event_id: r.event_id ?? '',
    date: r.date ?? '',
    pose_x: r.pose_x ?? '',
    pose_y: r.pose_y ?? '',
    robot_id: r.robot_id ?? '',
    stop_location_code: r.stop_location_code ?? '',
    l1_stop_reason: r.l1_stop_reason ?? '',
    l2_stop_reason: r.l2_stop_reason ?? '',
    l3_stop_reason: r.l3_stop_reason ?? '',
    nexus_sw_version: r.nexus_sw_version ?? '',
    nrv_sw_version: r.nrv_sw_version ?? '',
    vros_sw_version: r.vros_sw_version ?? '',
    stop_duration: r.stop_duration ?? '',
    support_intervention_made: r.support_intervention_made ?? '',
    pallet_loaded: r.pallet_loaded ?? '',
  }));
}
