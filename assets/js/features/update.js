let waiting = null, requested = false, hidden = false;
const listeners = new Set();
export const onUpdateChange = fn => listeners.add(fn);
const changed = () => listeners.forEach(fn => fn());

export const updateAvailable = () => Boolean(waiting) && !hidden;
export const hideUpdate = () => { hidden = true; changed(); };

export function applyUpdate() {
  if (!waiting) return location.reload();
  requested = true;
  waiting.postMessage('skip-waiting');
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const reg = await navigator.serviceWorker.register('sw.js');

  const offer = worker => { waiting = worker; hidden = false; changed(); };
  const watch = worker => worker?.addEventListener('statechange', () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) offer(worker);
  });

  if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
  reg.addEventListener('updatefound', () => watch(reg.installing));
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (requested) location.reload(); });

  const check = () => reg.update().catch(() => {});
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  setInterval(check, 30 * 60 * 1000);
}
