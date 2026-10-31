// Einstellungen: Darstellung, Erinnerungen, Person.
import { LANDS } from '../../core/holidays.js';
import { store, save } from '../../core/store.js';
import { $, $$, esc, cardHead } from '../../ui/dom.js';
import { applyTheme } from '../../ui/theme.js';
import { rerender } from '../../ui/nav.js';
import { notify, notificationPermission, checkReminders } from '../../features/reminders.js';

const s = () => store.state.settings;
const update = fn => { fn(s()); save(); };

export const appearance = {
  html: () => `<section class="card">${cardHead('Darstellung')}
    <div class="seg">${[['system', 'System'], ['light', 'Hell'], ['dark', 'Dunkel']]
      .map(([k, l]) => `<button data-th="${k}" class="${s().theme === k ? 'on' : ''}">${l}</button>`).join('')}</div></section>`,
  bind: view => $$('[data-th]', view).forEach(b => (b.onclick = () => {
    update(x => (x.theme = b.dataset.th));
    applyTheme();
    rerender();
  })),
};

export const reminders = {
  html: () => {
    const rs = s().remind, perm = notificationPermission();
    const test = perm === 'granted' && rs.on ? '<button class="btn btn-sm btn-ghost accent" id="rTest">Test senden</button>' : '';
    const hours = [0, 9, 10, 11, 12].map(h => `<option value="${h}" ${rs.forgot === h ? 'selected' : ''}>${h ? h + ' h' : 'aus'}</option>`).join('');
    return `<section class="card">${cardHead('Erinnerungen', test)}
      <label class="switch"><span>Benachrichtigungen</span>
        <input type="checkbox" id="rOn" ${rs.on && perm === 'granted' ? 'checked' : ''} ${perm === 'unsupported' ? 'disabled' : ''}></label>
      <label class="switch"><span>Melden, wenn Soll erreicht</span><input type="checkbox" id="rSoll" ${rs.soll ? 'checked' : ''}></label>
      <div class="grid-2" style="margin-top:var(--sp-3)">
        <label class="field"><span>Nicht eingestempelt ab</span><input type="time" id="rAt" value="${rs.at}"></label>
        <label class="field"><span>Ausstempeln vergessen nach</span><select id="rForgot">${hours}</select></label>
      </div>
      <p class="hint">${perm === 'denied' ? 'Benachrichtigungen sind im Browser blockiert – bitte in den Website-Einstellungen erlauben. ' : ''}
        Funktioniert, solange die App geöffnet ist. Nur an Arbeitstagen ohne Urlaub/Krank.</p></section>`;
  },
  bind: view => {
    $('#rOn', view).onchange = async e => {
      if (e.target.checked && Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') {
        e.target.checked = false;
      } else {
        update(x => (x.remind.on = e.target.checked));
        checkReminders();
      }
      rerender();
    };
    $('#rAt', view).onchange = e => update(x => (x.remind.at = e.target.value || '09:00'));
    $('#rForgot', view).onchange = e => update(x => (x.remind.forgot = +e.target.value));
    $('#rSoll', view).onchange = e => update(x => (x.remind.soll = e.target.checked));
    $('#rTest', view)?.addEventListener('click', () => notify('Clockwise', 'So sehen deine Erinnerungen aus.', 'test'));
  },
};

export const person = {
  html: () => `<section class="card">${cardHead('Person')}
    <div class="grid-2">
      <label class="field"><span>Name</span><input type="text" id="sName" value="${esc(s().name)}"></label>
      <label class="field"><span>Personal-Nr.</span><input type="text" id="sPnr" value="${esc(s().pnr)}"></label>
    </div>
    <label class="field"><span>Bundesland für Feiertage</span><select id="sLand">${Object.entries(LANDS)
      .map(([k, v]) => `<option value="${k}" ${s().land === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label class="switch" style="margin-top:var(--sp-2)"><span>Heiligabend &amp; Silvester als halbe Tage</span>
      <input type="checkbox" id="sHalf" ${s().halfHolidays ? 'checked' : ''}></label></section>`,
  bind: view => {
    $('#sName', view).onchange = e => update(x => (x.name = e.target.value));
    $('#sPnr', view).onchange = e => update(x => (x.pnr = e.target.value));
    $('#sLand', view).onchange = e => update(x => (x.land = e.target.value));
    $('#sHalf', view).onchange = e => update(x => (x.halfHolidays = e.target.checked));
  },
};
