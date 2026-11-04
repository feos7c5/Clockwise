import { iso, fmtDur, addDays } from '../core/time.js';
import { vacationValue } from '../core/codes.js';
import { sumRange, balance, vacationAccount, dayStats } from '../core/calc.js';
import { store } from '../core/store.js';
import { now, todayStr } from '../core/session.js';
import { t, tn, monthName, formatNumber } from '../i18n/index.js';
import { $, $$, tone, stat, cardHead, codeLabel } from '../ui/dom.js';
import { ICON } from '../ui/icons.js';
import { exportYearPdf } from '../features/report.js';
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
    rows += `<tr data-m="${m}"><td>${monthName(m)}</td><td>${fmtDur(r.ist)}</td><td>${fmtDur(r.soll)}</td>
      <td class="${tone(r.diff)}">${fmtDur(r.diff, true)}</td><td class="${tone(bal)}">${fmtDur(bal, true)}</td></tr>`;
  }
  return { rows, total };
}

// Shade of a day in the year calendar: worked (darker = longer), absent, or empty.
function cell(ds, n, today) {
  const st = dayStats(store.state, ds, n), code = st.day.code;
  const kind = st.ist ? 'work' : code && !['G', 'H', 'D'].includes(code) ? 'off' : '';
  const level = st.ist ? Math.min(4, Math.max(1, Math.ceil(st.ist / 150))) : 0;
  return `<i class="${kind} ${level ? 'l' + level : ''} ${ds === today ? 'now' : ''}"></i>`;
}

function calendar(y, n) {
  const today = todayStr();
  const months = [...Array(12)].map((_, m) => {
    const first = new Date(y, m, 1), lead = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
    const cells = '<i class="pad"></i>'.repeat(lead) + [...Array(days)].map((_, d) => cell(iso(addDays(first, d)), n, today)).join('');
    return `<button class="ym" data-m="${m}"><span>${monthName(m).slice(0, 3)}</span><div>${cells}</div></button>`;
  }).join('');
  return `<section class="card">${cardHead(t('year.calendar'))}<div class="yearcal">${months}</div></section>`;
}

export function renderYear(view) {
  const y = nav.year, n = now(), s = store.state.settings;
  const entries = Object.entries(store.state.days).filter(([d]) => d.startsWith(y));
  const count = code => entries.filter(([, v]) => v.code === code).length;
  const vac = vacationAccount(store.state, y);
  const used = vac.used;
  const planned = entries.filter(([d]) => d > todayStr()).reduce((a, [, v]) => a + vacationValue(v.code), 0);
  const bal = balance(store.state, todayStr(), n);
  const dayMin = s.periods.at(-1).min[0] || 480;
  const { rows, total } = monthRows(y, n);
  const usedText = t('year.vacationUsed', { used: formatNumber(used), total: formatNumber(vac.total) })
    + (vac.prorated ? ' · ' + t('year.prorated') : '')
    + (vac.carry ? ' · ' + t('year.carryIncluded', { n: formatNumber(vac.carry), year: y - 1 }) : '')
    + (planned ? ' · ' + t('year.planned', { n: formatNumber(planned) }) : '');

  view.innerHTML = `<div class="stack">
    <section class="stats">
      ${stat(t('year.vacationLeft'), tn('year.days', vac.left, { n: formatNumber(vac.left) }), usedText)}
      ${stat(t('year.overtime'), fmtDur(bal, true), t('year.approxDays', { n: formatNumber(bal / dayMin) }), tone(bal))}
    </section>
    ${calendar(+y, n)}
    <div class="btn-row"><button class="btn btn-raised" id="printYear">${ICON.print}${t('month.print')}</button></div>
    <section class="card">
      ${cardHead(t('year.months'))}
      <table>
        <thead><tr><th>${t('year.month')}</th><th>${t('common.ist')}</th><th>${t('common.soll')}</th><th>${t('common.diff')}</th><th>${t('common.balance')}</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5" class="muted">${t('year.noData')}</td></tr>`}</tbody>
        <tfoot><tr><th>${t('common.total')}</th><th>${fmtDur(total.ist)}</th><th>${fmtDur(total.soll)}</th>
          <th class="${tone(total.diff)}">${fmtDur(total.diff, true)}</th><th></th></tr></tfoot>
      </table>
    </section>
    <section class="card">
      ${cardHead(t('year.dayCounts'))}
      <table><tbody>
        <tr><td>${t('year.present')}</td><td>${entries.filter(([, v]) => v.blocks.length).length}</td></tr>
        <tr><td>${codeLabel('H')}</td><td>${count('H')}</td></tr>
        <tr><td>${codeLabel('D')}</td><td>${count('D')}</td></tr>
        <tr><td>${t('year.vacation')}</td><td>${formatNumber(used)}</td></tr>
        <tr><td>${t('year.sick')}</td><td>${count('K') + count('KR')}</td></tr>
        <tr><td>${codeLabel('G')}</td><td>${count('G')}</td></tr>
      </tbody></table>
    </section>
  </div>`;

  $$('[data-m]', view).forEach(el => (el.onclick = () => { nav.month = { y, m: +el.dataset.m }; goTo('month'); }));
  $('#printYear', view).onclick = () => exportYearPdf(+y);
}
