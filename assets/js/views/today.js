// Ansicht "Heute": Stempeln, Tageswerte, Woche, Tagesart.
import { fmtDur, toMin, fromMin, iso, range, addDays } from '../core/time.js';
import { QUICK_CODES } from '../core/codes.js';
import { holidayOn } from '../core/holidays.js';
import { dayStats, balance, istMin, grossMin, pauseMin, pauseWarning } from '../core/calc.js';
import { store, getDay, cleanDay, save } from '../core/store.js';
import { now, todayStr, nowMin, running, onBreak, missingStamp, stamp } from '../core/session.js';
import { t, weekdayShort } from '../i18n/index.js';
import { $, $$, esc, tone, fmtSec, stat, cardHead, codeLabel, holidayLabel } from '../ui/dom.js';
import { ICON } from '../ui/icons.js';
import { rerender } from '../ui/nav.js';
import { openDayDialog } from './day-dialog.js';

// Netto-Sekunden für den Live-Timer
export function liveSeconds(ds) {
  const day = store.state.days[ds];
  if (!day) return 0;
  const n = now();
  const nowS = n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds() + (ds === todayStr() ? 0 : 86400);
  let gross = 0;
  for (const b of day.blocks) {
    const start = toMin(b.in) * 60;
    let end = b.out ? toMin(b.out) * 60 : nowS;
    if (end < start) end += 86400;
    gross += end - start;
  }
  return Math.max(0, gross - pauseMin(store.state.settings, day, Math.floor(gross / 60)) * 60);
}

// Uhrzeit, zu der das Netto-Ist eine Grenze erreicht (inkl. automatischer Pause)
function reachAt(ds, target) {
  const day = store.state.days[ds], base = nowMin(), offset = ds === todayStr() ? 0 : 1440;
  for (let m = 0; m <= 1440; m++) {
    if (istMin(store.state.settings, day, base + offset + m) >= target) return fromMin(base + m);
  }
  return null;
}

function statusLine(r, brk, day, ds) {
  let dot = '', text = t('today.notClockedIn');
  if (r) {
    dot = 'on';
    text = t('today.clockedInSince', { time: r.block.in }) + (r.ds !== ds ? ' ' + t('today.yesterday') : '');
  } else if (brk) {
    dot = 'brk';
    text = t('today.onBreakSince', { time: brk.out, dur: fmtDur(Math.max(0, nowMin() - toMin(brk.out))) });
  } else if (day.blocks.length) {
    text = t('today.finishedAt', { time: day.blocks[day.blocks.length - 1].out });
  }
  const hol = holidayOn(store.state.settings, ds);
  if (hol) text += ` · ${esc(holidayLabel(hol))}`;
  if (day.code) text += ` · ${esc(codeLabel(day.code))}`;
  return `<div class="status"><span class="dot ${dot}"></span>${text}</div>`;
}

function stampButtons(r, brk) {
  if (r) return `<button class="btn btn-lg" data-act="pause">${ICON.pause}${t('today.pause')}</button>
    <button class="btn btn-lg btn-ink" data-act="out">${ICON.stop}${t('today.clockOut')}</button>`;
  if (brk) return `<button class="btn btn-lg btn-primary" data-act="in">${ICON.play}${t('today.resume')}</button>
    <button class="btn btn-lg" data-act="end">${t('today.finish')}</button>`;
  return `<button class="btn btn-lg btn-primary" data-act="in">${ICON.play}${t('today.clockIn')}</button>`;
}

function statTiles(r, st, activeDs, bal) {
  if (r && st.soll > 0) {
    const left = st.soll - st.ist;
    return stat(t('today.targetReached'), left > 0 ? reachAt(activeDs, st.soll) || '–' : '✓',
      left > 0 ? t('today.remaining', { dur: fmtDur(left) }) : t('today.over', { dur: fmtDur(-left, true) }))
      + stat(t('today.latestEnd'), reachAt(activeDs, 600) || '–', t('today.maxHours'));
  }
  const today = st.counts
    ? stat(t('today.day'), fmtDur(st.ist - st.soll, true), t('common.istSoll', { ist: fmtDur(st.ist), soll: fmtDur(st.soll) }), tone(st.ist - st.soll))
    : stat(t('today.day'), fmtDur(st.soll), t('today.target'));
  return today + stat(t('today.overtime'), fmtDur(bal, true), t('today.totalBalance'), tone(bal));
}

function weekCard(n) {
  const ds = todayStr();
  const monday = addDays(n, -((n.getDay() + 6) % 7));
  const days = range(iso(monday), iso(addDays(monday, 6)));
  const stats = days.map(d => dayStats(store.state, d, n));
  const scale = Math.max(480, ...stats.map(s => Math.max(s.ist, s.soll)));
  const sum = key => stats.reduce((a, s) => a + s[key], 0);
  const bars = days.map((d, i) => {
    const s = stats[i], over = s.ist > s.soll && s.soll;
    return `<div class="wb ${d === ds ? 'today' : ''}">
      <div class="h">${s.ist ? fmtDur(s.ist) : ''}</div>
      <div class="col"><i class="${over ? 'over' : ''}" style="height:${(s.ist / scale) * 100}%"></i></div>
      <div class="lbl">${weekdayShort(addDays(monday, i).getDay())}</div></div>`;
  }).join('');
  return `<section class="card">${cardHead(t('today.week'))}<div class="weekbars">${bars}</div>
    <div class="weektot"><span><b>${fmtDur(sum('ist'))}</b> ${t('today.weekOf', { dur: fmtDur(sum('soll')) })}</span>
    <span class="${tone(sum('diff'))}">${fmtDur(sum('diff'), true)}</span></div></section>`;
}

function entriesCard(day, gross) {
  const list = day.blocks.length
    ? `<ul class="list">${day.blocks.map(b => `<li><span>${b.in} – ${b.out || t('today.running')}</span>
        <span class="muted">${b.out ? fmtDur(grossMin({ blocks: [b] })) + ' h' : ''}</span></li>`).join('')}
        <li><span class="muted">${t('today.pauseDeduction')}</span><span class="muted">${pauseMin(store.state.settings, day, gross)} min</span></li></ul>`
    : `<div class="empty-text">${t('today.noEntries')}</div>`;
  const edit = `<button class="btn btn-sm btn-ghost accent" id="editToday">${ICON.edit}${t('common.edit')}</button>`;
  return `<section class="card">${cardHead(t('today.entries'), edit)}${list}</section>`;
}

function codesCard(day) {
  const toggles = QUICK_CODES.map(k => `<button data-code="${k}" class="toggle ${day.code === k ? 'on' : ''}">${codeLabel(k)}</button>`).join('');
  return `<section class="card">${cardHead(t('common.dayType'))}<div class="toggles">${toggles}</div>
    <label class="field" style="margin-top:var(--sp-4)"><span>${t('common.note')}</span>
    <textarea id="todayNote" placeholder="${t('today.notePlaceholder')}">${esc(day.note)}</textarea></label></section>`;
}

export function renderToday(view) {
  const n = now(), ds = todayStr(), r = running(), brk = onBreak();
  const activeDs = r ? r.ds : ds;
  const st = dayStats(store.state, activeDs, n);
  const day = store.state.days[ds] || { blocks: [] };
  const warn = st.day.blocks.length && !r && !brk && pauseWarning(store.state.settings, st.day);
  const progress = st.soll ? Math.min(100, (st.ist / st.soll) * 100) : 0;

  view.innerHTML = `<div class="stack">
    ${missingStamp() ? `<div class="notice"><div class="ic">${ICON.bell}</div><div><b>${t('today.missingTitle')}</b>${t('today.missingText')}</div></div>` : ''}
    <section class="card clock">
      ${statusLine(r, brk, day, ds)}
      <div class="timer" id="timer">${fmtSec(liveSeconds(activeDs))}</div>
      <div class="timer-sub">${t('today.ofTarget', { dur: fmtDur(st.soll) })}</div>
      <div class="progress"><i style="width:${progress}%"></i></div>
      <div class="btn-row">${stampButtons(r, brk)}</div>
      ${warn ? `<div class="warn">${t('today.pauseWarning')}</div>` : ''}
    </section>
    <section class="stats">${statTiles(r, st, activeDs, balance(store.state, ds, n))}</section>
    ${weekCard(n)}
    ${entriesCard(day, grossMin(day, r && r.ds === ds ? nowMin() : null))}
    ${codesCard(day)}
  </div>`;

  $$('[data-act]', view).forEach(b => (b.onclick = () => { navigator.vibrate?.(20); stamp(b.dataset.act); rerender(); }));
  $('#editToday', view).onclick = () => openDayDialog(ds);
  $$('[data-code]', view).forEach(b => (b.onclick = () => {
    const d = getDay(ds);
    if (d.code === b.dataset.code) delete d.code; else d.code = b.dataset.code;
    cleanDay(ds); save(); rerender();
  }));
  $('#todayNote', view).onchange = e => {
    const d = getDay(ds);
    d.note = e.target.value.trim();
    if (!d.note) delete d.note;
    cleanDay(ds); save();
  };
}

// Sekündlicher Timer ohne komplettes Neu-Zeichnen
export function tickTimer() {
  const el = $('#timer');
  if (!el) return;
  const r = running();
  el.textContent = fmtSec(liveSeconds(r ? r.ds : todayStr()));
}
