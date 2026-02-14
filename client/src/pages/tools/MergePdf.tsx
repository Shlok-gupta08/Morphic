import { useState, useCallback } from 'react';
import { useModuleState } from '@/hooks/useModuleState';
import { Merge, Plus, Download, Save, Upload } from 'lucide-react';
import { AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import ToolPageWrapper from '@/components/shared/ToolPageWrapper';
import ProcessingResult from '@/components/shared/ProcessingResult';
import { mergePdfs, saveFile, downloadBlob } from '@/services/api';
import { useDropzone } from 'react-dropzone';
import PreviewPanel, { type PreviewResult } from '@/components/shared/PreviewPanel';
import { useFileManager } from '@/contexts/FileManagerContext';  // Import context
import { GripVertical, X } from 'lucide-react';

interface OrderedFile {
  id: string;
  file: File;
}

// Utility function - moved outside component for DraggableItem access
const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

export default function MergePdf() {
  const { sets } = useFileManager(); // Get sets for drag-drop lookup
  const { state, setState, undo, redo, clear, canUndo, canRedo, isLoading } = useModuleState<{
    items: OrderedFile[];
    results: PreviewResult[];
    activeResultId: string | null;
    selectedInputId: string | null;
    closedResults: PreviewResult[];
  }>('merge-pdf', {
    items: [],
    results: [],
    activeResultId: null,
    selectedInputId: null,
    closedResults: []
  });

  const [isProcessing, setIsProcessing] = useState(false);
const [error, setError] = useState('');
const [progress, setProgress] = useState(0);

const activeResult = state.results.find(r => r.id === state.activeResultId);

// If a specific Result is active, we show that.
// Otherwise if an Input is selected, show that.
// Default to first input if nothing else.
// We pass 'activeResultId' to PreviewPanel. 
// PreviewPanel logic: if activeResultId is set, show that tab. If not, show original.

const previewOriginalFile = state.selectedInputId
  ? state.items.find(i => i.id === state.selectedInputId)?.file
  : state.items[0]?.file;

const onDrop = useCallback((accepted: File[]) => {
  const newItems = accepted.map((file) => ({
    id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
  }));

  setState(prev => {
    const updatedItems = [...prev.items, ...newItems];
    let newSelectedId = prev.selectedInputId;
    if (!newSelectedId && newItems.length > 0) {
      if (prev.items.length === 0) newSelectedId = newItems[0].id;
    }
    return { ...prev, items: updatedItems, selectedInputId: newSelectedId };
  });
}, [state.items.length, state.selectedInputId]); // Relying on state from closure might be stale if not careful, but setState callback is safe. Dependency array is mostly for re-creating callback.

const { getRootProps, getInputProps, isDragActive } = useDropzone({
  onDrop,
  accept: { 'application/pdf': ['.pdf'] },
  multiple: true,
  noClick: false
});

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();

  // 1. Check for File Drag (internal hack)
  // @ts-ignore
  const internalFile = window.__draggedFile as File;
  if (internalFile) {
    onDrop([internalFile]);
    // @ts-ignore
    window.__draggedFile = null;
    return;
  }

  // 2. Check for Set Drag (internal hack via window global)
  // @ts-ignore
  const setId = window.__draggedSetId;
  if (setId) {
    const set = sets.find(s => s.id === setId);
    if (set && set.files.length > 0) {
      // Files are now StoredFile[], map them to File[]
      onDrop(set.files.map(f => f.file));
    }
    // @ts-ignore
    window.__draggedSetId = null;
  }
};

const removeItem = (id: string) => {
  setState(prev => {
    const newItems = prev.items.filter((item) => item.id !== id);
    let newSelectedId = prev.selectedInputId;
    if (newSelectedId === id) newSelectedId = null;
    return { ...prev, items: newItems, selectedInputId: newSelectedId };
  });
};

const handleMerge = async () => {
  if (state.items.length < 2) return;

  setIsProcessing(true);
  setProgress(0);
  setError('');

  try {
    const orderedFiles = state.items.map((item) => item.file);
    const blob = await mergePdfs(orderedFiles, setProgress);

    const newResult: PreviewResult = {
      id: crypto.randomUUID(),
      name: `Merged-${state.results.length + 1}.pdf`,
      blob
    };

    setState(prev => ({
      ...prev,
      results: [newResult, ...prev.results],
      activeResultId: newResult.id
    }));
  } catch (err: any) {
    const errorMsg = err.response?.data?.error || err.message;
    setError(errorMsg);
  } finally {
    setIsProcessing(false);
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
    title="Merge PDFs"
    description="Combine multiple PDFs into one. Drag to reorder. Click to preview."
    icon={Merge}
    onUndo={undo}
    onRedo={redo}
    onClear={() => {
      clear();
      setIsProcessing(false);
      setError('');
      setProgress(0);
    }}
    canUndo={canUndo}
    canRedo={canRedo}
    preview={
      <div className="flex flex-col h-full bg-surface-100/50 backdrop-blur-sm rounded-xl overflow-hidden border border-surface-200">
        {/* Preview Panel handles its own tabs for Result 1, Result 2 etc & Original */}
        <PreviewPanel
          originalFile={previewOriginalFile}
          results={state.results}
          activeResultId={state.activeResultId}
          onTabChange={(isOriginal, id) => {
            if (isOriginal) {
              setState(prev => ({ ...prev, activeResultId: null }));
            } else if (id) {
              setState(prev => ({ ...prev, activeResultId: id }));
            }
          }}
          onClose={handleCloseResult}
        onRestore={handleRestoreResults}
        closedCount={(state.closedResults || []).length}
          />
      </div>
    }
    action={
      <div className="w-full space-y-3">
        {/* Action Buttons Row */}
        <div className="flex gap-2">
          {/* Merge Button */}
          <button
            onClick={handleMerge}
            className={`btn-primary shadow-lg shadow-accent-400/20 py-3 transition-all ${activeResult ? 'flex-1' : 'w-full'}`}
            disabled={state.items.length < 2 || isProcessing}
          >
            {isProcessing ? 'Merging...' : (activeResult ? 'Merge Again' : `Merge ${state.items.length} PDFs`)}
          </button>

          {/* Save/Download Actions (Only if result is ACTIVE) */}
          {activeResult && !isProcessing && (
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
          status={isProcessing ? 'processing' : (error ? 'error' : 'idle')}
          progress={progress}
          error={error}
        />
      </div>
    }
  >
    {/* Container for file list & dropzone */}
    <div
      className="space-y-4"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`dropzone-area group ${isDragActive ? 'dropzone-active' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-200"
            style={{
              backgroundColor: isDragActive ? 'rgb(var(--accent-100))' : 'rgb(var(--surface-200))',
              color: isDragActive ? 'rgb(var(--accent-400))' : 'rgb(var(--ink-muted))',
            }}
          >
            <Plus className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium" style={{ color: 'rgb(var(--ink-muted))' }}>
            Drop PDF files here
          </p>
        </div>
      </div>

      {/* Reorderable file list */}
      {/* Reorderable file list */}
      {state.items.length > 0 && (
        <div className="space-y-3">
          {/* Draggable Header for the Group (Matches FileDropzone style) */}
          <div
            draggable={true}
            onDragStart={(e) => {
              e.dataTransfer.setData('application/x-file-converter-module-files', 'true');
              e.dataTransfer.effectAllowed = 'copy';
              // @ts-ignore
              window.__draggedModuleFiles = state.items.map(i => i.file);
            }}
            onDragEnd={() => {
              // @ts-ignore
              window.__draggedModuleFiles = undefined;
            }}
            className="flex items-center gap-2 px-3 py-2 bg-surface-200 border border-surface-300 rounded-xl cursor-grab active:cursor-grabbing hover:border-accent-400 transition-colors select-none group/header shadow-sm"
          >
            <div className="p-1 rounded bg-surface-300 text-ink-muted group-hover/header:text-accent-400 transition-colors">
              <Upload className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted flex-1">
              Input Files ({state.items.length})
            </span>
            <span className="text-[10px] text-ink-faint bg-surface-100 px-1.5 py-0.5 rounded border border-surface-200">
              Drag to Sidebar
            </span>
          </div>

          <div
            className="rounded-2xl overflow-hidden shadow-sm animate-slide-up"
            style={{
              backgroundColor: 'rgb(var(--surface-100))',
              border: '1px solid rgb(var(--surface-200))',
            }}
          >
            <Reorder.Group
              axis="y"
              values={state.items}
              onReorder={(newOrder) => setState(prev => ({ ...prev, items: newOrder }))}
              className="divide-y"
              style={{ '--tw-divide-color': 'rgb(var(--surface-200))' } as any}
            >
              <AnimatePresence initial={false}>
                {state.items.map((item, index) => (
                  <DraggableItem
                    key={item.id}
                    item={item}
                    index={index}
                    isSelected={state.selectedInputId === item.id}
                    onSelect={() => setState(prev => ({ ...prev, selectedInputId: item.id, activeResultId: null }))}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </AnimatePresence>
            </Reorder.Group>
          </div>
          <p className="text-center text-[10px] text-ink-faint">Drag handle to reorder</p>
        </div>
      )}
    </div>
  </ToolPageWrapper>
);
}

// Separate component for draggable items to allow useDragControls per item
function DraggableItem({ item, index, isSelected, onSelect, onRemove }: {
  item: { id: string; file: File };
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`flex items-center gap-3 px-4 py-3 hover:bg-surface-200/50 transition-colors
             ${isSelected ? 'bg-surface-200/80 border-l-2 border-accent-400' : 'border-l-2 border-transparent'}
        `}
      onClick={onSelect}
      whileDrag={{
        backgroundColor: 'rgb(var(--surface-200))',
        boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
        zIndex: 10,
      }}
    >
      <div 
        className="w-5 h-5 shrink-0 text-surface-400 cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={(e) => controls.start(e)}
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <span
        className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 bg-surface-200 text-ink-muted"
      >
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate font-medium ${isSelected ? 'text-accent-400' : 'text-ink'}`}>
          {item.file.name}
        </p>
        <p className="text-[10px] text-ink-faint">
          {formatSize(item.file.size)}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-surface-300 text-ink-faint hover:text-red-400"
      >
        <X className="w-4 h-4" />
      </button>
    </Reorder.Item>
  );
}
