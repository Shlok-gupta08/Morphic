import { Router, Request, Response } from 'express';
import { mergePdfs } from '../services/pdf.service.js';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length < 2) {
      res.status(400).json({ error: 'At least 2 PDF files required' });
      return;
    }

    const buffers = files.map(f => f.buffer);
    const result = await mergePdfs(buffers);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="merged.pdf"',
    });
    res.send(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
