import { useState, useEffect, useCallback } from 'react';

const THEME_CHANGE_EVENT = 'tourtally-theme-change';

function getStoredTheme() {
  return localStorage.getItem('theme') || 'dark';
}

function updateFavicon(theme) {
  const iconPath =
    theme === 'dark'
      ? '/icons/dark/svg/favicon-dark.svg'
      : '/icons/light/svg/favicon-light.svg';

  const favicons = document.querySelectorAll(
    "link[rel='icon'], link[rel='alternate icon'], link[data-theme-icon]"
  );

  favicons.forEach((el) => {
    if (el.getAttribute('type') === 'image/svg+xml') {
      el.setAttribute('href', iconPath);
    }
  });
}

/**
 * useTheme — manages Bootstrap dark/light theme toggle.
 *
 * Reads the saved theme from localStorage (defaults to 'dark'),
 * applies it to `document.documentElement` via `data-bs-theme`,
 * updates the browser tab favicon, and dispatches an event so all components stay in sync.
 *
 * @returns {{ theme: string, toggleTheme: () => void, setTheme: (t: string) => void }}
 */
export function useTheme() {
  const [theme, setLocalTheme] = useState(getStoredTheme);

  const applyTheme = useCallback((newTheme) => {
    document.documentElement.setAttribute('data-bs-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateFavicon(newTheme);
    setLocalTheme(newTheme);
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: newTheme }));
  }, []);

  useEffect(() => {
    // Apply current theme on mount
    const current = getStoredTheme();
    document.documentElement.setAttribute('data-bs-theme', current);
    updateFavicon(current);

    const handleThemeChange = (e) => {
      setLocalTheme(e.detail);
    };

    const handleStorageChange = (e) => {
      if (e.key === 'theme' && e.newValue) {
        document.documentElement.setAttribute('data-bs-theme', e.newValue);
        updateFavicon(e.newValue);
        setLocalTheme(e.newValue);
      }
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme = getStoredTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  }, [applyTheme]);

  const setTheme = useCallback(
    (t) => {
      applyTheme(t);
    },
    [applyTheme]
  );

  return {
    theme,
    toggleTheme,
    setTheme,
  };
}
