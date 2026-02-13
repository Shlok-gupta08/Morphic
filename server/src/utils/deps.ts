import fs from 'fs';
import { config } from '../config/index.js';
import { logger } from './logger.js';

export interface DepStatus {
  name: string;
  available: boolean;
  path: string;
}

/** Check which external binaries are available */
export function checkDependencies(): DepStatus[] {
  const deps: DepStatus[] = [];

  const checks: [string, string][] = [
    ['LibreOffice', config.bins.libreoffice],
    ['FFmpeg', config.bins.ffmpeg],
    ['Ghostscript', config.bins.ghostscript],
    ['Tesseract', config.bins.tesseract],
    ['QPDF', config.bins.qpdf],
    ['Calibre', config.bins.calibre],
    ['ImageMagick', config.bins.imagemagick],
  ];

  for (const [name, binPath] of checks) {
    const available = fs.existsSync(binPath);
    deps.push({ name, available, path: binPath });
    if (available) {
      logger.info(`✓ ${name} found at ${binPath}`);
    } else {
      logger.warn(`✗ ${name} not found (${binPath})`);
    }
  }

  return deps;
}
