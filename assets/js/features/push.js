import { SYNC_URL } from '../sync/config.js';

const SENT_KEY = 'clockwise-push-sent';

let active = false, busy = false;
export const pushActive = () => active;

const supported = () => Boolean(SYNC_URL) && 'PushManager' in window && 'serviceWorker' in navigator;

const post = (method, path, body) => fetch(SYNC_URL + path, {
  method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store',
});

async function subscription(create) {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub || !create) return sub;
  const { key } = await (await fetch(SYNC_URL + '/v1/push/key')).json();
  const raw = atob(key.replace(/-/g, '+').replace(/_/g, '/'));
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, c => c.charCodeAt(0)) });
}

// Hands the upcoming notifications to the server, which sends them even while the app is closed.
export async function syncPush(items, { subscribe = false } = {}) {
  if (!supported() || Notification.permission !== 'granted' || busy) return;
  busy = true;
  try {
    const sub = await subscription(subscribe || items.length > 0);
    if (!sub) { active = false; return; }
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
  const sub = supported() && await subscription(false);
  if (!sub) return false;
  const res = await post('POST', '/v1/push/test', { endpoint: sub.endpoint, title, body }).catch(() => null);
  const status = res?.ok ? (await res.json()).status : 0;
  return status >= 200 && status < 300;
}
