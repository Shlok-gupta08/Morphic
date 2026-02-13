import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { exec } from '../utils/exec.js';
import { config } from '../config/index.js';
import { createTempDir, cleanupTempDir, writeTempFile, readTempFile } from '../utils/tempfile.js';

export type ImageFormat = 'png' | 'jpg' | 'jpeg' | 'webp' | 'tiff' | 'avif' | 'gif' | 'bmp' | 'ico' | 'svg';

const SHARP_FORMATS = ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'avif', 'gif'] as const;

// ─── Image Conversion ────────────────────────────────────

export async function convertImage(buffer: Buffer, targetFormat: ImageFormat, opts: {
  width?: number;
  height?: number;
  quality?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
} = {}): Promise<Buffer> {
  const { width, height, quality = 90, fit = 'inside' } = opts;

  // Handle SVG output via ImageMagick
  if (targetFormat === 'svg') {
    return convertWithImageMagick(buffer, 'svg');
  }

  // Handle BMP and ICO via ImageMagick
  if (targetFormat === 'bmp' || targetFormat === 'ico') {
    return convertWithImageMagick(buffer, targetFormat);
  }

  let pipeline = sharp(buffer);

  if (width || height) {
    pipeline = pipeline.resize(width, height, { fit, withoutEnlargement: true });
  }

  const format = targetFormat === 'jpg' ? 'jpeg' : targetFormat;

  switch (format) {
    case 'png':
      pipeline = pipeline.png({ quality });
      break;
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality });
      break;
    case 'tiff':
      pipeline = pipeline.tiff({ quality });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality });
      break;
    case 'gif':
      pipeline = pipeline.gif();
      break;
  }

  const result = await pipeline.toBuffer();
  
  // Validate output
  if (result.length < 10) {
    throw new Error(`Image conversion produced invalid output (${result.length} bytes)`);
  }

  return result;
}

// ─── Image Info ──────────────────────────────────────────

export async function getImageInfo(buffer: Buffer) {
  const meta = await sharp(buffer).metadata();
  return {
    format: meta.format,
    width: meta.width,
    height: meta.height,
    channels: meta.channels,
    space: meta.space,
    depth: meta.depth,
    density: meta.density,
    hasAlpha: meta.hasAlpha,
    size: buffer.length,
  };
}

// ─── Batch Resize ────────────────────────────────────────

export async function resizeImage(buffer: Buffer, width: number, height?: number, opts: {
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  format?: ImageFormat;
  quality?: number;
} = {}): Promise<Buffer> {
  const { fit = 'inside', format, quality = 90 } = opts;
  let pipeline = sharp(buffer).resize(width, height, { fit, withoutEnlargement: true });

  if (format) {
    const f = format === 'jpg' ? 'jpeg' : format;
    if (f === 'png') pipeline = pipeline.png({ quality });
    else if (f === 'jpeg') pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    else if (f === 'webp') pipeline = pipeline.webp({ quality });
    else if (f === 'avif') pipeline = pipeline.avif({ quality });
  }

  return pipeline.toBuffer();
}

// ─── Image Operations ────────────────────────────────────

export async function cropImage(buffer: Buffer, left: number, top: number, width: number, height: number): Promise<Buffer> {
  return sharp(buffer).extract({ left, top, width, height }).toBuffer();
}

export async function rotateImage(buffer: Buffer, angle: number): Promise<Buffer> {
  return sharp(buffer).rotate(angle).toBuffer();
}

export async function flipImage(buffer: Buffer, direction: 'horizontal' | 'vertical'): Promise<Buffer> {
  const pipeline = direction === 'horizontal' ? sharp(buffer).flop() : sharp(buffer).flip();
  return pipeline.toBuffer();
}

export async function adjustImage(buffer: Buffer, opts: {
  brightness?: number;
  saturation?: number;
  contrast?: number;
  grayscale?: boolean;
} = {}): Promise<Buffer> {
  let pipeline = sharp(buffer);

  if (opts.grayscale) {
    pipeline = pipeline.grayscale();
  }

  // Sharp uses linear for brightness/contrast
  if (opts.brightness !== undefined || opts.contrast !== undefined) {
    const a = opts.contrast ?? 1; // multiplier
    const b = opts.brightness ?? 0; // offset
    pipeline = pipeline.linear(a, b);
  }

  if (opts.saturation !== undefined) {
    pipeline = pipeline.modulate({ saturation: opts.saturation });
  }

  return pipeline.toBuffer();
}

// ─── PDF to Images ───────────────────────────────────────

export async function pdfToImages(pdfBuffer: Buffer, format: 'png' | 'jpeg' = 'png', dpi = 150): Promise<Buffer[]> {
  const tmpDir = createTempDir();
  try {
    const input = writeTempFile(tmpDir, 'input.pdf', pdfBuffer);
    const outputPattern = path.join(tmpDir, 'page-%03d.' + format);

    // Use Ghostscript for PDF → images
    const device = format === 'png' ? 'png16m' : 'jpeg';
    const result = await exec(config.bins.ghostscript, [
      '-dNOPAUSE', '-dBATCH', '-dQUIET',
      '-dSAFER',
      `-sDEVICE=${device}`,
      `-r${dpi}`,
      `-sOutputFile=${outputPattern}`,
      input,
    ]);

    if (result.code !== 0) {
      throw new Error(`PDF to image failed: ${result.stderr || 'Ghostscript error'}`);
    }

    // Collect output files
    const files = fs.readdirSync(tmpDir)
      .filter(f => f.startsWith('page-') && f.endsWith('.' + format))
      .sort()
      .map(f => {
        const imgBuffer = readTempFile(path.join(tmpDir, f));
        // Validate each image
        if (imgBuffer.length < 100) {
          throw new Error(`PDF page conversion produced invalid image (${imgBuffer.length} bytes)`);
        }
        return imgBuffer;
      });

    if (files.length === 0) {
      throw new Error('Ghostscript did not produce any output images. The PDF may be invalid or empty.');
    }

    return files;
  } finally {
    cleanupTempDir(tmpDir);
  }
}

// ─── Images to PDF ───────────────────────────────────────

export async function imagesToPdf(imageBuffers: Buffer[]): Promise<Buffer> {
  const { PDFDocument } = await import('pdf-lib');
  const doc = await PDFDocument.create();

  for (const imgBuf of imageBuffers) {
    const meta = await sharp(imgBuf).metadata();
    const pngBuf = await sharp(imgBuf).png().toBuffer();
    const img = await doc.embedPng(pngBuf);

    const page = doc.addPage([meta.width || 612, meta.height || 792]);
    page.drawImage(img, {
      x: 0, y: 0,
      width: page.getWidth(),
      height: page.getHeight(),
    });
  }

  return Buffer.from(await doc.save());
}

// ─── ImageMagick fallback ────────────────────────────────

async function convertWithImageMagick(buffer: Buffer, targetFormat: string): Promise<Buffer> {
  const tmpDir = createTempDir();
  try {
    const input = writeTempFile(tmpDir, 'input', buffer);
    const output = path.join(tmpDir, `output.${targetFormat}`);

    const result = await exec(config.bins.imagemagick, ['convert', input, output]);
    if (result.code !== 0) {
      throw new Error(`ImageMagick convert failed: ${result.stderr || 'Unknown error'}`);
    }
    
    if (!fs.existsSync(output)) {
      throw new Error('ImageMagick did not produce output file');
    }
    
    const outputBuffer = readTempFile(output);
    if (outputBuffer.length < 10) {
      throw new Error(`ImageMagick produced invalid output (${outputBuffer.length} bytes)`);
    }
    
    return outputBuffer;
  } finally {
    cleanupTempDir(tmpDir);
  }
}
