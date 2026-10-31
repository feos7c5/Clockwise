// Monatsnachweis zum Drucken bzw. als PDF (Layout in assets/css/print.css).
import { iso, parseISO, range, pad, fmtDur } from '../core/time.js';
import { CODES, vacationValue } from '../core/codes.js';
import { holidayOn } from '../core/holidays.js';
import { dayStats, sumRange, balance, pauseMin, grossMin } from '../core/calc.js';
import { store } from '../core/store.js';
import { now } from '../core/session.js';
import { $, esc, WD, MONTHS } from '../ui/dom.js';

function row(ds, m, n, totals) {
  const s = store.state.settings, st = dayStats(store.state, ds, n), b = st.day.blocks, d = parseISO(ds), wd = d.getDay();
  const code = st.day.code;
  totals.vac += vacationValue(code);
  totals.sick += code === 'K' ? 1 : 0;
  totals.ho += code === 'H' ? 1 : 0;
  const note = [holidayOn(s, ds)?.name, code && CODES[code]?.label, st.day.note].filter(Boolean).join(' · ');
  return `<tr class="${wd === 0 || wd === 6 ? 'we' : ''}">
    <td>${WD[wd]} ${pad(d.getDate())}.${pad(m + 1)}.</td>
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
  const rows = range(first, last).map(ds => row(ds, m, n, totals)).join('');

  $('#print').innerHTML = `
    <h1>Arbeitszeitnachweis ${MONTHS[m]} ${y}</h1>
    <div class="meta">${esc(s.name)}${s.pnr ? ' · Personal-Nr. ' + esc(s.pnr) : ''}</div>
    <table>
      <thead><tr><th>Tag</th><th>Kommt</th><th>Geht</th><th>Pause</th><th>Ist</th><th>Soll</th><th>Diff</th><th class="note">Bemerkung</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <table class="sum"><tbody>
      <tr><td>Übertrag Vormonat</td><td>${fmtDur(carry, true)}</td></tr>
      <tr><td>Soll-Arbeitszeit</td><td>${fmtDur(sum.soll)}</td></tr>
      <tr><td>Ist-Arbeitszeit</td><td>${fmtDur(sum.ist)}</td></tr>
      <tr><td><b>Übertrag nächster Monat</b></td><td><b>${fmtDur(carry + sum.diff, true)}</b></td></tr>
      <tr><td>Urlaub / Krank / Homeoffice</td><td>${totals.vac} / ${totals.sick} / ${totals.ho} Tage</td></tr>
    </tbody></table>
    <div class="sign"><div>Datum, Arbeitnehmer</div><div>Datum, Arbeitgeber</div></div>`;
  window.print();
}
