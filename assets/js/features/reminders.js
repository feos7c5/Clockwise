// Erinnerungen per Notification – solange die App geöffnet ist.
import { fmtDur } from '../core/time.js';
import { dayStats } from '../core/calc.js';
import { store } from '../core/store.js';
import { now, todayStr, running, missingStamp } from '../core/session.js';
import { t } from '../i18n/index.js';

const FLAGS_KEY = 'stempeluhr-notified';

export const notificationPermission = () => ('Notification' in window ? Notification.permission : 'unsupported');

export async function notify(title, body, tag) {
  if (notificationPermission() !== 'granted') return;
  const opts = { body, tag, icon: 'assets/icons/icon-192.png', badge: 'assets/icons/icon-192.png' };
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) reg.showNotification(title, opts);
  else new Notification(title, opts);
}

// Jede Erinnerung höchstens einmal pro Tag
function flagsForToday() {
  let f;
  try { f = JSON.parse(localStorage.getItem(FLAGS_KEY)) || {}; } catch (e) { f = {}; }
  return f.date === todayStr() ? f : { date: todayStr() };
}

export function checkReminders() {
  const rs = store.state.settings.remind;
  if (!rs.on) return;
  const flags = flagsForToday();
  const once = (key, title, body) => { if (!flags[key]) { flags[key] = true; notify(title, body, key); } };

  if (missingStamp()) once('start', t('notify.missingTitle'), t('notify.missingBody'));

  const r = running();
  if (r) {
    const st = dayStats(store.state, r.ds, now());
    if (rs.soll && st.soll > 0 && st.ist >= st.soll) once('soll', t('notify.targetTitle'), t('notify.targetBody', { dur: fmtDur(st.ist) }));
    if (rs.forgot && st.ist >= rs.forgot * 60) once('forgot', t('notify.forgotTitle'), t('notify.forgotBody', { time: r.block.in }));
  }
  localStorage.setItem(FLAGS_KEY, JSON.stringify(flags));
}

export function startReminders() {
  checkReminders();
  setInterval(checkReminders, 30000);
}
