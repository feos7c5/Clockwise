import de from './de.js';
import en from './en.js';

export const LANGUAGES = { de, en };
export const FALLBACK = 'de';

let current = FALLBACK;

const lookup = (dict, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), dict);

export function resolveLanguage(pref) {
  if (pref && pref !== 'system' && LANGUAGES[pref]) return pref;
  for (const tag of navigator.languages || [navigator.language || FALLBACK]) {
    const code = tag.slice(0, 2).toLowerCase();
    if (LANGUAGES[code]) return code;
  }
  return FALLBACK;
}

export function setLanguage(pref) {
  current = resolveLanguage(pref);
  document.documentElement.lang = current;
}

export const language = () => current;

export function t(key, params) {
  const value = lookup(LANGUAGES[current], key) ?? lookup(LANGUAGES[FALLBACK], key) ?? key;
  if (typeof value !== 'string' || !params) return value;
  return value.replace(/\{(\w+)\}/g, (m, k) => (params[k] ?? m));
}

export function tn(key, n, params = {}) {
  const form = new Intl.PluralRules(current).select(n);
  const forms = t(key);
  const text = typeof forms === 'object' ? forms[form] ?? forms.other : forms;
  return text.replace(/\{(\w+)\}/g, (m, k) => ({ n, ...params }[k] ?? m));
}

const fmt = (opts) => new Intl.DateTimeFormat(current, opts);
export const formatLongDate = d => fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(d);
export const formatFullDate = d => fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
export const formatDayMonth = d => fmt({ day: '2-digit', month: '2-digit' }).format(d);
export const formatDate = d => fmt({ day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
export const formatDateTime = d => fmt({ dateStyle: 'medium', timeStyle: 'short' }).format(d);
export const monthName = m => fmt({ month: 'long' }).format(new Date(2000, m, 1));
export const weekdayShort = wd => t('weekdays')[wd];
export const formatNumber = (n, digits = 1) => new Intl.NumberFormat(current, { maximumFractionDigits: digits }).format(n);
