import { useState } from 'react';
import { useModuleState } from '@/hooks/useModuleState';
import { Layers, Save, Download } from 'lucide-react';
import ToolPageWrapper from '@/components/shared/ToolPageWrapper';
import FileDropzone from '@/components/shared/FileDropzone';
import ProcessingResult, { type ProcessingStatus } from '@/components/shared/ProcessingResult';
import PreviewPanel, { type PreviewResult } from '@/components/shared/PreviewPanel';
import { flattenPdf, saveFile, downloadBlob } from '@/services/api';

export default function FlattenPdf() {
  const { state, setState, undo, redo, clear, canUndo, canRedo, isLoading } = useModuleState<{
    files: File[];
    results: PreviewResult[];
    activeResultId: string | null;
    closedResults: PreviewResult[];
  }>('flatten-pdf', {
    files: [],
    results: [],
    activeResultId: null,
    closedResults: []
  });

  const [status, setStatus] = useState<ProcessingStatus>('idle');
const [error, setError] = useState('');
const [progress, setProgress] = useState(0);

const activeResult = state.results.find(r => r.id === state.activeResultId);

const handle = async () => {
  if (state.files.length === 0) return;
  setStatus('processing');
  setProgress(0); // Reset progress (even if fake)
  setError('');
  try {
    // Simulate progress for UX since flattenPdf doesn't support it yet
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 10, 90));
    }, 200);

    const blob = await flattenPdf(state.files[0]);
    clearInterval(interval);
    setProgress(100);

    const newResult: PreviewResult = {
      id: crypto.randomUUID(),
      name: `flattened-${state.files[0].name}`,
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

  setState(prev => ({
    ...prev,
    results: prev.results.filter(r => r.id !== id),
    closedResults: [...(prev.closedResults || []), resultToClose],
    activeResultId: prev.activeResultId === id ? null : prev.activeResultId
  }));
};

const handleRestoreResults = () => {
  setState(prev => ({
    ...prev,
    results: [...prev.results, ...(prev.closedResults || [])],
    closedResults: []
  }));
};

if (isLoading) return null;

const isProcessing = status === 'processing';

return (
  <ToolPageWrapper
    title="Flatten PDF"
    description="Flatten form fields and annotations into the PDF content"
    icon={Layers}
    onUndo={undo}
    onRedo={redo}
    onClear={() => {
      clear();
      setStatus('idle');
      setError('');
      setProgress(0);
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
        onClose={handleCloseResult}
        onRestore={handleRestoreResults}
        closedCount={(state.closedResults || []).length}
      />
    }
    action={
      <div className="w-full space-y-3">
        {/* Action Buttons Row */}
        <div className="flex gap-2">
          {/* Flatten Button */}
          <button
            onClick={handle}
            className={`btn-primary shadow-lg shadow-accent-400/20 py-3 transition-all ${activeResult ? 'flex-1' : 'w-full'}`}
            disabled={state.files.length === 0 || isProcessing}
          >
            {isProcessing ? 'Flattening...' : (activeResult ? 'Flatten Again' : 'Flatten PDF')}
          </button>

          {/* Save/Download Actions (Only if result is ACTIVE) */}
          {activeResult && !isProcessing && (
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
          progress={progress}
          error={error}
        />
      </div>
    }
  >
    <FileDropzone
      onFilesSelected={(files) => setState(prev => ({ ...prev, files }))}
      accept={{ 'application/pdf': ['.pdf'] }}
      label="Drop your PDF here"
    />

  </ToolPageWrapper>
);
}
