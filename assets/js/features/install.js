// Installation als App: Safari zeigt keinen eigenen Hinweis, Chrome/Edge liefern beforeinstallprompt.
const DISMISSED_KEY = 'clockwise-install-dismissed';

let deferredPrompt = null;
const listeners = new Set();
export const onInstallChange = fn => listeners.add(fn);
const changed = () => listeners.forEach(fn => fn());

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; changed(); });
window.addEventListener('appinstalled', () => { deferredPrompt = null; dismissInstall(); });

const ua = navigator.userAgent;
const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isMacSafari = !isIOS && /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua);
const isInstalled = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// 'prompt' (Chrome/Edge), 'ios', 'mac' oder null (installiert, ausgeblendet, nicht möglich)
export function installMode() {
  if (isInstalled()) return null;
  try { if (localStorage.getItem(DISMISSED_KEY)) return null; } catch { /* privat */ }
  if (deferredPrompt) return 'prompt';
  if (isIOS) return 'ios';
  if (isMacSafari) return 'mac';
  return null;
}

export function dismissInstall() {
  try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* privat */ }
  changed();
}

export async function promptInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  changed();
}
