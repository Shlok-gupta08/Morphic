import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileIcon } from 'lucide-react';

import { useInternalDrop } from '@/hooks/useInternalDrop';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  maxFiles?: number;
  label?: string;
  hint?: string;
}

export default function FileDropzone({
  onFilesSelected,
  accept,
  multiple = false,
  maxFiles = 100,
  label = 'Drop your files here',
  hint = 'or click to browse',
}: FileDropzoneProps) {
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles = multiple ? [...files, ...accepted].slice(0, maxFiles) : accepted.slice(0, 1);
    setFiles(newFiles);
    onFilesSelected(newFiles);
  }, [files, multiple, maxFiles, onFilesSelected]);

  const { handleInternalDrop } = useInternalDrop(onDrop);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxFiles,
  });

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesSelected(newFiles);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div
      className="space-y-4"
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
      onDrop={handleInternalDrop}
    >
      <div
        {...getRootProps()}
        className={`dropzone-area ${isDragActive ? 'dropzone-active' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
            style={{
              backgroundColor: isDragActive ? 'rgb(var(--accent-100))' : 'rgb(var(--surface-200))',
              color: isDragActive ? 'rgb(var(--accent-400))' : 'rgb(var(--ink-muted))',
            }}
          >
            <Upload className="w-5 h-5" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'rgb(var(--ink))' }}>{label}</p>
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--ink-faint))' }}>{hint}</p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {/* Draggable Header for the Group */}
          <div
            draggable={true}
            onDragStart={(e) => {
              e.dataTransfer.setData('application/x-file-converter-module-files', 'true');
              e.dataTransfer.effectAllowed = 'copy';
              // @ts-ignore
              window.__draggedModuleFiles = files;
              // Set a custom drag image or use default
            }}
            onDragEnd={() => {
              // @ts-ignore
              window.__draggedModuleFiles = undefined;
            }}
            className="flex items-center gap-2 px-3 py-2 bg-surface-200 border border-surface-300 rounded-xl cursor-grab active:cursor-grabbing hover:border-accent-400 transition-colors select-none group/header"
          >
            <div className="p-1 rounded bg-surface-300 text-ink-muted group-hover/header:text-accent-400 transition-colors">
              <Upload className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted flex-1">
              Input Files ({files.length})
            </span>
            <span className="text-[10px] text-ink-faint bg-surface-100 px-1.5 py-0.5 rounded border border-surface-200">
              Drag to Sidebar
            </span>
          </div>

          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 p-3 rounded-xl group/file bg-surface-200/50 border border-surface-200"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-surface-200"
              >
                <FileIcon className="w-4 h-4 text-ink-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-ink">{file.name}</p>
                <p className="text-xs text-ink-faint">{formatSize(file.size)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover/file:opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-500 text-ink-faint"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
