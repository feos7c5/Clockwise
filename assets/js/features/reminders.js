import { fmtDur, fromMin, iso, toMin, addDays } from '../core/time.js';
import { dayStats, reachMin } from '../core/calc.js';
import { store } from '../core/store.js';
import { now, running, isWorkday, atMin, clockOutDue, autoClockOut } from '../core/session.js';
import { rerender } from '../ui/nav.js';
import { t } from '../i18n/index.js';
import { initPush, syncPush, pushActive, sendPushTest } from './push.js';

const FLAGS_KEY = 'stempeluhr-notified';
const LOCAL_WINDOW_MS = 6 * 3600_000;
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

export function upcoming(n = now()) {
  const s = store.state.settings, rs = s.remind, items = [];
  if (!rs.on) return items;
  for (let i = 0; i < LOOKAHEAD_DAYS; i++) {
    const ds = iso(addDays(n, i));
    if (isWorkday(ds) && !store.state.days[ds]?.blocks.length) {
      items.push({ tag: `start-${ds}`, at: +atMin(ds, toMin(rs.at)), title: t('notify.missingTitle'), body: t('notify.missingBody') });
    }
  }
  const r = running();
  if (!r) return items;
  const st = dayStats(store.state, r.ds, n);
  const sollAt = rs.soll && st.soll > 0 ? reachMin(s, store.state.days[r.ds], st.soll, toMin(r.block.in)) : null;
  if (sollAt != null) {
    items.push({ tag: `soll-${r.ds}`, at: +atMin(r.ds, sollAt), title: t('notify.targetTitle'), body: t('notify.targetBody', { dur: fmtDur(st.soll) }) });
  }
  const out = clockOutDue();
  if (out) {
    items.push({ tag: `out-${r.ds}`, at: +out.at, title: t('notify.autoOutTitle'), body: t('notify.autoOutBody', { time: fromMin(out.min), hours: rs.forgot }) });
  }
  return items;
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

export async function checkReminders() {
  const before = upcoming();
  if (autoClockOut()) rerender();
  await syncPush(upcoming());
  if (!pushActive()) await notifyLocally(before);
}

export async function sendTest() {
  const title = t('settings.testTitle'), body = t('settings.testBody');
  if (!(await sendPushTest(title, body))) await notify({ title, body, tag: 'test' });
}

export function startReminders() {
  initPush(checkReminders);
  setInterval(checkReminders, 30000);
}
