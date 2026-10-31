import { parseISO, fmtDur } from '../core/time.js';
import { CODES } from '../core/codes.js';
import { holidayOn } from '../core/holidays.js';
import { dayStats, pauseMin, grossMin } from '../core/calc.js';
import { store, save, cleanDay } from '../core/store.js';
import { now } from '../core/session.js';
import { t, formatLongDate } from '../i18n/index.js';
import { $, $$, esc, tone, codeLabel, holidayLabel } from '../ui/dom.js';
import { ICON } from '../ui/icons.js';
import { showDialog, dialogHead, closeDialog } from '../ui/dialog.js';
import { rerender } from '../ui/nav.js';

function blockRows(blocks) {
  if (!blocks.length) return '';
  const head = `<div class="blocks-head"><span>${t('dayDialog.clockIn')}</span><span>${t('dayDialog.clockOut')}</span></div>`;
  return head + blocks.map((b, i) => `
    <div class="block-edit">
      <input type="time" data-i="${i}" data-k="in" value="${b.in || ''}" aria-label="${t('dayDialog.clockIn')}">
      <input type="time" data-i="${i}" data-k="out" value="${b.out || ''}" aria-label="${t('dayDialog.clockOut')}">
      <button type="button" class="btn btn-icon btn-ghost" data-del="${i}" aria-label="${t('dayDialog.removeBlock')}">${ICON.close}</button>
    </div>`).join('');
}

function commit(ds, draft) {
  const out = { blocks: draft.blocks.filter(b => b.in) };
  if (draft.pause != null) out.pause = draft.pause;
  if (draft.code) out.code = draft.code;
  if (draft.note && draft.note.trim()) out.note = draft.note.trim();
  store.state.days[ds] = out;
  cleanDay(ds);
  save();
}

export function openDayDialog(ds) {
  const draft = structuredClone(store.state.days[ds] || { blocks: [] });
  const date = parseISO(ds);
  const hol = holidayOn(store.state.settings, ds);
  const settings = store.state.settings;

  const resultLine = () => {
    const st = dayStats({ ...store.state, days: { ...store.state.days, [ds]: draft } }, ds, now());
    return `${t('common.istSoll', { ist: fmtDur(st.ist), soll: fmtDur(st.soll) })} ·
      <span class="${tone(st.ist - st.soll)}">${fmtDur(st.ist - st.soll, true)}</span>`;
  };
  const autoPauseHint = () => t('dayDialog.auto', { n: pauseMin(settings, { ...draft, pause: null }, grossMin(draft)) });

  const refresh = dlg => {
    $('#dlgResult', dlg).innerHTML = resultLine();
    $('#pause', dlg).placeholder = autoPauseHint();
  };

  const draw = () => {
    const options = Object.keys(CODES).map(k => `<option value="${k}" ${draft.code === k ? 'selected' : ''}>${codeLabel(k)}</option>`).join('');

    showDialog(`
      ${dialogHead(`${formatLongDate(date)}${hol ? ` <span class="muted">· ${esc(holidayLabel(hol))}</span>` : ''}`)}
      ${blockRows(draft.blocks)}
      <button type="button" class="btn btn-sm btn-ghost accent add-block" id="addBlock">${ICON.plus}${t('dayDialog.addBlock')}</button>
      <div class="grid-2 dlg-section">
        <label class="field"><span>${t('dayDialog.pauseMin')}</span>
          <input type="number" min="0" inputmode="numeric" id="pause" value="${draft.pause ?? ''}" placeholder="${autoPauseHint()}"></label>
        <label class="field"><span>${t('common.dayType')}</span>
          <select id="code"><option value="">${t('common.normal')}</option>${options}</select></label>
      </div>
      <label class="field dlg-section"><span>${t('common.note')}</span><textarea id="note">${esc(draft.note)}</textarea></label>
      <div class="dlg-result" id="dlgResult">${resultLine()}</div>
      <div class="dlg-foot">
        <button type="button" class="btn btn-ghost danger" id="clear">${t('dayDialog.clear')}</button>
        <span class="spacer"></span>
        <button type="button" class="btn" data-close>${t('common.cancel')}</button>
        <button type="button" class="btn btn-primary" id="ok">${t('common.save')}</button>
      </div>`, dlg => {
      $$('input[type=time]', dlg).forEach(inp => {
        inp.oninput = inp.onchange = () => { draft.blocks[inp.dataset.i][inp.dataset.k] = inp.value || null; refresh(dlg); };
      });
      $$('[data-del]', dlg).forEach(b => (b.onclick = () => { draft.blocks.splice(+b.dataset.del, 1); draw(); }));
      $('#addBlock', dlg).onclick = () => {
        const last = draft.blocks[draft.blocks.length - 1];
        draft.blocks.push({ in: last?.out || '08:00', out: null });
        draw();
      };
      $('#pause', dlg).oninput = e => { draft.pause = e.target.value === '' ? null : Math.max(0, +e.target.value); refresh(dlg); };
      $('#code', dlg).onchange = e => { draft.code = e.target.value; refresh(dlg); };
      $('#note', dlg).oninput = e => { draft.note = e.target.value; };
      $('#clear', dlg).onclick = () => {
        if (!confirm(t('dayDialog.confirmClear'))) return;
        delete store.state.days[ds];
        save(); closeDialog(); rerender();
      };
      $('#ok', dlg).onclick = () => { commit(ds, draft); closeDialog(); rerender(); };
    });
  };
  draw();
}
