// Einstellungen: Soll-Arbeitszeit, Pause, Urlaubs- und Stundenkonto.
import { fmtDur, parseDur } from '../../core/time.js';
import { store, save } from '../../core/store.js';
import { vacationAccount } from '../../core/calc.js';
import { formatNumber } from '../../i18n/index.js';
import { todayStr, now } from '../../core/session.js';
import { t } from '../../i18n/index.js';
import { $, $$, cardHead } from '../../ui/dom.js';
import { ICON } from '../../ui/icons.js';
import { rerender } from '../../ui/nav.js';

const s = () => store.state.settings;
const update = fn => { fn(s()); save(); };
const durIn = m => (m ? fmtDur(m).replace('−', '-') : '0');
const sortedPeriods = () => [...s().periods].sort((a, b) => a.from.localeCompare(b.from));

function periodBlock(p, i) {
  const days = t('weekdaysMonFirst').map((w, j) =>
    `<label>${w}<input type="text" inputmode="decimal" data-p="${i}" data-w="${j}" value="${durIn(p.min[j])}"></label>`).join('');
  return `<div class="period">
    <div class="period-head"><span class="muted">${t('settings.from')}</span>
      <input type="date" data-pf="${i}" value="${p.from}">
      <button class="btn btn-icon btn-ghost" data-pdel="${i}" aria-label="${t('settings.deletePeriod')}">${ICON.close}</button></div>
    <div class="week">${days}</div>
    <div class="hint">${t('settings.perWeek', { dur: fmtDur(p.min.reduce((a, b) => a + b, 0)) })}</div></div>`;
}

export const schedule = {
  html: () => `<section class="card">
    ${cardHead(`${t('settings.schedule')} <span class="muted">${t('settings.scheduleUnit')}</span>`,
      `<button class="btn btn-sm btn-ghost accent" id="addPeriod">${ICON.plus}${t('settings.addPeriod')}</button>`)}
    ${sortedPeriods().map(periodBlock).join('')}
    <p class="hint">${t('settings.scheduleHint')}</p></section>`,
  bind: view => {
    const periods = sortedPeriods();
    const commit = () => { s().periods = periods; save(); };
    $$('[data-p]', view).forEach(inp => (inp.onchange = () => {
      const p = periods[inp.dataset.p];
      p.min[inp.dataset.w] = Math.max(0, parseDur(inp.value) || 0);
      inp.value = durIn(p.min[inp.dataset.w]);
      commit();
    }));
    $$('[data-pf]', view).forEach(inp => (inp.onchange = () => {
      if (inp.value) { periods[inp.dataset.pf].from = inp.value; commit(); } // Sortierung beim nächsten Öffnen
    }));
    $$('[data-pdel]', view).forEach(b => (b.onclick = () => {
      if (periods.length < 2) return alert(t('settings.needOnePeriod'));
      if (!confirm(t('settings.confirmDeletePeriod'))) return;
      periods.splice(+b.dataset.pdel, 1);
      commit(); rerender();
    }));
    $('#addPeriod', view).onclick = () => {
      periods.push({ from: todayStr(), min: [...periods[periods.length - 1].min] });
      commit(); rerender();
    };
  },
};

export const pause = {
  html: () => {
    const fix = s().pauseMode === 'fix';
    const modes = [['fix', t('settings.pauseFixed')], ['gesetz', t('settings.pauseLegal')]];
    return `<section class="card">${cardHead(t('settings.pause'))}
      <div class="seg">${modes.map(([k, l]) => `<button data-pm="${k}" class="${s().pauseMode === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${fix ? `<label class="field" style="margin-top:var(--sp-3)"><span>${t('settings.pausePerDay')}</span><input type="number" min="0" id="sPause" value="${s().pauseMin}"></label>` : ''}
      <p class="hint">${t(fix ? 'settings.pauseFixedHint' : 'settings.pauseLegalHint')}</p></section>`;
  },
  bind: view => {
    $$('[data-pm]', view).forEach(b => (b.onclick = () => { update(x => (x.pauseMode = b.dataset.pm)); rerender(); }));
    $('#sPause', view)?.addEventListener('change', e => update(x => (x.pauseMin = Math.max(0, +e.target.value || 0))));
  },
};

export const accounts = {
  html: () => {
    const y = now().getFullYear();
    const vac = vacationAccount(store.state, y);
    return `<section class="card">${cardHead(t('settings.accounts'))}
      <div class="grid-2">
        <label class="field"><span>${t('settings.vacationDays')}</span><input type="number" step="0.5" min="0" id="sVac" value="${vac.base || ''}"></label>
        <label class="field"><span>${t('settings.vacationCarry', { year: y - 1 })}</span><input type="number" step="0.5" id="sVacCarry" value="${vac.manual ? vac.carry : ''}" placeholder="${t('settings.carryAuto', { n: formatNumber(vac.autoCarry) })}"></label>
      </div>
      <label class="field"><span>${t('settings.hourCarry')}</span><input type="text" id="sCarry" value="${durIn(s().carry)}"></label>
      <p class="hint">${t('settings.accountsHint')}</p></section>`;
  },
  bind: view => {
    const y = now().getFullYear();
    const setOrDelete = (obj, v) => { if (v === '') delete obj[y]; else obj[y] = +v; };
    $('#sVac', view).onchange = e => update(x => setOrDelete(x.vacation, e.target.value));
    $('#sVacCarry', view).onchange = e => { update(x => setOrDelete(x.vacationCarry, e.target.value)); rerender(); };
    $('#sCarry', view).onchange = e => update(x => (x.carry = parseDur(e.target.value) || 0));
  },
};
