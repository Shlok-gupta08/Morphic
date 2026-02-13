import { useState, useMemo } from 'react';
import { useModuleState } from '@/hooks/useModuleState';
import { Scissors, Save, Download } from 'lucide-react';
import ToolPageWrapper from '@/components/shared/ToolPageWrapper';
import FileDropzone from '@/components/shared/FileDropzone';
import ProcessingResult, { type ProcessingStatus } from '@/components/shared/ProcessingResult';
import { removePages, saveFile, downloadBlob } from '@/services/api';
import { PDFDocument } from 'pdf-lib';
import PreviewPanel, { type PreviewResult } from '@/components/shared/PreviewPanel';

/* ── Range parser: "1-5, 7, 9-12" → [1,2,3,4,5,7,9,10,11,12] ── */
function parseRanges(input: string, max: number): number[] {
  const pages = new Set<number>();
  const parts = input.split(',').map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.max(1, start); i <= Math.min(max, end); i++) {
          pages.add(i);
        }
      }
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n) && n >= 1 && n <= max) {
        pages.add(n);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

export default function RemovePages() {
  const { state, setState, undo, redo, clear, canUndo, canRedo, isLoading } = useModuleState<{
    files: File[];
    rangeInput: string;
    totalPages: number;
    results: PreviewResult[];
    activeResultId: string | null;
    closedResults: PreviewResult[];
  }>('remove-pages', {
    files: [],
    rangeInput: '',
    totalPages: 0,
    results: [],
    activeResultId: null,
    closedResults: []
  });

  const [status, setStatus] = useState<ProcessingStatus>('idle');
const [error, setError] = useState('');
const [progress, setProgress] = useState(0);

const activeResult = state.results.find(r => r.id === state.activeResultId);

// Read total page count when file is selected
const onFilesSelected = async (selected: File[]) => {
  // We'll update files first, then async parse
  setState(prev => ({ ...prev, files: selected, rangeInput: '', totalPages: 0 }));

  if (selected.length > 0) {
    try {
      const bytes = await selected[0].arrayBuffer();
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      setState(prev => ({ ...prev, totalPages: pdf.getPageCount() }));
    } catch {
      // If we can't read it, that's OK — let the server handle it
      setState(prev => ({ ...prev, totalPages: 0 }));
    }
  }
};

const parsed = useMemo(
  () => parseRanges(state.rangeInput, state.totalPages || 9999),
  [state.rangeInput, state.totalPages]
);

const handle = async () => {
  if (state.files.length === 0 || parsed.length === 0) return;
  setStatus('processing');
  setProgress(0);
  setError('');
  try {
    const blob = await removePages(state.files[0], parsed.join(','));

    const newResult: PreviewResult = {
      id: crypto.randomUUID(),
      name: `${state.files[0].name.replace('.pdf', '')}_trimmed.pdf`,
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
    title="Remove Pages"
    description="Delete specific pages or page ranges from a PDF"
    icon={Scissors}
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
          {/* Remove Button */}
          <button
            onClick={handle}
            className={`btn-primary shadow-lg shadow-accent-400/20 py-3 transition-all ${activeResult ? 'flex-1' : 'w-full'}`}
            disabled={parsed.length === 0 || status === 'processing'}
          >
            {status === 'processing' ? 'Removing Pages...' : (activeResult ? `Remove ${parsed.length} Page${parsed.length !== 1 ? 's' : ''} Again` : `Remove ${parsed.length} Page${parsed.length !== 1 ? 's' : ''}`)}
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
        />
      </div>
    }
  >
    <FileDropzone
      onFilesSelected={onFilesSelected}
      accept={{ 'application/pdf': ['.pdf'] }}
      label="Drop your PDF here"
    />

    {state.files.length > 0 && (
      <div
        className="p-6 rounded-2xl space-y-5"
        style={{
          backgroundColor: 'rgb(var(--surface-100))',
          border: '1px solid rgb(var(--surface-300))',
        }}
      >
        {state.totalPages > 0 && (
          <p className="text-xs" style={{ color: 'rgb(var(--ink-faint))' }}>
            This PDF has <span className="font-semibold" style={{ color: 'rgb(var(--ink))' }}>{state.totalPages}</span> pages
          </p>
        )}

        <div>
          <label
            className="text-xs font-medium uppercase tracking-wider mb-2 block"
            style={{ color: 'rgb(var(--ink-muted))' }}
          >
            Pages to remove
          </label>
          <input
            type="text"
            value={state.rangeInput}
            onChange={(e) => setState(prev => ({ ...prev, rangeInput: e.target.value }))}
            placeholder="e.g. 1-5, 7, 9-12"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
            style={{
              backgroundColor: 'rgb(var(--surface-200))',
              border: '1px solid rgb(var(--surface-300))',
              color: 'rgb(var(--ink))',
              '--tw-ring-color': 'rgb(var(--accent-400) / 0.4)',
            } as any}
          />
          <p className="text-[11px] mt-2" style={{ color: 'rgb(var(--ink-faint))' }}>
            Use commas to separate individual pages and dashes for ranges.
            {parsed.length > 0 && (
              <span className="ml-1" style={{ color: 'rgb(var(--accent-400))' }}>
                — Will remove {parsed.length} page{parsed.length !== 1 ? 's' : ''}: [{parsed.join(', ')}]
              </span>
            )}
          </p>
        </div>

        {/* Visual page grid */}
        {state.totalPages > 0 && state.totalPages <= 100 && (
          <div>
            <label
              className="text-xs font-medium uppercase tracking-wider mb-2 block"
              style={{ color: 'rgb(var(--ink-muted))' }}
            >
              Click pages to toggle
            </label>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: state.totalPages }, (_, i) => i + 1).map((page) => {
                const isSelected = parsed.includes(page);
                return (
                  <button
                    key={page}
                    onClick={() => {
                      const current = state.rangeInput
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean);
                      if (isSelected) {
                        // Remove this page from input
                        const filtered = current.filter((s) => {
                          if (s.includes('-')) return true; // Keep ranges, user can fix
                          return parseInt(s, 10) !== page;
                        });
                        setState(prev => ({ ...prev, rangeInput: filtered.join(', ') }));
                      } else {
                        current.push(String(page));
                        setState(prev => ({ ...prev, rangeInput: current.join(', ') }));
                      }
                    }}
                    className="w-8 h-8 rounded-lg text-[11px] font-medium transition-all"
                    style={{
                      backgroundColor: isSelected
                        ? 'rgb(var(--accent-400))'
                        : 'rgb(var(--surface-200))',
                      color: isSelected ? '#fff' : 'rgb(var(--ink-muted))',
                      border: `1px solid ${isSelected ? 'rgb(var(--accent-400))' : 'rgb(var(--surface-300))'}`,
                    }}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    )}

  </ToolPageWrapper>
);
}
