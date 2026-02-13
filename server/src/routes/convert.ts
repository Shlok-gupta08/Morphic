import { Router, Request, Response } from 'express';
import { convertImage, getImageInfo, resizeImage, cropImage, rotateImage, flipImage, adjustImage, pdfToImages, imagesToPdf } from '../services/image.service.js';
import { convertVideo, extractAudio, getMediaInfo, compressVideo, isVideoFormat, isAudioFormat } from '../services/video.service.js';
import { officeToPdf, pdfToOffice, isOfficeFormat, convertEbook, isEbookFormat, htmlToPdf, markdownToPdf } from '../services/document.service.js';
import path from 'path';
import archiver from 'archiver';

const router = Router();

// ─── Universal Convert Endpoint ──────────────────────────

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // Handle both upload.single and upload.fields
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const file = files?.file?.[0] || (req as any).file;
    
    if (!file) {
      res.status(400).json({ error: 'File required' });
      return;
    }

    const targetFormat = (req.body.format || req.body.targetFormat || '').toLowerCase().trim();
    if (!targetFormat) {
      res.status(400).json({ error: 'Target format required (e.g. "pdf", "png", "mp4")' });
      return;
    }

    const inputExt = path.extname(file.originalname).slice(1).toLowerCase();
    const baseName = path.basename(file.originalname, path.extname(file.originalname));
    const outputName = `${baseName}.${targetFormat}`;

    let result: Buffer;

    // ── Route to appropriate converter ──

    // Office → PDF
    if (isOfficeFormat(inputExt) && targetFormat === 'pdf') {
      result = await officeToPdf(file.buffer, file.originalname);
    }
    // PDF → Office format
    else if (inputExt === 'pdf' && isOfficeFormat(targetFormat)) {
      result = await pdfToOffice(file.buffer, targetFormat);
    }
    // PDF → Images
    else if (inputExt === 'pdf' && isImageFormat(targetFormat)) {
      const format = (targetFormat === 'jpg' || targetFormat === 'jpeg') ? 'jpeg' : 'png';
      const images = await pdfToImages(file.buffer, format as 'png' | 'jpeg');

      if (images.length === 1) {
        result = images[0];
      } else {
        // Multiple pages → ZIP
        res.set({
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${baseName}-images.zip"`,
        });
        const archive = archiver('zip', { zlib: { level: 5 } });
        archive.pipe(res);
        images.forEach((buf, i) => {
          archive.append(buf, { name: `${baseName}-page-${i + 1}.${targetFormat}` });
        });
        await archive.finalize();
        return;
      }
    }
    // Images → PDF
    else if (isImageFormat(inputExt) && targetFormat === 'pdf') {
      result = await imagesToPdf([file.buffer]);
    }
    // Image → Image
    else if (isImageFormat(inputExt) && isImageFormat(targetFormat)) {
      const quality = parseInt(req.body.quality) || 90;
      const width = req.body.width ? parseInt(req.body.width) : undefined;
      const height = req.body.height ? parseInt(req.body.height) : undefined;
      result = await convertImage(file.buffer, targetFormat as any, { quality, width, height });
    }
    // Video/Audio conversion
    else if ((isVideoFormat(inputExt) || isAudioFormat(inputExt)) &&
             (isVideoFormat(targetFormat) || isAudioFormat(targetFormat))) {
      result = await convertVideo(file.buffer, file.originalname, targetFormat as any, {
        resolution: req.body.resolution,
        bitrate: req.body.bitrate,
        fps: req.body.fps ? parseInt(req.body.fps) : undefined,
        crf: req.body.quality ? parseInt(req.body.quality) : undefined,
        audioOnly: isAudioFormat(targetFormat),
      });
    }
    // Ebook conversion
    else if (isEbookFormat(inputExt) && (targetFormat === 'pdf' || isEbookFormat(targetFormat))) {
      result = await convertEbook(file.buffer, file.originalname, targetFormat);
    }
    else if (inputExt === 'pdf' && isEbookFormat(targetFormat)) {
      result = await convertEbook(file.buffer, file.originalname, targetFormat);
    }
    // HTML → PDF
    else if ((inputExt === 'html' || inputExt === 'htm') && targetFormat === 'pdf') {
      result = await htmlToPdf(file.buffer);
    }
    // Markdown → PDF
    else if (inputExt === 'md' && targetFormat === 'pdf') {
      result = await markdownToPdf(file.buffer);
    }
    // Fallback: try LibreOffice for anything → PDF
    else if (targetFormat === 'pdf') {
      result = await officeToPdf(file.buffer, file.originalname);
    }
    else {
      res.status(400).json({
        error: `Conversion from .${inputExt} to .${targetFormat} is not supported`,
        supported: getSupportedConversions(),
      });
      return;
    }

    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      webp: 'image/webp', tiff: 'image/tiff', avif: 'image/avif',
      gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml',
      mp4: 'video/mp4', avi: 'video/x-msvideo', mkv: 'video/x-matroska',
      webm: 'video/webm', mov: 'video/quicktime',
      mp3: 'audio/mpeg', wav: 'audio/wav', aac: 'audio/aac',
      ogg: 'audio/ogg', flac: 'audio/flac',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain', html: 'text/html', csv: 'text/csv',
      epub: 'application/epub+zip',
    };

    res.set({
      'Content-Type': mimeMap[targetFormat] || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${outputName}"`,
    });
    res.send(result);
  } catch (err: any) {
    // Enhanced error messages for common failures
    const msg = err.message || 'Unknown conversion error';
    let hint = '';

    if (msg.includes('LibreOffice') || msg.includes('libreoffice')) {
      hint = ' Make sure LibreOffice is installed and accessible.';
    } else if (msg.includes('ffmpeg') || msg.includes('FFmpeg')) {
      hint = ' Make sure FFmpeg is installed and accessible.';
    } else if (msg.includes('Ghostscript') || msg.includes('gs')) {
      hint = ' Make sure Ghostscript is installed.';
    } else if (msg.includes('Calibre') || msg.includes('calibre')) {
      hint = ' Make sure Calibre is installed.';
    } else if (msg.includes('ENOENT') || msg.includes('spawn')) {
      hint = ' A required tool is not installed or not found in PATH.';
    }

    res.status(500).json({ error: msg + hint });
  }
});

// ─── Image Compression Endpoint ──────────────────────────

router.post('/compress-image', async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const file = files?.file?.[0] || (req as any).file;
    
    if (!file) {
      res.status(400).json({ error: 'Image file required' });
      return;
    }

    const inputExt = path.extname(file.originalname).slice(1).toLowerCase();
    const baseName = path.basename(file.originalname, path.extname(file.originalname));
    
    // Get compression options
    const quality = parseInt(req.body.quality) || 80;
    const maxWidth = req.body.maxWidth ? parseInt(req.body.maxWidth) : undefined;
    const maxHeight = req.body.maxHeight ? parseInt(req.body.maxHeight) : undefined;
    
    // Determine output format (keep same or convert to more efficient format)
    let outputFormat = inputExt;
    if (req.body.format) {
      outputFormat = req.body.format.toLowerCase();
    }
    
    // Use webp for maximum compression if no format specified and original isn't already webp
    if (req.body.aggressive === 'true' && outputFormat !== 'webp') {
      outputFormat = 'webp';
    }

    const result = await convertImage(file.buffer, outputFormat as any, {
      quality,
      width: maxWidth,
      height: maxHeight,
      fit: 'inside',
    });

    const outputName = `${baseName}-compressed.${outputFormat}`;

    const mimeMap: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      webp: 'image/webp', tiff: 'image/tiff', avif: 'image/avif',
      gif: 'image/gif', bmp: 'image/bmp',
    };

    res.set({
      'Content-Type': mimeMap[outputFormat] || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${outputName}"`,
      'X-Original-Size': String(file.size),
      'X-Compressed-Size': String(result.length),
    });
    res.send(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/batch', async (req: Request, res: Response): Promise<void> => {
  try {
    // Handle both upload.array and upload.fields
    const filesObj = req.files as { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[] | undefined;
    const files = Array.isArray(filesObj) ? filesObj : filesObj?.files;
    
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'Files required' });
      return;
    }

    const targetFormat = (req.body.format || '').toLowerCase().trim();
    if (!targetFormat) {
      res.status(400).json({ error: 'Target format required' });
      return;
    }

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="converted-${targetFormat}.zip"`,
    });

    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.pipe(res);

    for (const file of files) {
      const baseName = path.basename(file.originalname, path.extname(file.originalname));
      const converted = await convertImage(file.buffer, targetFormat as any);
      archive.append(converted, { name: `${baseName}.${targetFormat}` });
    }

    await archive.finalize();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Supported Formats Endpoint ──────────────────────────

router.get('/formats', (_req: Request, res: Response) => {
  res.json(getSupportedConversions());
});

// ─── Helpers ─────────────────────────────────────────────

function isImageFormat(ext: string): boolean {
  return ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'avif', 'gif', 'bmp', 'svg', 'ico', 'heic', 'heif'].includes(ext);
}

function getSupportedConversions() {
  return {
    documents: {
      toPdf: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf', 'txt', 'csv', 'html', 'md'],
      fromPdf: ['docx', 'xlsx', 'pptx', 'odt', 'txt', 'html', 'csv', 'rtf'],
    },
    images: {
      formats: ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'avif', 'gif', 'bmp', 'svg', 'ico', 'heic', 'heif'],
      toPdf: true,
      fromPdf: true,
    },
    video: {
      formats: ['mp4', 'avi', 'mkv', 'webm', 'mov', 'flv', 'wmv', 'gif'],
    },
    audio: {
      formats: ['mp3', 'wav', 'aac', 'ogg', 'flac'],
    },
    ebooks: {
      formats: ['epub', 'mobi', 'azw3', 'fb2', 'pdf'],
    },
  };
}

export default router;