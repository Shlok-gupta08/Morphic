import { useState } from 'react';
import { useModuleState } from '@/hooks/useModuleState';
import { Image, Save, Download } from 'lucide-react';
import ToolPageWrapper from '@/components/shared/ToolPageWrapper';
import FileDropzone from '@/components/shared/FileDropzone';
import ProcessingResult, { type ProcessingStatus } from '@/components/shared/ProcessingResult';
import PreviewPanel, { type PreviewResult } from '@/components/shared/PreviewPanel';
import { convertFile, saveFile, downloadBlob } from '@/services/api';

const IMAGE_FORMATS = ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'avif', 'gif', 'bmp', 'svg', 'ico', 'pdf'];

export default function ImageConverter() {
  const { state, setState, undo, redo, clear, canUndo, canRedo, isLoading } = useModuleState<{
    files: File[];
    targetFormat: string;
    quality: number;
    width: string;
    height: string;
    results: PreviewResult[];
    activeResultId: string | null;
  }>('image-converter', {
    files: [],
    targetFormat: 'png',
    quality: 90,
    width: '',
    height: '',
    results: [],
    activeResultId: null
  });

  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState('');

  const activeResult = state.results.find(r => r.id === state.activeResultId);

  const handleConvert = async () => {
    if (state.files.length === 0) return;
    setStatus('processing');
    setError('');

    try {
      const opts: Record<string, string> = { quality: String(state.quality) };
      if (state.width) opts.width = state.width;
      if (state.height) opts.height = state.height;

      const blob = await convertFile(state.files[0], state.targetFormat, opts);

      const newResult: PreviewResult = {
        id: crypto.randomUUID(),
        name: `${state.files[0].name.replace(/\.[^.]+$/, '')}.${state.targetFormat}`,
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
      title="Image Converter"
      description="Convert between PNG, JPG, WebP, TIFF, AVIF, GIF, BMP, SVG and more"
      icon={Image}
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
            {/* Convert Button */}
            <button
              onClick={handleConvert}
              className={`btn-primary shadow-lg shadow-accent-400/20 py-3 transition-all ${activeResult ? 'flex-1' : 'w-full'}`}
              disabled={state.files.length === 0 || status === 'processing'}
            >
              {status === 'processing' ? 'Converting...' : (activeResult ? `Convert to .${state.targetFormat.toUpperCase()} Again` : `Convert to .${state.targetFormat.toUpperCase()}`)}
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
        accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.tiff', '.avif', '.gif', '.bmp', '.svg', '.heic', '.heif'] }}
        label="Drop your image here"
        hint="PNG, JPG, WebP, TIFF, AVIF, GIF, BMP, SVG, HEIC"
      />

      {state.files.length > 0 && (
        <div className="p-6 rounded-2xl bg-surface-100 border border-surface-300 space-y-5">
          {/* Format */}
          <div>
            <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-2 block">
              Convert to
            </label>
            <div className="flex flex-wrap gap-2">
              {IMAGE_FORMATS.map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setState(prev => ({ ...prev, targetFormat: fmt }))}
                  className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wider transition-all
                    ${state.targetFormat === fmt
                      ? 'bg-accent-600 text-white'
                      : 'bg-surface-200 text-ink-muted hover:bg-surface-300 hover:text-ink'}`}
                >
                  .{fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div>
            <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-2 block">
              Quality: {state.quality}%
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={state.quality}
              onChange={e => setState(prev => ({ ...prev, quality: Number(e.target.value) }))}
              className="w-full accent-accent-500"
            />
          </div>

          {/* Resize */}
          <div>
            <label className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-2 block">
              Resize (optional)
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                placeholder="Width"
                value={state.width}
                onChange={e => setState(prev => ({ ...prev, width: e.target.value }))}
                className="input-field"
              />
              <span className="flex items-center text-ink-faint text-sm">×</span>
              <input
                type="number"
                placeholder="Height"
                value={state.height}
                onChange={e => setState(prev => ({ ...prev, height: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>
        </div>
      )}

    </ToolPageWrapper>
  );
}
