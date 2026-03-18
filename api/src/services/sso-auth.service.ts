import {
  SSOOIDCClient,
  RegisterClientCommand,
  StartDeviceAuthorizationCommand,
  CreateTokenCommand,
  AuthorizationPendingException,
  SlowDownException,
  ExpiredTokenException,
} from '@aws-sdk/client-sso-oidc';
import {
  SSOClient,
  GetRoleCredentialsCommand,
} from '@aws-sdk/client-sso';
import crypto from 'crypto';
import { config } from '../config.js';

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: number; // Unix ms
}

interface SessionEntry {
  credentials: AWSCredentials | null;
  // SSO flow state (while user is approving)
  pendingAuth?: {
    clientId: string;
    clientSecret: string;
    deviceCode: string;
    accessToken?: string;
    ssoRegion: string;
    ssoStartUrl: string;
  };
}

/** In-memory session store — keyed by session token */
const sessions = new Map<string, SessionEntry>();

/** Generate a new session token */
export function createSessionToken(): string {
  return crypto.randomUUID();
}

/** Get credentials for a session token, or null */
export function getSessionCredentials(token: string): AWSCredentials | null {
  const entry = sessions.get(token);
  if (!entry?.credentials) return null;
  // Check expiry (with 60s buffer)
  if (Date.now() > entry.credentials.expiration - 60_000) {
    return null;
  }
  return entry.credentials;
}

/** Check if a session is authenticated */
export function isAuthenticated(token: string): boolean {
  return getSessionCredentials(token) !== null;
}

/** Get auth status for a session */
export function getAuthStatus(token: string): { authenticated: boolean; expiresAt?: string } {
  const creds = getSessionCredentials(token);
  if (!creds) return { authenticated: false };
  return {
    authenticated: true,
    expiresAt: new Date(creds.expiration).toISOString(),
  };
}

/** Start the SSO device authorization flow */
export async function startSSOFlow(
  token: string,
  ssoStartUrl?: string,
  ssoRegion?: string,
): Promise<{ verificationUri: string; deviceCode: string; interval: number; expiresIn: number }> {
  const startUrl = ssoStartUrl || config.ssoStartUrl;
  const region = ssoRegion || config.ssoRegion;

  if (!startUrl) {
    throw new Error('AWS SSO start URL is not configured. Set AWS_SSO_START_URL env var.');
  }

  const oidcClient = new SSOOIDCClient({ region });

  // Step 1: Register this client
  const registerResp = await oidcClient.send(new RegisterClientCommand({
    clientName: 'ProductHealthDashboard',
    clientType: 'public',
    scopes: ['sso:account:access'],
  }));

  const clientId = registerResp.clientId!;
  const clientSecret = registerResp.clientSecret!;

  // Step 2: Start device authorization
  const authResp = await oidcClient.send(new StartDeviceAuthorizationCommand({
    clientId,
    clientSecret,
    startUrl,
  }));

  // Store pending auth state
  sessions.set(token, {
    credentials: null,
    pendingAuth: {
      clientId,
      clientSecret,
      deviceCode: authResp.deviceCode!,
      ssoRegion: region,
      ssoStartUrl: startUrl,
    },
  });

  return {
    verificationUri: authResp.verificationUriComplete!,
    deviceCode: authResp.deviceCode!,
    interval: authResp.interval ?? 5,
    expiresIn: authResp.expiresIn ?? 600,
  };
}

/** Poll for SSO token completion */
export async function pollSSOToken(
  token: string,
  deviceCode: string,
): Promise<{ authenticated: boolean; pending?: boolean }> {
  const entry = sessions.get(token);
  if (!entry?.pendingAuth) {
    throw new Error('No pending SSO flow for this session');
  }

  const { clientId, clientSecret, ssoRegion } = entry.pendingAuth;
  const oidcClient = new SSOOIDCClient({ region: ssoRegion });

  try {
    const tokenResp = await oidcClient.send(new CreateTokenCommand({
      clientId,
      clientSecret,
      grantType: 'urn:ietf:params:oauth:grant-type:device_code',
      deviceCode,
    }));

    // Got the access token — now exchange for AWS credentials
    const accessToken = tokenResp.accessToken!;
    const credentials = await getAWSCredentials(accessToken, ssoRegion);

    // Store credentials, clear pending auth
    sessions.set(token, { credentials });

    return { authenticated: true };
  } catch (err) {
    if (err instanceof AuthorizationPendingException) {
      return { authenticated: false, pending: true };
    }
    if (err instanceof SlowDownException) {
      return { authenticated: false, pending: true };
    }
    if (err instanceof ExpiredTokenException) {
      sessions.delete(token);
      throw new Error('SSO authorization expired. Please start the sign-in process again.');
    }
    throw err;
  }
}

/** Exchange SSO access token for AWS role credentials */
async function getAWSCredentials(accessToken: string, region: string): Promise<AWSCredentials> {
  if (!config.ssoAccountId || !config.ssoRoleName) {
    throw new Error('AWS SSO account ID and role name must be configured. Set AWS_SSO_ACCOUNT_ID and AWS_SSO_ROLE_NAME env vars.');
  }

  const ssoClient = new SSOClient({ region });
  const resp = await ssoClient.send(new GetRoleCredentialsCommand({
    accessToken,
    accountId: config.ssoAccountId,
    roleName: config.ssoRoleName,
  }));

  const roleCreds = resp.roleCredentials!;
  return {
    accessKeyId: roleCreds.accessKeyId!,
    secretAccessKey: roleCreds.secretAccessKey!,
    sessionToken: roleCreds.sessionToken!,
    expiration: roleCreds.expiration!,
  };
}

/** Clear a session (logout) */
export function clearSession(token: string): void {
  sessions.delete(token);
}

/** Get active session count (for monitoring) */
export function getActiveSessionCount(): number {
  return sessions.size;
}
