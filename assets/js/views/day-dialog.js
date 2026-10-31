// Dialog: einen Tag bearbeiten oder nachtragen.
import { parseISO, fmtDur } from '../core/time.js';
import { CODES } from '../core/codes.js';
import { holidayOn } from '../core/holidays.js';
import { dayStats, pauseMin, grossMin } from '../core/calc.js';
import { store, save, cleanDay } from '../core/store.js';
import { now } from '../core/session.js';
import { $, $$, esc, tone, longDate } from '../ui/dom.js';
import { ICON } from '../ui/icons.js';
import { showDialog, dialogHead, closeDialog } from '../ui/dialog.js';
import { rerender } from '../ui/nav.js';

function blockRows(blocks) {
  if (!blocks.length) return '';
  return '<div class="blocks-head"><span>Kommt</span><span>Geht</span></div>' + blocks.map((b, i) => `
    <div class="block-edit">
      <input type="time" data-i="${i}" data-k="in" value="${b.in || ''}" aria-label="Kommt">
      <input type="time" data-i="${i}" data-k="out" value="${b.out || ''}" aria-label="Geht">
      <button type="button" class="btn btn-icon btn-ghost" data-del="${i}" aria-label="Zeitblock entfernen">${ICON.close}</button>
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

  const draw = () => {
    const st = dayStats({ ...store.state, days: { ...store.state.days, [ds]: draft } }, ds, now());
    const autoPause = pauseMin(settings, { ...draft, pause: null }, grossMin(draft));
    const codeOptions = Object.entries(CODES).map(([k, c]) => `<option value="${k}" ${draft.code === k ? 'selected' : ''}>${c.label}</option>`).join('');

    showDialog(`
      ${dialogHead(`${longDate(date)}${hol ? ` <span class="tag">${esc(hol.name)}</span>` : ''}`)}
      ${blockRows(draft.blocks)}
      <button type="button" class="btn btn-sm btn-ghost accent add-block" id="addBlock">${ICON.plus}Zeitblock</button>
      <div class="grid-2 dlg-section">
        <label class="field"><span>Pause (min)</span>
          <input type="number" min="0" inputmode="numeric" id="pause" value="${draft.pause ?? ''}" placeholder="auto: ${autoPause}"></label>
        <label class="field"><span>Tagesart</span>
          <select id="code"><option value="">Normal</option>${codeOptions}</select></label>
      </div>
      <label class="field dlg-section"><span>Bemerkung</span><textarea id="note">${esc(draft.note)}</textarea></label>
      <div class="dlg-result">Ist ${fmtDur(st.ist)} · Soll ${fmtDur(st.soll)} ·
        <span class="${tone(st.ist - st.soll)}">${fmtDur(st.ist - st.soll, true)}</span></div>
      <div class="dlg-foot">
        <button type="button" class="btn btn-ghost danger" id="clear">Tag leeren</button>
        <span class="spacer"></span>
        <button type="button" class="btn" data-close>Abbrechen</button>
        <button type="button" class="btn btn-primary" id="ok">Speichern</button>
      </div>`, dlg => {
      $$('input[type=time]', dlg).forEach(inp => (inp.onchange = () => { draft.blocks[inp.dataset.i][inp.dataset.k] = inp.value || null; draw(); }));
      $$('[data-del]', dlg).forEach(b => (b.onclick = () => { draft.blocks.splice(+b.dataset.del, 1); draw(); }));
      $('#addBlock', dlg).onclick = () => {
        const last = draft.blocks[draft.blocks.length - 1];
        draft.blocks.push({ in: last?.out || '08:00', out: null });
        draw();
      };
      $('#pause', dlg).onchange = e => { draft.pause = e.target.value === '' ? null : Math.max(0, +e.target.value); draw(); };
      $('#code', dlg).onchange = e => { draft.code = e.target.value; draw(); };
      $('#note', dlg).oninput = e => { draft.note = e.target.value; };
      $('#clear', dlg).onclick = () => {
        if (!confirm('Alle Einträge dieses Tages löschen?')) return;
        delete store.state.days[ds];
        save(); closeDialog(); rerender();
      };
      $('#ok', dlg).onclick = () => { commit(ds, draft); closeDialog(); rerender(); };
    });
  };
  draw();
}
