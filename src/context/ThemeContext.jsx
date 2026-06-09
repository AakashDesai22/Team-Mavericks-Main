import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * ============================================================================
 * BODHANTRA EVENT OS — Theme Context
 * ============================================================================
 *
 * Manages Light / Dark theme globally.
 *   - Persists to localStorage under key `bodhantra-theme`.
 *   - Sets `data-theme` attribute on <html> for CSS variable switching.
 *   - Default: "light".
 */

const STORAGE_KEY = 'bodhantra-theme';

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'light';
    } catch {
      return 'light';
    }
  });

  // Sync data-theme attribute on <html>
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // storage full / disabled — silently ignore
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeContext;
