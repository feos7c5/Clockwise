// Ansicht "Jahr": Monate, Urlaub, Überstunden, Tagesarten.
import { iso, fmtDur } from '../core/time.js';
import { vacationValue } from '../core/codes.js';
import { sumRange, balance, vacationUsed } from '../core/calc.js';
import { store } from '../core/store.js';
import { now, todayStr } from '../core/session.js';
import { $$, tone, MONTHS, stat, cardHead } from '../ui/dom.js';
import { nav, goTo } from '../ui/nav.js';

function monthRows(y, n) {
  let rows = '';
  const total = { ist: 0, soll: 0, diff: 0 };
  for (let m = 0; m < 12; m++) {
    const end = iso(new Date(y, m + 1, 0));
    const r = sumRange(store.state, iso(new Date(y, m, 1)), end, n);
    if (!r.ist && !r.soll) continue;
    total.ist += r.ist; total.soll += r.soll; total.diff += r.diff;
    const bal = balance(store.state, end, n);
    rows += `<tr data-m="${m}"><td>${MONTHS[m]}</td><td>${fmtDur(r.ist)}</td><td>${fmtDur(r.soll)}</td>
      <td class="${tone(r.diff)}">${fmtDur(r.diff, true)}</td><td class="${tone(bal)}">${fmtDur(bal, true)}</td></tr>`;
  }
  return { rows, total };
}

function entitlement(s, y) {
  const latest = s.vacation[Object.keys(s.vacation).sort().pop()];
  return (s.vacation[y] ?? latest ?? 0) + (s.vacationCarry[y] || 0);
}

export function renderYear(view) {
  const y = nav.year, n = now(), s = store.state.settings;
  const entries = Object.entries(store.state.days).filter(([d]) => d.startsWith(y));
  const count = code => entries.filter(([, v]) => v.code === code).length;
  const used = vacationUsed(store.state, String(y));
  const planned = entries.filter(([d]) => d > todayStr()).reduce((a, [, v]) => a + vacationValue(v.code), 0);
  const entitled = entitlement(s, y);
  const bal = balance(store.state, todayStr(), n);
  const dayMin = s.periods.at(-1).min[0] || 480;
  const { rows, total } = monthRows(y, n);

  view.innerHTML = `<div class="stack">
    <section class="stats">
      ${stat('Resturlaub', `${entitled - used} Tage`, `${used} von ${entitled} genommen${planned ? ` · ${planned} geplant` : ''}`)}
      ${stat('Überstunden', fmtDur(bal, true), `≈ ${(bal / dayMin).toFixed(1).replace('.', ',')} Arbeitstage`, tone(bal))}
    </section>
    <section class="card">
      ${cardHead('Monate')}
      <table>
        <thead><tr><th>Monat</th><th>Ist</th><th>Soll</th><th>Diff</th><th>Saldo</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="muted">Keine Daten</td></tr>'}</tbody>
        <tfoot><tr><th>Gesamt</th><th>${fmtDur(total.ist)}</th><th>${fmtDur(total.soll)}</th>
          <th class="${tone(total.diff)}">${fmtDur(total.diff, true)}</th><th></th></tr></tfoot>
      </table>
    </section>
    <section class="card">
      ${cardHead('Tage')}
      <table><tbody>
        <tr><td>Anwesend</td><td>${entries.filter(([, v]) => v.blocks.length).length}</td></tr>
        <tr><td>Homeoffice</td><td>${count('H')}</td></tr>
        <tr><td>Dienstreise</td><td>${count('D')}</td></tr>
        <tr><td>Urlaub</td><td>${used}</td></tr>
        <tr><td>Krank</td><td>${count('K') + count('KR')}</td></tr>
        <tr><td>Gleittage</td><td>${count('G')}</td></tr>
      </tbody></table>
    </section>
  </div>`;

  $$('tr[data-m]', view).forEach(tr => (tr.onclick = () => { nav.month = { y, m: +tr.dataset.m }; goTo('monat'); }));
}
