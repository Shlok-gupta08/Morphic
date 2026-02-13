import { useState } from 'react';
import { useModuleState } from '@/hooks/useModuleState';
import { Unlock, Eye, EyeOff, Save, Download } from 'lucide-react';
import ToolPageWrapper from '@/components/shared/ToolPageWrapper';
import FileDropzone from '@/components/shared/FileDropzone';
import ProcessingResult, { type ProcessingStatus } from '@/components/shared/ProcessingResult';
import { removePassword, saveFile, downloadBlob } from '@/services/api';
import PreviewPanel, { type PreviewResult } from '@/components/shared/PreviewPanel';

export default function RemovePassword() {
  const { state, setState, undo, redo, clear, canUndo, canRedo, isLoading } = useModuleState<{
    files: File[];
    password: string;
    results: PreviewResult[];
    activeResultId: string | null;
    closedResults: PreviewResult[];
  }>('remove-password', {
    files: [],
    password: '',
    results: [],
    activeResultId: null,
    closedResults: []
  });

  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const activeResult = state.results.find(r => r.id === state.activeResultId);

  const handle = async () => {
    if (state.files.length === 0 || state.password.length === 0) return;
    setStatus('processing');
    setProgress(0);
    setError('');
    try {
      const blob = await removePassword(state.files[0], state.password, setProgress);

      const newResult: PreviewResult = {
        id: crypto.randomUUID(),
        name: `${state.files[0].name.replace('.pdf', '')}_unlocked.pdf`,
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
        'Failed to remove password. Make sure the password is correct.';
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

  if (isLoading) return null;

  return (
    <ToolPageWrapper
      title="Remove Password"
      description="Unlock a password-protected PDF"
      icon={Unlock}
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
            {/* Remove Password Button */}
            <button
              onClick={handle}
              className={`btn-primary shadow-lg shadow-accent-400/20 py-3 transition-all ${activeResult ? 'flex-1' : 'w-full'}`}
              disabled={state.files.length === 0 || state.password.length === 0 || status === 'processing'}
            >
              {status === 'processing' ? 'Unlocking...' : (activeResult ? 'Unlock Again' : 'Unlock PDF')}
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
        onFilesSelected={(files) => setState(prev => ({ ...prev, files }))}
        accept={{ 'application/pdf': ['.pdf'] }}
        label="Drop your protected PDF here"
      />

      {state.files.length > 0 && (
        <div
          className="p-6 rounded-2xl space-y-5"
          style={{
            backgroundColor: 'rgb(var(--surface-100))',
            border: '1px solid rgb(var(--surface-300))',
          }}
        >
          <div>
            <label
              className="text-xs font-medium uppercase tracking-wider mb-2 block"
              style={{ color: 'rgb(var(--ink-muted))' }}
            >
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={state.password}
                onChange={(e) => setState(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter the PDF password"
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all focus:ring-2"
                style={{
                  backgroundColor: 'rgb(var(--surface-200))',
                  border: '1px solid rgb(var(--surface-300))',
                  color: 'rgb(var(--ink))',
                  '--tw-ring-color': 'rgb(var(--accent-400) / 0.4)',
                } as any}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                style={{ color: 'rgb(var(--ink-faint))' }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

    </ToolPageWrapper>
  );
}
