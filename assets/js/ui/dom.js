// DOM- und Formatierungs-Helfer für die Views.
import { pad } from '../core/time.js';

export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// CSS-Klasse für positive/negative Zeitwerte
export const tone = m => (m > 0 ? 'plus' : m < 0 ? 'minus' : '');

export const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export const WD_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
export const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export const longDate = d => `${WD_LONG[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`;

export const fmtSec = s => `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;

// Kennzahl-Kachel
export const stat = (label, value, sub = '', valueCls = '') => `
  <div class="stat">
    <div class="stat-label">${label}</div>
    <div class="stat-value ${valueCls}">${value}</div>
    ${sub ? `<div class="stat-sub">${sub}</div>` : ''}
  </div>`;

export const cardHead = (title, action = '') => `<div class="card-head"><h2>${title}</h2>${action}</div>`;
