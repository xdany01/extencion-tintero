import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { defineContentScript } from 'wxt/utils/define-content-script';
import paperCss from '../../assets/paper.css?inline';
import { Widget } from './Widget';
import { WidgetController } from './controller';
import widgetCss from './style.css?inline';

interface InvalidationContext {
  onInvalidated(callback: () => void): void;
}

function mountWidget(ctx: InvalidationContext): void {
  const host = document.createElement('div');
  host.setAttribute('data-tintero-host', '');
  host.style.cssText =
    'position:fixed;inset:0;z-index:2147483646;pointer-events:none;margin:0;padding:0;border:0;';

  const shadow = host.attachShadow({ mode: 'open' });

  // Las hojas construidas no las bloquea el CSP de la página.
  const cssText = `${paperCss}\n${widgetCss}`;
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    shadow.adoptedStyleSheets = [sheet];
  } catch {
    const style = document.createElement('style');
    style.textContent = cssText;
    shadow.append(style);
  }

  const container = document.createElement('div');
  container.className = 'tintero-root';
  shadow.append(container);

  const mountTarget = document.body ?? document.documentElement;
  mountTarget.append(host);

  const root = createRoot(container);
  const controller = new WidgetController(host, container);
  root.render(createElement(Widget, { controller }));
  void controller.start();

  ctx.onInvalidated(() => {
    controller.stop();
    root.unmount();
    host.remove();
  });
}

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  matchAboutBlank: true,
  runAt: 'document_idle',
  main(ctx) {
    mountWidget(ctx);
  },
});
