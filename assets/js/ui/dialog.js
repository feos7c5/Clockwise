// Ein gemeinsamer <dialog> für alle Bearbeitungs-Dialoge.
import { $, $$ } from './dom.js';
import { ICON } from './icons.js';
import { t } from '../i18n/index.js';

const el = () => $('#dialog');

// iOS ignoriert overflow:hidden am body – deshalb fixieren und Scrollposition merken
let lockedAt = 0;
function lockScroll() {
  lockedAt = window.scrollY;
  Object.assign(document.body.style, { position: 'fixed', top: `-${lockedAt}px`, left: '0', right: '0' });
}
function unlockScroll() {
  Object.assign(document.body.style, { position: '', top: '', left: '', right: '' });
  window.scrollTo(0, lockedAt);
}

export const dialogHead = title => `
  <div class="dlg-head">
    <h3>${title}</h3>
    <button type="button" class="btn btn-icon btn-ghost" data-close aria-label="${t('common.close')}">${ICON.close}</button>
  </div>`;

export function showDialog(html, bind) {
  const dlg = el();
  dlg.innerHTML = `<form class="dlg" method="dialog" tabindex="-1">${html}</form>`;
  $$('[data-close]', dlg).forEach(b => (b.onclick = () => dlg.close()));
  bind(dlg);
  if (!dlg.open) {
    lockScroll();
    dlg.addEventListener('close', unlockScroll, { once: true });
    dlg.showModal();
  }
  // Sonst fokussiert der Browser das ✕ und zeigt einen Fokusring
  (dlg.querySelector('[autofocus]') || dlg.querySelector('form')).focus({ preventScroll: true });
}

export const closeDialog = () => el().close();
export const dialogOpen = () => el().open;
