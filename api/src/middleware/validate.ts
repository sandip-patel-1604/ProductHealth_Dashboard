import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten().fieldErrors });
      return;
    }
    // Express 5 makes req.query a getter-only property, so store parsed data separately
    (req as any).validatedQuery = result.data;
    next();
  };
}

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten().fieldErrors });
      return;
    }
    req.body = result.data;
    next();
  };
}
