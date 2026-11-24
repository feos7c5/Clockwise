import { SYNC_URL, VAPID_KEY } from '../sync/config.js';
import { store } from '../core/store.js';

const SENT_KEY = 'clockwise-push-sent';
const RESEND_MS = 15 * 60_000;
const SERVER_KEY = Uint8Array.from(atob(VAPID_KEY.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

// active: null until the server has answered once – only a clear "no" lets the app notify by itself.
let reg = null, sub = null, pending = null, active = null, running = null, queued = null, onSubscribed = async () => {};
export const pushActive = () => active;
export const currentSubscription = () => (sub ? sub.toJSON() : null);

const supported = () => Boolean(SYNC_URL) && 'PushManager' in window && 'serviceWorker' in navigator;
const wanted = () => store.state.settings.remind.on && Notification.permission === 'granted';

const post = (method, path, body, keepalive = false) => fetch(SYNC_URL + path, {
  method, headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body), cache: 'no-store', keepalive,
});

// iOS only accepts pushManager.subscribe() as the first thing a tap does – no await before it.
export function subscribe() {
  if (sub || !reg || !wanted()) return Promise.resolve(sub);
  return pending ||= reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: SERVER_KEY })
    .then(async s => {
      sub = s;
      document.removeEventListener('click', subscribe, true);
      await onSubscribed();
      return s;
    })
    .catch(() => null)
    .finally(() => { pending = null; });
}

export async function initPush(resync) {
  if (!supported()) { active = false; return; }
  onSubscribed = resync;
  reg = await navigator.serviceWorker.ready;
  sub = await reg.pushManager.getSubscription();
  if (!sub) document.addEventListener('click', subscribe, true);
  await resync();
}

const readSent = () => { try { return JSON.parse(localStorage.getItem(SENT_KEY)) || {}; } catch { return {}; } };

// Hands every device its list of upcoming notifications; the server sends them even while the app is closed.
// A list is only sent again when it changed. This device's own list is also refreshed now and then, in case
// another device replaced it with an older one. One rejected list does not stop the others.
async function upload(targets, keepalive) {
  const sent = readSent();
  let ownOk = false;
  for (const { subscription, items, own } of targets) {
    const body = JSON.stringify({ subscription, items }), prev = sent[subscription.endpoint];
    const fresh = prev && prev.body === body && (!own || !items.length || Date.now() - prev.at < RESEND_MS);
    let ok = fresh;
    if (!fresh) {
      const res = await post('PUT', '/v1/push', body, keepalive).catch(() => null);
      ok = Boolean(res?.ok);
      // A list the server refuses (e.g. an outdated push address) is not retried until it changes.
      if (ok || res?.status === 400) sent[subscription.endpoint] = { body, at: Date.now() };
    }
    if (own) ownOk = ok;
  }
  active = Boolean(sub) && ownOk;
  localStorage.setItem(SENT_KEY, JSON.stringify(sent));
}

export function syncPush(targets, { keepalive = false } = {}) {
  if (running) { queued = { targets, keepalive }; return running; }
  running = (async () => {
    let job = { targets, keepalive };
    while (job) { queued = null; await upload(job.targets, job.keepalive); job = queued; }
    running = null;
  })();
  return running;
}

export async function sendPushTest(title, body) {
  const s = sub || await subscribe();
  if (!s) return false;
  const res = await post('POST', '/v1/push/test', { endpoint: s.endpoint, title, body }).catch(() => null);
  const status = res?.ok ? (await res.json()).status : 0;
  return status >= 200 && status < 300;
}
