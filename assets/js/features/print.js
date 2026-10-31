// Monatsnachweis zum Drucken bzw. als PDF (Layout in assets/css/print.css).
import { iso, parseISO, range, fmtDur } from '../core/time.js';
import { vacationValue } from '../core/codes.js';
import { holidayOn } from '../core/holidays.js';
import { dayStats, sumRange, balance, pauseMin, grossMin } from '../core/calc.js';
import { store } from '../core/store.js';
import { now } from '../core/session.js';
import { t, weekdayShort, formatDayMonth, monthName, formatNumber } from '../i18n/index.js';
import { $, esc, codeLabel, holidayLabel } from '../ui/dom.js';

function row(ds, n, totals) {
  const s = store.state.settings, st = dayStats(store.state, ds, n), b = st.day.blocks, d = parseISO(ds), wd = d.getDay();
  const code = st.day.code, hol = holidayOn(s, ds);
  totals.vac += vacationValue(code);
  totals.sick += code === 'K' ? 1 : 0;
  totals.ho += code === 'H' ? 1 : 0;
  const note = [hol && holidayLabel(hol), code && codeLabel(code), st.day.note].filter(Boolean).join(' · ');
  return `<tr class="${wd === 0 || wd === 6 ? 'we' : ''}">
    <td>${weekdayShort(wd)} ${formatDayMonth(d)}</td>
    <td>${b.map(x => x.in).join('<br>')}</td>
    <td>${b.map(x => x.out || '').join('<br>')}</td>
    <td>${b.length ? pauseMin(s, st.day, grossMin(st.day)) : ''}</td>
    <td>${st.ist ? fmtDur(st.ist) : ''}</td>
    <td>${st.soll && st.counts ? fmtDur(st.soll) : ''}</td>
    <td>${st.counts && (st.ist || st.soll) ? fmtDur(st.diff, true) : ''}</td>
    <td class="note">${esc(note)}</td></tr>`;
}

export function printMonth(y, m) {
  const n = now(), s = store.state.settings;
  const first = iso(new Date(y, m, 1)), last = iso(new Date(y, m + 1, 0));
  const carry = balance(store.state, iso(new Date(y, m, 0)), n);
  const sum = sumRange(store.state, first, last, n);
  const totals = { vac: 0, sick: 0, ho: 0 };
  const rows = range(first, last).map(ds => row(ds, n, totals)).join('');
  const th = key => `<th>${t(key)}</th>`;

  $('#print').innerHTML = `
    <h1>${t('print.title', { month: monthName(m), year: y })}</h1>
    <div class="meta">${esc(s.name)}${s.pnr ? ' · ' + esc(t('print.pnr', { pnr: s.pnr })) : ''}</div>
    <table>
      <thead><tr>${th('print.day')}${th('print.clockIn')}${th('print.clockOut')}${th('print.pause')}${th('common.ist')}${th('common.soll')}${th('common.diff')}<th class="note">${t('common.note')}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <table class="sum"><tbody>
      <tr><td>${t('print.carryPrev')}</td><td>${fmtDur(carry, true)}</td></tr>
      <tr><td>${t('print.target')}</td><td>${fmtDur(sum.soll)}</td></tr>
      <tr><td>${t('print.actual')}</td><td>${fmtDur(sum.ist)}</td></tr>
      <tr><td><b>${t('print.carryNext')}</b></td><td><b>${fmtDur(carry + sum.diff, true)}</b></td></tr>
      <tr><td>${t('print.absences')}</td><td>${t('print.absenceDays', { vac: formatNumber(totals.vac), sick: totals.sick, ho: totals.ho })}</td></tr>
    </tbody></table>
    <div class="sign"><div>${t('print.signEmployee')}</div><div>${t('print.signEmployer')}</div></div>`;
  window.print();
}
