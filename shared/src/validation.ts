import { z } from 'zod';

/** Schema for session upload metadata */
export const sessionUploadSchema = z.object({
  releaseVersion: z.string().min(1, 'Release version is required'),
  robotIds: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

/** Schema for stop query parameters */
export const stopQuerySchema = z.object({
  robotId: z.coerce.number().optional(),
  l1StopReason: z.string().optional(),
  l2StopReason: z.string().optional(),
  l3StopReason: z.string().optional(),
  stopLocationCode: z.string().optional(),
  minDuration: z.coerce.number().optional(),
  maxDuration: z.coerce.number().optional(),
  sortBy: z.string().optional().default('timestamp'),
  sortDir: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(500).optional().default(100),
});

/** Schema for mode update */
export const modeUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

/** Schema for Athena preview request */
export const athenaPreviewSchema = z.object({
  customersitekey: z.string().min(1, 'Customer site key is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
});

/** Schema for Athena sync request */
export const athenaSyncSchema = z.object({
  customersitekey: z.string().min(1, 'Customer site key is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  runIds: z.array(z.string().min(1)).optional(),
});

/** Schema for SSO start request */
export const ssoStartSchema = z.object({
  ssoStartUrl: z.string().url('SSO start URL must be a valid URL').optional(),
  ssoRegion: z.string().optional(),
});

/** Schema for SSO poll request */
export const ssoPollSchema = z.object({
  deviceCode: z.string().min(1, 'Device code is required'),
});

export type SessionUploadInput = z.infer<typeof sessionUploadSchema>;
export type StopQueryInput = z.infer<typeof stopQuerySchema>;
export type ModeUpdateInput = z.infer<typeof modeUpdateSchema>;
export type AthenaPreviewInput = z.infer<typeof athenaPreviewSchema>;
export type AthenaSyncInput = z.infer<typeof athenaSyncSchema>;
export type SSOStartInput = z.infer<typeof ssoStartSchema>;
export type SSOPollInput = z.infer<typeof ssoPollSchema>;
