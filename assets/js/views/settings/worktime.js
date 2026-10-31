// Einstellungen: Soll-Arbeitszeit, Pause, Urlaubs- und Stundenkonto.
import { fmtDur, parseDur } from '../../core/time.js';
import { store, save } from '../../core/store.js';
import { todayStr, now } from '../../core/session.js';
import { $, $$, cardHead } from '../../ui/dom.js';
import { ICON } from '../../ui/icons.js';
import { rerender } from '../../ui/nav.js';

const WEEK = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const s = () => store.state.settings;
const update = fn => { fn(s()); save(); };
const durIn = m => (m ? fmtDur(m).replace('−', '-') : '0');
const sortedPeriods = () => [...s().periods].sort((a, b) => a.from.localeCompare(b.from));

function periodBlock(p, i) {
  const days = WEEK.map((w, j) => `<label>${w}<input type="text" inputmode="decimal" data-p="${i}" data-w="${j}" value="${durIn(p.min[j])}"></label>`).join('');
  return `<div class="period">
    <div class="period-head"><span class="muted">ab</span>
      <input type="date" data-pf="${i}" value="${p.from}">
      <button class="btn btn-icon btn-ghost" data-pdel="${i}" aria-label="Zeitraum löschen">${ICON.close}</button></div>
    <div class="week">${days}</div>
    <div class="hint">${fmtDur(p.min.reduce((a, b) => a + b, 0))} h pro Woche</div></div>`;
}

export const schedule = {
  html: () => `<section class="card">
    ${cardHead('Soll-Arbeitszeit <span class="muted">Stunden pro Tag</span>', `<button class="btn btn-sm btn-ghost accent" id="addPeriod">${ICON.plus}Zeitraum</button>`)}
    ${sortedPeriods().map(periodBlock).join('')}
    <p class="hint">Eingabe als 7:30 oder 7,5. Gilt ab dem Datum bis zum nächsten Zeitraum.</p></section>`,
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
      if (inp.value) { periods[inp.dataset.pf].from = inp.value; commit(); }
      rerender();
    }));
    $$('[data-pdel]', view).forEach(b => (b.onclick = () => {
      if (periods.length < 2) return alert('Mindestens ein Zeitraum wird benötigt.');
      if (!confirm('Zeitraum löschen?')) return;
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
    return `<section class="card">${cardHead('Pause')}
      <div class="seg">${[['fix', 'Fester Abzug'], ['gesetz', 'Nach Gesetz']]
        .map(([k, l]) => `<button data-pm="${k}" class="${s().pauseMode === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${fix ? `<label class="field" style="margin-top:var(--sp-3)"><span>Minuten pro Tag</span><input type="number" min="0" id="sPause" value="${s().pauseMin}"></label>` : ''}
      <p class="hint">${fix ? 'Gestempelte Pausen werden angerechnet.' : 'Ab 6 h 30 min, ab 9 h 45 min, gestempelte Pausen zählen mit.'} Pro Tag änderbar.</p></section>`;
  },
  bind: view => {
    $$('[data-pm]', view).forEach(b => (b.onclick = () => { update(x => (x.pauseMode = b.dataset.pm)); rerender(); }));
    $('#sPause', view)?.addEventListener('change', e => update(x => (x.pauseMin = Math.max(0, +e.target.value || 0))));
  },
};

export const accounts = {
  html: () => {
    const y = now().getFullYear();
    return `<section class="card">${cardHead('Konten')}
      <div class="grid-2">
        <label class="field"><span>Urlaubstage ${y}</span><input type="number" step="0.5" id="sVac" value="${s().vacation[y] ?? ''}"></label>
        <label class="field"><span>Resturlaub aus ${y - 1}</span><input type="number" step="0.5" id="sVacCarry" value="${s().vacationCarry[y] ?? ''}"></label>
      </div>
      <label class="field"><span>Stunden-Übertrag beim Start (z. B. -2:30)</span><input type="text" id="sCarry" value="${durIn(s().carry)}"></label></section>`;
  },
  bind: view => {
    const y = now().getFullYear();
    const setOrDelete = (obj, v) => { if (v === '') delete obj[y]; else obj[y] = +v; };
    $('#sVac', view).onchange = e => update(x => setOrDelete(x.vacation, e.target.value));
    $('#sVacCarry', view).onchange = e => update(x => setOrDelete(x.vacationCarry, e.target.value));
    $('#sCarry', view).onchange = e => update(x => (x.carry = parseDur(e.target.value) || 0));
  },
};
