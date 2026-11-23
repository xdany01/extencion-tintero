import { useSyncExternalStore, type CSSProperties } from 'react';
import { CloseIcon, NibIcon, SearchIcon } from '../../components/icons';
import type { Rect } from '../../lib/types';
import type { WidgetController } from './controller';

const PANEL_WIDTH = 372;
const TRIGGER_SIZE = 30;
const MARGIN = 8;

interface Layout {
  trigger: { left: number; top: number };
  panel: CSSProperties;
}

/**
 * ¿Hay otro control (o un enlace) justo en ese punto? Sirve para no colocar la
 * pluma encima del campo vecino cuando el formulario va a dos columnas.
 */
function isObstructed(x: number, y: number): boolean {
  const stack =
    typeof document.elementsFromPoint === 'function'
      ? document.elementsFromPoint(x, y)
      : [document.elementFromPoint(x, y)];

  for (const node of stack) {
    if (!node || node.closest('[data-tintero-host]')) continue;
    return Boolean(
      node.closest(
        'input, textarea, select, button, a[href], [role="button"], [contenteditable="true"]',
      ),
    );
  }
  return false;
}

function computeLayout(rect: Rect): Layout {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let top = rect.height > 64 ? rect.top + 8 : rect.top + rect.height / 2 - TRIGGER_SIZE / 2;
  top = Math.min(Math.max(MARGIN, top), viewportHeight - TRIGGER_SIZE - MARGIN);

  // Fuera del campo si cabe y no tapa otro control; si no, dentro del borde derecho.
  const outsideLeft = rect.right + 7;
  const fitsOutside = outsideLeft + TRIGGER_SIZE <= viewportWidth - MARGIN;
  const outside =
    fitsOutside && !isObstructed(outsideLeft + TRIGGER_SIZE / 2, top + TRIGGER_SIZE / 2);

  const left = outside
    ? outsideLeft
    : Math.max(
        MARGIN,
        Math.min(rect.right - TRIGGER_SIZE - 6, viewportWidth - TRIGGER_SIZE - MARGIN),
      );

  const width = Math.min(PANEL_WIDTH, viewportWidth - MARGIN * 2);
  const panelLeft = Math.min(Math.max(MARGIN, rect.left), viewportWidth - width - MARGIN);
  const spaceBelow = viewportHeight - rect.bottom - 14;
  const spaceAbove = rect.top - 14;
  const below = spaceBelow >= 260 || spaceBelow >= spaceAbove;
  const maxHeight = Math.max(180, Math.min(440, below ? spaceBelow : spaceAbove));

  const panel: CSSProperties = { left: panelLeft, width, maxHeight };
  if (below) panel.top = rect.bottom + 8;
  else panel.bottom = viewportHeight - rect.top + 8;

  return { trigger: { left, top }, panel };
}

export function Widget({ controller }: { controller: WidgetController }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const { target, rect, open } = state;

  if (!target || !rect) return null;

  const layout = computeLayout(rect);
  const hasSnippets = state.snippets.length > 0;

  return (
    <>
      <button
        type="button"
        className={`tintero-trigger${open ? ' is-open' : ''}`}
        style={{ left: layout.trigger.left, top: layout.trigger.top }}
        aria-label={open ? 'Cerrar sugerencias de Tintero' : 'Ver sugerencias de Tintero'}
        aria-expanded={open}
        onClick={() => controller.toggle()}
      >
        <NibIcon size={16} />
      </button>

      {open && (
        <div
          className="tintero-panel paper"
          style={layout.panel}
          role="dialog"
          aria-label="Sugerencias de autocompletado"
        >
          <span className="tintero-tape" aria-hidden="true" />

          <header className="tintero-head">
            <span className="tintero-brand">
              <NibIcon size={15} />
              Tintero
            </span>
            <span className="tintero-count">{state.visible.length}</span>
            <button
              type="button"
              className="tintero-x"
              onClick={() => controller.close(true)}
              aria-label="Cerrar"
            >
              <CloseIcon size={14} />
            </button>
          </header>

          <label className="tintero-search">
            <SearchIcon size={13} />
            <input
              autoFocus
              value={state.query}
              placeholder="Filtrar por título, texto o etiqueta…"
              onChange={(event) => controller.setQuery(event.target.value)}
              aria-label="Filtrar sugerencias"
            />
          </label>

          <ul className="tintero-list">
            {state.visible.map((match, index) => {
              const { snippet, percent, matchedBadges } = match;
              return (
                <li key={snippet.id}>
                  <button
                    type="button"
                    className={`tintero-item${index === state.activeIndex ? ' is-active' : ''}`}
                    onMouseEnter={() => controller.setActiveIndex(index)}
                    onClick={() => controller.pick(index)}
                  >
                    <span className="tintero-rank">{String(index + 1).padStart(2, '0')}</span>
                    <span className="tintero-item-body">
                      <span className="tintero-title-row">
                        <span className="tintero-title">{snippet.title}</span>
                        <span className="tintero-score" title={`Afinidad con el campo: ${percent}%`}>
                          <span className="tintero-meter">
                            <i style={{ width: `${percent}%` }} />
                          </span>
                          <span className="tintero-pct">{percent}%</span>
                        </span>
                      </span>
                      <span className="tintero-text">{snippet.text}</span>
                      {snippet.badges.length > 0 && (
                        <span className="tintero-badges">
                          {snippet.badges.map((badge) => (
                            <span
                              key={badge}
                              className={`tintero-badge${matchedBadges.includes(badge) ? ' is-match' : ''}`}
                            >
                              {badge}
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {state.visible.length === 0 && (
            <div className="tintero-empty">
              {hasSnippets ? (
                <p>Ningún texto coincide con «{state.query}».</p>
              ) : (
                <>
                  <p>Todavía no has guardado ningún texto.</p>
                  <button type="button" onClick={() => controller.openOptions()}>
                    Abrir el gestor
                  </button>
                </>
              )}
            </div>
          )}

          <footer className="tintero-foot">
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> moverse
            </span>
            <span>
              <kbd>↵</kbd> insertar
            </span>
            <span>
              <kbd>esc</kbd> cerrar
            </span>
          </footer>
        </div>
      )}
    </>
  );
}
