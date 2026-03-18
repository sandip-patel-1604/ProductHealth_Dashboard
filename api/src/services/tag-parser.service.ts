import type { ParsedTag, AthenaSessionRow } from '@ph/shared';

/**
 * Parse the tag field from fact_date_range.
 *
 * Example tag: "T1361-30p-AG/2.23.0-VC3+patches w/220,225,481 2026/3/16"
 *
 * Extracts:
 * - runId: "T1361" (grouping key — rows with same prefix = same fleet run)
 * - config: "30p-AG"
 * - releaseVersion: "2.23.0-VC3"
 * - hasPatches: true
 * - robotSerials: [220, 225, 481]
 * - date: "2026/3/16"
 *
 * Defensive: returns partial results with defaults if any part fails to parse.
 */
export function parseTag(tag: string): ParsedTag {
  const result: ParsedTag = {
    runId: '',
    config: '',
    releaseVersion: '',
    hasPatches: false,
    robotSerials: [],
    date: '',
    rawTag: tag,
  };

  if (!tag) return result;

  // 1. Run ID: leading T followed by digits
  const runIdMatch = tag.match(/^(T\d+)/);
  if (runIdMatch) {
    result.runId = runIdMatch[1];
  }

  // 2. Config: text between run ID and first "/"
  //    e.g. "T1361-30p-AG/..." → "-30p-AG" → "30p-AG"
  const afterRunId = result.runId ? tag.slice(result.runId.length) : tag;
  const slashIdx = afterRunId.indexOf('/');
  if (slashIdx > 0) {
    result.config = afterRunId.slice(0, slashIdx).replace(/^-/, '');
  }

  // 3. Release version: after "/", before "+" or space
  //    e.g. "/2.23.0-VC3+patches" → "2.23.0-VC3"
  //    e.g. "/Master-2.24+patches" → "Master-2.24"
  const versionMatch = tag.match(/\/([^\s+]+)/);
  if (versionMatch) {
    result.releaseVersion = versionMatch[1];
  }

  // 4. Patches flag
  result.hasPatches = /\+patches/i.test(tag);

  // 5. Robot serials: "w/220,225,481"
  const robotMatch = tag.match(/w\/(\d+(?:,\d+)*)/);
  if (robotMatch) {
    result.robotSerials = robotMatch[1]
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
  }

  // 6. Date: "2026/3/16" or "2026/03/16"
  const dateMatch = tag.match(/(\d{4}\/\d{1,2}\/\d{1,2})/);
  if (dateMatch) {
    result.date = dateMatch[1];
  }

  return result;
}

/**
 * Group Athena rows by run ID (T-prefix).
 * Rows sharing the same T-prefix belong to the same fleet run.
 */
export function groupAthenaRows(
  rows: AthenaSessionRow[],
): Map<string, AthenaSessionRow[]> {
  const groups = new Map<string, AthenaSessionRow[]>();

  for (const row of rows) {
    const parsed = parseTag(row.tag);
    // Use the full tag as key if no run ID found, or a hash of the row for truly empty tags.
    // This ensures run_id is never empty, so the partial unique index always applies.
    const key = parsed.runId || row.tag || `unknown-${row.start}-${row.robot_id}`;
    const group = groups.get(key);
    if (group) {
      group.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  return groups;
}
