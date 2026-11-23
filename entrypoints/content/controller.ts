import { browser } from 'wxt/browser';
import { extractInputContext, isSupportedField, rectOf } from '../../lib/context';
import { filterMatches, rankSnippets, type InputContext, type MatchResult } from '../../lib/matching';
import { getSettings, getSnippets, markUsed, watchSettings, watchSnippets } from '../../lib/storage';
import { resolveTheme } from '../../lib/theme';
import { DEFAULT_SETTINGS, type Rect, type Settings, type Snippet } from '../../lib/types';
import { insertText } from '../../lib/insert';

export interface WidgetState {
  theme: 'light' | 'dark';
  settings: Settings;
  snippets: Snippet[];
  target: HTMLElement | null;
  rect: Rect | null;
  open: boolean;
  query: string;
  activeIndex: number;
  matches: MatchResult[];
  visible: MatchResult[];
  context: InputContext | null;
}

export class WidgetController {
  private state: WidgetState;
  private listeners = new Set<() => void>();
  private cleanups: Array<() => void> = [];
  private frame = 0;
  private focusTimer = 0;
  private hostPointerAt = 0;

  constructor(
    private readonly host: HTMLElement,
    private readonly rootEl: HTMLElement,
  ) {
    this.state = {
      theme: resolveTheme('system'),
      settings: DEFAULT_SETTINGS,
      snippets: [],
      target: null,
      rect: null,
      open: false,
      query: '',
      activeIndex: 0,
      matches: [],
      visible: [],
      context: null,
    };
    this.rootEl.dataset.theme = this.state.theme;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): WidgetState => this.state;

  async start(): Promise<void> {
    const [settings, snippets] = await Promise.all([getSettings(), getSnippets()]);
    this.patch({ settings, snippets, theme: resolveTheme(settings.theme) });

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onMediaChange = () => {
      if (this.state.settings.theme === 'system') {
        this.patch({ theme: resolveTheme('system') });
      }
    };
    media.addEventListener('change', onMediaChange);

    this.cleanups.push(
      () => media.removeEventListener('change', onMediaChange),
      watchSettings((next) => {
        this.patch({ settings: next, theme: resolveTheme(next.theme) });
        if (!next.active) this.hide();
      }),
      watchSnippets((next) => {
        const target = this.state.target;
        if (!this.state.open || !target || !target.isConnected) {
          this.patch({ snippets: next });
          return;
        }
        const context = extractInputContext(target);
        const matches = rankSnippets(next, context);
        const visible = filterMatches(matches, this.state.query);
        this.patch({
          snippets: next,
          context,
          matches,
          visible,
          activeIndex: Math.min(this.state.activeIndex, Math.max(0, visible.length - 1)),
        });
      }),
    );

    document.addEventListener('focusin', this.onFocusIn, true);
    document.addEventListener('focusout', this.onFocusOut, true);
    document.addEventListener('pointerdown', this.onPointerDown, true);
    document.addEventListener('input', this.onInput, true);
    document.addEventListener('keydown', this.onKeyDown, true);
    window.addEventListener('scroll', this.onViewportChange, { capture: true, passive: true });
    window.addEventListener('resize', this.onViewportChange, { passive: true });

    // Un campo puede estar enfocado antes de que cargue el content script.
    const activeElement = document.activeElement;
    if (this.state.settings.active && isSupportedField(activeElement)) {
      this.repositionHost(activeElement);
      this.patch({ target: activeElement, rect: rectOf(activeElement) });
    }
  }

  stop(): void {
    document.removeEventListener('focusin', this.onFocusIn, true);
    document.removeEventListener('focusout', this.onFocusOut, true);
    document.removeEventListener('pointerdown', this.onPointerDown, true);
    document.removeEventListener('input', this.onInput, true);
    document.removeEventListener('keydown', this.onKeyDown, true);
    window.removeEventListener('scroll', this.onViewportChange, true);
    window.removeEventListener('resize', this.onViewportChange);

    if (this.frame) cancelAnimationFrame(this.frame);
    window.clearTimeout(this.focusTimer);
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
    this.listeners.clear();
  }

  toggle(): void {
    if (this.state.open) this.close(true);
    else this.openPanel();
  }

  openPanel(): void {
    const target = this.state.target;
    if (!target || !target.isConnected) return;
    const context = extractInputContext(target);
    const matches = rankSnippets(this.state.snippets, context);
    const visible = filterMatches(matches, this.state.query);
    this.patch({
      open: true,
      rect: rectOf(target),
      context,
      matches,
      visible,
      activeIndex: 0,
    });
  }

  close(refocus = false): void {
    if (!this.state.open) return;
    this.patch({ open: false, query: '', activeIndex: 0, visible: this.state.matches });
    if (refocus) this.state.target?.focus({ preventScroll: true });
  }

  hide(): void {
    this.repositionHost(null);
    this.patch({
      target: null,
      rect: null,
      open: false,
      query: '',
      activeIndex: 0,
      matches: [],
      visible: [],
      context: null,
    });
  }

  setQuery(query: string): void {
    const visible = filterMatches(this.state.matches, query);
    this.patch({ query, visible, activeIndex: 0 });
  }

  setActiveIndex(activeIndex: number): void {
    if (activeIndex === this.state.activeIndex) return;
    this.patch({ activeIndex });
  }

  pick(index: number): void {
    const match = this.state.visible[index];
    if (match) this.apply(match.snippet);
  }

  openOptions(): void {
    void browser.runtime.openOptionsPage();
  }

  private apply(snippet: Snippet): void {
    const target = this.state.target;
    if (target && target.isConnected) insertText(target, snippet.text);
    void markUsed(snippet.id);
    this.patch({ open: false, query: '', activeIndex: 0 });
    target?.focus({ preventScroll: true });
  }

  private patch(patch: Partial<WidgetState>): void {
    this.state = { ...this.state, ...patch };
    if (this.rootEl.dataset.theme !== this.state.theme) {
      this.rootEl.dataset.theme = this.state.theme;
    }
    for (const listener of this.listeners) listener();
  }

  private repositionHost(target: HTMLElement | null): void {
    const defaultParent = document.body ?? document.documentElement;
    if (!target || !target.isConnected) {
      if (this.host.parentElement !== defaultParent && defaultParent) {
        defaultParent.appendChild(this.host);
      }
      return;
    }

    // Si el elemento está dentro de un <dialog>, un popover o un contenedor modal
    // (como la modal de Easy Apply de LinkedIn en el Top Layer):
    const dialogContainer = target.closest<HTMLElement>(
      'dialog, [popover], [role="dialog"], [role="alertdialog"], .artdeco-modal, [data-testid*="dialog"]',
    );
    const destination = dialogContainer ?? defaultParent;
    if (this.host.parentElement !== destination && destination) {
      destination.appendChild(this.host);
    }
  }

  private onFocusIn = (event: FocusEvent): void => {
    if (!this.state.settings.active) return;
    if (event.composedPath().includes(this.host)) return;

    const target = event.target;
    if (!isSupportedField(target)) return;
    if (target === this.state.target && this.state.rect !== null) return;

    this.repositionHost(target);

    this.patch({
      target,
      rect: rectOf(target),
      open: false,
      query: '',
      activeIndex: 0,
      matches: [],
      visible: [],
      context: null,
    });
  };

  private onFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget as Node | null;
    if (next && (next === this.host || this.host.contains(next))) return;

    window.clearTimeout(this.focusTimer);
    this.focusTimer = window.setTimeout(() => {
      // Safari no enfoca los botones al hacer clic: si el puntero acaba de
      // entrar en el widget, no lo ocultamos antes de que llegue el clic.
      if (Date.now() - this.hostPointerAt < 300) return;
      const active = document.activeElement;
      if (active && (active === this.host || this.host.contains(active))) return;
      if (this.state.target && active === this.state.target) return;
      this.hide();
    }, 0);
  };

  private onPointerDown = (event: PointerEvent): void => {
    const path = event.composedPath();
    if (path.includes(this.host)) {
      this.hostPointerAt = Date.now();
      return;
    }
    if (this.state.target && path.includes(this.state.target)) return;
    this.hide();
  };

  private onInput = (event: Event): void => {
    if (!this.state.open) return;
    if (event.target === this.state.target) this.close();
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.isComposing) return;
    const { open, target, visible, activeIndex } = this.state;
    if (!target) return;

    if (!open) {
      const wantsOpen =
        (event.altKey && event.key === 'ArrowDown') || (event.ctrlKey && event.key === ' ');
      if (wantsOpen) {
        event.preventDefault();
        this.openPanel();
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close(true);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (visible.length === 0) return;
      event.preventDefault();
      event.stopPropagation();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      this.patch({ activeIndex: (activeIndex + delta + visible.length) % visible.length });
      this.scrollActiveIntoView();
      return;
    }

    if (event.key === 'Enter') {
      const match = visible[activeIndex];
      if (!match) return;
      event.preventDefault();
      event.stopPropagation();
      this.apply(match.snippet);
      return;
    }

    if (event.key === 'Tab') {
      this.close();
    }
  };

  private onViewportChange = (): void => {
    if (!this.state.target) return;
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      const target = this.state.target;
      if (!target) return;
      if (!target.isConnected) {
        this.hide();
        return;
      }
      const rect = rectOf(target);
      const offscreen =
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth;
      if (offscreen) {
        this.close();
        this.patch({ rect: null });
        return;
      }
      this.patch({ rect });
    });
  };

  private scrollActiveIntoView(): void {
    requestAnimationFrame(() => {
      const node = this.host.shadowRoot?.querySelector('.tintero-item.is-active');
      node?.scrollIntoView({ block: 'nearest' });
    });
  }
}
