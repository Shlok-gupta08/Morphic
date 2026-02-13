import { Router, Request, Response } from 'express';
import { ocrImage, ocrPdf, ocrImageDetailed } from '../services/ocr.service.js';

const router = Router();

// ─── OCR Image → Text ────────────────────────────────────

router.post('/image', async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'Image file required' }); return; }

    const lang = req.body.lang || 'eng';
    const detailed = req.body.detailed === 'true';

    if (detailed) {
      const result = await ocrImageDetailed(file.buffer, lang);
      res.json(result);
    } else {
      const text = await ocrImage(file.buffer, lang);
      res.json({ text });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── OCR PDF → Searchable PDF ────────────────────────────

router.post('/pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'PDF file required' }); return; }

    const lang = req.body.lang || 'eng';
    const result = await ocrPdf(file.buffer, lang);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="ocr-output.pdf"',
    });
    res.send(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
