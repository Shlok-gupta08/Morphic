import { useState } from 'react';
import { useModuleState } from '@/hooks/useModuleState';
import { Droplets, Save, Download } from 'lucide-react';
import ToolPageWrapper from '@/components/shared/ToolPageWrapper';
import FileDropzone from '@/components/shared/FileDropzone';
import ProcessingResult, { type ProcessingStatus } from '@/components/shared/ProcessingResult';
import PreviewPanel, { type PreviewResult } from '@/components/shared/PreviewPanel';
import { addWatermark as apiAddWatermark, saveFile, downloadBlob } from '@/services/api';

interface WatermarkState {
  files: File[];
  text: string;
  fontSize: number;
  opacity: number;
  rotation: number;
  results: PreviewResult[];
  activeResultId: string | null;
  closedResults: PreviewResult[];
}

export default function Watermark() {
  const { state, setState, undo, redo, clear, canUndo, canRedo, isLoading } = useModuleState<WatermarkState>('watermark', {
    files: [],
    text: 'CONFIDENTIAL',
    fontSize: 48,
    opacity: 15,
    rotation: 45,
    results: [],
    activeResultId: null,
    closedResults: []
  });

  const [status, setStatus] = useState<ProcessingStatus>('idle');
const [error, setError] = useState('');

const activeResult = state.results.find(r => r.id === state.activeResultId);

const handle = async () => {
  if (state.files.length === 0 || !state.text) return;
  setStatus('processing');
  setError('');
  try {
    const blob = await apiAddWatermark(state.files[0], state.text, {
      fontSize: String(state.fontSize),
      opacity: String(state.opacity / 100),
      rotation: String(state.rotation),
    });

    const newResult: PreviewResult = {
      id: crypto.randomUUID(),
      name: `watermarked-${state.files[0].name}`,
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

return (
  <ToolPageWrapper
    title="Add Watermark"
    description="Stamp text across every page of your PDF"
    icon={Droplets}
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
        onClose={handleCloseResult}
        onRestore={handleRestoreResults}
        closedCount={(state.closedResults || []).length}
      />
    }
    action={
      <div className="w-full space-y-3">
        {/* Action Buttons Row */}
        <div className="flex gap-2">
          {/* Watermark Button */}
          <button
            onClick={handle}
            className={`btn-primary shadow-lg shadow-accent-400/20 py-3 transition-all ${activeResult ? 'flex-1' : 'w-full'}`}
            disabled={state.files.length === 0 || !state.text || status === 'processing'}
          >
            {status === 'processing' ? 'Stamping...' : (activeResult ? 'Stamp Again' : 'Add Watermark')}
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
        <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-2 block">Watermark text</label>
        <input
          type="text"
          value={state.text}
          onChange={e => setState(prev => ({ ...prev, text: e.target.value }))}
          className="input-field"
          placeholder="CONFIDENTIAL"
        />
      </div>
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-2 block">Font size</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="12"
              max="120"
              value={state.fontSize}
              onChange={e => setState(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
              className="flex-1 accent-accent-500"
            />
            <input
              type="number"
              min="12"
              max="120"
              value={state.fontSize}
              onChange={e => setState(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
              onBlur={e => {
                const val = Math.max(12, Math.min(120, Number(e.target.value) || 12));
                setState(prev => ({ ...prev, fontSize: val }));
              }}
              className="w-16 px-2 py-1 text-sm text-center rounded-lg bg-surface-200 border border-surface-300 text-ink focus:outline-none focus:ring-1 focus:ring-accent-400 no-spinner"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-2 block">Opacity</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="5"
              max="80"
              value={state.opacity}
              onChange={e => setState(prev => ({ ...prev, opacity: Number(e.target.value) }))}
              className="flex-1 accent-accent-500"
            />
            <div className="relative">
              <input
                type="number"
                min="5"
                max="80"
                value={state.opacity}
                onChange={e => setState(prev => ({ ...prev, opacity: Number(e.target.value) }))}
                onBlur={e => {
                  const val = Math.max(5, Math.min(80, Number(e.target.value) || 5));
                  setState(prev => ({ ...prev, opacity: val }));
                }}
                className="w-16 px-2 py-1 pr-6 text-sm text-center rounded-lg bg-surface-200 border border-surface-300 text-ink focus:outline-none focus:ring-1 focus:ring-accent-400 no-spinner"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink-faint">%</span>
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-2 block">Rotation</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="-90"
              max="90"
              value={state.rotation}
              onChange={e => setState(prev => ({ ...prev, rotation: Number(e.target.value) }))}
              className="flex-1 accent-accent-500"
            />
            <div className="relative">
              <input
                type="number"
                min="-90"
                max="90"
                value={state.rotation}
                onChange={e => setState(prev => ({ ...prev, rotation: Number(e.target.value) }))}
                onBlur={e => {
                  const val = Math.max(-90, Math.min(90, Number(e.target.value) || 0));
                  setState(prev => ({ ...prev, rotation: val }));
                }}
                className="w-16 px-2 py-1 pr-5 text-sm text-center rounded-lg bg-surface-200 border border-surface-300 text-ink focus:outline-none focus:ring-1 focus:ring-accent-400 no-spinner"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink-faint">°</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    )}

  </ToolPageWrapper>
  );
}
