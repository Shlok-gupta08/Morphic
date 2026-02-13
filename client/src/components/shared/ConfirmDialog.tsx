import { X, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger'
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    >
                        {/* Dialog */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-surface-100 border border-surface-200 rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-full shrink-0 ${variant === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-accent-400/10 text-accent-400'}`}>
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-ink mb-2">{title}</h3>
                                        <p className="text-sm text-ink-muted leading-relaxed">
                                            {description}
                                        </p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-1 rounded-lg hover:bg-surface-200 text-ink-muted transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-end gap-3 mt-8">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 rounded-xl text-sm font-medium text-ink hover:bg-surface-200 transition-colors"
                                    >
                                        {cancelLabel}
                                    </button>
                                    <button
                                        onClick={() => {
                                            onConfirm();
                                            onClose();
                                        }}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg transition-all transform active:scale-95
                      ${variant === 'danger'
                                                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                                                : 'bg-accent-400 hover:bg-accent-500 shadow-accent-400/20'
                                            }`}
                                    >
                                        {confirmLabel}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
