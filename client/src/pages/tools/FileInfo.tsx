import { useState, useCallback, useEffect } from 'react';
import { Info, X, GripVertical, FileText, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { AnimatePresence, Reorder } from 'framer-motion';
import ToolPageWrapper from '@/components/shared/ToolPageWrapper';
import { getMetadata } from '@/services/api';
import { useModuleState } from '@/hooks/useModuleState';
import { useFileManager } from '@/contexts/FileManagerContext';
import { useDropzone } from 'react-dropzone';

interface FileMeta {
    type: 'pdf' | 'image' | 'video' | 'unknown';
    width?: number;
    height?: number;
    duration?: number;
    pdfMeta?: {
        title: string | null;
        author: string | null;
        subject: string | null;
        creator: string | null;
        producer: string | null;
        creationDate: string | null;
        modificationDate: string | null;
        pageCount: number;
        pages: { number: number; width: number; height: number }[];
    };
}

interface FileItem {
    id: string;
    file: File;
    meta: FileMeta | null;
    loading: boolean;
    error: string | null;
}

export default function FileInfo() {
    const { sets } = useFileManager();
    const { state, setState, undo, redo, clear, canUndo, canRedo, isLoading } = useModuleState<{
        items: FileItem[];
        selectedId: string | null;
    }>('file-info', {
        items: [],
        selectedId: null
    });

    const selectedItem = state.items.find(i => i.id === state.selectedId);

    const onDrop = useCallback((accepted: File[]) => {
        const newItems: FileItem[] = accepted.map((file) => ({
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            file,
            meta: null,
            loading: false,
            error: null,
        }));

        setState(prev => {
            const updatedItems = [...prev.items, ...newItems];
            let newSelectedId = prev.selectedId;
            if (!newSelectedId && newItems.length > 0) {
                newSelectedId = newItems[0].id;
            }
            return { ...prev, items: updatedItems, selectedId: newSelectedId };
        });
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
            'video/*': ['.mp4', '.mov', '.webm']
        },
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
            let newSelectedId = prev.selectedId;
            if (newSelectedId === id) {
                const remaining = newItems; // already filtered
                newSelectedId = remaining.length > 0 ? remaining[0].id : null;
            }
            return { ...prev, items: newItems, selectedId: newSelectedId };
        });
    };

    // Auto-fetch metadata
    useEffect(() => {
        if (!state.selectedId) return;
        const item = state.items.find(i => i.id === state.selectedId);
        if (!item || item.meta || item.loading || item.error) return;

        // Mark as loading - we do this via setState but we need to be careful not to trigger infinite loops.
        // The check `!item.meta && !item.loading` prevents re-entry.

        setState(prev => ({
            ...prev,
            items: prev.items.map(i => i.id === state.selectedId ? { ...i, loading: true, error: null } : i)
        }));

        const processFile = async () => {
            try {
                const meta: FileMeta = { type: 'unknown' };

                if (item.file.type.startsWith('image/')) {
                    meta.type = 'image';
                    await new Promise<void>((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => {
                            meta.width = img.width;
                            meta.height = img.height;
                            URL.revokeObjectURL(img.src);
                            resolve();
                        };
                        img.onerror = reject;
                        img.src = URL.createObjectURL(item.file);
                    });
                } else if (item.file.type.startsWith('video/')) {
                    meta.type = 'video';
                    await new Promise<void>((resolve, reject) => {
                        const video = document.createElement('video');
                        video.onloadedmetadata = () => {
                            meta.width = video.videoWidth;
                            meta.height = video.videoHeight;
                            meta.duration = video.duration;
                            URL.revokeObjectURL(video.src);
                            resolve();
                        };
                        video.onerror = reject;
                        video.src = URL.createObjectURL(item.file);
                    });
                } else if (item.file.type === 'application/pdf') {
                    meta.type = 'pdf';
                    meta.pdfMeta = await getMetadata(item.file);
                }

                setState(prev => ({
                    ...prev,
                    items: prev.items.map(i => i.id === state.selectedId ? { ...i, meta, loading: false } : i)
                }));
            } catch (err: any) {
                setState(prev => ({
                    ...prev,
                    items: prev.items.map(i => i.id === state.selectedId ? { ...i, error: err.message || 'Failed to read file info', loading: false } : i)
                }));
            }
        };

        processFile();
    }, [state.selectedId, state.items]); // We depend on state.items to get the *current* item but we guard inside.

    const formatDate = (iso: string | null) => {
        if (!iso) return '—';
        try { return new Date(iso).toLocaleString(); } catch { return iso; }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '—';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const InfoPanel = () => {
        if (state.items.length === 0) {
            return (
                <div className="h-full flex items-center justify-center text-ink-faint">
                    <div className="text-center">
                        <Info className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Add files to inspect details</p>
                    </div>
                </div>
            );
        }

        if (!selectedItem) return <div className="h-full flex items-center justify-center text-ink-faint"><p className="text-sm">Select a file</p></div>;

        if (selectedItem.loading) {
            return (
                <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-8 h-8 border-2 border-accent-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-sm text-ink-muted">Reading file info...</p>
                    </div>
                </div>
            );
        }

        if (selectedItem.error) {
            return (
                <div className="h-full flex items-center justify-center p-6">
                    <p className="text-sm text-red-400 bg-red-950/40 p-4 rounded-xl">{selectedItem.error}</p>
                </div>
            );
        }

        const meta = selectedItem.meta;
        if (!meta) return null;

        return (
            <div className="h-full overflow-auto p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-surface-300">
                    <div className="w-10 h-10 rounded-lg bg-accent-400/10 flex items-center justify-center">
                        {meta.type === 'image' ? <ImageIcon className="w-5 h-5 text-accent-400" /> :
                            meta.type === 'video' ? <VideoIcon className="w-5 h-5 text-accent-400" /> :
                                <FileText className="w-5 h-5 text-accent-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-ink truncate">{selectedItem.file.name}</h3>
                        <p className="text-xs text-ink-faint">{formatSize(selectedItem.file.size)} • {selectedItem.file.type}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Basic Properties</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-[11px] uppercase tracking-wider text-ink-faint font-medium">Last Modified</p>
                                <p className="text-sm text-ink">{new Date(selectedItem.file.lastModified).toLocaleString()}</p>
                            </div>
                            {(meta.width && meta.height) && (
                                <div className="space-y-1">
                                    <p className="text-[11px] uppercase tracking-wider text-ink-faint font-medium">Dimensions</p>
                                    <p className="text-sm text-ink">{meta.width} × {meta.height} px</p>
                                </div>
                            )}
                            {meta.duration && (
                                <div className="space-y-1">
                                    <p className="text-[11px] uppercase tracking-wider text-ink-faint font-medium">Duration</p>
                                    <p className="text-sm text-ink">{formatDuration(meta.duration)}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {meta.pdfMeta && (
                        <div>
                            <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3 mt-6">PDF Metadata</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    ['Title', meta.pdfMeta.title],
                                    ['Author', meta.pdfMeta.author],
                                    ['Subject', meta.pdfMeta.subject],
                                    ['Creator', meta.pdfMeta.creator],
                                    ['Producer', meta.pdfMeta.producer],
                                    ['Created', formatDate(meta.pdfMeta.creationDate)],
                                    ['Modified', formatDate(meta.pdfMeta.modificationDate)],
                                    ['Pages', String(meta.pdfMeta.pageCount)],
                                ].map(([label, value]) => (
                                    <div key={label} className="space-y-1">
                                        <p className="text-[11px] uppercase tracking-wider text-ink-faint font-medium">{label}</p>
                                        <p className="text-sm text-ink">{value || '—'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (isLoading) return null;

    return (
        <ToolPageWrapper
            title="File Info"
            description="Inspect metadata for PDFs, Images, and Videos"
            icon={Info}
            onUndo={undo}
            onRedo={redo}
            onClear={() => {
                clear();
            }}
            canUndo={canUndo}
            canRedo={canRedo}
            preview={
                <div className="h-full bg-surface-100/50 backdrop-blur-sm rounded-xl overflow-hidden border border-surface-200">
                    <InfoPanel />
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
                            <FileText className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium" style={{ color: 'rgb(var(--ink-muted))' }}>
                            Drop files here
                        </p>
                        <p className="text-xs text-ink-faint">PDF, Image, Video</p>
                    </div>
                </div>

                {state.items.length > 0 && (
                    <div
                        className="rounded-2xl overflow-hidden shadow-sm"
                        style={{
                            backgroundColor: 'rgb(var(--surface-100))',
                            border: '1px solid rgb(var(--surface-200))',
                        }}
                    >
                        <div
                            className="px-5 py-3 border-b flex items-center justify-between"
                            style={{ borderColor: 'rgb(var(--surface-200))' }}
                        >
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
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-200 border border-surface-300 hover:border-accent-400 hover:bg-surface-300 cursor-grab active:cursor-grabbing transition-all select-none shadow-sm group/drag"
                                title="Drag this group to Sidebar"
                            >
                                <GripVertical className="w-4 h-4 text-ink-muted group-hover/drag:text-accent-400" />
                                <span className="text-xs font-bold uppercase tracking-wider text-ink-muted group-hover/drag:text-ink">
                                    {state.items.length} Files
                                </span>
                            </div>
                            <p className="text-[10px] text-ink-faint">Drag to reorder</p>
                        </div>

                        <Reorder.Group
                            axis="y"
                            values={state.items}
                            onReorder={(newOrder) => setState(prev => ({ ...prev, items: newOrder }))}
                            className="divide-y"
                            style={{ '--tw-divide-color': 'rgb(var(--surface-200))' } as any}
                        >
                            <AnimatePresence initial={false}>
                                {state.items.map((item, index) => (
                                    <Reorder.Item
                                        key={item.id}
                                        value={item}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className={`flex items-center gap-3 px-4 py-3 cursor-grab active:cursor-grabbing hover:bg-surface-200/50 transition-colors
                                             ${state.selectedId === item.id ? 'bg-surface-200/80 border-l-2 border-accent-400' : 'border-l-2 border-transparent'}
                                        `}
                                        onClick={() => setState(prev => ({ ...prev, selectedId: item.id }))}
                                        whileDrag={{
                                            backgroundColor: 'rgb(var(--surface-200))',
                                            boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
                                            zIndex: 10,
                                        }}
                                    >
                                        <GripVertical className="w-4 h-4 shrink-0 text-surface-400" />
                                        <div className="w-8 h-8 rounded-lg bg-surface-200 flex items-center justify-center shrink-0">
                                            {item.meta?.type === 'image' ? <ImageIcon className="w-4 h-4 text-ink-faint" /> :
                                                item.meta?.type === 'video' ? <VideoIcon className="w-4 h-4 text-ink-faint" /> :
                                                    <FileText className="w-4 h-4 text-ink-faint" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm truncate font-medium ${state.selectedId === item.id ? 'text-accent-400' : 'text-ink'}`}>
                                                {item.file.name}
                                            </p>
                                            <p className="text-[10px] text-ink-faint">
                                                {formatSize(item.file.size)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-surface-300 text-ink-faint hover:text-red-400"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </Reorder.Item>
                                ))}
                            </AnimatePresence>
                        </Reorder.Group>
                    </div>
                )}
            </div>
        </ToolPageWrapper>
    );
}
