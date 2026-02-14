import { useState } from 'react';
import { useModuleState } from '@/hooks/useModuleState';
import { ScanText, FileText, Image, Save, Download, Check, Copy } from 'lucide-react';
import ToolPageWrapper from '@/components/shared/ToolPageWrapper';
import FileDropzone from '@/components/shared/FileDropzone';
import ProcessingResult, { type ProcessingStatus } from '@/components/shared/ProcessingResult';
import { ocrImage, ocrPdf, saveFile, downloadBlob } from '@/services/api';
import PreviewPanel, { type PreviewResult } from '@/components/shared/PreviewPanel';

const LANGUAGES = [
  { value: 'eng', label: 'English' },
  { value: 'spa', label: 'Spanish' },
  { value: 'fra', label: 'French' },
  { value: 'deu', label: 'German' },
  { value: 'ita', label: 'Italian' },
  { value: 'por', label: 'Portuguese' },
  { value: 'jpn', label: 'Japanese' },
  { value: 'kor', label: 'Korean' },
  { value: 'chi_sim', label: 'Chinese (Simplified)' },
  { value: 'chi_tra', label: 'Chinese (Traditional)' },
  { value: 'ara', label: 'Arabic' },
  { value: 'hin', label: 'Hindi' },
  { value: 'rus', label: 'Russian' },
];

type OcrMode = 'image' | 'pdf';

export default function OcrTool() {
  const { state, setState, undo, redo, clear, canUndo, canRedo, isLoading } = useModuleState<{
    files: File[];
    lang: string;
    mode: OcrMode;
    results: PreviewResult[];
    activeResultId: string | null;

    extractedText: string;
    closedResults: PreviewResult[];
  }>('ocr-tool', {
    files: [],
    lang: 'eng',
    mode: 'image',
    results: [],
    activeResultId: null,

    extractedText: '',
    closedResults: []
  });


  // Transient state (not persisted)
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeResult = state.results.find(r => r.id === state.activeResultId);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(state.extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onFilesSelected = (selected: File[]) => {
    setState(prev => {
      const newState = { ...prev, files: selected };
      if (selected.length > 0) {
        const isPdf = selected[0].type === 'application/pdf' || selected[0].name.toLowerCase().endsWith('.pdf');
        newState.mode = isPdf ? 'pdf' : 'image';
      }
      return newState;
    });
  };

  const handle = async () => {
    if (state.files.length === 0) return;
    setStatus('processing');
    setProgress(0);
    setError('');

    // Clear previous text if any, but keep other state
    setState(prev => ({ ...prev, extractedText: '' }));

    try {
      if (state.mode === 'image') {
        const data = await ocrImage(state.files[0], state.lang);
        setState(prev => ({ ...prev, extractedText: data.text }));
        setStatus('done');
      } else {
        const blob = await ocrPdf(state.files[0], state.lang, setProgress);

        const newResult: PreviewResult = {
          id: crypto.randomUUID(),
          name: `${state.files[0].name.replace(/\.[^.]+$/, '')}_ocr.pdf`,
          blob
        };

        setState(prev => ({
          ...prev,
          results: [newResult, ...prev.results],
          activeResultId: newResult.id
        }));
        setStatus('done');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        'OCR failed. Make sure Tesseract is installed correctly.';
      setError(msg);
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

  if (isLoading) return null; // Or a loading spinner

  return (
    <ToolPageWrapper
      title="OCR — Optical Character Recognition"
      description="Extract text from images or make scanned PDFs searchable"
      icon={ScanText}
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
        state.mode === 'pdf' ? (
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
        ) : state.mode === 'image' && (status === 'done' || status === 'processing') ? (
          <div className="h-full flex flex-col rounded-2xl overflow-hidden" style={{ backgroundColor: 'rgb(var(--surface-100))', border: '1px solid rgb(var(--surface-300))' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgb(var(--surface-300))' }}>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgb(var(--ink-muted))' }}>
                Extracted Text
              </p>
              {state.extractedText && (
                <button
                  onClick={handleCopy}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${copied ? 'bg-green-500/20 text-green-500' : 'hover:bg-surface-300'}`}
                  style={!copied ? {
                    backgroundColor: 'rgb(var(--surface-200))',
                    color: 'rgb(var(--ink-muted))',
                  } : undefined}
                >
                  {copied ? (
                    <><Check className="w-3.5 h-3.5" /> Copied!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copy</>
                  )}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {status === 'processing' ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-accent-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm" style={{ color: 'rgb(var(--ink-muted))' }}>Extracting text...</p>
                  </div>
                </div>
              ) : state.extractedText ? (
                <pre
                  className="text-sm whitespace-pre-wrap font-mono leading-relaxed"
                  style={{ color: 'rgb(var(--ink))' }}
                >
                  {state.extractedText}
                </pre>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm" style={{ color: 'rgb(var(--ink-faint))' }}>No text extracted</p>
                </div>
              )}
            </div>
          </div>
        ) : undefined
      }
      action={
        <div className="w-full space-y-3">
          {/* Action Buttons Row */}
          <div className="flex gap-2">
            {/* Extract/Create Button */}
            <button
              onClick={handle}
              className={`btn-primary shadow-lg shadow-accent-400/20 py-3 transition-all ${activeResult || (state.mode === 'image' && status === 'done') ? 'flex-1' : 'w-full'}`}
              disabled={state.files.length === 0 || status === 'processing'}
            >
              {status === 'processing' ? 'Processing...' : (state.mode === 'image' ? 'Extract Text' : 'Create Searchable PDF')}
            </button>

            {/* Save/Download Actions (Only if result is ACTIVE or Done) */}
            {
              state.mode === 'pdf' && activeResult && status === 'done' && (
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
              )
            }
          </div >

          {
            state.mode === 'pdf' && (
              <ProcessingResult
                status={status}
                result={activeResult?.blob}
                filename={activeResult?.name}
                error={error}
                progress={progress}
              />
            )
          }
          {
            state.mode === 'image' && status === 'error' && (
              <ProcessingResult status="error" error={error} />
            )
          }
        </div >
      }
    >
      <FileDropzone
        onFilesSelected={onFilesSelected}
        accept={{
          'application/pdf': ['.pdf'],
          'image/*': ['.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp', '.webp'],
        }}
        label="Drop an image or PDF here"
        hint="Supports PNG, JPG, TIFF, BMP, WebP, PDF"
      />

      {
        state.files.length > 0 && (
          <div
            className="p-6 rounded-2xl space-y-5"
            style={{
              backgroundColor: 'rgb(var(--surface-100))',
              border: '1px solid rgb(var(--surface-300))',
            }}
          >
            {/* Mode toggle */}
            <div>
              <label
                className="text-xs font-medium uppercase tracking-wider mb-3 block"
                style={{ color: 'rgb(var(--ink-muted))' }}
              >
                Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { value: 'image' as OcrMode, label: 'Extract Text', desc: 'Get plain text from image', icon: Image },
                  { value: 'pdf' as OcrMode, label: 'Searchable PDF', desc: 'Add text layer to scanned PDF', icon: FileText },
                ].map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setState(prev => ({ ...prev, mode: m.value }))}
                    className="p-4 rounded-xl text-left transition-all border flex items-start gap-3"
                    style={{
                      backgroundColor:
                        state.mode === m.value ? 'rgb(var(--accent-50))' : 'rgb(var(--surface-200))',
                      borderColor:
                        state.mode === m.value ? 'rgb(var(--accent-400))' : 'rgb(var(--surface-300))',
                    }}
                  >
                    <m.icon
                      className="w-5 h-5 shrink-0 mt-0.5"
                      style={{
                        color: state.mode === m.value ? 'rgb(var(--accent-400))' : 'rgb(var(--ink-faint))',
                      }}
                    />
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{
                          color: state.mode === m.value ? 'rgb(var(--accent-400))' : 'rgb(var(--ink))',
                        }}
                      >
                        {m.label}
                      </p>
                      <p
                        className="text-[11px] mt-0.5"
                        style={{ color: 'rgb(var(--ink-faint))' }}
                      >
                        {m.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <label
                className="text-xs font-medium uppercase tracking-wider mb-2 block"
                style={{ color: 'rgb(var(--ink-muted))' }}
              >
                Language
              </label>
              <select
                value={state.lang}
                onChange={(e) => setState(prev => ({ ...prev, lang: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  backgroundColor: 'rgb(var(--surface-200))',
                  border: '1px solid rgb(var(--surface-300))',
                  color: 'rgb(var(--ink))',
                }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Button moved to action area */}
          </div>
        )
      }

    </ToolPageWrapper >
  );
}
