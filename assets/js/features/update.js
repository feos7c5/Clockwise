import { dialogOpen } from '../ui/dialog.js';

const busy = () => dialogOpen() || document.activeElement?.matches('textarea, input, select');

// A new version activates right away; the open app reloads as soon as nobody is in the middle of an edit.
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const replacing = Boolean(navigator.serviceWorker.controller);
  const reg = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!replacing) return;
    if (document.hidden || !busy()) location.reload();
    else document.addEventListener('visibilitychange', () => location.reload(), { once: true });
  });

  const check = () => reg.update().catch(() => {});
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  setInterval(check, 30 * 60 * 1000);
}
