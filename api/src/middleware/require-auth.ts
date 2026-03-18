import type { Request, Response, NextFunction } from 'express';
import { getSessionCredentials, type AWSCredentials } from '../services/sso-auth.service.js';
import { config } from '../config.js';

const SESSION_COOKIE = 'ph_session';

// Extend Express Request to carry AWS credentials
declare global {
  namespace Express {
    interface Request {
      awsCredentials?: AWSCredentials | null;
      sessionToken?: string;
    }
  }
}

/**
 * Middleware that requires a valid authenticated session.
 *
 * In dev mode: passes through with no credentials (Athena service uses default chain).
 * In prod mode: requires SSO session with valid temporary credentials.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Dev mode: skip auth, use default AWS credential chain
  if (config.isDev) {
    req.awsCredentials = null;
    next();
    return;
  }

  // Production: require SSO session
  const token =
    req.cookies?.[SESSION_COOKIE] ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'authentication_required', message: 'No session token provided' });
    return;
  }

  const credentials = getSessionCredentials(token);
  if (!credentials) {
    res.status(401).json({ error: 'authentication_required', message: 'Session expired or invalid' });
    return;
  }

  req.awsCredentials = credentials;
  req.sessionToken = token;
  next();
}
