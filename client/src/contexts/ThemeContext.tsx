import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type ThemeId = 'dark' | 'light';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  label: string;
  accentName: string;
  fontDisplay: string;
  fontBody: string;
  colors: Record<string, string>;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'dark',
    name: 'Obsidian Gold',
    label: 'Dark',
    accentName: 'Gold',
    fontDisplay: "'Urbanist', sans-serif",
    fontBody: "'Manrope', sans-serif",
    colors: {
      '--surface-50': '0 0 0',        /* True Black */
      '--surface-100': '10 10 10',    /* Very Dark Gray */
      '--surface-200': '20 20 20',    /* Dark Gray */
      '--surface-300': '35 35 35',    /* Borders/Hover */
      '--surface-400': '50 50 50',    /* Disabled/Muted */
      '--surface-500': '80 80 80',
      '--surface-600': '112 112 112',
      '--surface-700': '150 150 150',
      '--surface-800': '200 200 200',
      '--surface-900': '240 240 240',

      '--accent-50': '25 20 5',
      '--accent-100': '50 40 10',
      '--accent-200': '100 80 20',
      '--accent-300': '160 120 30',
      '--accent-400': '212 175 55',   /* Metallic Gold */
      '--accent-500': '230 190 70',
      '--accent-600': '255 215 90',

      '--ink': '245 245 245',         /* Off-white Text */
      '--ink-muted': '160 160 160',   /* Light Gray Text */
      '--ink-faint': '100 100 100',
    },
  },
  {
    id: 'light',
    name: 'Light',
    label: 'Light',
    accentName: 'Brown',
    fontDisplay: "'Urbanist', sans-serif",
    fontBody: "'Manrope', sans-serif",
    colors: {
      '--surface-50': '250 248 245',     /* #faf8f5 - Warm beige/paper white */
      '--surface-100': '245 240 235',    /* #f5f0eb - Card bg */
      '--surface-200': '232 226 218',    /* #e8e2da - Border */
      '--surface-300': '219 210 200',    /* #dbd2c8 - Hover */
      '--surface-400': '190 180 170',    /* #beb4aa - Disabled */
      '--surface-500': '160 150 140',    /* #a0968c - Icons */
      '--surface-600': '130 120 110',
      '--surface-700': '100 90 85',
      '--surface-800': '70 60 55',
      '--surface-900': '45 35 30',
      '--accent-50': '248 244 240',
      '--accent-100': '240 232 225',
      '--accent-200': '210 195 180',
      '--accent-300': '180 160 140',
      '--accent-400': '150 125 105',     /* #967d69 - Muted Brown Accent */
      '--accent-500': '130 105 85',
      '--accent-600': '110 85 65',
      '--ink': '60 50 45',              /* #3c322d - Dark Brown Text */
      '--ink-muted': '120 105 95',      /* #78695f - Secondary Text */
      '--ink-faint': '170 160 150',
    },
  },
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  themeConfig: ThemeDefinition;
  allThemes: ThemeDefinition[];
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      return (localStorage.getItem('fc-theme') as ThemeId) || 'light';
    } catch {
      return 'dark'; // Default to our new dark mode
    }
  });

  // Fallback to first theme if stored theme id is invalid (unlikely but safe)
  const themeConfig = THEMES.find(t => t.id === theme) || THEMES[0];

  const setTheme = (id: ThemeId) => {
    // Add transitioning class for smooth animation
    document.documentElement.classList.add('theme-transitioning');

    setThemeState(id);
    try { localStorage.setItem('fc-theme', id); } catch { }

    // Remove transitioning class after animation completes
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 150);
  };

  useEffect(() => {
    const root = document.documentElement;

    // Apply color variables
    for (const [key, value] of Object.entries(themeConfig.colors)) {
      root.style.setProperty(key, value);
    }

    // Apply font variables
    root.style.setProperty('--font-display', themeConfig.fontDisplay);
    root.style.setProperty('--font-body', themeConfig.fontBody);

    // Data attribute for CSS targeting
    // For CSS, we might want to just set 'dark' or 'light' for high level, 
    // but specific styles might rely on the exact id.
    // However, existing CSS relies on [data-theme='light'] override.
    // So if it's ANY dark theme, we probably want it to NOT be 'light'.
    // We can set specific data-theme-id for granular control if needed.
    const mode = theme === 'light' ? 'light' : 'dark';
    root.setAttribute('data-theme', mode);
    root.setAttribute('data-theme-id', theme); // Granular ID
  }, [theme, themeConfig]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeConfig, allThemes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
