import path from 'path';
import fs from 'fs';
import { exec } from '../utils/exec.js';
import { config } from '../config/index.js';
import { createTempDir, cleanupTempDir, writeTempFile, readTempFile } from '../utils/tempfile.js';

// ─── Document → PDF (LibreOffice) ────────────────────────

const OFFICE_EXTENSIONS = [
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'odt', 'ods', 'odp', 'odg',
  'rtf', 'txt', 'csv', 'html', 'htm',
  'wpd', 'wps', 'xml',
];

export function isOfficeFormat(ext: string): boolean {
  return OFFICE_EXTENSIONS.includes(ext.toLowerCase().replace('.', ''));
}

export async function officeToPdf(buffer: Buffer, inputFilename: string): Promise<Buffer> {
  const tmpDir = createTempDir();
  try {
    const input = writeTempFile(tmpDir, inputFilename, buffer);

    // Use a unique user profile to avoid LibreOffice lock conflicts,
    // and embed fonts in the PDF output for better fidelity
    const userProfile = path.join(tmpDir, 'lo_profile');
    fs.mkdirSync(userProfile, { recursive: true });

    // First try standard PDF export with embedded fonts (most compatible)
    const result = await exec(config.bins.libreoffice, [
      '--headless',
      '--norestore',
      '--nofirststartwizard',
      `-env:UserInstallation=file:///${userProfile.replace(/\\/g, '/')}`,
      '--convert-to', 'pdf',
      '--outdir', tmpDir,
      input,
    ], { timeoutMs: 120_000 });

    const pdfName = path.basename(inputFilename, path.extname(inputFilename)) + '.pdf';
    let outputPath = path.join(tmpDir, pdfName);

    if (result.code !== 0 || !fs.existsSync(outputPath)) {
      throw new Error(`LibreOffice conversion failed: ${result.stderr || 'Unknown error'}`);
    }

    // Verify the PDF is valid (at least starts with %PDF)
    const pdfBuffer = readTempFile(outputPath);
    if (pdfBuffer.length < 10 || !pdfBuffer.slice(0, 5).toString('ascii').includes('%PDF')) {
      throw new Error('LibreOffice produced an invalid PDF file');
    }

    return pdfBuffer;
  } finally {
    cleanupTempDir(tmpDir);
  }
}

// ─── PDF → Office Format (LibreOffice) ──────────────────

export async function pdfToOffice(buffer: Buffer, targetFormat: string): Promise<Buffer> {
  const tmpDir = createTempDir();
  try {
    const input = writeTempFile(tmpDir, 'input.pdf', buffer);
    const userProfile = path.join(tmpDir, 'lo_profile');
    fs.mkdirSync(userProfile, { recursive: true });

    // Map common names to LibreOffice filter names
    const formatMap: Record<string, string> = {
      'docx': 'docx',
      'doc': 'doc',
      'xlsx': 'xlsx',
      'xls': 'xls',
      'pptx': 'pptx',
      'ppt': 'ppt',
      'odt': 'odt',
      'ods': 'ods',
      'odp': 'odp',
      'rtf': 'rtf',
      'txt': 'txt',
      'html': 'html',
      'csv': 'csv',
    };

    const loFormat = formatMap[targetFormat.toLowerCase()] || targetFormat;

    // NOTE: PDF to editable document conversion is inherently lossy.
    // LibreOffice's PDF import (writer_pdf_import) does its best but
    // fonts may be substituted if not installed on the system.
    const result = await exec(config.bins.libreoffice, [
      '--headless',
      '--norestore',
      '--nofirststartwizard',
      `-env:UserInstallation=file:///${userProfile.replace(/\\/g, '/')}`,
      '--infilter=writer_pdf_import',
      '--convert-to', loFormat,
      '--outdir', tmpDir,
      input,
    ], { timeoutMs: 120_000 });

    if (result.code !== 0) {
      throw new Error(`LibreOffice PDF-to-${targetFormat} failed: ${result.stderr}. Note: PDF to editable format conversion may have limitations with fonts and complex layouts.`);
    }

    // Find the output file
    const outputFile = fs.readdirSync(tmpDir).find(
      f => f.startsWith('input.') && !f.endsWith('.pdf')
    );

    if (!outputFile) {
      throw new Error(`No output file produced for format: ${targetFormat}. This conversion may not be supported.`);
    }

    const outputBuffer = readTempFile(path.join(tmpDir, outputFile));
    
    // Validate the output file has content
    if (outputBuffer.length < 100) {
      throw new Error(`Conversion produced an unusually small file (${outputBuffer.length} bytes). The source PDF may not be convertible to ${targetFormat}.`);
    }

    return outputBuffer;
  } finally {
    cleanupTempDir(tmpDir);
  }
}

// ─── Ebook Conversion (Calibre) ──────────────────────────

const EBOOK_EXTENSIONS = ['epub', 'mobi', 'azw3', 'fb2', 'lit', 'pdb', 'cbz', 'cbr'];

export function isEbookFormat(ext: string): boolean {
  return EBOOK_EXTENSIONS.includes(ext.toLowerCase().replace('.', ''));
}

export async function convertEbook(buffer: Buffer, inputFilename: string, targetFormat: string): Promise<Buffer> {
  const tmpDir = createTempDir();
  try {
    const input = writeTempFile(tmpDir, inputFilename, buffer);
    const outName = path.basename(inputFilename, path.extname(inputFilename)) + '.' + targetFormat;
    const output = path.join(tmpDir, outName);

    const result = await exec(config.bins.calibre, [input, output], { timeoutMs: 120_000 });
    if (result.code !== 0) {
      throw new Error(`Calibre conversion failed: ${result.stderr || 'Unknown error'}. Make sure Calibre is installed.`);
    }
    if (!fs.existsSync(output)) {
      throw new Error('Calibre did not produce output file');
    }

    const outputBuffer = readTempFile(output);
    if (outputBuffer.length < 100) {
      throw new Error(`Calibre produced an unusually small file (${outputBuffer.length} bytes). The ebook may not be convertible.`);
    }

    return outputBuffer;
  } finally {
    cleanupTempDir(tmpDir);
  }
}

// ─── HTML/Markdown → PDF (via LibreOffice) ───────────────

export async function htmlToPdf(buffer: Buffer): Promise<Buffer> {
  return officeToPdf(buffer, 'input.html');
}

export async function markdownToPdf(mdBuffer: Buffer): Promise<Buffer> {
  // Convert markdown to basic HTML first, then to PDF
  const md = mdBuffer.toString('utf-8');
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: Georgia, serif; max-width: 800px; margin: 2em auto; padding: 0 1em; line-height: 1.6; color: #333; }
  h1, h2, h3 { color: #111; } pre { background: #f4f4f4; padding: 1em; overflow-x: auto; border-radius: 4px; }
  code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
  blockquote { border-left: 4px solid #ddd; margin: 1em 0; padding: 0.5em 1em; color: #666; }
</style>
</head><body>${simpleMarkdownToHtml(md)}</body></html>`;

  return officeToPdf(Buffer.from(html, 'utf-8'), 'input.html');
}

/** Minimal markdown → HTML (no external deps) */
function simpleMarkdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}
