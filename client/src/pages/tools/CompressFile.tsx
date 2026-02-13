import { useState, useMemo } from 'react';
import { useModuleState } from '@/hooks/useModuleState';
import { Minimize2, Save, Download, FileImage, FileText } from 'lucide-react';
import ToolPageWrapper from '@/components/shared/ToolPageWrapper';
import FileDropzone from '@/components/shared/FileDropzone';
import ProcessingResult, { type ProcessingStatus } from '@/components/shared/ProcessingResult';
import PreviewPanel, { type PreviewResult } from '@/components/shared/PreviewPanel';
import { compressPdf, compressImage, saveFile, downloadBlob } from '@/services/api';

const PDF_QUALITIES = [
  { value: 'screen', label: 'Maximum', description: 'Smallest file, lower quality' },
  { value: 'ebook', label: 'Balanced', description: 'Good quality, smaller file' },
  { value: 'printer', label: 'High', description: 'High quality, moderate size' },
  { value: 'prepress', label: 'Minimal', description: 'Best quality, slight reduction' },
];

const IMAGE_QUALITIES = [
  { value: 40, label: 'Maximum', description: 'Smallest file, lower quality' },
  { value: 60, label: 'Balanced', description: 'Good quality, smaller file' },
  { value: 80, label: 'High', description: 'High quality, moderate size' },
  { value: 95, label: 'Minimal', description: 'Best quality, slight reduction' },
];

const IMAGE_FORMATS = [
  { value: '', label: 'Keep Original', description: 'Same format as input' },
  { value: 'webp', label: 'WebP', description: 'Best compression' },
  { value: 'jpg', label: 'JPEG', description: 'Universal support' },
  { value: 'png', label: 'PNG', description: 'Lossless option' },
];

type FileType = 'pdf' | 'image' | null;

function getFileType(file: File | undefined): FileType {
  if (!file) return null;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'avif', 'heic', 'heif'].includes(ext)) return 'image';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf') return 'pdf';
  return null;
}

export default function CompressFile() {
  const { state, setState, undo, redo, clear, canUndo, canRedo, isLoading } = useModuleState<{
    pdfFiles: File[];
    imageFiles: File[];
    activeTab: 'pdf' | 'image';
    pdfQuality: string;
    imageQuality: number;
    imageFormat: string;
    results: PreviewResult[];
    closedPdfResults: PreviewResult[];
    closedImageResults: PreviewResult[];
    activeResultId: string | null;
  }>('compress-file', {
    pdfFiles: [],
    imageFiles: [],
    activeTab: 'pdf',
    pdfQuality: 'ebook',
    imageQuality: 60,
    imageFormat: '',
    results: [],
    closedPdfResults: [],
    closedImageResults: [],
    activeResultId: null
  });

  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState('');

  // Determine active file based on tab (Safety check for undefined state during migration)
  const activeFile = state.activeTab === 'pdf'
    ? (state.pdfFiles && state.pdfFiles[0])
    : (state.imageFiles && state.imageFiles[0]);

  // Filter results based on active tab
  const tabResults = state.results.filter(r => {
    // Basic heuristic: check name extension or mime type if available
    // Since we don't store mime in PreviewResult explicitly (only in blob), checks name
    const ext = r.name.split('.').pop()?.toLowerCase() || '';
    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'avif', 'heic', 'heif'].includes(ext);
    const isPdf = ext === 'pdf';

    if (state.activeTab === 'pdf') return isPdf;
    return isImage;
  });

  const activeResult = tabResults.find(r => r.id === state.activeResultId);

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    const type = getFileType(file);

    if (type === 'pdf') {
      setState(prev => ({
        ...prev,
        pdfFiles: [file],
        activeTab: 'pdf',
        // Clear active result if switching context
        activeResultId: null
      }));
    } else if (type === 'image') {
      setState(prev => ({
        ...prev,
        imageFiles: [file],
        activeTab: 'image',
        activeResultId: null
      }));
    } else {
      // Unsupported or mixed?
      setError('Unsupported file type');
    }
  };

  const handleCompress = async () => {
    if (!activeFile) return;
    setStatus('processing');
    setError('');

    try {
      let blob: Blob;
      let outputName: string;

      if (state.activeTab === 'pdf') {
        blob = await compressPdf(activeFile, state.pdfQuality);
        outputName = `compressed-${activeFile.name}`;
      } else {
        blob = await compressImage(activeFile, {
          quality: state.imageQuality,
          format: state.imageFormat || undefined,
        });

        // Determine output extension
        const originalExt = activeFile.name.split('.').pop() || 'jpg';
        const outputExt = state.imageFormat || originalExt;
        const baseName = activeFile.name.replace(/\.[^.]+$/, '');
        outputName = `${baseName}-compressed.${outputExt}`;
      }

      const newResult: PreviewResult = {
        id: crypto.randomUUID(),
        name: outputName,
        blob
      };

      setState(prev => ({
        ...prev,
        results: [newResult, ...prev.results],
        activeResultId: newResult.id
      }));
      setStatus('done');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
      setStatus('error');
    }
  };

  const handleCloseResult = (id: string) => {
    const resultToClose = state.results.find(r => r.id === id);
    if (!resultToClose) return;

    setState(prev => {
      const isPdfTab = prev.activeTab === 'pdf';
      return {
        ...prev,
        results: prev.results.filter(r => r.id !== id),
        closedPdfResults: isPdfTab ? [...(prev.closedPdfResults || []), resultToClose] : (prev.closedPdfResults || []),
        closedImageResults: !isPdfTab ? [...(prev.closedImageResults || []), resultToClose] : (prev.closedImageResults || []),
        activeResultId: prev.activeResultId === id ? null : prev.activeResultId
      };
    });
  };

  const handleRestoreResults = () => {
    setState(prev => {
      const isPdfTab = prev.activeTab === 'pdf';
      const restored = isPdfTab ? (prev.closedPdfResults || []) : (prev.closedImageResults || []);
      return {
        ...prev,
        results: [...prev.results, ...restored],
        closedPdfResults: isPdfTab ? [] : (prev.closedPdfResults || []),
        closedImageResults: !isPdfTab ? [] : (prev.closedImageResults || [])
      };
    });
  };

  if (isLoading) return null;

  const currentClosedCount = state.activeTab === 'pdf'
    ? (state.closedPdfResults || []).length
    : (state.closedImageResults || []).length;

  return (
    <ToolPageWrapper
      title="Compress Files"
      description="Reduce file size for PDFs and images while maintaining quality"
      icon={Minimize2}
      onUndo={undo}
      onRedo={redo}
      onClear={() => {
        clear();
        setStatus('idle');
        setError('');
      }}
      canUndo={canUndo}
      canRedo={canRedo}
      preview={
        <PreviewPanel
          originalFile={activeFile}
          results={tabResults}
          activeResultId={state.activeResultId}
          onTabChange={(isOriginal, id) => {
            if (isOriginal) setState(prev => ({ ...prev, activeResultId: null }));
            else if (id) setState(prev => ({ ...prev, activeResultId: id }));
          }}
          onClose={handleCloseResult}
          onRestore={handleRestoreResults}
          closedCount={currentClosedCount}
        />
      }
      action={
        <div className="w-full space-y-3">
          {/* Action Buttons Row */}
          <div className="flex gap-2">
            {/* Compress Button */}
            <button
              onClick={handleCompress}
              className={`btn-primary shadow-lg shadow-accent-400/20 py-3 transition-all ${activeResult ? 'flex-1' : 'w-full'}`}
              disabled={!activeFile || status === 'processing'}
            >
              {status === 'processing' ? 'Compressing...' : (activeResult ? 'Compress Again' : `Compress ${state.activeTab === 'pdf' ? 'PDF' : 'Image'}`)}
            </button>

            {/* Save/Download Actions (Only if result is ACTIVE) */}
            {activeResult && status === 'done' && (
              <div className="flex gap-2 animate-fade-in text-nowrap">
                <button
                  onClick={() => saveFile(activeResult.blob, activeResult.name)}
                  className="bg-surface-200 hover:bg-surface-300 text-ink rounded-xl px-4 flex items-center justify-center gap-2 font-medium transition-colors cursor-grab active:cursor-grabbing"
                  title="Save File (Drag to move)"
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-file-converter-result', 'true');
                    const fileToDrop = activeResult.blob instanceof File ? activeResult.blob : new File([activeResult.blob], activeResult.name);
                    // @ts-ignore
                    window.__draggedResultFile = fileToDrop;
                  }}
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Save</span>
                </button>
                <button
                  onClick={() => downloadBlob(activeResult.blob, activeResult.name)}
                  className="bg-accent-400 text-surface-50 hover:bg-accent-500 rounded-xl px-4 flex items-center justify-center gap-2 font-bold transition-colors shadow-lg shadow-accent-400/20"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Download</span>
                </button>
              </div>
            )}
          </div>

          <ProcessingResult
            status={status}
            result={activeResult?.blob}
            filename={activeResult?.name}
            error={error}
            resultSize={activeResult?.blob.size}
            originalSize={activeFile?.size}
          />
        </div>
      }
    >
      <div className="space-y-6">
        {/* Tab Switcher */}
        <div className="flex p-1 bg-surface-200 rounded-xl">
          <button
            onClick={() => setState(prev => ({ ...prev, activeTab: 'pdf' }))}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all
              ${state.activeTab === 'pdf' ? 'bg-surface-50 text-accent-500 shadow-sm' : 'text-ink-muted hover:text-ink'}`}
          >
            <FileText className="w-4 h-4" />
            PDF Compression
          </button>
          <button
            onClick={() => setState(prev => ({ ...prev, activeTab: 'image' }))}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all
              ${state.activeTab === 'image' ? 'bg-surface-50 text-accent-500 shadow-sm' : 'text-ink-muted hover:text-ink'}`}
          >
            <FileImage className="w-4 h-4" />
            Image Compression
          </button>
        </div>

        <FileDropzone
          onFilesSelected={handleFiles}
          accept={{
            'application/pdf': ['.pdf'],
            'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff', '.avif', '.heic', '.heif']
          }}
          label={`Drop your ${state.activeTab === 'pdf' ? 'PDF' : 'Image'} here`}
          hint={state.activeTab === 'pdf' ? 'PDF files only' : 'PNG, JPG, WebP, GIF, TIFF, AVIF, HEIC'}
        />

        {activeFile && (
          <div className="p-6 rounded-2xl bg-surface-100 border border-surface-300 space-y-5 animate-fade-in">
            {/* PDF Options */}
            {state.activeTab === 'pdf' && (
              <div>
                <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-3 block">
                  Compression level
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {PDF_QUALITIES.map(q => (
                    <button
                      key={q.value}
                      onClick={() => setState(prev => ({ ...prev, pdfQuality: q.value }))}
                      className={`p-4 rounded-xl text-left transition-all border
                        ${state.pdfQuality === q.value
                          ? 'bg-accent-400 text-surface-50 border-accent-400'
                          : 'bg-surface-200 text-ink border-surface-300 hover:border-surface-400'}`}
                    >
                      <p className={`text-sm font-medium ${state.pdfQuality === q.value ? 'text-surface-50' : 'text-ink'}`}>{q.label}</p>
                      <p className={`text-[11px] mt-0.5 ${state.pdfQuality === q.value ? 'text-surface-200' : 'text-ink-faint'}`}>{q.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Image Options */}
            {state.activeTab === 'image' && (
              <>
                <div>
                  <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-3 block">
                    Quality level
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {IMAGE_QUALITIES.map(q => (
                      <button
                        key={q.value}
                        onClick={() => setState(prev => ({ ...prev, imageQuality: q.value }))}
                        className={`p-4 rounded-xl text-left transition-all border
                          ${state.imageQuality === q.value
                            ? 'bg-accent-400 text-surface-50 border-accent-400'
                            : 'bg-surface-200 text-ink border-surface-300 hover:border-surface-400'}`}
                      >
                        <p className={`text-sm font-medium ${state.imageQuality === q.value ? 'text-surface-50' : 'text-ink'}`}>{q.label}</p>
                        <p className={`text-[11px] mt-0.5 ${state.imageQuality === q.value ? 'text-surface-200' : 'text-ink-faint'}`}>{q.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-3 block">
                    Output format
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {IMAGE_FORMATS.map(f => (
                      <button
                        key={f.value}
                        onClick={() => setState(prev => ({ ...prev, imageFormat: f.value }))}
                        className={`p-4 rounded-xl text-left transition-all border
                          ${state.imageFormat === f.value
                            ? 'bg-accent-400 text-surface-50 border-accent-400'
                            : 'bg-surface-200 text-ink border-surface-300 hover:border-surface-400'}`}
                      >
                        <p className={`text-sm font-medium ${state.imageFormat === f.value ? 'text-surface-50' : 'text-ink'}`}>{f.label}</p>
                        <p className={`text-[11px] mt-0.5 ${state.imageFormat === f.value ? 'text-surface-200' : 'text-ink-faint'}`}>{f.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </ToolPageWrapper>
  );
}
