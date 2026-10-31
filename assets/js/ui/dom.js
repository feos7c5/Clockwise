import { pad } from '../core/time.js';
import { t } from '../i18n/index.js';

export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const tone = m => (m > 0 ? 'plus' : m < 0 ? 'minus' : '');

export const fmtSec = s => `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;

export const codeLabel = code => t(`codes.${code}`);
export const holidayLabel = hol => t(`holidays.${hol.id}`);

export const stat = (label, value, sub = '', valueCls = '') => `
  <div class="stat">
    <div class="stat-label">${label}</div>
    <div class="stat-value ${valueCls}">${value}</div>
    ${sub ? `<div class="stat-sub">${sub}</div>` : ''}
  </div>`;

export const cardHead = (title, action = '') => `<div class="card-head"><h2>${title}</h2>${action}</div>`;

export const settingRow = (label, control) => `<label class="setting-row"><span>${label}</span>${control}</label>`;
