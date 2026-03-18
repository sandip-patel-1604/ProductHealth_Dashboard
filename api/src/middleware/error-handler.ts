import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('Unhandled error:', err.message);

  if (err.message.includes('duplicate key')) {
    res.status(409).json({ error: 'A session with this filename already exists.' });
    return;
  }

  // Surface AWS/SSO configuration errors clearly to the user
  if (err.message.includes('SSO') || err.message.includes('AWS')) {
    res.status(503).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}
