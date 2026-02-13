import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { checkDependencies } from './utils/deps.js';
import { startTempCleanup } from './utils/tempfile.js';

import mergeRoutes from './routes/merge.js';
import splitRoutes from './routes/split.js';
import convertRoutes from './routes/convert.js';
import pdfRoutes from './routes/pdf.js';
import ocrRoutes from './routes/ocr.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ─── Middleware ───────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: config.uploadLimit }));
app.use(express.urlencoded({ extended: true, limit: config.uploadLimit }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// ─── API Routes ──────────────────────────────────────────

app.use('/api/merge', upload.array('files', 100), mergeRoutes);
app.use('/api/split', upload.single('file'), splitRoutes);
app.use('/api/convert', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'files', maxCount: 100 }]), convertRoutes);
app.use('/api/pdf', upload.single('file'), pdfRoutes);
app.use('/api/ocr', upload.single('file'), ocrRoutes);

// ─── Health & Info ───────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/deps', (_req, res) => {
  const deps = checkDependencies();
  res.json({ dependencies: deps });
});

// ─── Serve React Frontend (production) ───────────────────

const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  logger.info('Serving frontend from client/dist');
}

// ─── Start ───────────────────────────────────────────────

app.listen(config.port, () => {
  logger.info(`╔══════════════════════════════════════════╗`);
  logger.info(`║  File Converter running on port ${config.port}      ║`);
  logger.info(`║  http://localhost:${config.port}                  ║`);
  logger.info(`╚══════════════════════════════════════════╝`);

  // Check dependencies
  logger.info('Checking external dependencies...');
  checkDependencies();

  // Start temp file cleanup
  startTempCleanup();
});

export default app;
