import { useState, useCallback, useEffect } from 'react';
import { useModuleState } from '@/hooks/useModuleState';
import { Info, X, GripVertical, FileText } from 'lucide-react';
import ToolPageWrapper from '@/components/shared/ToolPageWrapper';
import { getMetadata } from '@/services/api';
import { useDropzone } from 'react-dropzone';
import { useInternalDrop } from '@/hooks/useInternalDrop';

interface PdfMeta {
  title: string | null;
  author: string | null;
  subject: string | null;
  creator: string | null;
  producer: string | null;
  creationDate: string | null;
  modificationDate: string | null;
  pageCount: number;
  pages: { number: number; width: number; height: number }[];
}

interface PdfItem {
  id: string;
  file: File;
  meta: PdfMeta | null;
  loading: boolean;
  error: string | null;
}

interface MetadataState {
  items: PdfItem[];
  selectedId: string | null;
}

export default function MetadataTool() {
  const { state, setState, undo, redo, clear, canUndo, canRedo, isLoading } = useModuleState<MetadataState>('metadata-tool-v2', {
    items: [],
    selectedId: null
  });

  // Defensive coding: ensure items is always an array
  const items = state?.items || [];
  const selectedId = state?.selectedId || null;

  const selectedItem = items.find(i => i.id === selectedId);

  const onDrop = useCallback((accepted: File[]) => {
    const newItems: PdfItem[] = accepted.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      meta: null,
      loading: false,
      error: null,
    }));

    setState(prev => {
      const currentItems = prev.items || [];
      const updatedItems = [...currentItems, ...newItems];
      // Select the first new item if nothing was selected
      const nextSelectedId = (!prev.selectedId && newItems.length > 0) ? newItems[0].id : prev.selectedId;
      return {
        ...prev,
        items: updatedItems,
        selectedId: nextSelectedId
      };
    });
  }, [setState]);

  const { handleInternalDrop } = useInternalDrop(onDrop);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    noClick: false
  });

  const removeItem = (id: string) => {
    setState(prev => {
      const currentItems = prev.items || [];
      const newItems = currentItems.filter((item) => item.id !== id);
      const newSelectedId = prev.selectedId === id
        ? (newItems.length > 0 ? newItems[0].id : null)
        : prev.selectedId;

      return {
        ...prev,
        items: newItems,
        selectedId: newSelectedId
      };
    });
  };

  // Auto-fetch metadata when a PDF is selected
  useEffect(() => {
    if (!selectedId) return;
    const item = items.find(i => i.id === selectedId);

    // Check if item exists and if we need to fetch
    if (!item) return;
    if (item.meta || item.loading || item.error) return;

    // Check if file is valid (persistence might have lost it if using localStorage, though we use IDB)
    if (!item.file || !(item.file instanceof File)) {
      console.warn('Invalid file object found', item);
      return;
    }

    // Set loading
    setState(prev => ({
      ...prev,
      items: (prev.items || []).map(i => i.id === selectedId ? { ...i, loading: true, error: null } : i)
    }));

    getMetadata(item.file)
      .then((data) => {
        setState(prev => ({
          ...prev,
          items: (prev.items || []).map(i => i.id === selectedId ? { ...i, meta: data, loading: false } : i)
        }));
      })
      .catch((err) => {
        console.error('Metadata fetch error:', err);
        setState(prev => ({
          ...prev,
          items: (prev.items || []).map(i =>
            i.id === selectedId ? { ...i, error: err.response?.data?.error || err.message || 'Failed to load metadata', loading: false } : i
          )
        }));
      });
  }, [selectedId, items, setState]);

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes && bytes !== 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // Info Panel component for the right side
  const InfoPanel = () => {
    if (items.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-ink-faint">
          <div className="text-center">
            <Info className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Add PDFs to view their information</p>
          </div>
        </div>
      );
    }

    if (!selectedItem) {
      return (
        <div className="h-full flex items-center justify-center text-ink-faint">
          <p className="text-sm">Select a PDF to view its info</p>
        </div>
      );
    }

    if (selectedItem.loading) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-accent-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-ink-muted">Reading PDF info...</p>
          </div>
        </div>
      );
    }

    if (selectedItem.error) {
      return (
        <div className="h-full flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-sm text-red-400 bg-red-950/40 p-4 rounded-xl">{selectedItem.error}</p>
          </div>
        </div>
      );
    }

    const meta = selectedItem.meta;
    if (!meta) return null;

    return (
      <div className="h-full overflow-auto p-6">
        {/* File info header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-surface-300">
          <div className="w-10 h-10 rounded-lg bg-accent-400/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-accent-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-ink truncate">{selectedItem.file.name}</h3>
            <p className="text-xs text-ink-faint">{formatSize(selectedItem.file.size)}</p>
          </div>
        </div>

        {/* Document Properties */}
        <div className="space-y-6">
          <div>
            <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Document Properties</h4>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Title', meta.title],
                ['Author', meta.author],
                ['Subject', meta.subject],
                ['Creator', meta.creator],
                ['Producer', meta.producer],
                ['Created', formatDate(meta.creationDate)],
                ['Modified', formatDate(meta.modificationDate)],
                ['Pages', String(meta.pageCount)],
              ].map(([label, value]) => (
                <div key={label} className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wider text-ink-faint font-medium">{label}</p>
                  <p className="text-sm text-ink">{value || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Page Dimensions */}
          {meta.pages.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Page Dimensions</h4>
              <div className="bg-surface-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-surface-300">
                      <th className="text-left px-4 py-2 text-ink-faint font-medium uppercase tracking-wider">Page</th>
                      <th className="text-left px-4 py-2 text-ink-faint font-medium uppercase tracking-wider">Width</th>
                      <th className="text-left px-4 py-2 text-ink-faint font-medium uppercase tracking-wider">Height</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meta.pages.slice(0, 20).map(p => (
                      <tr key={p.number} className="border-b border-surface-300 last:border-0">
                        <td className="px-4 py-2 text-ink">{p.number}</td>
                        <td className="px-4 py-2 text-ink">{p.width} pt</td>
                        <td className="px-4 py-2 text-ink">{p.height} pt</td>
                      </tr>
                    ))}
                    {meta.pages.length > 20 && (
                      <tr><td colSpan={3} className="px-4 py-2 text-ink-faint">...and {meta.pages.length - 20} more pages</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <ToolPageWrapper
      title="File Info"
      description="View and edit PDF metadata properties"
      icon={Info}
      onUndo={undo}
      onRedo={redo}
      onClear={() => {
        clear();
      }}
      canUndo={canUndo}
      canRedo={canRedo}
      preview={
        <div className="h-full bg-surface-100/50 backdrop-blur-sm rounded-xl overflow-hidden border border-surface-200 relative">
          {isLoading && (
            <div className="absolute inset-0 z-50 bg-surface-100/50 backdrop-blur-sm flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-accent-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <InfoPanel />
        </div>
      }
    >
      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
        onDrop={handleInternalDrop}
      >
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
            ${isDragActive
              ? 'border-accent-400 bg-accent-400/5'
              : 'border-surface-300 hover:border-accent-400/50 hover:bg-surface-100'
            }`}
        >
          <input {...getInputProps()} />
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-surface-200 flex items-center justify-center">
            <FileText className="w-6 h-6 text-ink-muted" />
          </div>
          <p className="text-sm text-ink-muted mb-1">
            {isDragActive ? 'Drop PDFs here' : 'Drop your PDFs here'}
          </p>
          <p className="text-xs text-ink-faint">or click to browse</p>
        </div>
      </div>

      {/* File list */}
      {items.length > 0 && (
        <div className="mt-4 space-y-2">
          <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-2 block">
            {items.length} PDF{items.length > 1 ? 's' : ''} added — click to view info
          </label>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => setState(prev => ({ ...prev, selectedId: item.id }))}
                className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
                  ${selectedId === item.id
                    ? 'bg-accent-400/10 border border-accent-400/30'
                    : 'bg-surface-100 border border-surface-300 hover:border-accent-400/30'
                  }`}
              >
                <GripVertical className="w-4 h-4 text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="w-8 h-8 rounded-lg bg-surface-200 flex items-center justify-center shrink-0">
                  <FileText className={`w-4 h-4 ${selectedId === item.id ? 'text-accent-400' : 'text-ink-muted'}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${selectedId === item.id ? 'text-ink font-medium' : 'text-ink'}`}>
                    {item.file.name}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {formatSize(item.file.size)}
                    {item.meta && ` • ${item.meta.pageCount} page${item.meta.pageCount !== 1 ? 's' : ''}`}
                    {item.loading && ' • Loading...'}
                    {item.error && ' • Error'}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(item.id);
                  }}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-surface-200 transition-all"
                >
                  <X className="w-4 h-4 text-ink-faint" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </ToolPageWrapper>
  );
}
