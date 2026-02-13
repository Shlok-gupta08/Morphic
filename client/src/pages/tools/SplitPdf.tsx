import { useState } from 'react';
import { useModuleState } from '@/hooks/useModuleState';
import { Scissors, Save, Download } from 'lucide-react';
import ToolPageWrapper from '@/components/shared/ToolPageWrapper';
import FileDropzone from '@/components/shared/FileDropzone';
import ProcessingResult, { type ProcessingStatus } from '@/components/shared/ProcessingResult';
import { splitPdf, saveFile, downloadBlob } from '@/services/api';
import PreviewPanel, { type PreviewResult } from '@/components/shared/PreviewPanel';

export default function SplitPdf() {
  const { state, setState, undo, redo, clear, canUndo, canRedo, isLoading } = useModuleState<{
    files: File[];
    mode: 'all' | 'ranges';
    ranges: string;
    results: PreviewResult[];
    activeResultId: string | null;
  }>('split-pdf', {
    files: [],
    mode: 'all',
    ranges: '',
    results: [],
    activeResultId: null
  });

  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState('');

  const activeResult = state.results.find(r => r.id === state.activeResultId);
  const isZip = activeResult?.blob && activeResult.blob.type === 'application/zip';

  const handleSplit = async () => {
    if (state.files.length === 0) return;
    setStatus('processing');
    setError('');

    try {
      const blob = await splitPdf(state.files[0], state.mode === 'all' ? 'all' : state.ranges);

      const newResult: PreviewResult = {
        id: crypto.randomUUID(),
        name: blob.type === 'application/zip' ? 'split-pages.zip' : `split-${state.files[0].name}`,
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
      title="Split PDF"
      description="Split a PDF into separate pages or page ranges"
      icon={Scissors}
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
            {/* Split Button */}
            <button
              onClick={handleSplit}
              className={`btn-primary shadow-lg shadow-accent-400/20 py-3 transition-all ${activeResult ? 'flex-1' : 'w-full'}`}
              disabled={state.files.length === 0 || status === 'processing' || (state.mode === 'ranges' && !state.ranges.trim())}
            >
              {status === 'processing' ? 'Splitting...' : (activeResult ? 'Split Again' : 'Split PDF')}
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
          {/* Mode */}
          <div className="flex gap-3">
            <button
              onClick={() => setState(prev => ({ ...prev, mode: 'all' }))}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all
                ${state.mode === 'all' ? 'bg-accent-600 text-white' : 'bg-surface-200 text-ink-muted hover:bg-surface-300'}`}
            >
              Every Page
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, mode: 'ranges' }))}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all
                ${state.mode === 'ranges' ? 'bg-accent-600 text-white' : 'bg-surface-200 text-ink-muted hover:bg-surface-300'}`}
            >
              Custom Ranges
            </button>
          </div>

          {state.mode === 'ranges' && (
            <div>
              <input
                type="text"
                placeholder="e.g. 1-3;4-6;7-10"
                value={state.ranges}
                onChange={e => setState(prev => ({ ...prev, ranges: e.target.value }))}
                className="input-field"
              />
              <p className="text-[11px] text-ink-faint mt-2">
                Use semicolons to create separate PDFs. Use commas or hyphens for page ranges.
              </p>
            </div>
          )}
        </div>
      )}

    </ToolPageWrapper>
  );
}
