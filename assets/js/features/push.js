import { SYNC_URL, VAPID_KEY } from '../sync/config.js';
import { store } from '../core/store.js';

const SENT_KEY = 'clockwise-push-sent';
const SERVER_KEY = Uint8Array.from(atob(VAPID_KEY.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

let reg = null, sub = null, pending = null, active = false, busy = false, onSubscribed = async () => {};
export const pushActive = () => active;

const supported = () => Boolean(SYNC_URL) && 'PushManager' in window && 'serviceWorker' in navigator;
const wanted = () => store.state.settings.remind.on && Notification.permission === 'granted';

const post = (method, path, body) => fetch(SYNC_URL + path, {
  method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store',
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
  if (!supported()) return;
  onSubscribed = resync;
  reg = await navigator.serviceWorker.ready;
  sub = await reg.pushManager.getSubscription();
  if (!sub) document.addEventListener('click', subscribe, true);
  await resync();
}

// Hands the upcoming notifications to the server, which sends them even while the app is closed.
export async function syncPush(items) {
  if (!sub) { active = false; return; }
  if (busy) return;
  busy = true;
  try {
    const body = JSON.stringify({ subscription: sub.toJSON(), items: items.filter(i => i.at > Date.now()) });
    if (body !== localStorage.getItem(SENT_KEY)) {
      if (!(await post('PUT', '/v1/push', JSON.parse(body))).ok) throw new Error('push schedule rejected');
      localStorage.setItem(SENT_KEY, body);
    }
    active = true;
  } catch (e) {
    active = false;
  } finally {
    busy = false;
  }
}

export async function sendPushTest(title, body) {
  const s = sub || await subscribe();
  if (!s) return false;
  const res = await post('POST', '/v1/push/test', { endpoint: s.endpoint, title, body }).catch(() => null);
  const status = res?.ok ? (await res.json()).status : 0;
  return status >= 200 && status < 300;
}
