import { useEffect, useState } from 'react';
import { getSettings, getSnippets, watchSettings, watchSnippets } from './storage';
import { DEFAULT_SETTINGS, type Settings, type Snippet, type ThemeMode } from './types';
import { applyThemeToDocument } from './theme';

export function useSnippetsState(): { snippets: Snippet[]; loading: boolean } {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void getSnippets().then((value) => {
      if (!alive) return;
      setSnippets(value);
      setLoading(false);
    });
    const unsubscribe = watchSnippets((value) => {
      if (!alive) return;
      setSnippets(value);
      setLoading(false);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  return { snippets, loading };
}

export function useSnippets(): Snippet[] {
  return useSnippetsState().snippets;
}

export function useSettings(): Settings {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let alive = true;
    void getSettings().then((value) => {
      if (alive) setSettings(value);
    });
    const unsubscribe = watchSettings((value) => {
      if (alive) setSettings(value);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  return settings;
}

export function useTheme(mode: ThemeMode): void {
  useEffect(() => applyThemeToDocument(mode), [mode]);
}
