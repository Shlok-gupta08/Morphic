import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
}

export default function ProgressBar({ progress, label, showPercentage = true }: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="space-y-2">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-xs font-medium" style={{ color: 'rgb(var(--ink-muted))' }}>
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-xs tabular-nums font-medium" style={{ color: 'rgb(var(--accent-400))' }}>
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: 'rgb(var(--surface-300))' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, rgb(var(--accent-400)), rgb(var(--accent-500)))`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
