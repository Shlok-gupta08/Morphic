import { useState } from 'react';
import { useModuleState } from '@/hooks/useModuleState';
import { Lock, Eye, EyeOff, Save, Download } from 'lucide-react';
import ToolPageWrapper from '@/components/shared/ToolPageWrapper';
import FileDropzone from '@/components/shared/FileDropzone';
import ProcessingResult, { type ProcessingStatus } from '@/components/shared/ProcessingResult';
import { addPassword, saveFile, downloadBlob } from '@/services/api';
import PreviewPanel, { type PreviewResult } from '@/components/shared/PreviewPanel';

interface AddPasswordState {
  files: File[];
  password: string;
  confirmPassword: string;
  results: PreviewResult[];
  activeResultId: string | null;
}

export default function AddPassword() {
  const { state, setState, undo, redo, clear, canUndo, canRedo, isLoading } = useModuleState<AddPasswordState>('add-password', {
    files: [],
    password: '',
    confirmPassword: '',
    results: [],
    activeResultId: null
  });

  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const passwordsMatch = state.password.length > 0 && state.password === state.confirmPassword;
  const activeResult = state.results.find(r => r.id === state.activeResultId);

  const handle = async () => {
    if (state.files.length === 0 || !passwordsMatch) return;
    setStatus('processing');
    setProgress(0);
    setError('');
    try {
      const blob = await addPassword(state.files[0], state.password, setProgress);

      const newResult: PreviewResult = {
        id: crypto.randomUUID(),
        name: `${state.files[0].name.replace('.pdf', '')}_protected.pdf`,
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
        'Failed to add password. The PDF may already be encrypted.';
      setError(msg);
      setStatus('error');
    }
  };

  if (isLoading) return null;

  return (
    <ToolPageWrapper
      title="Add Password"
      description="Protect your PDF with a password"
      icon={Lock}
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
        />
      }
      action={
        <div className="w-full space-y-3">
          {/* Action Buttons Row */}
          <div className="flex gap-2">
            {/* Encrypt Button */}
            <button
              onClick={handle}
              className={`btn-primary shadow-lg shadow-accent-400/20 py-3 transition-all ${activeResult ? 'flex-1' : 'w-full'}`}
              disabled={state.files.length === 0 || !passwordsMatch || status === 'processing'}
            >
              {status === 'processing' ? 'Encrypting...' : (activeResult ? 'Encrypt Again' : 'Encrypt PDF')}
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
          {/* Password input */}
          <div>
            <label
              className="text-xs font-medium uppercase tracking-wider mb-2 block"
              style={{ color: 'rgb(var(--ink-muted))' }}
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={state.password}
                onChange={(e) => setState(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password"
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

          {/* Confirm password */}
          <div>
            <label
              className="text-xs font-medium uppercase tracking-wider mb-2 block"
              style={{ color: 'rgb(var(--ink-muted))' }}
            >
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={state.confirmPassword}
              onChange={(e) => setState(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Confirm password"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
              style={{
                backgroundColor: 'rgb(var(--surface-200))',
                border: '1px solid rgb(var(--surface-300))',
                color: 'rgb(var(--ink))',
                '--tw-ring-color': 'rgb(var(--accent-400) / 0.4)',
              } as any}
            />
            {state.confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-red-400 mt-1.5">Passwords don't match</p>
            )}
          </div>

          {/* Password strength hint */}
          {state.password.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgb(var(--surface-300))' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (state.password.length / 12) * 100)}%`,
                    backgroundColor:
                      state.password.length < 4
                        ? '#ef4444'
                        : state.password.length < 8
                          ? '#f59e0b'
                          : '#10b981',
                  }}
                />
              </div>
              <span className="text-[10px]" style={{ color: 'rgb(var(--ink-faint))' }}>
                {state.password.length < 4 ? 'Weak' : state.password.length < 8 ? 'Fair' : 'Strong'}
              </span>
            </div>
          )}
        </div>
      )}
    </ToolPageWrapper>
  );
}
