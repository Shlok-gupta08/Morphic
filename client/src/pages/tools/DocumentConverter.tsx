import { useState, useEffect } from 'react';
import { useModuleState } from '@/hooks/useModuleState';
import { FileOutput, ArrowRight, Save, Download } from 'lucide-react';
import ToolPageWrapper from '@/components/shared/ToolPageWrapper';
import FileDropzone from '@/components/shared/FileDropzone';
import ProcessingResult, { type ProcessingStatus } from '@/components/shared/ProcessingResult';
import PreviewPanel, { type PreviewResult } from '@/components/shared/PreviewPanel';
import { convertFile, saveFile, downloadBlob, getSupportedFormats } from '@/services/api';

interface FormatGroup {
  label: string;
  formats: string[];
}

export default function DocumentConverter() {
  const { state, setState, undo, redo, clear, canUndo, canRedo, isLoading } = useModuleState<{
    files: File[];
    targetFormat: string;
    results: PreviewResult[];
    activeResultId: string | null;
    closedResults: PreviewResult[];
  }>('document-converter', {
    files: [],
    targetFormat: '',
    results: [],
    activeResultId: null,
    closedResults: []
  });

  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [supportedFormats, setSupportedFormats] = useState<Record<string, string[]>>({});

  useEffect(() => {
    getSupportedFormats()
      .then((data) => setSupportedFormats(data))
      .catch(() => { });
  }, []);

  const getExtension = (file: File) => file.name.split('.').pop()?.toLowerCase() || '';

  const getAvailableTargets = (): FormatGroup[] => {
    if (state.files.length === 0) return [];
    const ext = getExtension(state.files[0]);

    // Build groups from supported formats
    const targets = supportedFormats[ext] || [];
    if (targets.length === 0) {
      // Provide common defaults if API doesn't have this format
      return [
        { label: 'Documents', formats: ['pdf', 'docx', 'txt', 'html', 'rtf', 'odt'] },
        { label: 'Images', formats: ['png', 'jpg', 'webp', 'svg', 'gif', 'bmp'] },
      ];
    }

    const docFormats = targets.filter((f: string) =>
      ['pdf', 'docx', 'doc', 'txt', 'html', 'rtf', 'odt', 'epub', 'md'].includes(f)
    );
    const imgFormats = targets.filter((f: string) =>
      ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'tiff', 'ico'].includes(f)
    );
    const otherFormats = targets.filter(
      (f: string) => !docFormats.includes(f) && !imgFormats.includes(f)
    );

    const groups: FormatGroup[] = [];
    if (docFormats.length > 0) groups.push({ label: 'Documents', formats: docFormats });
    if (imgFormats.length > 0) groups.push({ label: 'Images', formats: imgFormats });
    if (otherFormats.length > 0) groups.push({ label: 'Other', formats: otherFormats });
    return groups;
  };

  const activeResult = state.results.find(r => r.id === state.activeResultId);

  const handle = async () => {
    if (state.files.length === 0 || !state.targetFormat) return;
    setStatus('processing');
    setProgress(0);
    setError('');

    try {
      const blob = await convertFile(state.files[0], state.targetFormat, {}, setProgress);

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
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Conversion failed. Make sure the required tools are installed.';
      setError(msg);
      setStatus('error');
    }
  };

  const groups = getAvailableTargets();

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
      title="Document Converter"
      description="Convert between document, image, audio and video formats"
      icon={FileOutput}
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
            {/* Convert Button */}
            <button
              onClick={handle}
              className={`btn-primary shadow-lg shadow-accent-400/20 py-3 transition-all ${activeResult ? 'flex-1' : 'w-full'}`}
              disabled={state.files.length === 0 || !state.targetFormat || status === 'processing'}
            >
              {status === 'processing' ? 'Converting...' : (activeResult ? `Convert to ${state.targetFormat.toUpperCase()} Again` : `Convert to ${state.targetFormat?.toUpperCase() || '...'}`)}
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
            progress={progress}
            originalSize={state.files[0]?.size}
            resultSize={activeResult?.blob.size}
          />
        </div>
      }
    >
      <FileDropzone
        onFilesSelected={(selected) => {
          setState(prev => ({
            ...prev,
            files: selected,
            targetFormat: '',
            results: [],
            activeResultId: null
          }));
          setStatus('idle');
        }}
        label="Drop your file here"
        hint="Documents, images, audio, video — we'll figure out the rest"
      />

      {state.files.length > 0 && (
        <div
          className="p-6 rounded-2xl space-y-5"
          style={{
            backgroundColor: 'rgb(var(--surface-100))',
            border: '1px solid rgb(var(--surface-300))',
          }}
        >
          {/* Source info */}
          <div className="flex items-center gap-3">
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold uppercase"
              style={{
                backgroundColor: 'rgb(var(--surface-200))',
                color: 'rgb(var(--ink))',
                border: '1px solid rgb(var(--surface-300))',
              }}
            >
              .{getExtension(state.files[0])}
            </div>
            <ArrowRight className="w-4 h-4" style={{ color: 'rgb(var(--ink-faint))' }} />
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold uppercase"
              style={{
                backgroundColor: state.targetFormat ? 'rgb(var(--accent-50))' : 'rgb(var(--surface-200))',
                color: state.targetFormat ? 'rgb(var(--accent-400))' : 'rgb(var(--ink-faint))',
                border: `1px solid ${state.targetFormat ? 'rgb(var(--accent-400) / 0.3)' : 'rgb(var(--surface-300))'}`,
              }}
            >
              {state.targetFormat ? `.${state.targetFormat}` : '?'}
            </div>
          </div>

          {/* Target format selection */}
          {groups.map((group) => (
            <div key={group.label}>
              <label
                className="text-xs font-medium uppercase tracking-wider mb-2 block"
                style={{ color: 'rgb(var(--ink-faint))' }}
              >
                {group.label}
              </label>
              <div className="flex flex-wrap gap-2">
                {group.formats.map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setState(prev => ({ ...prev, targetFormat: fmt }))}
                    className="px-3 py-2 rounded-lg text-xs font-mono font-medium uppercase transition-all"
                    style={{
                      backgroundColor:
                        state.targetFormat === fmt ? 'rgb(var(--accent-400))' : 'rgb(var(--surface-200))',
                      color: state.targetFormat === fmt ? '#fff' : 'rgb(var(--ink-muted))',
                      border: `1px solid ${state.targetFormat === fmt ? 'rgb(var(--accent-400))' : 'rgb(var(--surface-300))'
                        }`,
                    }}
                  >
                    .{fmt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </ToolPageWrapper>
  );
}
