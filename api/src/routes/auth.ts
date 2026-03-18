import { Router } from 'express';
import { ssoStartSchema, ssoPollSchema } from '@ph/shared';
import {
  createSessionToken,
  startSSOFlow,
  pollSSOToken,
  clearSession,
  getAuthStatus,
} from '../services/sso-auth.service.js';
import { config } from '../config.js';

const router = Router();

const SESSION_COOKIE = 'ph_session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: !config.isDev,
  maxAge: 4 * 60 * 60 * 1000, // 4 hours
};

/** GET /auth/status — check if current session is authenticated */
router.get('/status', (req, res) => {
  // Dev mode: always authenticated (uses ~/.aws credentials)
  if (config.isDev) {
    res.json({ data: { authenticated: true, mode: 'dev' } });
    return;
  }

  const token = req.cookies?.[SESSION_COOKIE] || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.json({ data: { authenticated: false } });
    return;
  }
  res.json({ data: getAuthStatus(token) });
});

/** POST /auth/sso/start — begin SSO device authorization flow */
router.post('/sso/start', async (req, res, next) => {
  try {
    const parsed = ssoStartSchema.parse(req.body);

    // Create or reuse session token
    let token = req.cookies?.[SESSION_COOKIE];
    if (!token) {
      token = createSessionToken();
      res.cookie(SESSION_COOKIE, token, COOKIE_OPTIONS);
    }

    const result = await startSSOFlow(token, parsed.ssoStartUrl, parsed.ssoRegion);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

/** POST /auth/sso/poll — poll for SSO authorization completion */
router.post('/sso/poll', async (req, res, next) => {
  try {
    const { deviceCode } = ssoPollSchema.parse(req.body);
    const token = req.cookies?.[SESSION_COOKIE];

    if (!token) {
      res.status(400).json({ error: 'No session token. Call /auth/sso/start first.' });
      return;
    }

    const result = await pollSSOToken(token, deviceCode);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

/** POST /auth/logout — clear session credentials */
router.post('/logout', (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) {
    clearSession(token);
  }
  res.clearCookie(SESSION_COOKIE);
  res.json({ data: { ok: true } });
});

export default router;
