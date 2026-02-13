import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export default function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="fixed bottom-5 right-5 z-50">
            <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-surface-100 border border-surface-300 shadow-lg hover:border-accent-400 transition-all group"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
                {/* Toggle Track (Slightly reduced: w-[42px]) */}
                <div className="relative w-[42px] h-5 rounded-md bg-surface-300 group-hover:bg-surface-400 transition-colors overflow-hidden">
                    {/* Toggle Thumb 
              Width: 12px (w-3)
              Container: 42px
              Padding: 4px (left-1)
              Travel: 42 - 4 - 4 - 12 = 22px
          */}
                    <div
                        className={`absolute top-1 left-1 w-3 h-3 rounded-sm bg-accent-400 shadow-sm transition-all duration-300 ${theme === 'light' ? 'translate-x-[22px]' : 'translate-x-0'
                            }`}
                    />
                </div>

                {/* Icon instead of Text */}
                <div className="flex items-center justify-center w-6">
                    {theme === 'dark' ? (
                        <Moon className="w-4 h-4 text-ink-muted group-hover:text-accent-400 transition-colors" />
                    ) : (
                        <Sun className="w-4 h-4 text-ink-muted group-hover:text-accent-400 transition-colors" />
                    )}
                </div>
            </button>
        </div>
    );
}
