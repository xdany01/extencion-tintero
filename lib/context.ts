import type { InputContext } from './matching';
import type { Rect } from './types';
import { normalize } from './normalize';

const SUPPORTED_INPUT_TYPES = new Set(['text', 'search', 'email', 'tel', 'url', 'number']);

/** ¿Es un campo en el que tiene sentido insertar texto? */
export function isSupportedField(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest('[data-tintero-host]')) return false;
  if (target.getAttribute('aria-disabled') === 'true') return false;

  if (target instanceof HTMLTextAreaElement) {
    return !target.disabled && !target.readOnly;
  }

  if (target instanceof HTMLInputElement) {
    if (target.disabled || target.readOnly) return false;
    const type = (target.type || 'text').toLowerCase();
    return SUPPORTED_INPUT_TYPES.has(type);
  }

  return target.isContentEditable;
}

export function rectOf(element: HTMLElement): Rect {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function pushSource(sources: string[], value: string | null | undefined): void {
  if (!value) return;
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length < 2) return;
  if (sources.includes(text)) return;
  sources.push(text.slice(0, 400));
}

/**
 * Reúne todo el texto que puede describir a un campo: label, aria, placeholder,
 * name, id, atributos data-*, leyenda del fieldset, cabecera de tabla, texto
 * hermano y el texto del contenedor más cercano.
 */
export function extractInputContext(element: HTMLElement): InputContext {
  const sources: string[] = [];

  pushSource(sources, element.getAttribute('aria-label'));
  pushSource(sources, element.getAttribute('placeholder'));
  pushSource(sources, element.getAttribute('title'));
  pushSource(sources, element.getAttribute('name'));
  pushSource(sources, element.id);
  pushSource(sources, element.getAttribute('autocomplete'));
  pushSource(sources, element.getAttribute('data-field'));
  pushSource(sources, element.getAttribute('data-name'));
  pushSource(sources, element.getAttribute('data-label'));

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    for (const id of labelledBy.split(/\s+/)) {
      const node = document.getElementById(id);
      if (node) pushSource(sources, node.textContent);
    }
  }

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    for (const label of Array.from(element.labels ?? [])) {
      pushSource(sources, label.innerText || label.textContent);
    }
  }

  const fieldset = element.closest('fieldset');
  if (fieldset) {
    const legend = fieldset.querySelector('legend');
    if (legend) pushSource(sources, legend.textContent);
  }

  const group = element.closest(
    'label, .form-group, .form-field, .form-item, .field, .input-group, .control, td, li, dd',
  );
  if (group instanceof HTMLElement) {
    pushSource(sources, group.innerText?.slice(0, 300));
  }

  let previous: Element | null = element.previousElementSibling;
  for (let hops = 0; previous && hops < 3; hops++) {
    if (previous instanceof HTMLElement) {
      pushSource(sources, previous.innerText?.slice(0, 120));
    }
    previous = previous.previousElementSibling;
  }

  const cell = element.closest('td');
  if (cell?.parentElement) {
    const index = Array.prototype.indexOf.call(cell.parentElement.children, cell);
    const table = cell.closest('table');
    const header =
      table?.querySelector('thead tr')?.children[index] ?? cell.parentElement.querySelector('th');
    if (header) pushSource(sources, header.textContent);
  }

  const combined = sources.join(' \n ');
  const normalized = normalize(combined);

  return {
    normalized,
    tokens: Array.from(new Set(normalized.split(' ').filter((token) => token.length > 1))),
    sources,
  };
}
