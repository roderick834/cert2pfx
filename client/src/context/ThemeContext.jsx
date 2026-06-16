import { createContext, useContext, useEffect, useState } from 'react';

export const THEMES = [
  { id: 'rose',   name: '玫瑰',   emoji: '🌹', primary: '#f43f5e', light: '#fff1f2', preview: ['#f43f5e', '#fb7185', '#fff1f2'] },
  { id: 'mint',   name: '薄荷',   emoji: '🌿', primary: '#14b8a6', light: '#f0fdfa', preview: ['#14b8a6', '#2dd4bf', '#f0fdfa'] },
  { id: 'ocean',  name: '海洋',   emoji: '🌊', primary: '#0ea5e9', light: '#f0f9ff', preview: ['#0ea5e9', '#38bdf8', '#f0f9ff'] },
  { id: 'plum',   name: '紫羅蘭', emoji: '💜', primary: '#8b5cf6', light: '#f5f3ff', preview: ['#8b5cf6', '#a78bfa', '#f5f3ff'] },
  { id: 'sunset', name: '夕陽',   emoji: '🌅', primary: '#f97316', light: '#fff7ed', preview: ['#f97316', '#fb923c', '#fff7ed'] },
  { id: 'night',  name: '深夜',   emoji: '🌙', primary: '#f43f5e', light: '#0f172a', preview: ['#0f172a', '#1e293b', '#f43f5e'] },
];

const ThemeContext = createContext({ theme: 'rose', setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem('app_theme') || 'rose'
  );

  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme data attributes / dark class
    root.removeAttribute('data-theme');
    root.classList.remove('dark');
    if (theme !== 'rose') {
      root.setAttribute('data-theme', theme);
      if (theme === 'night') root.classList.add('dark');
    }
    // Update body bg
    const t = THEMES.find(x => x.id === theme);
    if (t) document.body.style.backgroundColor = t.id === 'night' ? '#0f172a' : t.light;
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const setTheme = (id) => setThemeState(id);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }
