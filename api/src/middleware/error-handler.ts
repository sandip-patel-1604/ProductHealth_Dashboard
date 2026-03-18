import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('Unhandled error:', err.message);

  if (err.message.includes('duplicate key')) {
    res.status(409).json({ error: 'A session with this filename already exists.' });
    return;
  }

  // Map AWS/SSO errors to safe user-facing messages (never expose raw SDK details)
  if (err.message.includes('SSO') || err.message.includes('AWS') || err.name?.includes('SSO')) {
    const safeMessage = err.message.includes('start URL is not configured')
      ? 'AWS SSO is not configured. Contact your administrator.'
      : err.message.includes('account ID and role name')
        ? 'AWS SSO role is not configured. Contact your administrator.'
        : err.message.includes('expired')
          ? 'AWS session expired. Please sign in again.'
          : 'AWS service unavailable. Please try again later.';
    res.status(503).json({ error: safeMessage });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}
