// Ein gemeinsamer <dialog> für alle Bearbeitungs-Dialoge.
import { $, $$ } from './dom.js';
import { ICON } from './icons.js';
import { t } from '../i18n/index.js';

const el = () => $('#dialog');

export const dialogHead = title => `
  <div class="dlg-head">
    <h3>${title}</h3>
    <button type="button" class="btn btn-icon btn-ghost" data-close aria-label="${t('common.close')}">${ICON.close}</button>
  </div>`;

export function showDialog(html, bind) {
  const dlg = el();
  dlg.innerHTML = `<form class="dlg" method="dialog">${html}</form>`;
  $$('[data-close]', dlg).forEach(b => (b.onclick = () => dlg.close()));
  bind(dlg);
  if (!dlg.open) dlg.showModal();
}

export const closeDialog = () => el().close();
export const dialogOpen = () => el().open;
