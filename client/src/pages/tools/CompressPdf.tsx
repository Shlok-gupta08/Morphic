import { useState } from 'react';
import { useModuleState } from '@/hooks/useModuleState';
import { Minimize2, Save, Download } from 'lucide-react';
import ToolPageWrapper from '@/components/shared/ToolPageWrapper';
import FileDropzone from '@/components/shared/FileDropzone';
import ProcessingResult, { type ProcessingStatus } from '@/components/shared/ProcessingResult';
import PreviewPanel, { type PreviewResult } from '@/components/shared/PreviewPanel';
import { compressPdf, saveFile, downloadBlob } from '@/services/api';

const QUALITIES = [
  { value: 'screen', label: 'Maximum', description: 'Smallest file, lower quality' },
  { value: 'ebook', label: 'Balanced', description: 'Good quality, smaller file' },
  { value: 'printer', label: 'High', description: 'High quality, moderate size' },
  { value: 'prepress', label: 'Minimal', description: 'Best quality, slight reduction' },
];

export default function CompressPdf() {
  const { state, setState, undo, redo, clear, canUndo, canRedo, isLoading } = useModuleState<{
    files: File[];
    quality: string;
    results: PreviewResult[];
    activeResultId: string | null;
  }>('compress-pdf', {
    files: [],
    quality: 'ebook',
    results: [],
    activeResultId: null
  });

  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState('');

  const activeResult = state.results.find(r => r.id === state.activeResultId);

  const handle = async () => {
    if (state.files.length === 0) return;
    setStatus('processing');
    try {
      const blob = await compressPdf(state.files[0], state.quality);

      const newResult: PreviewResult = {
        id: crypto.randomUUID(),
        name: `compressed-${state.files[0].name}`,
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

  if (isLoading) return null;

  return (
    <ToolPageWrapper
      title="Compress PDF"
      description="Reduce PDF file size while maintaining quality"
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
          originalFile={state.files[0]}
          results={state.results}
          activeResultId={state.activeResultId}
          onTabChange={(isOriginal, id) => {
            if (isOriginal) setState(prev => ({ ...prev, activeResultId: null }));
            else if (id) setState(prev => ({ ...prev, activeResultId: id }));
          }}
        />
      }
      action={
        <div className="w-full space-y-3">
          {/* Action Buttons Row */}
          <div className="flex gap-2">
            {/* Compress Button */}
            <button
              onClick={handle}
              className={`btn-primary shadow-lg shadow-accent-400/20 py-3 transition-all ${activeResult ? 'flex-1' : 'w-full'}`}
              disabled={state.files.length === 0 || status === 'processing'}
            >
              {status === 'processing' ? 'Compressing...' : (activeResult ? 'Compress Again' : 'Compress PDF')}
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
            originalSize={state.files[0]?.size}
          />
        </div>
      }
    >
      <FileDropzone
        onFilesSelected={(files) => setState(prev => ({ ...prev, files }))}
        accept={{ 'application/pdf': ['.pdf'] }}
        label="Drop your PDF here"
      />

      {state.files.length > 0 && (
        <div className="p-6 rounded-2xl bg-surface-100 border border-surface-300 space-y-5">
          <div>
            <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-3 block">Compression level</label>
            <div className="grid grid-cols-2 gap-3">
              {QUALITIES.map(q => (
                <button
                  key={q.value}
                  onClick={() => setState(prev => ({ ...prev, quality: q.value }))}
                  className={`p-4 rounded-xl text-left transition-all border
                    ${state.quality === q.value
                      ? 'bg-accent-600 text-white border-accent-600'
                      : 'bg-surface-200 text-ink border-surface-300 hover:border-surface-400'}`}
                >
                  <p className={`text-sm font-medium ${state.quality === q.value ? 'text-white' : 'text-ink'}`}>{q.label}</p>
                  <p className={`text-[11px] mt-0.5 ${state.quality === q.value ? 'text-accent-200' : 'text-ink-faint'}`}>{q.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </ToolPageWrapper>
  );
}
