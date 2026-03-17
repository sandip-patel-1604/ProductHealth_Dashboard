import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('Unhandled error:', err.message);

  if (err.message.includes('duplicate key')) {
    res.status(409).json({ error: 'A session with this filename already exists.' });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}
