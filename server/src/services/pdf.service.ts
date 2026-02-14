import { PDFDocument, degrees, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { exec } from '../utils/exec.js';
import { config } from '../config/index.js';
import { createTempDir, cleanupTempDir, writeTempFile, readTempFile } from '../utils/tempfile.js';

// ─── Merge ───────────────────────────────────────────────

export async function mergePdfs(buffers: Buffer[]): Promise<Buffer> {
  const merged = await PDFDocument.create();
  for (const buf of buffers) {
    const src = await PDFDocument.load(buf);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }
  return Buffer.from(await merged.save());
}

// ─── Split ───────────────────────────────────────────────

export async function splitPdf(buffer: Buffer, ranges: string): Promise<Buffer[]> {
  const src = await PDFDocument.load(buffer);
  const total = src.getPageCount();
  const parsedRanges = parseRanges(ranges, total);
  const results: Buffer[] = [];

  for (const range of parsedRanges) {
    const doc = await PDFDocument.create();
    const indices = range.map(i => i - 1); // 0-indexed
    const pages = await doc.copyPages(src, indices);
    pages.forEach(p => doc.addPage(p));
    results.push(Buffer.from(await doc.save()));
  }
  return results;
}

/** Split every page into its own PDF */
export async function splitPdfAll(buffer: Buffer): Promise<Buffer[]> {
  const src = await PDFDocument.load(buffer);
  const results: Buffer[] = [];
  for (let i = 0; i < src.getPageCount(); i++) {
    const doc = await PDFDocument.create();
    const [page] = await doc.copyPages(src, [i]);
    doc.addPage(page);
    results.push(Buffer.from(await doc.save()));
  }
  return results;
}

// ─── Extract Pages ───────────────────────────────────────

export async function extractPages(buffer: Buffer, pages: number[]): Promise<Buffer> {
  const src = await PDFDocument.load(buffer);
  const doc = await PDFDocument.create();
  const indices = pages.map(p => p - 1);
  const copied = await doc.copyPages(src, indices);
  copied.forEach(p => doc.addPage(p));
  return Buffer.from(await doc.save());
}

// ─── Remove Pages ────────────────────────────────────────

export async function removePages(buffer: Buffer, pagesToRemove: number[]): Promise<Buffer> {
  const src = await PDFDocument.load(buffer);
  const total = src.getPageCount();
  const keep = Array.from({ length: total }, (_, i) => i + 1)
    .filter(p => !pagesToRemove.includes(p));
  return extractPages(buffer, keep);
}

// ─── Rotate ──────────────────────────────────────────────

export async function rotatePdf(buffer: Buffer, angle: number, pages?: number[]): Promise<Buffer> {
  const doc = await PDFDocument.load(buffer);
  const targets = pages || Array.from({ length: doc.getPageCount() }, (_, i) => i + 1);
  for (const p of targets) {
    const page = doc.getPage(p - 1);
    const current = page.getRotation().angle;
    page.setRotation(degrees(current + angle));
  }
  return Buffer.from(await doc.save());
}

// ─── Add Page Numbers ────────────────────────────────────

export async function addPageNumbers(buffer: Buffer, opts: {
  position?: 'bottom-center' | 'bottom-right' | 'bottom-left';
  startFrom?: number;
  fontSize?: number;
} = {}): Promise<Buffer> {
  const { position = 'bottom-center', startFrom = 1, fontSize = 12 } = opts;
  const doc = await PDFDocument.load(buffer);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const num = String(startFrom + i);
    const { width } = page.getSize();
    const textWidth = font.widthOfTextAtSize(num, fontSize);

    let x: number;
    if (position === 'bottom-center') x = (width - textWidth) / 2;
    else if (position === 'bottom-right') x = width - textWidth - 40;
    else x = 40;

    page.drawText(num, { x, y: 30, size: fontSize, font, color: rgb(0, 0, 0) });
  }
  return Buffer.from(await doc.save());
}

// ─── Watermark ───────────────────────────────────────────

export async function addWatermark(buffer: Buffer, text: string, opts: {
  fontSize?: number;
  opacity?: number;
  rotation?: number;
} = {}): Promise<Buffer> {
  const { fontSize = 48, opacity = 0.15, rotation = -45 } = opts;
  const doc = await PDFDocument.load(buffer);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity,
      rotate: degrees(rotation),
    });
  }
  return Buffer.from(await doc.save());
}

// ─── Metadata ────────────────────────────────────────────

export async function getMetadata(buffer: Buffer) {
  const doc = await PDFDocument.load(buffer);
  return {
    title: doc.getTitle() || null,
    author: doc.getAuthor() || null,
    subject: doc.getSubject() || null,
    creator: doc.getCreator() || null,
    producer: doc.getProducer() || null,
    creationDate: doc.getCreationDate()?.toISOString() || null,
    modificationDate: doc.getModificationDate()?.toISOString() || null,
    pageCount: doc.getPageCount(),
    pages: doc.getPages().map((p, i) => ({
      number: i + 1,
      width: Math.round(p.getSize().width),
      height: Math.round(p.getSize().height),
    })),
  };
}

export async function setMetadata(buffer: Buffer, meta: {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
}): Promise<Buffer> {
  const doc = await PDFDocument.load(buffer);
  if (meta.title) doc.setTitle(meta.title);
  if (meta.author) doc.setAuthor(meta.author);
  if (meta.subject) doc.setSubject(meta.subject);
  if (meta.creator) doc.setCreator(meta.creator);
  return Buffer.from(await doc.save());
}

// ─── Flatten ─────────────────────────────────────────────

export async function flattenPdf(buffer: Buffer): Promise<Buffer> {
  const doc = await PDFDocument.load(buffer);
  const form = doc.getForm();
  try {
    form.flatten();
  } catch {
    // No form fields — already flat
  }
  return Buffer.from(await doc.save());
}

// ─── Compress (via Ghostscript) ──────────────────────────

export async function compressPdf(buffer: Buffer, quality: 'screen' | 'ebook' | 'printer' | 'prepress' = 'ebook'): Promise<Buffer> {
  const tmpDir = createTempDir();
  try {
    const input = writeTempFile(tmpDir, 'input.pdf', buffer);
    const output = path.join(tmpDir, 'output.pdf');

    const result = await exec(config.bins.ghostscript, [
      '-sDEVICE=pdfwrite',
      `-dPDFSETTINGS=/${quality}`,
      '-dNOPAUSE', '-dBATCH', '-dQUIET',
      `-sOutputFile=${output}`,
      input,
    ]);

    if (result.code !== 0 || !fs.existsSync(output)) {
      throw new Error(`Ghostscript compression failed: ${result.stderr}`);
    }
    return readTempFile(output);
  } finally {
    cleanupTempDir(tmpDir);
  }
}

// ─── Repair (via QPDF) ──────────────────────────────────

export async function repairPdf(buffer: Buffer): Promise<Buffer> {
  const tmpDir = createTempDir();
  try {
    const input = writeTempFile(tmpDir, 'input.pdf', buffer);
    const output = path.join(tmpDir, 'output.pdf');

    const result = await exec(config.bins.qpdf, [
      '--replace-input', input,
    ]);

    // qpdf replaces in-place, so re-read
    if (fs.existsSync(input)) {
      return readTempFile(input);
    }

    // fallback: try linearize approach
    const result2 = await exec(config.bins.qpdf, [
      '--linearize', input, output,
    ]);
    // QPDF exit codes: 0=success, 2=error, 3=warnings (but succeeded)
    if (result2.code !== 0 && result2.code !== 3) throw new Error(`QPDF repair failed: ${result2.stderr}`);
    return readTempFile(output);
  } finally {
    cleanupTempDir(tmpDir);
  }
}

// ─── Password Protection ─────────────────────────────────

export async function addPassword(buffer: Buffer, userPassword: string, ownerPassword?: string): Promise<Buffer> {
  const tmpDir = createTempDir();
  try {
    const input = writeTempFile(tmpDir, 'input.pdf', buffer);
    const output = path.join(tmpDir, 'output.pdf');

    // QPDF encrypt syntax: qpdf input output --encrypt user owner keylen --
    const args = [
      input,
      output,
      '--encrypt',
      userPassword,
      ownerPassword || userPassword,
      '256',
      '--',
    ];

    const result = await exec(config.bins.qpdf, args);
    // QPDF exit codes: 0=success, 2=error, 3=warnings (but succeeded)
    if (result.code !== 0 && result.code !== 3) {
      // Try alternative arg order for older QPDF versions
      const altArgs = [
        '--encrypt', userPassword, ownerPassword || userPassword, '256', '--',
        input, output,
      ];
      const altResult = await exec(config.bins.qpdf, altArgs);
      if (altResult.code !== 0 && altResult.code !== 3) {
        throw new Error(`QPDF encrypt failed: ${altResult.stderr || result.stderr}`);
      }
    }

    if (!fs.existsSync(output)) {
      throw new Error('QPDF did not produce output file');
    }
    return readTempFile(output);
  } finally {
    cleanupTempDir(tmpDir);
  }
}

export async function removePassword(buffer: Buffer, password: string): Promise<Buffer> {
  const tmpDir = createTempDir();
  try {
    const input = writeTempFile(tmpDir, 'input.pdf', buffer);
    const output = path.join(tmpDir, 'output.pdf');

    // Try with --password= flag first
    const args = [
      `--password=${password}`,
      '--decrypt',
      input,
      output,
    ];

    const result = await exec(config.bins.qpdf, args);
    // QPDF exit codes: 0=success, 2=error, 3=warnings (but succeeded)
    if (result.code !== 0 && result.code !== 3) {
      // Try alternative: just copy with password to remove restrictions
      const altArgs = [
        `--password=${password}`,
        '--replace-input',
        input,
      ];
      const altResult = await exec(config.bins.qpdf, altArgs);
      if (altResult.code !== 0 && altResult.code !== 3) {
        throw new Error(
          `QPDF decrypt failed. Is the password correct? Error: ${altResult.stderr || result.stderr}`
        );
      }
      return readTempFile(input);
    }

    if (!fs.existsSync(output)) {
      throw new Error('QPDF did not produce output file');
    }
    return readTempFile(output);
  } finally {
    cleanupTempDir(tmpDir);
  }
}

// ─── Edit PDF (add text overlay) ─────────────────────────

export async function editPdf(buffer: Buffer, edits: Array<{
  text: string;
  page: number;
  x: number;
  y: number;
  fontSize?: number;
  color?: { r: number; g: number; b: number };
}>): Promise<Buffer> {
  const doc = await PDFDocument.load(buffer);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();

  for (const edit of edits) {
    const pageIndex = Math.max(0, Math.min(edit.page - 1, pages.length - 1));
    const page = pages[pageIndex];
    const { r, g, b } = edit.color || { r: 0, g: 0, b: 0 };

    page.drawText(edit.text, {
      x: edit.x || 50,
      y: edit.y || 50,
      size: edit.fontSize || 12,
      font,
      color: rgb(r / 255, g / 255, b / 255),
    });
  }
  return Buffer.from(await doc.save());
}

// ─── Helpers ─────────────────────────────────────────────

function parseRanges(input: string, total: number): number[][] {
  // Format: "1-3,5,7-9" → [[1,2,3],[5],[7,8,9]]
  // Or "1-3;5-7" to split into separate PDFs per range
  const groups = input.split(';').map(g => g.trim());
  return groups.map(group => {
    const pages: number[] = [];
    const parts = group.split(',').map(s => s.trim());
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        for (let i = Math.max(1, start); i <= Math.min(total, end); i++) {
          pages.push(i);
        }
      } else {
        const n = Number(part);
        if (n >= 1 && n <= total) pages.push(n);
      }
    }
    return pages;
  }).filter(g => g.length > 0);
}
