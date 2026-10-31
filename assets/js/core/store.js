// Zustand im localStorage. Alle Änderungen laufen über save(), das geänderte Tage für den Sync stempelt.
import { DEFAULT_STATE } from './defaults.js';
import { snapshot, stamp } from '../sync/merge.js';
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
let lastSnapshot = snapshot(store.state);

function persist() {
  store.state.savedAt = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(store.state));
  } catch (e) {
    alert(t('backup.saveFailed', { error: e.message }));
  }
}

// Lokale Änderung: stempeln, speichern, Beobachter informieren (z. B. Sync)
export function save() {
  lastSnapshot = stamp(store.state, lastSnapshot);
  persist();
  listeners.forEach(fn => fn(store.state));
}

// Zusammengeführter Stand vom Server: übernehmen, ohne neu zu stempeln
export function applyMerged(state) {
  store.state = withDefaults(state);
  lastSnapshot = snapshot(store.state);
  persist();
}

export const onSave = fn => listeners.add(fn);

export function isValidState(data) {
  return Boolean(data && data.days && data.settings);
}

export function replaceState(data) {
  store.state = withDefaults({ ...data, meta: store.state.meta });
  save();
}

export function resetState() {
  const meta = store.state.meta;
  store.state = withDefaults(structuredClone(DEFAULT_STATE));
  store.state.meta = meta; // gelöschte Tage als gelöscht stempeln
  save();
}

export const getDay = ds => (store.state.days[ds] ||= { blocks: [] });

// Leere Tage nicht aufbewahren
export function cleanDay(ds) {
  const d = store.state.days[ds];
  if (d && !d.blocks.length && !d.code && !d.note && d.pause == null) delete store.state.days[ds];
}

if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
