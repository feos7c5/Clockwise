import { STATES } from '../../core/holidays.js';
import { store, save } from '../../core/store.js';
import { t } from '../../i18n/index.js';
import { $, $$, esc, cardHead, settingRow } from '../../ui/dom.js';
import { applyTheme } from '../../ui/theme.js';
import { rerender } from '../../ui/nav.js';
import { notify, notificationPermission, checkReminders } from '../../features/reminders.js';

const s = () => store.state.settings;
const update = fn => { fn(s()); save(); };

const segment = (attr, current, options) =>
  `<div class="seg">${options.map(([k, label]) => `<button data-${attr}="${k}" class="${current === k ? 'on' : ''}">${label}</button>`).join('')}</div>`;

export const appearance = {
  html: () => `<section class="card">${cardHead(t('settings.appearance'))}
    ${segment('th', s().theme, [['system', t('settings.themeSystem')], ['light', t('settings.themeLight')], ['dark', t('settings.themeDark')]])}
    <div class="card-head sub"><h2>${t('settings.language')}</h2></div>
    ${segment('lang', s().language, [['system', t('settings.languageSystem')], ['de', 'Deutsch'], ['en', 'English']])}
  </section>`,
  bind: view => {
    $$('[data-th]', view).forEach(b => (b.onclick = () => { update(x => (x.theme = b.dataset.th)); applyTheme(); rerender(); }));
    $$('[data-lang]', view).forEach(b => (b.onclick = () => { update(x => (x.language = b.dataset.lang)); rerender(); }));
  },
};

export const reminders = {
  html: () => {
    const rs = s().remind, perm = notificationPermission();
    const test = perm === 'granted' && rs.on ? `<button class="btn btn-sm btn-ghost accent" id="rTest">${t('settings.sendTest')}</button>` : '';
    const hours = [0, 9, 10, 11, 12].map(h => `<option value="${h}" ${rs.forgot === h ? 'selected' : ''}>${h ? h + ' h' : t('settings.off')}</option>`).join('');
    return `<section class="card">${cardHead(t('settings.reminders'), test)}
      <label class="switch"><span>${t('settings.notifications')}</span>
        <input type="checkbox" id="rOn" ${rs.on && perm === 'granted' ? 'checked' : ''} ${perm === 'unsupported' ? 'disabled' : ''}></label>
      <label class="switch"><span>${t('settings.notifyTarget')}</span><input type="checkbox" id="rSoll" ${rs.soll ? 'checked' : ''}></label>
      ${settingRow(t('settings.remindAt'), `<input type="time" id="rAt" value="${rs.at}">`)}
      ${settingRow(t('settings.forgotAfter'), `<select id="rForgot">${hours}</select>`)}
      <p class="hint">${perm === 'denied' ? t('settings.notifyBlocked') + ' ' : ''}${t('settings.notifyHint')}</p></section>`;
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
    $('#rTest', view)?.addEventListener('click', () => notify('Clockwise', t('settings.testBody'), 'test'));
  },
};

export const person = {
  html: () => `<section class="card">${cardHead(t('settings.person'))}
    <div class="grid-2">
      <label class="field"><span>${t('settings.name')}</span><input type="text" id="sName" value="${esc(s().name)}"></label>
      <label class="field"><span>${t('settings.pnr')}</span><input type="text" id="sPnr" value="${esc(s().pnr)}"></label>
    </div>
    <label class="field"><span>${t('settings.state')}</span><select id="sLand">${STATES
      .map(k => `<option value="${k}" ${s().land === k ? 'selected' : ''}>${t(`states.${k}`)}</option>`).join('')}</select></label>
    <label class="switch" style="margin-top:var(--sp-2)"><span>${t('settings.halfDays')}</span>
      <input type="checkbox" id="sHalf" ${s().halfHolidays ? 'checked' : ''}></label></section>`,
  bind: view => {
    $('#sName', view).onchange = e => update(x => (x.name = e.target.value));
    $('#sPnr', view).onchange = e => update(x => (x.pnr = e.target.value));
    $('#sLand', view).onchange = e => update(x => (x.land = e.target.value));
    $('#sHalf', view).onchange = e => update(x => (x.halfHolidays = e.target.checked));
  },
};
