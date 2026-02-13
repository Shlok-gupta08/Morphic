import { Router, Request, Response } from 'express';
import { splitPdf, splitPdfAll } from '../services/pdf.service.js';
import archiver from 'archiver';
import { Readable } from 'stream';

const router = Router();

/**
 * POST /api/split
 * Body: file (PDF), ranges (string like "1-3;4-6" or "all")
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'PDF file required' });
      return;
    }

    const ranges = req.body.ranges as string;
    let results: Buffer[];

    if (!ranges || ranges === 'all') {
      results = await splitPdfAll(file.buffer);
    } else {
      results = await splitPdf(file.buffer, ranges);
    }

    if (results.length === 1) {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="split.pdf"',
      });
      res.send(results[0]);
      return;
    }

    // Multiple results → ZIP
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="split-pages.zip"',
    });

    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.pipe(res);

    results.forEach((buf, i) => {
      archive.append(buf, { name: `page-${i + 1}.pdf` });
    });

    await archive.finalize();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
