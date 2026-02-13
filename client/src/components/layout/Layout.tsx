import { useState, useCallback, useEffect, memo } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useFileManager, type FileSet, type StoredFile } from '@/contexts/FileManagerContext';
import { useDropzone } from 'react-dropzone';
import {
  PanelLeftClose, PanelLeftOpen,
  FileText, Plus, Trash2, Edit2, Upload, ChevronRight, GripVertical, Save, RotateCcw, RotateCw, Menu, X
} from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion';
import ConfirmDialog from '../shared/ConfirmDialog';

/* ═══════════════════════════════════════════════════════════════
   LAYOUT — sidebar (file uploader) + main content
   ═══════════════════════════════════════════════════════════════ */

export default function Layout() {
  const {
    isOpen, toggleOpen, sets, addSet, removeSet,
    renameSet, addFilesToSet, addResultFileToSet, removeFileFromSet, updateSets,
    moveFileBetweenSets, createSetWithFiles,
    undo, redo, canUndo, canRedo, clearSets, factoryReset
  } = useFileManager();

  // Initialize with all sets expanded by default
  const [expandedSets, setExpandedSets] = useState<Set<string>>(new Set());
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

  // Handle resizing for mobile check
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Auto-collapse on mobile initially
      if (window.innerWidth < 768 && isOpen) {
        // We might want to sync this, but for now let's leave it manual or controlled
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile && isOpen) {
      toggleOpen();
    }
  }, [location, isMobile]); // eslint-disable-line react-hooks/exhaustive-deps


  // Ensure ALL sets are auto-expanded whenever the list changes (and on mount)
  useEffect(() => {
    setExpandedSets(prev => {
      const next = new Set(prev);
      let changed = false;
      sets.forEach(s => {
        if (!prev.has(s.id)) {
          next.add(s.id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [sets]); // Dependency on 'sets' ensures we catch async loads

  // Initial expansion
  useEffect(() => {
    setExpandedSets(prev => {
      const next = new Set(prev);
      sets.forEach(s => next.add(s.id));
      return next;
    });
  }, []);


  const toggleSet = useCallback((id: string) => {
    setExpandedSets(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleUpdateFilesInSet = useCallback((setId: string, newFiles: StoredFile[]) => {
    // We need to access the latest 'sets' to update correctly.
    // Since 'sets' changes on every update, this callback would rebuild if we depend on 'sets'.
    // BUT 'updateSets' likely expects the FULL new state.
    // To make this stable-ISH, we can rely on the fact that we are inside a functional update or just accept that 'sets' dependency is fine 
    // IF the children are memoized correctly and we don't pass a new identity function unless sets changed.

    // Actually, to truly optimize, we need 'sets' to NOT cause this function to be recreated if 'sets' hasn't changed DEEP (which isn't easy here).
    // However, the main issue is likely the RENDER cost of all items.
    // Let's rely on the fact that if 'sets' changes, we PROBABLY want to re-render.
    // But if we drag item in Set A, Set B shouldn't re-render foundamentally.
    // But 'sets' is a global array. So modifying Set A changes 'sets' reference, causing re-render of Layout,
    // which rebuilds this function, which passes new props to Set B.
    // MEMO on Set B should prevent re-render if its specific props (set={setB}) haven't changed.
    // BUT this callback identity changing MIGHT cause re-render if passed as prop.
    // So we should try to keep it stable-ish or use an updater pattern if possible.
    // For now, let's just define it inline-ish or standard callback.
    // The simplified fix is valid:

    // We can't easily avoid 'sets' dependency here without a ref or functional state update on the context side.
    // Let's implement it straightforwardly first.
    // NOTE: We'll do the map inside the callback.
    const newSets = sets.map(s => s.id === setId ? { ...s, files: newFiles } : s);
    updateSets(newSets);
  }, [sets, updateSets]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-surface-50">

      <ConfirmDialog
        isOpen={isClearDialogOpen}
        onClose={() => setIsClearDialogOpen(false)}
        onConfirm={factoryReset}
        title="Factory Reset"
        description="This will permanently delete ALL data, including all file sets, all module history, and preferences. The application will reload. This cannot be undone."
        confirmLabel="Yes, Factory Reset"
        cancelLabel="Cancel"
        variant="danger"
      />

      {/* ─── Mobile Header ─────────────────────────── */}
      <div className="md:hidden h-16 flex items-center justify-between px-4 border-b border-surface-200 bg-surface-50/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleOpen}
            className="p-2 -ml-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-200 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img src="/icon.png" alt="Morphic" className="w-8 h-8 rounded-lg" />
            <span className="font-display font-bold text-lg text-ink">Morphic</span>
          </Link>
        </div>

        {/* Mobile Theme Switcher Placeholder - or maybe just keep the fixed one? 
            The fixed one is bottom-left usually. On mobile, bottom-right fixed might be better.
        */}
      </div>

      {/* ─── Sidebar Overlay (Mobile) ──────────────── */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={toggleOpen}
        />
      )}

      {/* ─── Sidebar ───────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 bg-surface-100 border-r border-surface-200 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:sticky md:top-0 md:h-screen shrink-0 overflow-hidden
          ${isMobile ? (isOpen ? 'translate-x-0 w-[280px] shadow-2xl' : '-translate-x-full w-[280px]') : ''}
        `}
        style={!isMobile ? {
          width: isOpen ? '280px' : '60px',
          transition: 'width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        } : undefined}
      >
        {/* Top bar (Only visible when expanded or on mobile) */}
        {(isOpen || isMobile) && (
          <div className="h-16 flex items-center justify-between px-3 shrink-0 border-b border-surface-200">
            <Link to="/" className="flex items-center gap-2.5 min-w-0">
              <img src="/icon.png" alt="Morphic" className="w-8 h-8 rounded-lg shrink-0" />
              <span className="font-display font-bold text-base tracking-tight truncate text-ink">
                Morphic
              </span>
            </Link>
            <button
              onClick={toggleOpen}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-200 transition-colors shrink-0 text-ink-muted"
              title="Close Sidebar"
            >
              {isMobile ? <X className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
          </div>
        )}

        {/* Persistence Controls */}
        {(isOpen || isMobile) && (
          <div className="flex items-center gap-2 px-3 py-3 border-b border-surface-200 bg-surface-50/50">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="flex-1 h-9 rounded-lg flex items-center justify-center gap-2 bg-surface-100 border border-surface-200 hover:bg-surface-200 hover:border-surface-300 text-ink-muted hover:text-ink disabled:opacity-40 disabled:hover:bg-surface-100 disabled:hover:border-surface-200 transition-all shadow-sm"
              title="Undo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="flex-1 h-9 rounded-lg flex items-center justify-center gap-2 bg-surface-100 border border-surface-200 hover:bg-surface-200 hover:border-surface-300 text-ink-muted hover:text-ink disabled:opacity-40 disabled:hover:bg-surface-100 disabled:hover:border-surface-200 transition-all shadow-sm"
              title="Redo"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={clearSets}
              className="flex-1 h-9 rounded-lg flex items-center justify-center gap-2 bg-surface-100 border border-surface-200 hover:bg-surface-200 hover:border-surface-300 text-ink-muted hover:text-ink transition-all shadow-sm"
              title="Clear Sets"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content */}
        {(isOpen || isMobile) && (
          <div
            className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin"
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes('application/x-file-converter-module-files')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }
            }}
            onDrop={(e) => {
              if (e.dataTransfer.types.includes('application/x-file-converter-module-files')) {
                e.preventDefault();
                e.stopPropagation();
                // @ts-ignore
                const files = window.__draggedModuleFiles;
                if (files && files.length > 0) {
                  createSetWithFiles(files);
                }
              }
            }}
          >

            {/* Header + Add Button */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-ink-faint">
                File Storage
              </span>
              <button
                onClick={addSet}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-surface-200 hover:text-accent-400 transition-colors text-ink-muted"
                title="Create new set"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {sets.length === 0 && (
              <div className="text-center py-8 px-4 border border-dashed border-surface-200 rounded-xl">
                <p className="text-xs text-ink-muted leading-relaxed">
                  No file sets yet.<br />Click
                  <span className="text-accent-400 font-bold mx-1">+</span>
                  to create your temporary storage.
                </p>
              </div>
            )}

            <Reorder.Group
              axis="y"
              values={sets}
              onReorder={updateSets}
              className="space-y-3"
              layoutScroll // Added for smoother scrolling during drag
            >
              <AnimatePresence initial={false}>
                {sets.map(set => (
                  <FileSetCard
                    key={set.id}
                    set={set}
                    expanded={expandedSets.has(set.id)}
                    onToggle={() => toggleSet(set.id)}
                    onRemove={() => removeSet(set.id)}
                    onRename={(name) => renameSet(set.id, name)}
                    onAddFiles={(files) => addFilesToSet(set.id, files)}
                    onAddResultFile={(file) => addResultFileToSet(set.id, file)}
                    onRemoveFile={(idx) => removeFileFromSet(set.id, idx)}
                    onUpdateFiles={(newFiles) => handleUpdateFilesInSet(set.id, newFiles)}
                    onMoveFileIn={(sourceSetId, sourceIdx) => moveFileBetweenSets(sourceSetId, sourceIdx, set.id)}
                  />
                ))}
              </AnimatePresence>
            </Reorder.Group>
          </div>
        )}

        {/* Clear All Footer */}
        {(isOpen || isMobile) && (
          <div className="p-3 border-t border-surface-200">
            <button
              onClick={() => setIsClearDialogOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-surface-200/50 hover:bg-red-500/10 text-ink-muted hover:text-red-500 transition-all group"
            >
              <Trash2 className="w-4 h-4 text-ink-faint group-hover:text-red-500" />
              <span className="text-sm font-medium">Factory Reset</span>
            </button>
          </div>
        )}


        {/* Collapsed View (Desktop Only) */}
        {!isOpen && !isMobile && (
          <div className="flex-1 flex flex-col items-center pt-3 gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center justify-center">
              <img src="/icon.png" alt="Morphic" className="w-8 h-8 rounded-lg shrink-0" />
            </Link>

            {/* Expand Button */}
            <button
              onClick={toggleOpen}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-200 transition-colors shrink-0 text-ink-muted"
              title="Expand"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>

            {/* Divider */}
            <div className="w-8 h-px bg-surface-200 shrink-0" />

            <button onClick={addSet} className="w-8 h-8 rounded-lg border border-dashed border-surface-300 flex items-center justify-center text-ink-muted hover:text-accent-400 hover:border-accent-400 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
            {sets.map(set => (
              <div key={set.id} className="w-8 h-8 rounded-lg bg-surface-200 flex items-center justify-center text-ink-muted text-xs font-bold select-none cursor-default" title={set.label}>
                {set.label.charAt(0)}
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ─── Main Content ──────────────────────────── */}
      <main className="flex-1 min-h-[calc(100vh-64px)] md:min-h-screen overflow-x-hidden relative">
        <Outlet />
      </main>

      {/* ─── Theme Switcher ─────────────────────────── */}
      <ThemeSwitcher />
    </div>
  );
}

/* ─── File Set Card (Redesigned) ──────────────────────────── */
const FileSetCard = memo(function FileSetCard({ set, expanded, onToggle, onRemove, onRename, onAddFiles, onAddResultFile, onRemoveFile, onUpdateFiles, onMoveFileIn }: {
  set: FileSet;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onRename: (name: string) => void;
  onAddFiles: (files: File[]) => void;
  onAddResultFile: (file: File) => void;
  onRemoveFile: (idx: number) => void;
  onUpdateFiles: (files: StoredFile[]) => void;
  onMoveFileIn: (sourceSetId: string, sourceIdx: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(set.label);
  const [isHovered, setIsHovered] = useState(false);
  const setDragControls = useDragControls();

  const onDrop = useCallback((accepted: File[]) => {
    onAddFiles(accepted);
  }, [onAddFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: false });

  const handleRename = () => {
    if (name.trim()) onRename(name);
    else setName(set.label);
    setEditing(false);
  };

  const handleSetDragStart = (e: React.DragEvent) => {
    // Metadata for dropping SETS onto modules
    e.dataTransfer.setData('application/x-file-converter-set-id', set.id);
    // @ts-ignore
    window.__draggedSetId = set.id;
  };

  const handleCardDragOver = (e: React.DragEvent) => {
    // Allow dropping files from other sets here OR results
    if (e.dataTransfer.types.includes('application/x-file-converter-set-id') ||
      e.dataTransfer.types.includes('application/x-file-converter-result') ||
      e.dataTransfer.types.includes('application/x-file-converter-module-files')) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy'; // or move
    }
  };

  const handleCardDrop = (e: React.DragEvent) => {
    const sourceSetId = e.dataTransfer.getData('application/x-file-converter-set-id');
    const sourceFileIdx = e.dataTransfer.getData('application/x-file-converter-file-idx');
    const isResult = e.dataTransfer.getData('application/x-file-converter-result');
    const isModuleFiles = e.dataTransfer.types.includes('application/x-file-converter-module-files');

    if (isResult) {
      e.preventDefault();
      e.stopPropagation();
      // @ts-ignore
      const resultFile = window.__draggedResultFile;
      if (resultFile) {
        onAddResultFile(resultFile);
      }
      return;
    }

    if (isModuleFiles) {
      e.preventDefault();
      e.stopPropagation();
      // @ts-ignore
      const files = window.__draggedModuleFiles as File[];
      if (files && files.length > 0) {
        // Filter unique files (by name)
        const existingNames = new Set(set.files.map(f => f.file.name));
        const uniqueFiles = files.filter(f => !existingNames.has(f.name));

        if (uniqueFiles.length > 0) {
          onAddFiles(uniqueFiles);
        }
      }
      return;
    }

    if (sourceSetId && sourceFileIdx && sourceSetId !== set.id) {
      e.preventDefault();
      e.stopPropagation();
      onMoveFileIn(sourceSetId, parseInt(sourceFileIdx));
    }
  };

  const handleReorder = (newFiles: StoredFile[]) => {
    onUpdateFiles(newFiles);
  };

  return (
    <Reorder.Item
      value={set}
      id={set.id}
      layout
      layoutId={set.id}
      dragListener={false}
      dragControls={setDragControls}
      className={`group rounded-xl transition-colors duration-200 border ${expanded ? 'bg-surface-100 border-surface-200' : 'bg-transparent border-transparent hover:bg-surface-100'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={handleCardDragOver}
      onDrop={handleCardDrop}
      transition={{
        layout: { type: "spring", stiffness: 350, damping: 30 }
      }}
      whileDrag={{
        scale: 1.02,
        boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
        zIndex: 50,
        backgroundColor: "rgb(var(--surface-100))"
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-3 py-2 cursor-pointer select-none relative"
        onClick={onToggle}
      >
        {/* Reorder Handle */}
        <div
          className="w-4 h-4 text-ink-faint hover:text-ink cursor-grab active:cursor-grabbing flex items-center justify-center shrink-0"
          onPointerDown={(e) => setDragControls.start(e)}
        >
          <GripVertical className="w-full h-full" />
        </div>

        <div className={`p-1 rounded-md transition-transform duration-200 ${expanded ? 'rotate-90 text-accent-400' : 'text-ink-muted'}`}>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>

        {editing ? (
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => e.key === 'Enter' && handleRename()}
            onClick={e => e.stopPropagation()}
            className="flex-1 bg-surface-200 text-xs font-semibold px-2 py-1 rounded outline-none border border-accent-400 text-ink"
            autoFocus
          />
        ) : (
          <span className="flex-1 text-sm font-medium text-ink truncate leading-none pt-0.5"
            // Allow dragging the TEXT/Body to export the set?
            draggable={true}
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.setData('application/x-file-converter-set-id', set.id);
              // @ts-ignore
              window.__draggedSetId = set.id;
            }}
          >
            {set.label}
          </span>
        )}

        <div className={`flex items-center gap-1 transition-opacity duration-200 ${isHovered || expanded ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            className="p-1.5 rounded hover:bg-surface-200 text-ink-muted hover:text-ink transition-colors"
            title="Rename"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1.5 rounded hover:bg-red-500/20 text-ink-muted hover:text-red-500 transition-colors"
            title="Delete Set"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1">

              <Reorder.Group
                axis="y"
                values={set.files}
                onReorder={handleReorder}
                className="space-y-1"
                layoutScroll // Added layoutScroll
              >
                <AnimatePresence initial={false}>
                  {set.files.map((fileWrapper, idx) => (
                    <DraggableFileItem
                      key={fileWrapper.id}
                      fileWrapper={fileWrapper}
                      idx={idx}
                      setId={set.id}
                      onRemove={() => onRemoveFile(idx)}
                    />
                  ))}
                </AnimatePresence>
              </Reorder.Group>

              {/* Drop Area */}
              <div
                {...getRootProps()}
                className={`mt-2 flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed transition-all cursor-pointer
                    ${isDragActive ? 'border-accent-400 bg-accent-400/5' : 'border-surface-300 hover:border-surface-400 hover:bg-surface-200/30'}
                `}
              >
                <input {...getInputProps()} />
                <Upload className={`w-3.5 h-3.5 ${isDragActive ? 'text-accent-400' : 'text-ink-faint'}`} />
                <span className={`text-[10px] uppercase font-bold tracking-wide ${isDragActive ? 'text-accent-400' : 'text-ink-faint'}`}>
                  Import Files
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
});

const DraggableFileItem = memo(function DraggableFileItem({ fileWrapper, idx, setId, onRemove }: { fileWrapper: StoredFile, idx: number, setId: string, onRemove: () => void }) {
  const controls = useDragControls();

  const handleFileDragStart = (e: React.DragEvent) => {
    // Just for data transfer to other modules/sets
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('application/x-file-converter-set-id', setId);
    e.dataTransfer.setData('application/x-file-converter-file-idx', idx.toString());
    e.dataTransfer.setData('application/x-file-converter-item', fileWrapper.file.name);
    // @ts-ignore
    window.__draggedFile = fileWrapper.file;
  };

  const handleSaveResult = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // @ts-ignore
    if (window.showSaveFilePicker) {
      try {
        // @ts-ignore
        const handle = await window.showSaveFilePicker({
          suggestedName: fileWrapper.file.name,
        });
        const writable = await handle.createWritable();
        await writable.write(fileWrapper.file);
        await writable.close();
        return;
      } catch (err) {
        // Ignore aborts
        console.error('Save cancelled or failed', err);
        return;
      }
    }

    // Fallback
    const url = URL.createObjectURL(fileWrapper.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileWrapper.file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Reorder.Item
      value={fileWrapper}
      layout
      layoutId={fileWrapper.id}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{
        layout: { type: "spring", stiffness: 350, damping: 30 },
        opacity: { duration: 0.2 },
        height: { duration: 0.2 }
      }}
      whileDrag={{
        scale: 1.02,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        zIndex: 50,
        backgroundColor: "rgb(var(--surface-50))"
      }}
      className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-surface-200/50 hover:bg-surface-200 text-xs group/file cursor-grab active:cursor-grabbing border border-transparent hover:border-surface-300 transition-colors select-none"
    >
      <div
        className="w-3 h-3 text-ink-faint hover:text-ink cursor-grab active:cursor-grabbing shrink-0"
        onPointerDown={(e) => controls.start(e)}
      >
        <GripVertical className="w-full h-full" />
      </div>

      <div
        className="flex-1 flex items-center gap-2 min-w-0 cursor-grab active:cursor-grabbing"
        draggable={true}
        onDragStart={handleFileDragStart}
      >
        <FileText className={`w-3.5 h-3.5 shrink-0 ${fileWrapper.isResult ? 'text-[var(--color-purple)]' : 'text-accent-400'}`} />
        <span className="flex-1 truncate text-ink-muted group-hover/file:text-ink transition-colors">
          {fileWrapper.file.name}
        </span>
      </div>

      {fileWrapper.isResult && (
        <button
          onClick={handleSaveResult}
          className="p-1 text-[var(--color-purple)] hover:text-white hover:bg-[var(--color-purple)] rounded transition-all mr-0.5"
          title="Save Result"
        >
          <Save className="w-3.5 h-3.5" />
        </button>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="opacity-0 group-hover/file:opacity-100 p-1 hover:text-red-400 text-ink-faint transition-all"
      >
        <XIcon />
      </button>
    </Reorder.Item>
  );
});

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  )
}
