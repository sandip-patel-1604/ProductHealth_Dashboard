import { Router } from 'express';
import multer from 'multer';
import { uploadSession, listSessions, getSession, deleteSession } from '../services/session.service.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();

/** POST /sessions/upload — Upload .ods file(s) + metadata */
router.post(
  '/upload',
  upload.fields([
    { name: 'odsFile', maxCount: 1 },
    { name: 'patchFile', maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const odsFile = files?.['odsFile']?.[0];

      if (!odsFile) {
        res.status(400).json({ error: 'An .ods file is required.' });
        return;
      }

      const { releaseVersion, robotIds, notes } = req.body;

      if (!releaseVersion || typeof releaseVersion !== 'string' || !releaseVersion.trim()) {
        res.status(400).json({ error: 'Release version is required.' });
        return;
      }

      const patchFile = files?.['patchFile']?.[0];

      const sessionId = await uploadSession({
        odsBuffer: odsFile.buffer,
        odsFilename: odsFile.originalname,
        patchBuffer: patchFile?.buffer,
        patchFilename: patchFile?.originalname,
        releaseVersion: releaseVersion.trim(),
        robotIdsText: robotIds ?? '',
        notes: notes ?? '',
      });

      res.status(201).json({ data: { id: sessionId } });
    } catch (err) {
      next(err);
    }
  }
);

/** GET /sessions — List all sessions */
router.get('/', async (_req, res, next) => {
  try {
    const sessions = await listSessions();
    res.json({ data: sessions });
  } catch (err) {
    next(err);
  }
});

/** GET /sessions/:id — Get full session with stops */
router.get('/:id', async (req, res, next) => {
  try {
    const session = await getSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ data: session });
  } catch (err) {
    next(err);
  }
});

/** DELETE /sessions/:id — Delete a session */
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await deleteSession(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

export default router;
