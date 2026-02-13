import { Router, Request, Response } from 'express';
import {
  compressPdf,
  repairPdf,
  flattenPdf,
  rotatePdf,
  extractPages,
  removePages,
  addPageNumbers,
  addWatermark,
  getMetadata,
  setMetadata,
  addPassword,
  removePassword,
  editPdf,
} from '../services/pdf.service.js';

const router = Router();

// ─── Compress ────────────────────────────────────────────

router.post('/compress', async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'PDF file required' }); return; }

    const quality = (req.body.quality || 'ebook') as 'screen' | 'ebook' | 'printer' | 'prepress';
    const result = await compressPdf(file.buffer, quality);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="compressed.pdf"',
      'X-Original-Size': String(file.size),
      'X-Compressed-Size': String(result.length),
    });
    res.send(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Repair ──────────────────────────────────────────────

router.post('/repair', async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'PDF file required' }); return; }

    const result = await repairPdf(file.buffer);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="repaired.pdf"',
    });
    res.send(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Flatten ─────────────────────────────────────────────

router.post('/flatten', async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'PDF file required' }); return; }

    const result = await flattenPdf(file.buffer);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="flattened.pdf"',
    });
    res.send(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Rotate ──────────────────────────────────────────────

router.post('/rotate', async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'PDF file required' }); return; }

    const angle = parseInt(req.body.angle) || 90;
    const pages = req.body.pages ? JSON.parse(req.body.pages) : undefined;
    const result = await rotatePdf(file.buffer, angle, pages);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="rotated.pdf"',
    });
    res.send(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Extract Pages ───────────────────────────────────────

router.post('/extract-pages', async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'PDF file required' }); return; }

    const pages = JSON.parse(req.body.pages || '[]') as number[];
    if (pages.length === 0) { res.status(400).json({ error: 'Pages array required' }); return; }

    const result = await extractPages(file.buffer, pages);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="extracted.pdf"',
    });
    res.send(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Remove Pages ────────────────────────────────────────

router.post('/remove-pages', async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'PDF file required' }); return; }

    let pages: number[];
    const raw = req.body.pages || '';
    try {
      // Try parsing as JSON array first
      pages = JSON.parse(raw);
    } catch {
      // Parse as comma-separated string: "1,2,5,7"
      pages = raw.split(',').map((s: string) => parseInt(s.trim(), 10)).filter((n: number) => !isNaN(n) && n >= 1);
    }
    if (pages.length === 0) { res.status(400).json({ error: 'Pages required (e.g. "1,2,5" or "[1,2,5]")' }); return; }

    const result = await removePages(file.buffer, pages);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="modified.pdf"',
    });
    res.send(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Page Numbers ────────────────────────────────────────

router.post('/page-numbers', async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'PDF file required' }); return; }

    const result = await addPageNumbers(file.buffer, {
      position: req.body.position || 'bottom-center',
      startFrom: parseInt(req.body.startFrom) || 1,
      fontSize: parseInt(req.body.fontSize) || 12,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="numbered.pdf"',
    });
    res.send(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Watermark ───────────────────────────────────────────

router.post('/watermark', async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'PDF file required' }); return; }

    const text = req.body.text || 'WATERMARK';
    const result = await addWatermark(file.buffer, text, {
      fontSize: parseInt(req.body.fontSize) || 48,
      opacity: parseFloat(req.body.opacity) || 0.15,
      rotation: parseInt(req.body.rotation) || -45,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="watermarked.pdf"',
    });
    res.send(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Metadata ────────────────────────────────────────────

router.post('/metadata', async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'PDF file required' }); return; }

    const info = await getMetadata(file.buffer);
    res.json(info);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/metadata/update', async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'PDF file required' }); return; }

    const result = await setMetadata(file.buffer, {
      title: req.body.title,
      author: req.body.author,
      subject: req.body.subject,
      creator: req.body.creator,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="updated-metadata.pdf"',
    });
    res.send(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Password ────────────────────────────────────────────

router.post('/add-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'PDF file required' }); return; }

    const password = req.body.password;
    if (!password) { res.status(400).json({ error: 'Password required' }); return; }

    const result = await addPassword(file.buffer, password, req.body.ownerPassword);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="protected.pdf"',
    });
    res.send(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/remove-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'PDF file required' }); return; }

    const password = req.body.password;
    if (!password) { res.status(400).json({ error: 'Password required' }); return; }

    const result = await removePassword(file.buffer, password);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="unlocked.pdf"',
    });
    res.send(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Edit PDF (add text annotations) ─────────────────────

router.post('/edit', async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'PDF file required' }); return; }

    let edits: Array<{
      text: string;
      page: number;
      x: number;
      y: number;
      fontSize?: number;
      color?: { r: number; g: number; b: number };
    }>;

    try {
      edits = JSON.parse(req.body.edits || '[]');
    } catch {
      // Handle single edit from form data
      edits = [{
        text: req.body.text || '',
        page: parseInt(req.body.page) || 1,
        x: parseFloat(req.body.x) || 50,
        y: parseFloat(req.body.y) || 50,
        fontSize: parseInt(req.body.fontSize) || 12,
      }];
    }

    if (edits.length === 0 || !edits[0].text) {
      res.status(400).json({ error: 'At least one text edit is required' });
      return;
    }

    const result = await editPdf(file.buffer, edits);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="edited.pdf"',
    });
    res.send(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
