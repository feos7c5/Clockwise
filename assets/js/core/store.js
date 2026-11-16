import { DEFAULT_STATE } from './defaults.js';
import { snapshot, stamp } from '../sync/merge.js';
import { invalidateCalc } from './calc.js';
import { normalizeState } from './validate.js';
export { isValidState } from './validate.js';
import { t } from '../i18n/index.js';

const KEY = 'stempeluhr-v1';
const listeners = new Set();

const withDefaults = s => normalizeState(s);

function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
  return withDefaults(s && s.days ? s : structuredClone(DEFAULT_STATE));
}

export const store = { state: load() };
let lastSnapshot = snapshot(store.state);

function persist() {
  invalidateCalc();
  store.state.savedAt = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(store.state));
  } catch (e) {
    alert(t('backup.saveFailed', { error: e.message }));
  }
}

// `at` lets a change count as older than now, e.g. an automatic clock-out that must not beat a real one.
export function save({ at = Date.now() } = {}) {
  lastSnapshot = stamp(store.state, lastSnapshot, at);
  persist();
  listeners.forEach(fn => fn(store.state));
}

export function applyMerged(state) {
  store.state = withDefaults(state);
  lastSnapshot = snapshot(store.state);
  persist();
}

export const onSave = fn => listeners.add(fn);

export function replaceState(data) {
  store.state = withDefaults({ ...data, meta: store.state.meta });
  save();
}

export function resetState() {
  const meta = store.state.meta;
  store.state = withDefaults(structuredClone(DEFAULT_STATE));
  store.state.meta = meta;
  save();
}

export const getDay = ds => (store.state.days[ds] ||= { blocks: [] });

export function cleanDay(ds) {
  const d = store.state.days[ds];
  if (d && !d.blocks.length && !d.code && !d.note && d.pause == null) delete store.state.days[ds];
}

if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
