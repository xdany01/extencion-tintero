import { useMemo, useState } from 'react';
import { browser } from 'wxt/browser';
import {
  AutoThemeIcon,
  CheckIcon,
  CopyIcon,
  MoonIcon,
  NibIcon,
  PlusIcon,
  SearchIcon,
  SunIcon,
} from '../../components/icons';
import { useSettings, useSnippetsState, useTheme } from '../../lib/hooks';
import { filterSnippets } from '../../lib/matching';
import { setSettings } from '../../lib/storage';
import type { Snippet, ThemeMode } from '../../lib/types';

const THEME_LABEL: Record<ThemeMode, string> = {
  system: 'Sistema',
  light: 'Claro',
  dark: 'Oscuro',
};

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === 'light') return <SunIcon size={16} />;
  if (mode === 'dark') return <MoonIcon size={16} />;
  return <AutoThemeIcon size={16} />;
}

function openManager(hash = ''): void {
  void browser.tabs.create({ url: `${browser.runtime.getURL('/options.html')}${hash}` });
  window.close();
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

export function App() {
  const { snippets, loading } = useSnippetsState();
  const settings = useSettings();
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useTheme(settings.theme);

  const visible = useMemo(() => filterSnippets(snippets, query), [snippets, query]);

  const cycleTheme = () => {
    const order: ThemeMode[] = ['system', 'light', 'dark'];
    const next = order[(order.indexOf(settings.theme) + 1) % order.length]!;
    void setSettings({ theme: next });
  };

  const copy = async (snippet: Snippet) => {
    await copyText(snippet.text);
    setCopiedId(snippet.id);
    window.setTimeout(() => {
      setCopiedId((current) => (current === snippet.id ? null : current));
    }, 1400);
  };

  return (
    <div className="pop">
      <header className="pop-head">
        <div className="pop-brand">
          <span className="mark">
            <NibIcon size={17} />
          </span>
          <div>
            <h1>Tintero</h1>
            <p>Autocompletado de formularios</p>
          </div>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={cycleTheme}
          title={`Tema: ${THEME_LABEL[settings.theme]}`}
          aria-label={`Cambiar tema (actual: ${THEME_LABEL[settings.theme]})`}
        >
          <ThemeIcon mode={settings.theme} />
        </button>
      </header>

      <section className="pop-active paper">
        <div className="pop-active-text">
          <strong>Autocompletado {settings.active ? 'activo' : 'desactivado'}</strong>
          <span>
            {settings.active
              ? 'La pluma aparece junto al campo que enfoques.'
              : 'Actívalo para ver la pluma en los formularios.'}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.active}
          aria-label="Activar autocompletado"
          className="switch"
          onClick={() => void setSettings({ active: !settings.active })}
        />
      </section>

      <label className="pop-search">
        <SearchIcon size={13} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar texto o etiqueta…"
          aria-label="Buscar textos"
        />
      </label>

      <div className="pop-list">
        {loading ? (
          <div className="pop-loading">Cargando…</div>
        ) : visible.length === 0 ? (
          <div className="empty">
            <strong>{snippets.length > 0 ? 'Sin resultados' : 'Todavía sin textos'}</strong>
            <p>
              {snippets.length > 0
                ? 'Prueba con otra búsqueda.'
                : 'Añade tu primer texto reutilizable y aparecerá junto a los campos.'}
            </p>
            {snippets.length === 0 && (
              <button type="button" className="btn" onClick={() => openManager('#new')}>
                Crear el primero
              </button>
            )}
          </div>
        ) : (
          visible.map((snippet) => (
            <button
              type="button"
              key={snippet.id}
              className="pop-item"
              onClick={() => void copy(snippet)}
              title="Copiar texto"
            >
              <span className="pop-item-body">
                <span className="pop-item-title">{snippet.title}</span>
                <span className="pop-item-text">{snippet.text}</span>
                {snippet.badges.length > 0 && (
                  <span className="badges">
                    {snippet.badges.slice(0, 3).map((badge) => (
                      <span key={badge} className="badge">
                        {badge}
                      </span>
                    ))}
                    {snippet.badges.length > 3 && (
                      <span className="badge">+{snippet.badges.length - 3}</span>
                    )}
                  </span>
                )}
              </span>
              <span className={`pop-copy${copiedId === snippet.id ? ' is-done' : ''}`}>
                {copiedId === snippet.id ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              </span>
            </button>
          ))
        )}
      </div>

      <footer className="pop-foot">
        <button type="button" className="btn" onClick={() => openManager('#new')}>
          <PlusIcon size={13} />
          Nuevo
        </button>
        <button type="button" className="btn btn-primary" onClick={() => openManager()}>
          Gestionar textos
        </button>
      </footer>
    </div>
  );
}
