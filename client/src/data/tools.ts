import {
  FileText, Image, Merge, Scissors, Minimize2,
  RotateCw, Trash2, Hash, Droplets, Info, Lock, Unlock,
  Wrench, Layers, ScanLine, type LucideIcon
} from 'lucide-react';

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: ToolCategory;
  path: string;
}

export type ToolCategory =
  | 'convert'
  | 'pdf-organize'
  | 'pdf-security'
  | 'pdf-tools';

export const CATEGORIES: { id: ToolCategory; label: string; description: string }[] = [
  { id: 'convert', label: 'Convert', description: 'Transform between any file format' },
  { id: 'pdf-organize', label: 'Organize', description: 'Merge, split, and rearrange PDF pages' },
  { id: 'pdf-security', label: 'Security', description: 'Protect and unlock your documents' },
  { id: 'pdf-tools', label: 'Tools', description: 'Compress, repair, edit, and enhance PDFs' },
];

export const TOOLS: Tool[] = [
  // ── Convert ─────────────────────────
  { id: 'doc-convert', name: 'Document Converter', description: 'Convert between DOC, DOCX, XLS, PPT, ODT, PDF and more', icon: FileText, category: 'convert', path: '/tools/document-converter' },
  { id: 'img-convert', name: 'Image Converter', description: 'PNG, JPG, WebP, TIFF, AVIF, GIF, BMP, SVG — any direction', icon: Image, category: 'convert', path: '/tools/image-converter' },

  // ── Organize ────────────────────────
  { id: 'merge', name: 'Merge PDFs', description: 'Combine multiple PDF files into one document', icon: Merge, category: 'pdf-organize', path: '/tools/merge' },
  { id: 'split', name: 'Split PDF', description: 'Extract pages or split into multiple files', icon: Scissors, category: 'pdf-organize', path: '/tools/split' },
  { id: 'rotate', name: 'Rotate Pages', description: 'Rotate PDF pages by 90°, 180°, or 270°', icon: RotateCw, category: 'pdf-organize', path: '/tools/rotate' },
  { id: 'extract-pages', name: 'Extract Pages', description: 'Pull specific pages out of a PDF', icon: Layers, category: 'pdf-organize', path: '/tools/extract-pages' },
  { id: 'remove-pages', name: 'Remove Pages', description: 'Delete specific pages or page ranges from a PDF', icon: Trash2, category: 'pdf-organize', path: '/tools/remove-pages' },
  { id: 'page-numbers', name: 'Page Numbers', description: 'Add page numbers to your PDF', icon: Hash, category: 'pdf-organize', path: '/tools/page-numbers' },

  // ── Security ────────────────────────
  { id: 'add-password', name: 'Add Password', description: 'Protect your PDF with a password', icon: Lock, category: 'pdf-security', path: '/tools/add-password' },
  { id: 'remove-password', name: 'Remove Password', description: 'Unlock a password-protected PDF', icon: Unlock, category: 'pdf-security', path: '/tools/remove-password' },
  { id: 'watermark', name: 'Add Watermark', description: 'Stamp text across every page', icon: Droplets, category: 'pdf-security', path: '/tools/watermark' },

  // ── Tools ───────────────────────────
  { id: 'compress', name: 'Compress PDF', description: 'Reduce file size while keeping quality', icon: Minimize2, category: 'pdf-tools', path: '/tools/compress' },
  { id: 'repair', name: 'Repair PDF', description: 'Fix corrupted or broken PDF files', icon: Wrench, category: 'pdf-tools', path: '/tools/repair' },
  { id: 'flatten', name: 'Flatten PDF', description: 'Flatten form fields and annotations', icon: Layers, category: 'pdf-tools', path: '/tools/flatten' },
  { id: 'ocr', name: 'OCR', description: 'Extract text from images and scanned PDFs', icon: ScanLine, category: 'pdf-tools', path: '/tools/ocr' },
  { id: 'metadata', name: 'File Info', description: 'View and edit file metadata', icon: Info, category: 'pdf-tools', path: '/tools/metadata' },
];

export function getToolsByCategory(category: ToolCategory): Tool[] {
  return TOOLS.filter(t => t.category === category);
}

export function getToolById(id: string): Tool | undefined {
  return TOOLS.find(t => t.id === id);
}
