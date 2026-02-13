import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, RotateCw, Trash2, type LucideIcon } from 'lucide-react';

interface ToolPageWrapperProps {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Left pane: file upload, file list, options */
  children: ReactNode;
  /** Right pane: preview panel — rendered large on the right */
  preview?: ReactNode;
  /** Action button + result — rendered at top of right pane */
  action?: ReactNode;

  /* Persistence / History */
  onUndo?: () => void;
  onRedo?: () => void;
  onClear?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export default function ToolPageWrapper({
  title, description, icon: Icon, children, preview, action,
  onUndo, onRedo, onClear, canUndo, canRedo
}: ToolPageWrapperProps) {
  return (
    <div className="tool-layout">
      {/* ─── Left pane — upload + controls ─── */}
      <div className="tool-left pt-6">
        {/* Breadcrumb */}
        {/* Breadcrumb */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs mb-5 px-3 py-2 -ml-3 rounded-lg transition-colors hover:bg-surface-200 text-ink-muted hover:text-ink w-fit relative z-10 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgb(var(--surface-200))' }}
            >
              <Icon className="w-4.5 h-4.5" style={{ color: 'rgb(var(--accent-400))' }} />
            </div>
            <div className="min-w-0">
              <h1
                className="text-xl font-display font-bold tracking-tight"
                style={{ color: 'rgb(var(--ink))' }}
              >
                {title}
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--ink-muted))' }}>
                {description}
              </p>
            </div>
          </div>

          {/* Module Persistence Controls */}
          {(onUndo || onRedo || onClear) && (
            <div className="flex items-center gap-1 bg-surface-200/50 p-1 rounded-lg">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-surface-300 text-ink-muted hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Undo"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-surface-300 text-ink-muted hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Redo"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-surface-300 mx-1" />
              <button
                onClick={onClear}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-500/10 text-ink-muted hover:text-red-500 transition-all"
                title="Reset"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {children}
        </div>
      </div>

      {/* ─── Right pane — action + preview ─── */}
      {(preview || action) && (
        <div className="tool-right pt-6">
          {action && <div className="tool-action mb-4">{action}</div>}
          {preview && <div className="tool-preview flex-1 min-h-0">{preview}</div>}
        </div>
      )}
    </div>
  );
}
