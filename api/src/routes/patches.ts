import { Router } from 'express';
import { eq } from 'drizzle-orm';
import multer from 'multer';
import { db } from '../db/client.js';
import { patches } from '../db/schema.js';
import { parsePatchBuffer } from '../services/parser.service.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

/** GET /sessions/:id/patches */
router.get('/:id/patches', async (req, res, next) => {
  try {
    const rows = await db
      .select({
        project: patches.project,
        patchSet: patches.patchSet,
        description: patches.description,
      })
      .from(patches)
      .where(eq(patches.sessionId, req.params.id));

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

/** POST /sessions/:id/patches/upload */
router.post('/:id/patches/upload', upload.single('patchFile'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'A patch file is required.' });
      return;
    }

    const records = parsePatchBuffer(req.file.buffer, req.file.originalname);

    if (records.length > 0) {
      await db.insert(patches).values(
        records.map((p) => ({
          sessionId: req.params.id,
          project: p.project,
          patchSet: p.patchSet,
          description: p.description,
        }))
      );
    }

    res.status(201).json({ data: { count: records.length } });
  } catch (err) {
    next(err);
  }
});

export default router;
