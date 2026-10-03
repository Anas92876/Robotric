import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';

type Theme = 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always use light theme
  const theme: Theme = 'light';
  const resolvedTheme: 'light' = 'light';

  useEffect(() => {
    const root = window.document.documentElement;

    // Ensure dark class is always removed (force light mode)
    root.classList.remove('dark');

    // Clear any stored theme preference
    localStorage.removeItem('theme');
  }, []);

  // No-op function since theme cannot be changed
  const setTheme = () => {
    // Theme is locked to light mode
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
