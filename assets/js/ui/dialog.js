import { $, $$ } from './dom.js';
import { ICON } from './icons.js';
import { t } from '../i18n/index.js';

const el = () => $('#dialog');

// While any dialog or sheet is open the page behind it stays put (iOS scrolls it otherwise). Counted, because
// the picker sheet can open on top of a dialog.
let locks = 0, lockedAt = 0;
export function lockScroll() {
  if (locks++) return;
  lockedAt = window.scrollY;
  Object.assign(document.body.style, { position: 'fixed', top: `-${lockedAt}px`, left: '0', right: '0' });
}
export function unlockScroll() {
  if (!locks || --locks) return;
  Object.assign(document.body.style, { position: '', top: '', left: '', right: '' });
  window.scrollTo(0, lockedAt);
}

export const dialogHead = title => `
  <div class="dlg-head">
    <h3>${title}</h3>
    <button type="button" class="btn btn-icon btn-ghost" data-close aria-label="${t('common.close')}">${ICON.close}</button>
  </div>`;

// `light`: nothing to save in it, so a tap beside the dialog closes it too.
export function showDialog(html, bind = () => {}, { light = false } = {}) {
  const dlg = el();
  dlg.onclick = light ? e => { if (e.target === dlg) dlg.close(); } : null;
  dlg.innerHTML = `<form class="dlg" method="dialog" tabindex="-1">${html}</form>`;
  $$('[data-close]', dlg).forEach(b => (b.onclick = () => dlg.close()));
  bind(dlg);
  if (!dlg.open) {
    lockScroll();
    dlg.addEventListener('close', unlockScroll, { once: true });
    dlg.showModal();
  }
  (dlg.querySelector('[autofocus]') || dlg.querySelector('form')).focus({ preventScroll: true });
}

export const closeDialog = () => el().close();
export const dialogOpen = () => el().open;
