import { iso, parseISO, range, fmtDur } from '../core/time.js';
import { holidayOn } from '../core/holidays.js';
import { dayStats, sumRange, balance } from '../core/calc.js';
import { store } from '../core/store.js';
import { now, todayStr } from '../core/session.js';
import { t, weekdayShort } from '../i18n/index.js';
import { $, $$, esc, tone, codeLabel, holidayLabel } from '../ui/dom.js';
import { ICON } from '../ui/icons.js';
import { nav } from '../ui/nav.js';
import { openDayDialog } from './day-dialog.js';
import { openAbsenceDialog } from './absence-dialog.js';
import { exportMonthPdf } from '../features/report.js';

function dayRow(ds, n, today) {
  const st = dayStats(store.state, ds, n), day = st.day, wd = parseISO(ds).getDay();
  const hol = holidayOn(store.state.settings, ds);
  const times = day.blocks.map(b => `${b.in}–${b.out || '…'}`).join(', ');
  const tags = (hol ? `<span class="tag">${esc(holidayLabel(hol))}</span>` : '')
    + (day.code ? `<span class="tag accent">${esc(codeLabel(day.code))}</span>` : '');
  const sub = [tags, esc(day.note)].filter(Boolean).join(' ');
  const missing = st.soll && st.counts && !day.code && !day.blocks.length;
  const compact = !times && !sub && !missing && !st.ist && ds !== today;
  const classes = [wd === 0 || wd === 6 ? 'we' : '', ds === today ? 'today' : '', compact ? 'compact' : ''].join(' ');

  return `<button class="dayrow ${classes}" data-day="${ds}">
    <div class="date"><small>${weekdayShort(wd)}</small><b>${parseISO(ds).getDate()}</b></div>
    <div class="main">${times || (missing ? `<span class="minus">${t('month.noTimes')}</span>` : '')}${sub ? `<div class="sub">${sub}</div>` : ''}</div>
    <div class="side">${st.ist ? fmtDur(st.ist) : ''}<small class="${tone(st.diff)}">${st.counts && (st.ist || st.soll) ? fmtDur(st.diff, true) : ''}</small></div>
  </button>`;
}

const summaryItem = (label, value, cls = '') =>
  `<div><div class="stat-label">${label}</div><div class="stat-value ${cls}">${value}</div></div>`;

export function renderMonth(view) {
  const { y, m } = nav.month, n = now();
  const first = iso(new Date(y, m, 1)), last = iso(new Date(y, m + 1, 0));
  const carry = balance(store.state, iso(new Date(y, m, 0)), n);
  const sum = sumRange(store.state, first, last, n);
  const end = carry + sum.diff;

  view.innerHTML = `<div class="stack">
    <section class="card summary">
      ${summaryItem(t('month.carry'), fmtDur(carry, true), tone(carry))}
      ${summaryItem(t('month.istSoll'), `${fmtDur(sum.ist)}<span class="muted"> / ${fmtDur(sum.soll)}</span>`)}
      ${summaryItem(t('month.endBalance'), fmtDur(end, true), tone(end))}
    </section>
    <div class="btn-row">
      <button class="btn btn-raised" id="absence">${ICON.plus}${t('month.absence')}</button>
      <button class="btn btn-raised" id="printMonth">${ICON.print}${t('month.print')}</button>
    </div>
    <div class="days">${range(first, last).map(ds => dayRow(ds, n, todayStr())).join('')}</div>
  </div>`;

  $('#absence', view).onclick = () => openAbsenceDialog(first);
  $('#printMonth', view).onclick = () => exportMonthPdf(y, m);
  $$('[data-day]', view).forEach(b => (b.onclick = () => openDayDialog(b.dataset.day)));
}
