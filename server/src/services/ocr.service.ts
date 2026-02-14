import Tesseract from 'tesseract.js';
import path from 'path';
import fs from 'fs';
import { exec } from '../utils/exec.js';
import { config } from '../config/index.js';
import { createTempDir, cleanupTempDir, writeTempFile, readTempFile } from '../utils/tempfile.js';
import { PDFDocument } from 'pdf-lib';

// ─── OCR Image → Text ────────────────────────────────────
// Uses native Tesseract binary (faster, more reliable) with Tesseract.js fallback

export async function ocrImage(imageBuffer: Buffer, lang = 'eng'): Promise<string> {
  const tmpDir = createTempDir();
  try {
    // Determine file extension from buffer magic bytes
    const ext = getImageExtension(imageBuffer);
    
    // Reject PDF files - they should use the PDF OCR endpoint
    if (ext === 'pdf') {
      throw new Error('PDF files should use the "Create Searchable PDF" mode, not "Extract Text"');
    }
    
    const inputPath = writeTempFile(tmpDir, `input.${ext}`, imageBuffer);
    const outputBase = path.join(tmpDir, 'output');

    // Try native Tesseract first (if available)
    if (config.bins.tesseract) {
      try {
        const result = await exec(config.bins.tesseract, [
          inputPath,
          outputBase,
          '-l', lang,
        ], { timeoutMs: 60 * 1000 });

        if (result.code === 0 && fs.existsSync(`${outputBase}.txt`)) {
          return fs.readFileSync(`${outputBase}.txt`, 'utf-8').trim();
        }
      } catch {
        // Native Tesseract failed, try Tesseract.js
      }
    }

    // Fallback to Tesseract.js (wrapped in try-catch to prevent crashes)
    try {
      const { data: { text } } = await Tesseract.recognize(imageBuffer, lang, {
        logger: () => {},
      });
      return text;
    } catch (jsErr: any) {
      throw new Error(`OCR failed: ${jsErr.message || 'Could not read image'}`);
    }
  } finally {
    cleanupTempDir(tmpDir);
  }
}

function getImageExtension(buffer: Buffer): string {
  // Check magic bytes
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'jpg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'gif';
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'webp';
  if (buffer[0] === 0x42 && buffer[1] === 0x4D) return 'bmp';
  // Check for PDF magic bytes (%PDF)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return 'pdf';
  return 'png'; // Default
}

// ─── OCR PDF → Searchable PDF ────────────────────────────

export async function ocrPdf(pdfBuffer: Buffer, lang = 'eng'): Promise<Buffer> {
  const tmpDir = createTempDir();
  try {
    const input = writeTempFile(tmpDir, 'input.pdf', pdfBuffer);
    const output = path.join(tmpDir, 'output.pdf');

    // First try ocrmypdf if available
    try {
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
    } catch {
      // ocrmypdf not available, continue to fallback
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

    // Step 3: OCR each page image with native Tesseract (or Tesseract.js fallback)
    const ocrResults: Array<{ text: string; width: number; height: number }> = [];
    for (const pageFile of pageFiles) {
      const imgPath = path.join(imagesDir, pageFile);
      let text = '';
      
      // Try native Tesseract first
      if (config.bins.tesseract) {
        try {
          const outputBase = path.join(imagesDir, `${pageFile}-out`);
          const result = await exec(config.bins.tesseract, [
            imgPath,
            outputBase,
            '-l', lang,
          ], { timeoutMs: 60 * 1000 });
          
          if (result.code === 0 && fs.existsSync(`${outputBase}.txt`)) {
            text = fs.readFileSync(`${outputBase}.txt`, 'utf-8').trim();
          }
        } catch {
          // Native Tesseract failed, try Tesseract.js
        }
      }
      
      // Fallback to Tesseract.js if native failed
      if (!text) {
        try {
          const imgBuffer = fs.readFileSync(imgPath);
          const { data } = await Tesseract.recognize(imgBuffer, lang, {
            logger: () => {},
          });
          text = data.text;
        } catch {
          // Both failed, use empty string
        }
      }
      
      ocrResults.push({
        text,
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
  const tmpDir = createTempDir();
  try {
    const ext = getImageExtension(imageBuffer);
    
    // Reject PDF files
    if (ext === 'pdf') {
      throw new Error('PDF files should use the "Create Searchable PDF" mode, not "Extract Text"');
    }
    
    const inputPath = writeTempFile(tmpDir, `input.${ext}`, imageBuffer);
    const outputBase = path.join(tmpDir, 'output');

    // Try native Tesseract first
    if (config.bins.tesseract) {
      try {
        const result = await exec(config.bins.tesseract, [
          inputPath,
          outputBase,
          '-l', lang,
        ], { timeoutMs: 60 * 1000 });

        if (result.code === 0 && fs.existsSync(`${outputBase}.txt`)) {
          const text = fs.readFileSync(`${outputBase}.txt`, 'utf-8').trim();
          return {
            text,
            confidence: 0, // Native Tesseract doesn't provide confidence in basic mode
            words: [],
          };
        }
      } catch {
        // Native Tesseract failed, try Tesseract.js
      }
    }

    // Fallback to Tesseract.js (wrapped in try-catch to prevent crashes)
    try {
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
    } catch (jsErr: any) {
      throw new Error(`OCR failed: ${jsErr.message || 'Could not read image'}`);
    }
  } finally {
    cleanupTempDir(tmpDir);
  }
}
