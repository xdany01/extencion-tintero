import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { exampleSnippets } from '../lib/seed';
import { getSettings, getSnippets, setSettings, setSnippets } from '../lib/storage';

const action =
  browser.action ??
  (browser as unknown as { browserAction?: typeof browser.action }).browserAction;

async function syncBadge(): Promise<void> {
  if (!action) return;
  const { active } = await getSettings();
  await action.setBadgeText({ text: active ? 'ON' : 'OFF' });
  await action.setBadgeBackgroundColor?.({ color: active ? '#3C6E66' : '#8A8378' });
}

export default defineBackground(() => {
  void syncBadge();

  browser.runtime.onInstalled.addListener((details) => {
    void (async () => {
      if (details.reason === 'install') {
        const existing = await getSnippets();
        if (existing.length === 0) await setSnippets(exampleSnippets());
      }
      await syncBadge();
    })();
  });

  browser.runtime.onStartup.addListener(() => {
    void syncBadge();
  });

  browser.commands.onCommand.addListener((command) => {
    void (async () => {
      if (command !== 'toggle-autofill') return;
      const settings = await getSettings();
      await setSettings({ active: !settings.active });
      await syncBadge();
    })();
  });

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && 'tintero:settings' in changes) void syncBadge();
  });
});
