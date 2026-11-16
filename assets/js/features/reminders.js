import { fmtDur, fromMin, iso, toMin, addDays } from '../core/time.js';
import { dayStats, reachMin } from '../core/calc.js';
import { store, onSave } from '../core/store.js';
import { now, running, isWorkday, atMin, clockOutDue, autoClockOut } from '../core/session.js';
import { rerender } from '../ui/nav.js';
import { t, tIn, language } from '../i18n/index.js';
import { syncSettled, publishDevice, ownDeviceId } from '../sync/engine.js';
import { initPush, syncPush, pushActive, sendPushTest, currentSubscription } from './push.js';

const FLAGS_KEY = 'stempeluhr-notified';
const LOCAL_WINDOW_MS = 6 * 3600_000;
const RECENT_MS = 15 * 60_000;
const LOOKAHEAD_DAYS = 7;

export const notificationPermission = () => ('Notification' in window ? Notification.permission : 'unsupported');

async function notify({ title, body, tag }) {
  if (notificationPermission() !== 'granted') return false;
  const opts = { body, tag, icon: 'assets/icons/icon-192.png', badge: 'assets/icons/icon-192.png' };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, opts);
    else new Notification(title, opts);
    return true;
  } catch (e) {
    return false;
  }
}

// Upcoming notifications for one device, with that device's reminder settings and language.
function itemsFor(rs, lang, n) {
  const s = store.state.settings, items = [], tx = (key, params) => tIn(lang, key, params);
  if (!rs?.on) return items;
  for (let i = 0; i < LOOKAHEAD_DAYS; i++) {
    const ds = iso(addDays(n, i));
    if (isWorkday(ds) && !store.state.days[ds]?.blocks.length) {
      items.push({ tag: `start-${ds}`, at: +atMin(ds, toMin(rs.at)), title: tx('notify.missingTitle'), body: tx('notify.missingBody') });
    }
  }
  const r = running();
  if (!r) return items;
  const st = dayStats(store.state, r.ds, n);
  const sollAt = rs.soll && st.soll > 0 ? reachMin(s, store.state.days[r.ds], st.soll, toMin(r.block.in)) : null;
  if (sollAt != null) {
    items.push({ tag: `soll-${r.ds}`, at: +atMin(r.ds, sollAt), title: tx('notify.targetTitle'), body: tx('notify.targetBody', { dur: fmtDur(st.soll) }) });
  }
  const out = clockOutDue(r, rs.forgot);
  if (out) {
    items.push({ tag: `out-${r.ds}`, at: +out.at, title: tx('notify.autoOutTitle'), body: tx('notify.autoOutBody', { time: fromMin(out.min), hours: rs.forgot }) });
  }
  return items;
}

export const upcoming = (n = now()) => itemsFor(store.state.settings.remind, language(), n);

// This device plus every other device that shares the data: whoever changes something keeps all of their
// notifications right. Removed devices get an empty list.
function targets(n) {
  const recent = items => items.filter(i => i.at > Date.now() - RECENT_MS);
  const list = [], own = currentSubscription(), me = ownDeviceId();
  for (const [id, d] of Object.entries(store.state.devices || {})) {
    if (id === me || !d.push?.endpoint) continue;
    const gone = d.removed || d.left;
    list.push({ subscription: d.push, items: gone ? [] : recent(itemsFor(d.remind, d.lang, n)) });
  }
  if (own) list.push({ subscription: own, items: recent(upcoming(n)) });
  return list;
}

// Fallback while the server can't deliver: notify from the open app, once per item.
async function notifyLocally(items) {
  let flags;
  try { flags = JSON.parse(localStorage.getItem(FLAGS_KEY)) || {}; } catch (e) { flags = {}; }
  const due = items.filter(i => i.at <= Date.now() && Date.now() - i.at < LOCAL_WINDOW_MS && !flags[i.tag]);
  for (const item of due) if (await notify(item)) flags[item.tag] = item.at;
  for (const tag in flags) if (Date.now() - flags[tag] > LOCAL_WINDOW_MS) delete flags[tag];
  localStorage.setItem(FLAGS_KEY, JSON.stringify(flags));
}

let changedSinceResume = false, saveTimer = 0;

export async function checkReminders({ keepalive = false } = {}) {
  clearTimeout(saveTimer);
  const before = upcoming();
  if (autoClockOut()) rerender();
  publishDevice({ push: currentSubscription(), remind: store.state.settings.remind, lang: language() });
  if (syncSettled() || changedSinceResume) await syncPush(targets(now()), { keepalive });
  if (!pushActive()) await notifyLocally(before);
}

export async function sendTest() {
  const title = t('settings.testTitle'), body = t('settings.testBody');
  if (!(await sendPushTest(title, body))) await notify({ title, body, tag: 'test' });
}

export function startReminders() {
  // Every change (clock-in, clock-out, edits) updates the schedules right away, and closing the app sends
  // whatever is still waiting.
  onSave(() => { changedSinceResume = true; clearTimeout(saveTimer); saveTimer = setTimeout(checkReminders, 400); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) checkReminders({ keepalive: true });
    else changedSinceResume = false;
  });
  initPush(checkReminders);
  setInterval(checkReminders, 30000);
}
