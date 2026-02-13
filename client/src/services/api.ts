import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10 * 60 * 1000,
});

// ─── Progress-aware helpers ──────────────────────────────

type ProgressCallback = (progress: number) => void;

function makeFormData(file: File, fields: Record<string, string> = {}): FormData {
  const form = new FormData();
  form.append('file', file);
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  return form;
}

async function postBlob(
  url: string,
  form: FormData,
  onProgress?: ProgressCallback
): Promise<Blob> {
  try {
    const res = await api.post(url, form, {
      responseType: 'blob',
      onUploadProgress: (e) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 50));
      },
      onDownloadProgress: (e) => {
        if (e.total && onProgress) onProgress(50 + Math.round((e.loaded / e.total) * 50));
      },
    });
    if (onProgress) onProgress(100);
    return res.data;
  } catch (err: any) {
    // When responseType is 'blob', error responses also come as blobs
    // We need to parse them to get the actual error message
    if (err.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        const json = JSON.parse(text);
        if (json.error) {
          err.message = json.error;
        }
      } catch {
        // If parsing fails, keep the original error
      }
    }
    throw err;
  }
}

// ─── Convert ─────────────────────────────────────────────

export async function convertFile(
  file: File,
  targetFormat: string,
  opts: Record<string, string> = {},
  onProgress?: ProgressCallback
): Promise<Blob> {
  const form = makeFormData(file, { format: targetFormat, ...opts });
  return postBlob('/convert', form, onProgress);
}

export async function batchConvert(files: File[], targetFormat: string): Promise<Blob> {
  const form = new FormData();
  files.forEach(f => form.append('files', f));
  form.append('format', targetFormat);
  const res = await api.post('/convert/batch', form, { responseType: 'blob' });
  return res.data;
}

export async function getSupportedFormats() {
  const res = await api.get('/convert/formats');
  return res.data;
}

// ─── Image Compression ───────────────────────────────────

export async function compressImage(
  file: File,
  opts: { quality?: number; maxWidth?: number; maxHeight?: number; format?: string; aggressive?: boolean } = {},
  onProgress?: ProgressCallback
): Promise<Blob> {
  const form = makeFormData(file, {
    quality: String(opts.quality ?? 80),
    ...(opts.maxWidth ? { maxWidth: String(opts.maxWidth) } : {}),
    ...(opts.maxHeight ? { maxHeight: String(opts.maxHeight) } : {}),
    ...(opts.format ? { format: opts.format } : {}),
    ...(opts.aggressive ? { aggressive: 'true' } : {}),
  });
  return postBlob('/convert/compress-image', form, onProgress);
}

// ─── Merge ───────────────────────────────────────────────

export async function mergePdfs(files: File[], onProgress?: ProgressCallback): Promise<Blob> {
  const form = new FormData();
  files.forEach(f => form.append('files', f));
  return postBlob('/merge', form, onProgress);
}

// ─── Split ───────────────────────────────────────────────

export async function splitPdf(file: File, ranges?: string, onProgress?: ProgressCallback): Promise<Blob> {
  const form = makeFormData(file, ranges ? { ranges } : {});
  return postBlob('/split', form, onProgress);
}

// ─── PDF Operations ──────────────────────────────────────

export async function pdfOp(
  endpoint: string,
  file: File,
  opts: Record<string, string> = {},
  onProgress?: ProgressCallback
): Promise<Blob> {
  const form = makeFormData(file, opts);
  return postBlob(`/pdf/${endpoint}`, form, onProgress);
}

export const compressPdf = (file: File, quality?: string, onProgress?: ProgressCallback) =>
  pdfOp('compress', file, quality ? { quality } : {}, onProgress);

export const repairPdf = (file: File, onProgress?: ProgressCallback) =>
  pdfOp('repair', file, {}, onProgress);

export const flattenPdf = (file: File, onProgress?: ProgressCallback) =>
  pdfOp('flatten', file, {}, onProgress);

export const rotatePdf = (file: File, angle: string, pages?: string) =>
  pdfOp('rotate', file, { angle, ...(pages ? { pages } : {}) });

export const extractPages = (file: File, pages: string) =>
  pdfOp('extract-pages', file, { pages });

export const removePages = (file: File, pages: string) =>
  pdfOp('remove-pages', file, { pages });

export const addPageNumbers = (file: File, opts: Record<string, string> = {}) =>
  pdfOp('page-numbers', file, opts);

export const addWatermark = (file: File, text: string, opts: Record<string, string> = {}) =>
  pdfOp('watermark', file, { text, ...opts });

export async function getMetadata(file: File) {
  const form = makeFormData(file);
  const res = await api.post('/pdf/metadata', form);
  return res.data;
}

export const updateMetadata = (file: File, opts: Record<string, string>) =>
  pdfOp('metadata/update', file, opts);

export const addPassword = (file: File, password: string, onProgress?: ProgressCallback) =>
  pdfOp('add-password', file, { password }, onProgress);

export const removePassword = (file: File, password: string, onProgress?: ProgressCallback) =>
  pdfOp('remove-password', file, { password }, onProgress);

// ─── OCR ─────────────────────────────────────────────────

export async function ocrImage(file: File, lang = 'eng'): Promise<{ text: string }> {
  const form = makeFormData(file, { lang });
  const res = await api.post('/ocr/image', form);
  return res.data;
}

export async function ocrPdf(file: File, lang = 'eng', onProgress?: ProgressCallback): Promise<Blob> {
  const form = makeFormData(file, { lang });
  return postBlob('/ocr/pdf', form, onProgress);
}

// ─── Health ──────────────────────────────────────────────

export async function checkHealth() {
  const res = await api.get('/health');
  return res.data;
}

export async function checkDeps() {
  const res = await api.get('/deps');
  return res.data;
}

// ─── File Save/Download ──────────────────────────────────

/** Try the native Save As dialog, falling back to auto-download */
export async function saveFile(blob: Blob, suggestedName: string): Promise<void> {
  if ('showSaveFilePicker' in window) {
    try {
      const ext = suggestedName.split('.').pop()?.toLowerCase() || '';
      const handle = await (window as any).showSaveFilePicker({
        suggestedName,
        types: getPickerTypes(ext),
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e: any) {
      if (e.name === 'AbortError') return; // User cancelled
      // Fall through to traditional download
    }
  }
  downloadBlob(blob, suggestedName);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getPickerTypes(ext: string) {
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
    mp4: 'video/mp4', mp3: 'audio/mpeg', wav: 'audio/wav',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain', html: 'text/html', csv: 'text/csv', zip: 'application/zip',
  };
  const mime = mimeMap[ext];
  if (!mime) return [];
  return [{ description: `${ext.toUpperCase()} file`, accept: { [mime]: [`.${ext}`] } }];
}
