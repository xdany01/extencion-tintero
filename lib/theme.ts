import type { ThemeMode } from './types';

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

/**
 * Aplica el tema al documento y devuelve la función de limpieza.
 * En modo "system" escucha cambios del sistema operativo.
 */
export function applyThemeToDocument(mode: ThemeMode): () => void {
  const root = document.documentElement;
  const apply = () => {
    root.dataset.theme = resolveTheme(mode);
  };
  apply();

  if (mode !== 'system') return () => {};

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', apply);
  return () => media.removeEventListener('change', apply);
}
