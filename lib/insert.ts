/**
 * Inserta texto respetando el comportamiento de frameworks (React, Vue…):
 * usa el setter nativo del prototipo y dispara eventos `input` y `change`.
 */
export function insertText(element: HTMLElement, text: string): void {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const prototype =
      element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    element.focus({ preventScroll: true });
    if (setter) setter.call(element, text);
    else element.value = text;

    element.dispatchEvent(
      new InputEvent('input', { bubbles: true, composed: true, data: text, inputType: 'insertText' }),
    );
    element.dispatchEvent(new Event('change', { bubbles: true }));

    try {
      const end = element.value.length;
      element.setSelectionRange(end, end);
    } catch {
      /* algunos tipos de input no admiten selección */
    }
    return;
  }

  if (!element.isContentEditable) return;

  element.focus({ preventScroll: true });

  const selection = window.getSelection();
  if (selection) {
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);

    // execCommand mantiene contenteditable y editores enriquecidos contentos.
    if (document.execCommand('insertText', false, text)) return;
    selection.removeAllRanges();
  }

  element.textContent = text;
  element.dispatchEvent(
    new InputEvent('input', { bubbles: true, composed: true, data: text, inputType: 'insertText' }),
  );
}
