import { CheckCircle2, Download, AlertCircle, Loader2, Save } from 'lucide-react';
import { saveFile, downloadBlob } from '@/services/api';
import ProgressBar from './ProgressBar';

export type ProcessingStatus = 'idle' | 'processing' | 'done' | 'error';

interface ProcessingResultProps {
  status: ProcessingStatus;
  result?: Blob | null;
  filename?: string;
  error?: string;
  originalSize?: number;
  resultSize?: number;
  progress?: number;
}

export default function ProcessingResult({
  status,
  result,
  filename = 'output',
  error,
  originalSize,
  resultSize,
  progress = 0,
}: ProcessingResultProps) {
  if (status === 'idle') return null;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="mt-6">
      {/* Processing state with progress bar */}
      {status === 'processing' && (
        <div
          className="p-5 rounded-xl space-y-4"
          style={{
            backgroundColor: 'rgb(var(--surface-200))',
            border: '1px solid rgb(var(--surface-300))',
          }}
        >
          <div className="flex items-center gap-4">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'rgb(var(--accent-400))' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'rgb(var(--ink))' }}>Processing your file...</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--ink-faint))' }}>
                This may take a moment for large files
              </p>
            </div>
          </div>
          <ProgressBar progress={progress} label="Progress" />
        </div>
      )}

      {/* Done state - REMOVED as per user request to save space. 
          The Save/Download buttons are now in the action row.
      */}

      {/* Error state */}
      {status === 'error' && (
        <div
          className="p-5 rounded-2xl"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
            >
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-300">Something went wrong</p>
              <p className="text-xs text-red-400 mt-1">{error || 'An unexpected error occurred. Please try again.'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
