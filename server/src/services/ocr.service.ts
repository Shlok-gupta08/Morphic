import Tesseract from 'tesseract.js';
import path from 'path';
import fs from 'fs';
import { exec } from '../utils/exec.js';
import { config } from '../config/index.js';
import { createTempDir, cleanupTempDir, writeTempFile, readTempFile } from '../utils/tempfile.js';
import { PDFDocument } from 'pdf-lib';

// ─── OCR Image → Text (Tesseract.js, no binary needed) ──

export async function ocrImage(imageBuffer: Buffer, lang = 'eng'): Promise<string> {
  const { data: { text } } = await Tesseract.recognize(imageBuffer, lang, {
    logger: () => {},
  });
  return text;
}

// ─── OCR PDF → Searchable PDF ────────────────────────────

export async function ocrPdf(pdfBuffer: Buffer, lang = 'eng'): Promise<Buffer> {
  const tmpDir = createTempDir();
  try {
    const input = writeTempFile(tmpDir, 'input.pdf', pdfBuffer);
    const output = path.join(tmpDir, 'output.pdf');

    // First try ocrmypdf if available
    const ocrmypdfResult = await exec('ocrmypdf', [
      '-l', lang,
      '--output-type', 'pdf',
      '--skip-text',
      input,
      output,
    ], { timeoutMs: 5 * 60 * 1000 });

    if (ocrmypdfResult.code === 0 && fs.existsSync(output)) {
      return readTempFile(output);
    }

    // ── Fallback: Ghostscript → images → Tesseract.js → rebuild PDF ──
    // Step 1: Convert PDF pages to images using Ghostscript
    const imagesDir = path.join(tmpDir, 'pages');
    fs.mkdirSync(imagesDir, { recursive: true });

    const gsResult = await exec(config.bins.ghostscript, [
      '-sDEVICE=png16m',
      '-r300',
      '-dNOPAUSE',
      '-dBATCH',
      '-dQUIET',
      `-sOutputFile=${path.join(imagesDir, 'page-%03d.png')}`,
      input,
    ], { timeoutMs: 5 * 60 * 1000 });

    if (gsResult.code !== 0) {
      throw new Error(
        `OCR failed: ocrmypdf is not available and Ghostscript could not convert the PDF to images. ` +
        `Error: ${gsResult.stderr}`
      );
    }

    // Step 2: Gather page images
    const pageFiles = fs.readdirSync(imagesDir)
      .filter(f => f.startsWith('page-') && f.endsWith('.png'))
      .sort();

    if (pageFiles.length === 0) {
      throw new Error('Ghostscript produced no page images from the PDF');
    }

    // Step 3: OCR each page image with Tesseract.js
    const ocrResults: Array<{ text: string; width: number; height: number }> = [];
    for (const pageFile of pageFiles) {
      const imgBuffer = fs.readFileSync(path.join(imagesDir, pageFile));
      const { data } = await Tesseract.recognize(imgBuffer, lang, {
        logger: () => {},
      });
      // Get image dimensions from the recognition data
      ocrResults.push({
        text: data.text,
        width: 612,   // Default US Letter width in points
        height: 792,  // Default US Letter height in points
      });
    }

    // Step 4: Rebuild a text-only PDF with the extracted text
    // Load the original PDF so we preserve layout/images,
    // and use pdf-lib to overlay invisible text
    try {
      const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
      const pages = srcDoc.getPages();

      for (let i = 0; i < Math.min(pages.length, ocrResults.length); i++) {
        const page = pages[i];
        const { text } = ocrResults[i];
        if (!text.trim()) continue;

        // Add invisible text overlay so the PDF becomes searchable
        const { width, height } = page.getSize();
        const fontSize = 1; // Tiny invisible text
        page.drawText(text.substring(0, 5000), {
          x: 0,
          y: height - fontSize,
          size: fontSize,
          opacity: 0, // Invisible — for searchability only
        });
      }

      return Buffer.from(await srcDoc.save());
    } catch {
      // If we can't modify the original, create a new text-only PDF
      const newDoc = await PDFDocument.create();
      for (const { text } of ocrResults) {
        const page = newDoc.addPage([612, 792]);
        if (text.trim()) {
          page.drawText(text.substring(0, 5000), {
            x: 50,
            y: 742,
            size: 10,
            maxWidth: 512,
          });
        }
      }
      return Buffer.from(await newDoc.save());
    }
  } finally {
    cleanupTempDir(tmpDir);
  }
}

// ─── OCR Image → Full Result (with confidence, etc.) ────

export async function ocrImageDetailed(imageBuffer: Buffer, lang = 'eng') {
  const { data } = await Tesseract.recognize(imageBuffer, lang, {
    logger: () => {},
  });

  return {
    text: data.text,
    confidence: data.confidence,
    words: data.words?.map(w => ({
      text: w.text,
      confidence: w.confidence,
      bbox: w.bbox,
    })) || [],
  };
}
