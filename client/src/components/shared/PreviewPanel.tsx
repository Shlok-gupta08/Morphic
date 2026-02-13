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
}

export default function PreviewPanel({ originalFile, results = [], activeResultId, onTabChange }: PreviewPanelProps) {
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

  if (!originalFile && results.length === 0) {
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
        {/* Tab bar */}
        <div
          className="flex items-center justify-between px-2 pt-2 pb-0 shrink-0 gap-2 overflow-x-auto no-scrollbar bg-surface-100"
          style={{ borderBottom: '1px solid rgb(var(--surface-200))' }}
        >
          <div className="flex items-end gap-1">
            {hasOriginal && (
              <button
                onClick={() => handleTabClick('original')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-[11px] font-bold uppercase tracking-wide transition-all border-t border-x ${internalTab === 'original' ? 'bg-surface-50 border-surface-200 border-b-surface-50 text-accent-400 translate-y-[1px]' : 'bg-transparent border-transparent text-ink-faint hover:text-ink hover:bg-surface-200/50'}`}
              >
                <Eye className="w-3 h-3" />
                Original
              </button>
            )}

            {results.map((res, idx) => (
              <button
                key={res.id}
                onClick={() => handleTabClick(res.id)}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, res)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-[11px] font-bold uppercase tracking-wide transition-all border-t border-x relative group cursor-grab active:cursor-grabbing
                    ${internalTab === res.id ? 'bg-surface-50 border-surface-200 border-b-surface-50 text-accent-400 translate-y-[1px] z-10' : 'bg-transparent border-transparent text-ink-faint hover:text-ink hover:bg-surface-200/50'}
                `}
                title="Drag to sidebar to save"
              >
                <CheckCircle2 className="w-3 h-3" />
                Result {results.length - idx}
              </button>
            ))}
          </div>

          <button
            onClick={() => setFullscreen(internalTab)}
            className="w-7 h-7 mb-1 rounded-lg flex items-center justify-center transition-colors hover:bg-surface-200 text-ink-muted"
            title="Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Preview content */}
        <div className="flex-1 relative bg-surface-50">
          <PreviewContent url={showUrl} type={showType} className="absolute inset-0 w-full h-full object-contain" />
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
          <div className="w-[90vw] h-[85vh]">
            <PreviewContent
              url={fullscreen === 'original' ? originalUrl : (previewUrls[fullscreen] || '')}
              type={fullscreen === 'original' ? (getPreviewType(originalFile?.name || '', originalFile?.type || '')) : (results.find(r => r.id === fullscreen) ? 'pdf' : 'unsupported')}
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </>
  );
}

function PreviewContent({ url, type, className }: { url: string; type: string; className?: string }) {
  if (type === 'image') {
    return <img src={url} alt="Preview" className={className} />;
  }
  if (type === 'pdf') {
    return <iframe src={url} className={className} style={{ border: 'none' }} title="PDF Preview" />;
  }
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <span className="text-xs" style={{ color: 'rgb(var(--ink-faint))' }}>
        Preview not available for this format
      </span>
    </div>
  );
}

function getPreviewType(filename: string, mimeType: string): 'image' | 'pdf' | 'text' | 'unsupported' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) return 'pdf';
  if (mimeType.startsWith('text/')) return 'text';
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'tiff'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  return 'unsupported';
}
