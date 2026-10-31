import { range } from '../core/time.js';
import { ABSENCE_CODES } from '../core/codes.js';
import { holidayOn } from '../core/holidays.js';
import { contractMin } from '../core/calc.js';
import { store, save, getDay, cleanDay } from '../core/store.js';
import { todayStr } from '../core/session.js';
import { t, tn } from '../i18n/index.js';
import { $, codeLabel } from '../ui/dom.js';
import { showDialog, dialogHead, closeDialog } from '../ui/dialog.js';
import { rerender } from '../ui/nav.js';

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
  const options = ABSENCE_CODES.map(k => `<option value="${k}">${codeLabel(k)}</option>`).join('');

  showDialog(`
    ${dialogHead(t('absence.title'))}
    <label class="field"><span>${t('absence.type')}</span>
      <select id="aCode">${options}<option value="">${t('absence.remove')}</option></select></label>
    <div class="grid-2 dlg-section">
      <label class="field"><span>${t('absence.from')}</span><input type="date" id="aFrom" value="${start}"></label>
      <label class="field"><span>${t('absence.to')}</span><input type="date" id="aTo" value="${start}"></label>
    </div>
    <div class="dlg-result" id="aInfo"></div>
    <div class="dlg-foot">
      <span class="spacer"></span>
      <button type="button" class="btn" data-close>${t('common.cancel')}</button>
      <button type="button" class="btn btn-primary" id="ok">${t('absence.apply')}</button>
    </div>`, dlg => {
    const from = $('#aFrom', dlg), to = $('#aTo', dlg);
    const days = () => workdays(from.value, to.value);
    const info = () => { $('#aInfo', dlg).textContent = tn('absence.workdays', days().length); };
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
