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

// Text in a given language, e.g. for a notification shown on another device.
export function tIn(lang, key, params) {
  const value = lookup(LANGUAGES[lang] || LANGUAGES[FALLBACK], key) ?? lookup(LANGUAGES[FALLBACK], key) ?? key;
  if (typeof value !== 'string' || !params) return value;
  return value.replace(/\{(\w+)\}/g, (m, k) => (params[k] ?? m));
}

export const t = (key, params) => tIn(current, key, params);

const intlCache = new Map();
const cached = (kind, opts) => {
  const key = `${kind}|${current}|${JSON.stringify(opts)}`;
  if (!intlCache.has(key)) intlCache.set(key, new Intl[kind](current, opts));
  return intlCache.get(key);
};

export function tn(key, n, params = {}) {
  const form = cached('PluralRules').select(n);
  const forms = t(key);
  const text = typeof forms === 'object' ? forms[form] ?? forms.other : forms;
  return text.replace(/\{(\w+)\}/g, (m, k) => ({ n, ...params }[k] ?? m));
}

const fmt = opts => cached('DateTimeFormat', opts);
export const formatLongDate = d => fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(d);
export const formatFullDate = d => fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
export const formatDayMonth = d => fmt({ day: '2-digit', month: '2-digit' }).format(d);
export const formatDate = d => fmt({ day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
export const formatDateTime = d => fmt({ dateStyle: 'medium', timeStyle: 'short' }).format(d);
export const monthName = m => fmt({ month: 'long' }).format(new Date(2000, m, 1));
export const weekdayShort = wd => t('weekdays')[wd];
export const formatNumber = (n, digits = 1) => cached('NumberFormat', { maximumFractionDigits: digits }).format(n);
export const formatRelativeDays = days => cached('RelativeTimeFormat', { numeric: 'auto' }).format(days, 'day');
