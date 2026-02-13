import path from 'path';
import os from 'os';
import fs from 'fs';

const TMP_BASE = path.join(os.tmpdir(), 'file-converter');
if (!fs.existsSync(TMP_BASE)) fs.mkdirSync(TMP_BASE, { recursive: true });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  uploadLimit: '500mb',
  tmpDir: TMP_BASE,
  
  // External binary paths (auto-detected or overridden via env)
  bins: {
    libreoffice: process.env.LIBREOFFICE_PATH || findBin('soffice', [
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      '/usr/bin/soffice',
      '/usr/bin/libreoffice',
    ]),
    ffmpeg: process.env.FFMPEG_PATH || findBin('ffmpeg', [
      'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
      '/usr/bin/ffmpeg',
    ]),
    ghostscript: process.env.GS_PATH || findBin('gswin64c', [
      ...findGhostscriptWindows(),
      '/usr/bin/gs',
    ]),
    tesseract: process.env.TESSERACT_PATH || findBin('tesseract', [
      'C:\\Program Files\\Tesseract-OCR\\tesseract.exe',
      '/usr/bin/tesseract',
    ]),
    qpdf: process.env.QPDF_PATH || findBin('qpdf', [
      ...findQpdfWindows(),
      'C:\\Program Files\\qpdf\\bin\\qpdf.exe',
      '/usr/bin/qpdf',
    ]),
    calibre: process.env.CALIBRE_PATH || findBin('ebook-convert', [
      'C:\\Program Files\\Calibre2\\ebook-convert.exe',
      'C:\\Program Files (x86)\\Calibre2\\ebook-convert.exe',
      '/usr/bin/ebook-convert',
    ]),
    imagemagick: process.env.MAGICK_PATH || findBin('magick', [
      ...findImageMagickWindows(),
      '/usr/bin/convert',
    ]),
  },
};

function findBin(name: string, candidates: string[]): string {
  // Check PATH first
  const pathDirs = (process.env.PATH || '').split(path.delimiter);
  const ext = process.platform === 'win32' ? '.exe' : '';
  for (const dir of pathDirs) {
    const full = path.join(dir, name + ext);
    if (fs.existsSync(full)) return full;
    // Also check without ext on Windows (e.g. batch files)
    if (ext && fs.existsSync(path.join(dir, name))) return path.join(dir, name);
  }
  // Check known candidate paths
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return name; // fallback to just the command name
}

function findGhostscriptWindows(): string[] {
  const gsBase = 'C:\\Program Files\\gs';
  if (!fs.existsSync(gsBase)) return [];
  try {
    const dirs = fs.readdirSync(gsBase);
    return dirs.map(d => path.join(gsBase, d, 'bin', 'gswin64c.exe'));
  } catch {
    return [];
  }
}

function findQpdfWindows(): string[] {
  const pfDir = 'C:\\Program Files';
  try {
    return fs.readdirSync(pfDir)
      .filter(d => d.toLowerCase().startsWith('qpdf'))
      .map(d => path.join(pfDir, d, 'bin', 'qpdf.exe'));
  } catch {
    return [];
  }
}

function findImageMagickWindows(): string[] {
  const pfDir = 'C:\\Program Files';
  try {
    return fs.readdirSync(pfDir)
      .filter(d => d.toLowerCase().startsWith('imagemagick'))
      .map(d => path.join(pfDir, d, 'magick.exe'));
  } catch {
    return [];
  }
}
