import { useState } from 'react';
import { useModuleState } from '@/hooks/useModuleState';
import { RotateCw, Save, Download } from 'lucide-react';
import ToolPageWrapper from '@/components/shared/ToolPageWrapper';
import FileDropzone from '@/components/shared/FileDropzone';
import ProcessingResult, { type ProcessingStatus } from '@/components/shared/ProcessingResult';
import PreviewPanel, { type PreviewResult } from '@/components/shared/PreviewPanel';
import { rotatePdf, saveFile, downloadBlob } from '@/services/api';

export default function RotatePdf() {
  const { state, setState, undo, redo, clear, canUndo, canRedo, isLoading } = useModuleState<{
    files: File[];
    angle: number;
    results: PreviewResult[];
    activeResultId: string | null;
  }>('rotate-pdf', {
    files: [],
    angle: 90,
    results: [],
    activeResultId: null
  });

  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState('');

  const activeResult = state.results.find(r => r.id === state.activeResultId);

  const handle = async () => {
    if (state.files.length === 0) return;
    setStatus('processing');
    setError('');
    try {
      const blob = await rotatePdf(state.files[0], String(state.angle));

      const newResult: PreviewResult = {
        id: crypto.randomUUID(),
        name: `rotated-${state.files[0].name}`,
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
      title="Rotate Pages"
      description="Rotate all pages in a PDF by a specified angle"
      icon={RotateCw}
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
            {/* Rotate Button */}
            <button
              onClick={handle}
              className={`btn-primary shadow-lg shadow-accent-400/20 py-3 transition-all ${activeResult ? 'flex-1' : 'w-full'}`}
              disabled={state.files.length === 0 || status === 'processing'}
            >
              {status === 'processing' ? 'Rotating...' : (activeResult ? `Rotate ${state.angle}° Again` : `Rotate ${state.angle}°`)}
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
            <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-2 block">Rotation</label>
            <div className="flex gap-3">
              {[90, 180, 270].map(a => (
                <button
                  key={a}
                  onClick={() => setState(prev => ({ ...prev, angle: a }))}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all
                    ${state.angle === a ? 'bg-accent-400 text-surface-50' : 'bg-surface-200 text-ink-muted hover:bg-surface-300'}`}
                >
                  {a}°
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </ToolPageWrapper>
  );
}
