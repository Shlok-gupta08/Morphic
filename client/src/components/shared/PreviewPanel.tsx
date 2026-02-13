import { useState, useEffect, useMemo } from 'react';
import { Eye, Maximize2, X, CheckCircle2 } from 'lucide-react';

export interface PreviewResult {
  id: string;
  blob: Blob;
  name: string;
  timestamp?: number;
}

interface PreviewPanelProps {
  originalFile?: File | null;
  results?: PreviewResult[];
  activeResultId?: string | null;
  onTabChange?: (isOriginal: boolean, resultId?: string) => void;
  onClose?: (resultId: string) => void;
  onRestore?: () => void;
  closedCount?: number;
}

export default function PreviewPanel({ originalFile, results = [], activeResultId, onTabChange, onClose, onRestore, closedCount = 0 }: PreviewPanelProps) {
  const [internalTab, setInternalTab] = useState<'original' | string>('original');
  const [fullscreen, setFullscreen] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    // Sync internal tab with prop if it changes externally
    if (activeResultId) {
      setInternalTab(activeResultId);
    } else if (activeResultId === null && originalFile) {
      // Force original if activeResultId is cleared? 
      // But sometimes we might want to stay on a tab.
      // Let's only force if we are currently on a result that no longer exists?
      // For now, if activeResultId is provided, use it.
      // If null, we might default to original, or stay.
      // The parent uses setActiveResultId(null) when clicking original items.
      setInternalTab('original');
    }
  }, [activeResultId, originalFile]);

  useEffect(() => {
    if (originalFile) {
      const url = URL.createObjectURL(originalFile);
      setOriginalUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setOriginalUrl('');
  }, [originalFile]);

  useEffect(() => {
    const urls: Record<string, string> = {};
    results.forEach(res => {
      urls[res.id] = URL.createObjectURL(res.blob);
    });
    setPreviewUrls(urls);
    return () => {
      Object.values(urls).forEach(u => URL.revokeObjectURL(u));
    };
  }, [results]);

  const activeResult = results.find(r => r.id === internalTab);
  const showUrl = internalTab === 'original' ? originalUrl : (activeResult ? previewUrls[activeResult.id] : '');
  const showType = useMemo(() => {
    if (internalTab === 'original') return getPreviewType(originalFile?.name || '', originalFile?.type || '');
    if (activeResult) return getPreviewType(activeResult.name, activeResult.blob.type);
    return 'unsupported';
  }, [internalTab, originalFile, activeResult]);

  // Get the current format extension for display
  const currentFormat = useMemo(() => {
    if (internalTab === 'original') {
      return originalFile?.name.split('.').pop()?.toUpperCase() || '';
    }
    if (activeResult) {
      return activeResult.name.split('.').pop()?.toUpperCase() || '';
    }
    return '';
  }, [internalTab, originalFile, activeResult]);

  // Get the current file size for display
  const currentSize = useMemo(() => {
    if (internalTab === 'original') {
      return originalFile?.size || 0;
    }
    if (activeResult) {
      return activeResult.blob.size || 0;
    }
    return 0;
  }, [internalTab, originalFile, activeResult]);

  // Format file size for display
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleTabClick = (tab: 'original' | string) => {
    setInternalTab(tab);
    if (onTabChange) {
      onTabChange(tab === 'original', tab === 'original' ? undefined : tab);
    }
  };

  const handleDragStart = (e: React.DragEvent, res: PreviewResult) => {
    e.dataTransfer.setData('application/x-file-converter-result', 'true');
    e.dataTransfer.effectAllowed = 'copy';

    // Create a pseudo-File object for the result if it's just a Blob
    // This allows consistency with the ProcessingResult drag behavior
    const fileToDrop = new File([res.blob], res.name, { type: res.blob.type });

    // @ts-ignore
    window.__draggedResultFile = fileToDrop;
  };

  if (!originalFile && results.length === 0 && closedCount === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center rounded-2xl"
        style={{
          backgroundColor: 'rgb(var(--surface-100))',
          border: '1px solid rgb(var(--surface-200))',
          minHeight: '400px',
        }}
      >
        <p className="text-xs" style={{ color: 'rgb(var(--ink-faint))' }}>Upload a file to preview</p>
      </div>
    );
  }

  const hasOriginal = !!originalFile;

  return (
    <>
      <div
        className="flex-1 flex flex-col rounded-2xl overflow-hidden shadow-sm"
        style={{
          backgroundColor: 'rgb(var(--surface-100))',
          border: '1px solid rgb(var(--surface-200))',
          minHeight: '400px',
        }}
      >
        {/* Tab bar header */}
        <div
          className="flex items-center justify-between px-2 pt-2 pb-0 shrink-0 gap-2 bg-surface-100 relative overflow-hidden"
          style={{ borderBottom: '1px solid rgb(var(--surface-200))' }}
        >
          {/* Scrollable Tabs Area */}
          <div className="flex-1 flex items-end gap-1 overflow-x-auto overflow-y-hidden no-scrollbar mask-linear-fade-right">
            {hasOriginal && (
              <button
                onClick={() => handleTabClick('original')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-[11px] font-bold uppercase tracking-wide transition-all border-t border-x shrink-0 ${internalTab === 'original' ? 'bg-surface-50 border-surface-200 border-b-surface-50 text-accent-400 translate-y-[1px]' : 'bg-transparent border-transparent text-ink-faint hover:text-ink hover:bg-surface-200/50'}`}
              >
                <Eye className="w-3 h-3" />
                Original
              </button>
            )}

            {results.map((res, idx) => (
              <div
                key={res.id}
                className={`flex items-center rounded-t-lg transition-all border-t border-x relative group shrink-0
                    ${internalTab === res.id ? 'bg-surface-50 border-surface-200 border-b-surface-50 text-accent-400 translate-y-[1px] z-10' : 'bg-transparent border-transparent text-ink-faint hover:text-ink hover:bg-surface-200/50'}
                `}
              >
                <button
                  onClick={() => handleTabClick(res.id)}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, res)}
                  className="flex items-center gap-1.5 pl-3 pr-1 py-2 text-[11px] font-bold uppercase tracking-wide cursor-grab active:cursor-grabbing"
                  title={`${res.name} - Drag to sidebar to save`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Result {results.length - idx}
                </button>
                {onClose && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose(res.id);
                    }}
                    className={`p-1 mr-1 rounded-md opacity-0 group-hover:opacity-100 transition-all
                      ${internalTab === res.id ? 'hover:bg-surface-200 text-ink-muted' : 'hover:bg-surface-300 text-ink-muted'}
                    `}
                    title="Close tab"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {/* Spacer to allow scrolling past last item */}
            <div className="w-4 shrink-0" />
          </div>

          {/* Fixed Controls Area */}
          <div className="flex items-center pl-2 pb-1 gap-2 bg-surface-100 z-20 relative">
            {/* Gradient Mask for items sliding behind */}
            <div className="absolute left-0 top-0 bottom-0 w-4 -translate-x-full bg-gradient-to-l from-surface-100 to-transparent pointer-events-none" />

            {/* Vertical Divider (only if restore button exists) */}
            {onRestore && closedCount > 0 && (
              <div className="w-px h-5 bg-surface-300 mx-1" />
            )}

            {/* Restore Tabs Button */}
            {onRestore && closedCount > 0 && (
              <button
                onClick={onRestore}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all bg-surface-200 text-accent-600 hover:bg-surface-300 hover:text-accent-700 shadow-sm"
                title={`Restore ${closedCount} closed tab${closedCount !== 1 ? 's' : ''}`}
              >
                <div className="w-4 h-4 rounded-full bg-accent-100 flex items-center justify-center text-[9px] font-bold text-accent-600">
                  {closedCount}
                </div>
                Restore
              </button>
            )}

            {/* Standard Divider */}
            <div className="w-px h-5 bg-surface-300 mx-1" />

            <button
              onClick={() => setFullscreen(internalTab)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-surface-200 text-ink-muted"
              title="Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Preview content */}
        <div className="flex-1 relative bg-surface-50">
          <PreviewContent url={showUrl} type={showType} className="absolute inset-0 w-full h-full object-contain" />

          {/* Format badge */}
          {currentFormat && (
            <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-wider flex items-center gap-3">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-400"></span>
                .{currentFormat}
              </span>
              {currentSize > 0 && (
                <span className="text-white/80 font-medium normal-case">{formatSize(currentSize)}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 animate-fade-in backdrop-blur-sm">
          <button
            onClick={() => setFullscreen(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-[90vw] h-[85vh] relative">
            <PreviewContent
              url={fullscreen === 'original' ? originalUrl : (previewUrls[fullscreen] || '')}
              type={fullscreen === 'original' ? (getPreviewType(originalFile?.name || '', originalFile?.type || '')) : (results.find(r => r.id === fullscreen) ? 'pdf' : 'unsupported')}
              className="w-full h-full object-contain rounded-xl"
            />
            {/* Fullscreen format badge */}
            {currentFormat && (
              <div className="absolute bottom-6 left-6 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm text-white text-sm font-bold uppercase tracking-wider flex items-center gap-3">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-400"></span>
                  .{currentFormat}
                </span>
                {currentSize > 0 && (
                  <span className="text-white/80 font-medium normal-case">{formatSize(currentSize)}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function PreviewContent({ url, type, className }: { url: string; type: string; className?: string }) {
  const [imageError, setImageError] = useState(false);

  // Reset error state when URL changes
  useEffect(() => {
    setImageError(false);
  }, [url]);

  if (type === 'image' && !imageError) {
    return (
      <img
        src={url}
        alt="Preview"
        className={className}
        onError={() => setImageError(true)}
      />
    );
  }
  if (type === 'pdf') {
    return <iframe src={url} className={className} style={{ border: 'none' }} title="PDF Preview" />;
  }
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="text-center p-6">
        <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-surface-200 flex items-center justify-center">
          <Eye className="w-8 h-8 text-ink-faint" />
        </div>
        <span className="text-sm font-medium block" style={{ color: 'rgb(var(--ink-muted))' }}>
          Preview not available
        </span>
        <span className="text-xs mt-1 block" style={{ color: 'rgb(var(--ink-faint))' }}>
          This format will be converted on the server
        </span>
      </div>
    </div>
  );
}

function getPreviewType(filename: string, mimeType: string): 'image' | 'pdf' | 'text' | 'unsupported' {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  // HEIC/HEIF files can't be previewed in browser but we mark them as image to attempt preview
  // The PreviewContent component will handle the error gracefully
  if (['heic', 'heif'].includes(ext)) return 'image';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) return 'pdf';
  if (mimeType.startsWith('text/')) return 'text';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'tiff'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  return 'unsupported';
}
