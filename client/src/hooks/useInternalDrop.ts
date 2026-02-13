import { useCallback } from 'react';
import { useFileManager } from '@/contexts/FileManagerContext';

export function useInternalDrop(onFilesSelected: (files: File[]) => void) {
    const { sets } = useFileManager();

    const handleInternalDrop = useCallback((e: React.DragEvent) => {
        // 1. Check for File Drag (internal hack)
        // @ts-ignore
        const internalFile = window.__draggedFile as File;
        if (internalFile) {
            e.preventDefault();
            onFilesSelected([internalFile]);
            // @ts-ignore
            window.__draggedFile = null;
            return true;
        }

        // 2. Check for Result Drag (internal hack via window global)
        // @ts-ignore
        const resultFile = window.__draggedResultFile as File;
        if (resultFile) {
            e.preventDefault();
            onFilesSelected([resultFile]);
            // @ts-ignore
            window.__draggedResultFile = null;
            return true;
        }

        // 3. Check for Set Drag (internal hack via window global)
        // @ts-ignore
        const setId = window.__draggedSetId;
        if (setId) {
            e.preventDefault();
            const set = sets.find(s => s.id === setId);
            if (set && set.files.length > 0) {
                // Files are now StoredFile[], map them to File[]
                onFilesSelected(set.files.map(f => f.file));
            }
            // @ts-ignore
            window.__draggedSetId = null;
            return true;
        }

        return false;
    }, [sets, onFilesSelected]);

    return { handleInternalDrop };
}
