// Dialog: Urlaub, Krankheit usw. für einen Zeitraum eintragen.
import { range } from '../core/time.js';
import { CODES, ABSENCE_CODES } from '../core/codes.js';
import { holidayOn } from '../core/holidays.js';
import { contractMin } from '../core/calc.js';
import { store, save, getDay, cleanDay } from '../core/store.js';
import { todayStr } from '../core/session.js';
import { $ } from '../ui/dom.js';
import { showDialog, dialogHead, closeDialog } from '../ui/dialog.js';
import { rerender } from '../ui/nav.js';

// Arbeitstage im Zeitraum – Wochenenden und volle Feiertage fallen weg
function workdays(from, to) {
  if (!from || !to || to < from) return [];
  const s = store.state.settings;
  return range(from, to).filter(ds => {
    const hol = holidayOn(s, ds);
    return contractMin(s, ds) > 0 && !(hol && hol.f === 0);
  });
}

export function openAbsenceDialog(suggestedDs) {
  const start = suggestedDs < todayStr() ? todayStr() : suggestedDs;
  const options = ABSENCE_CODES.map(k => `<option value="${k}">${CODES[k].label}</option>`).join('');

  showDialog(`
    ${dialogHead('Abwesenheit eintragen')}
    <label class="field"><span>Art</span>
      <select id="aCode">${options}<option value="">Eintrag entfernen</option></select></label>
    <div class="grid-2 dlg-section">
      <label class="field"><span>Von</span><input type="date" id="aFrom" value="${start}"></label>
      <label class="field"><span>Bis</span><input type="date" id="aTo" value="${start}"></label>
    </div>
    <div class="dlg-result" id="aInfo"></div>
    <div class="dlg-foot">
      <span class="spacer"></span>
      <button type="button" class="btn" data-close>Abbrechen</button>
      <button type="button" class="btn btn-primary" id="ok">Eintragen</button>
    </div>`, dlg => {
    const from = $('#aFrom', dlg), to = $('#aTo', dlg);
    const days = () => workdays(from.value, to.value);
    const info = () => {
      const n = days().length;
      $('#aInfo', dlg).textContent = `${n} Arbeitstag${n === 1 ? '' : 'e'} – Wochenenden und Feiertage werden übersprungen.`;
    };
    from.onchange = () => { if (to.value < from.value) to.value = from.value; info(); };
    to.onchange = info;
    info();
    $('#ok', dlg).onclick = () => {
      const code = $('#aCode', dlg).value;
      for (const ds of days()) {
        const d = getDay(ds);
        if (code) d.code = code; else delete d.code;
        cleanDay(ds);
      }
      save(); closeDialog(); rerender();
    };
  });
}
