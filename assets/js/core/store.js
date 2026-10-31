// Zustand im localStorage. Alle Änderungen laufen über save().
import { DEFAULT_STATE } from './defaults.js';
import { t } from '../i18n/index.js';

const KEY = 'stempeluhr-v1';
const listeners = new Set();

function withDefaults(s) {
  const d = DEFAULT_STATE.settings;
  s.settings = { ...d, ...s.settings, remind: { ...d.remind, ...(s.settings.remind || {}) } };
  return s;
}

function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* defekt → Standard */ }
  return withDefaults(s && s.days ? s : structuredClone(DEFAULT_STATE));
}

export const store = { state: load() };

export function save() {
  store.state.savedAt = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(store.state));
  } catch (e) {
    alert(t('backup.saveFailed', { error: e.message }));
  }
  listeners.forEach(fn => fn(store.state));
}

// Wird nach jedem Speichern aufgerufen (z. B. Datei-Sync)
export const onSave = fn => listeners.add(fn);

export function isValidState(data) {
  return Boolean(data && data.days && data.settings);
}

export function replaceState(data) {
  store.state = withDefaults(data);
  save();
}

export function resetState() {
  localStorage.removeItem(KEY);
  store.state = load();
  save();
}

export const getDay = ds => (store.state.days[ds] ||= { blocks: [] });

// Leere Tage nicht aufbewahren
export function cleanDay(ds) {
  const d = store.state.days[ds];
  if (d && !d.blocks.length && !d.code && !d.note && d.pause == null) delete store.state.days[ds];
}

if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
