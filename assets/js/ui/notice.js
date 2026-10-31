// Hinweis-Karten. Jeder Hinweis lässt sich mit ✕ ausblenden (dauerhaft oder z. B. nur für heute).
import { ICON } from './icons.js';
import { $$ } from './dom.js';
import { t } from '../i18n/index.js';

const KEY = 'clockwise-dismissed';

const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };

// value: true = für immer, sonst z. B. das Datum → gilt nur, solange der Wert gleich bleibt
export const isDismissed = (id, value = true) => read()[id] === value;

export function dismiss(id, value = true) {
  const all = read();
  all[id] = value;
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* privat */ }
}

export function notice({ id, value = true, title, text = '', action = '', icon = '', tone = 'info' }) {
  return `<div class="notice ${tone}">
    ${icon ? `<div class="ic">${icon}</div>` : ''}
    <div class="notice-text"><b>${title}</b>${text}</div>
    <div class="notice-actions">${action}
      <button class="btn btn-icon btn-sm btn-ghost" data-dismiss="${id}" data-value="${value}" aria-label="${t('common.dismiss')}">${ICON.close}</button>
    </div>
  </div>`;
}

// ✕-Knöpfe verbinden; onDismiss zeichnet neu
export function bindNotices(root, onDismiss) {
  $$('[data-dismiss]', root).forEach(b => (b.onclick = () => {
    const value = b.dataset.value === 'true' ? true : b.dataset.value;
    dismiss(b.dataset.dismiss, value);
    onDismiss(b.dataset.dismiss);
  }));
}
