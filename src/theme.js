import { useEffect, useState } from 'react';
import './theme.css';

export const THEMES = ['light', 'dark', 'beige', 'system'];
const STORAGE_KEY = 'jarvis_theme';
function initialTheme() {
  try { const value = localStorage.getItem(STORAGE_KEY); return THEMES.includes(value) ? value : 'system'; }
  catch { return 'system'; }
}
export function useTheme() {
  const [theme, setPreference] = useState(initialTheme);
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const change = event => setSystemDark(event.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themePreference = theme;
    document.documentElement.style.colorScheme = resolvedTheme === 'dark' ? 'dark' : 'light';
  }, [theme, resolvedTheme]);
  const setTheme = value => {
    if (!THEMES.includes(value)) return;
    setPreference(value);
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* Theme still works for this session. */ }
  };
  return { theme, setTheme, resolvedTheme };
}

// Shared tokens also cover inline chart and CRM styles.
export const C = {
  orange: 'var(--accent)', orangeHover: 'var(--accent-hover)', orangeDim: 'var(--accent-soft)', orangeBorder: 'var(--accent-border)',
  bg: 'var(--bg)', bgNav: 'var(--surface)', bgCard: 'var(--surface)', bgInput: 'var(--input)', bgHover: 'var(--hover)',
  border: 'var(--border)', border2: 'var(--border-strong)', text: 'var(--text)', text2: 'var(--muted)', text3: 'var(--subtle)',
  green: 'var(--success)', greenDim: 'var(--success-soft)', cyan: 'var(--info)', amber: 'var(--warning)', rose: 'var(--danger)',
};
