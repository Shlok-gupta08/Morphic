import { ProcessingStatus } from './ProcessingResult';
import { X, Check, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ResultTab {
    id: string;
    name: string;
    blob: Blob;
    status: ProcessingStatus;
    timestamp: number;
}

interface ResultTabsProps {
    tabs: ResultTab[];
    activeTabId: string | null;
    onSwitch: (id: string) => void;
    onClose: (id: string) => void;
}

export default function ResultTabs({ tabs, activeTabId, onSwitch, onClose }: ResultTabsProps) {
    if (tabs.length === 0) return null;

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
            <AnimatePresence>
                {tabs.map(tab => (
                    <motion.div
                        key={tab.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={() => onSwitch(tab.id)}
                        className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer select-none transition-all
              min-w-[120px] max-w-[200px]
              ${activeTabId === tab.id
                                ? 'bg-surface-200 border-accent-400 text-ink'
                                : 'bg-surface-100 border-surface-200 text-ink-muted hover:bg-surface-200'
                            }
            `}
                    >
                        <FileText className={`w-3.5 h-3.5 ${activeTabId === tab.id ? 'text-accent-400' : 'text-ink-faint'}`} />

                        <div className="flex-1 min-w-0 flex flex-col">
                            <span className="text-xs font-medium truncate">{tab.name}</span>
                            <span className="text-[10px] text-ink-faint">
                                {new Date(tab.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        <button
                            onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
                            className="p-1 rounded-md hover:bg-surface-300 text-ink-faint hover:text-ink transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
