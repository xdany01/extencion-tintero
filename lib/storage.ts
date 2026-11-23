import { browser } from 'wxt/browser';
import { DEFAULT_SETTINGS, type Settings, type Snippet, type ThemeMode } from './types';

const SNIPPETS_KEY = 'tintero:snippets';
const SETTINGS_KEY = 'tintero:settings';

type ChangeMap = Record<string, { oldValue?: unknown; newValue?: unknown }>;

function sanitizeSnippet(value: unknown): Snippet | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.title !== 'string' || typeof raw.text !== 'string') return null;

  const now = Date.now();
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `t_${now.toString(36)}`,
    title: raw.title.slice(0, 160),
    text: raw.text,
    badges: Array.isArray(raw.badges)
      ? raw.badges
          .filter((badge): badge is string => typeof badge === 'string')
          .map((badge) => badge.trim().slice(0, 60))
          .filter(Boolean)
          .slice(0, 30)
      : [],
    uses: typeof raw.uses === 'number' && Number.isFinite(raw.uses) ? Math.max(0, raw.uses) : 0,
    lastUsedAt: typeof raw.lastUsedAt === 'number' ? raw.lastUsedAt : null,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
  };
}

export function sanitizeSnippets(value: unknown): Snippet[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: Snippet[] = [];
  for (const item of value) {
    const snippet = sanitizeSnippet(item);
    if (!snippet || seen.has(snippet.id)) continue;
    seen.add(snippet.id);
    result.push(snippet);
  }
  return result;
}

function mergeSettings(value: unknown): Settings {
  const raw = (value ?? {}) as Partial<Settings>;
  const theme: ThemeMode =
    raw.theme === 'light' || raw.theme === 'dark' || raw.theme === 'system'
      ? raw.theme
      : DEFAULT_SETTINGS.theme;
  return {
    active: typeof raw.active === 'boolean' ? raw.active : DEFAULT_SETTINGS.active,
    theme,
  };
}

export async function getSnippets(): Promise<Snippet[]> {
  const data = await browser.storage.local.get(SNIPPETS_KEY);
  return sanitizeSnippets(data?.[SNIPPETS_KEY]);
}

export async function setSnippets(snippets: Snippet[]): Promise<void> {
  await browser.storage.local.set({ [SNIPPETS_KEY]: snippets });
}

export async function getSettings(): Promise<Settings> {
  const data = await browser.storage.local.get(SETTINGS_KEY);
  return mergeSettings(data?.[SETTINGS_KEY]);
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next: Settings = { ...current, ...patch };
  await browser.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

export async function markUsed(id: string): Promise<void> {
  const snippets = await getSnippets();
  const now = Date.now();
  let touched = false;
  const next = snippets.map((snippet) => {
    if (snippet.id !== id) return snippet;
    touched = true;
    return { ...snippet, uses: snippet.uses + 1, lastUsedAt: now };
  });
  if (touched) await setSnippets(next);
}

export function watchSnippets(callback: (snippets: Snippet[]) => void): () => void {
  const listener = (changes: ChangeMap, area: string) => {
    if (area !== 'local' || !(SNIPPETS_KEY in changes)) return;
    callback(sanitizeSnippets(changes[SNIPPETS_KEY]?.newValue));
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

export function watchSettings(callback: (settings: Settings) => void): () => void {
  const listener = (changes: ChangeMap, area: string) => {
    if (area !== 'local' || !(SETTINGS_KEY in changes)) return;
    callback(mergeSettings(changes[SETTINGS_KEY]?.newValue));
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
