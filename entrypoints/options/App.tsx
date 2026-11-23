import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DownloadIcon,
  NibIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  UploadIcon,
} from '../../components/icons';
import { useSettings, useSnippetsState, useTheme } from '../../lib/hooks';
import { newId } from '../../lib/id';
import { filterSnippets } from '../../lib/matching';
import { exampleSnippets } from '../../lib/seed';
import { sanitizeSnippets, setSettings, setSnippets } from '../../lib/storage';
import type { Snippet, ThemeMode } from '../../lib/types';
import { BadgeEditor } from './BadgeEditor';

const THEME_LABEL: Record<ThemeMode, string> = {
  system: 'Sistema',
  light: 'Claro',
  dark: 'Oscuro',
};

function formatRelative(timestamp: number): string {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'ahora mismo';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return new Date(timestamp).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

export function App() {
  const { snippets, loading } = useSnippetsState();
  const settings = useSettings();
  useTheme(settings.theme);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [badges, setBadges] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: 'ok' | 'err' } | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!confirmId) return;
    const timer = window.setTimeout(() => setConfirmId(null), 3200);
    return () => window.clearTimeout(timer);
  }, [confirmId]);

  useEffect(() => {
    if (location.hash !== '#new') return;
    const timer = window.setTimeout(() => titleRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, []);

  const visible = useMemo(() => filterSnippets(snippets, query), [snippets, query]);
  const totalUses = useMemo(() => snippets.reduce((sum, snippet) => sum + snippet.uses, 0), [snippets]);

  const notify = (message: string, kind: 'ok' | 'err' = 'ok') => setToast({ message, kind });

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setText('');
    setBadges([]);
  };

  const startEdit = (snippet: Snippet) => {
    setEditingId(snippet.id);
    setTitle(snippet.title);
    setText(snippet.text);
    setBadges(snippet.badges);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => titleRef.current?.focus(), 120);
  };

  const save = async () => {
    const cleanTitle = title.trim();
    const cleanText = text.trim();
    if (!cleanTitle || !cleanText) {
      notify('El título y el texto son obligatorios', 'err');
      return;
    }

    const now = Date.now();
    if (editingId) {
      await setSnippets(
        snippets.map((snippet) =>
          snippet.id === editingId
            ? { ...snippet, title: cleanTitle, text: cleanText, badges, updatedAt: now }
            : snippet,
        ),
      );
      notify('Texto actualizado');
    } else {
      const snippet: Snippet = {
        id: newId(),
        title: cleanTitle,
        text: cleanText,
        badges,
        uses: 0,
        lastUsedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      await setSnippets([snippet, ...snippets]);
      notify('Texto añadido');
    }
    resetForm();
  };

  const remove = async (id: string) => {
    await setSnippets(snippets.filter((snippet) => snippet.id !== id));
    setConfirmId(null);
    if (editingId === id) resetForm();
    notify('Texto eliminado');
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(snippets, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `tintero-textos-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify(`Exportados ${snippets.length} texto(s)`);
  };

  const importFile = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const list = Array.isArray(parsed)
        ? parsed
        : (parsed as { snippets?: unknown })?.snippets;
      const incoming = sanitizeSnippets(list);
      if (incoming.length === 0) throw new Error('El archivo no contiene textos válidos');

      const map = new Map(snippets.map((snippet) => [snippet.id, snippet]));
      for (const snippet of incoming) map.set(snippet.id, snippet);
      await setSnippets([...map.values()]);
      notify(`Importados ${incoming.length} texto(s)`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo importar el archivo', 'err');
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="mark lg">
            <NibIcon size={22} />
          </span>
          <div>
            <h1>Tintero</h1>
            <p>Textos reutilizables para formularios repetitivos</p>
          </div>
        </div>

        <div className="top-actions">
          <div className="segmented" role="group" aria-label="Tema">
            {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={settings.theme === mode ? 'is-on' : ''}
                onClick={() => void setSettings({ theme: mode })}
                aria-pressed={settings.theme === mode}
              >
                {THEME_LABEL[mode]}
              </button>
            ))}
          </div>
          <button type="button" className="btn" onClick={exportJson}>
            <DownloadIcon size={14} />
            Exportar
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            <UploadIcon size={14} />
            Importar
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importFile(file);
              event.target.value = '';
            }}
          />
        </div>
      </header>

      <div className="grid">
        <form
          className="paper form-card"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <h2>{editingId ? 'Editar texto' : 'Nuevo texto'}</h2>

          <label className="field">
            <span className="label">Título</span>
            <input
              ref={titleRef}
              type="text"
              value={title}
              maxLength={160}
              placeholder="Nombre completo"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <label className="field">
            <span className="label">Texto a insertar</span>
            <textarea
              rows={5}
              value={text}
              placeholder="María Fernanda López García"
              onChange={(event) => setText(event.target.value)}
            />
          </label>

          <div className="field">
            <span className="label">Etiquetas de coincidencia</span>
            <BadgeEditor badges={badges} onChange={setBadges} />
            <span className="hint">
              Se comparan con el label, placeholder, name, id, aria-label y el texto cercano al
              campo. Enter o coma para añadir.
            </span>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Guardar cambios' : 'Añadir texto'}
            </button>
            {editingId && (
              <button type="button" className="btn" onClick={resetForm}>
                Cancelar
              </button>
            )}
          </div>
        </form>

        <section>
          <div className="list-head">
            <h2>
              Tus textos <span className="count">{snippets.length}</span>
              <span className="uses">{totalUses} usos</span>
            </h2>
            <label className="search">
              <SearchIcon size={13} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar…"
                aria-label="Buscar textos"
              />
            </label>
          </div>

          {loading ? (
            <p className="loading">Cargando…</p>
          ) : visible.length === 0 ? (
            <div className="paper empty-block">
              <div className="empty">
                <strong>{snippets.length > 0 ? 'Sin resultados' : 'Todavía no hay textos'}</strong>
                <p>
                  {snippets.length > 0
                    ? 'Prueba con otra búsqueda.'
                    : 'Crea tu primer texto reutilizable con un título, el contenido y sus etiquetas.'}
                </p>
                {snippets.length === 0 && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void setSnippets(exampleSnippets())}
                  >
                    <PlusIcon size={13} />
                    Cargar ejemplos
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="cards">
              {visible.map((snippet) => (
                <article className="paper snippet" key={snippet.id}>
                  <header className="snippet-head">
                    <h3>{snippet.title}</h3>
                    <div className="snippet-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => startEdit(snippet)}
                        aria-label={`Editar ${snippet.title}`}
                        title="Editar"
                      >
                        <PencilIcon size={14} />
                      </button>
                      <button
                        type="button"
                        className={`icon-btn danger${confirmId === snippet.id ? ' is-confirm' : ''}`}
                        onClick={() =>
                          confirmId === snippet.id ? void remove(snippet.id) : setConfirmId(snippet.id)
                        }
                        aria-label={`Eliminar ${snippet.title}`}
                        title="Eliminar"
                      >
                        {confirmId === snippet.id ? '¿Eliminar?' : <TrashIcon size={14} />}
                      </button>
                    </div>
                  </header>

                  <p className="snippet-text">{snippet.text}</p>

                  {snippet.badges.length > 0 && (
                    <div className="badges">
                      {snippet.badges.map((badge) => (
                        <span className="badge" key={badge}>
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}

                  <footer className="snippet-foot">
                    <span>
                      {snippet.uses} {snippet.uses === 1 ? 'uso' : 'usos'}
                    </span>
                    {snippet.lastUsedAt && <span>· último {formatRelative(snippet.lastUsedAt)}</span>}
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <details className="paper help">
        <summary>¿Cómo se ordenan las sugerencias?</summary>
        <p>
          Al abrir la pluma, Tintero reúne el texto que describe el campo (label, placeholder,{' '}
          <code>name</code>, <code>id</code>, <code>aria-label</code>, leyenda, cabecera de tabla y
          texto cercano) y lo compara con tus etiquetas. Una etiqueta exacta pesa mucho más que una
          palabra suelta; también se toleran erratas y variantes. El título y el propio texto suman
          un poco, y los textos que ya has usado suben posiciones. Las etiquetas resaltadas en cada
          sugerencia son las que han coincidido.
        </p>
      </details>

      {toast && (
        <div className="toast" data-kind={toast.kind} role="status">
          {toast.message}
        </div>
      )}
    </div>
  );
}
