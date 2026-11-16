import { withIds } from '../core/validate.js';

export const DEVICE_SETTINGS = ['theme', 'accent', 'language', 'remind'];

export const sharedSettings = settings =>
  Object.fromEntries(Object.entries(settings).filter(([k]) => !DEVICE_SETTINGS.includes(k)));

const emptyMeta = () => ({ days: {}, settings: 0, blocks: {}, gone: {} });
const GONE_KEEP_MS = 180 * 86_400_000;
const newId = () => [...globalThis.crypto.getRandomValues(new Uint8Array(4))].map(b => b.toString(16).padStart(2, '0')).join('');

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export function snapshot(state) {
  const days = {}, blocks = {};
  for (const [ds, day] of Object.entries(state.days)) {
    const plain = (day.blocks || []).map(({ id, ...b }) => b);
    days[ds] = canonical({ ...day, blocks: plain });
    blocks[ds] = Object.fromEntries((day.blocks || []).filter(b => b.id).map(({ id, ...b }) => [id, canonical(b)]));
  }
  return { days, blocks, settings: canonical(sharedSettings(state.settings)) };
}

// Records when each day and each single block last changed, and which blocks were deleted. That lets two
// devices that edited the same day at the same time keep both of their changes.
export function stamp(state, previous, now = Date.now()) {
  const meta = (state.meta ||= emptyMeta());
  meta.blocks ||= {}; meta.gone ||= {};
  for (const day of Object.values(state.days)) {
    const ids = new Set((day.blocks || []).map(b => b.id));
    for (const b of day.blocks || []) if (!b.id) { do b.id = newId(); while (ids.has(b.id)); ids.add(b.id); }
  }
  const current = snapshot(state);
  for (const ds of new Set([...Object.keys(previous.days), ...Object.keys(current.days)])) {
    if (previous.days[ds] !== current.days[ds]) meta.days[ds] = now;
    const before = previous.blocks?.[ds] || {}, after = current.blocks[ds] || {};
    for (const id in after) if (before[id] !== after[id]) (meta.blocks[ds] ||= {})[id] = now;
    for (const id in before) {
      if (id in after) continue;
      (meta.gone[ds] ||= {})[id] = now;
      if (meta.blocks[ds]) delete meta.blocks[ds][id];
    }
  }
  for (const ds in meta.gone) {
    for (const id in meta.gone[ds]) if (now - meta.gone[ds][id] > GONE_KEEP_MS) delete meta.gone[ds][id];
    if (!Object.keys(meta.gone[ds]).length) delete meta.gone[ds];
  }
  for (const ds in meta.blocks) if (!current.days[ds] || !Object.keys(meta.blocks[ds]).length) delete meta.blocks[ds];
  if (previous.settings !== current.settings) meta.settings = now;
  return snapshot(state);
}

export const payload = state => ({
  version: 1,
  days: state.days,
  settings: sharedSettings(state.settings),
  meta: state.meta || emptyMeta(),
  devices: state.devices || {},
});

export function mergeDevices(local = {}, remote = {}) {
  const out = {};
  for (const id of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const a = local[id], b = remote[id];
    const winner = !a ? b : !b ? a : (a.updated || 0) > (b.updated || 0) ? a : b;
    out[id] = { ...winner, ...((a?.removed || b?.removed) ? { removed: true } : {}) };
  }
  return out;
}

const maxMerge = (a = {}, b = {}) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v);
  return out;
};

// Day fields (type, note, break) come from the side that changed the day last; blocks are combined one by one,
// so a block added on one device and a block edited on the other both survive.
// Without its own timestamp a block counts as unchanged (0) – unless the data comes from an app version that
// has no block timestamps at all; then its day's timestamp applies.
const blockFallback = (meta, dayTs) => (meta && 'blocks' in meta ? 0 : dayTs);

function mergeBlocks(ds, local, remote, lm, rm, lt, rt) {
  const gone = maxMerge(lm.gone?.[ds], rm.gone?.[ds]);
  const picks = new Map();
  const add = (blocks, times, fallback, preferOnTie) => {
    for (const b of withIds(blocks || [])) {
      const ts = times?.[b.id] ?? fallback, cur = picks.get(b.id);
      if (!cur || ts > cur.ts || (ts === cur.ts && preferOnTie)) picks.set(b.id, { b, ts });
    }
  };
  add(local.days[ds]?.blocks, lm.blocks?.[ds], blockFallback(local.meta, lt), false);
  add(remote.days[ds]?.blocks, rm.blocks?.[ds], blockFallback(remote.meta, rt), true);
  const kept = [...picks.values()].filter(p => !(gone[p.b.id] >= p.ts));
  kept.sort((a, b) => (a.b.in < b.b.in ? -1 : a.b.in > b.b.in ? 1 : 0));
  return {
    blocks: kept.map(p => structuredClone(p.b)),
    times: Object.fromEntries(kept.filter(p => p.ts > 0).map(p => [p.b.id, p.ts])),
    gone,
  };
}

export function merge(local, remote) {
  const lm = local.meta || emptyMeta(), rm = remote.meta || emptyMeta();
  const days = {}, metaDays = {}, metaBlocks = {}, metaGone = {};
  const all = new Set([...Object.keys(local.days), ...Object.keys(remote.days), ...Object.keys(lm.days), ...Object.keys(rm.days)]);

  for (const ds of all) {
    const lt = lm.days[ds] ?? 0, rt = rm.days[ds] ?? 0;
    const winner = lt > rt ? local : rt > lt ? remote : (ds in remote.days ? remote : local);
    if (Math.max(lt, rt) > 0) metaDays[ds] = Math.max(lt, rt);
    const blockAware = lm.blocks?.[ds] || rm.blocks?.[ds] || lm.gone?.[ds] || rm.gone?.[ds];
    if (!blockAware) {
      if (ds in winner.days) days[ds] = structuredClone(winner.days[ds]);
      continue;
    }
    const { blocks, times, gone } = mergeBlocks(ds, local, remote, lm, rm, lt, rt);
    const base = winner.days[ds];
    if (base || blocks.length) days[ds] = { ...structuredClone(base || {}), blocks };
    if (Object.keys(times).length) metaBlocks[ds] = times;
    if (Object.keys(gone).length) metaGone[ds] = gone;
  }

  const settingsFromLocal = (lm.settings || 0) > (rm.settings || 0);
  const shared = settingsFromLocal ? sharedSettings(local.settings) : sharedSettings(remote.settings);
  const deviceOnly = Object.fromEntries(DEVICE_SETTINGS.filter(k => k in local.settings).map(k => [k, local.settings[k]]));

  return {
    ...local,
    days,
    settings: structuredClone({ ...local.settings, ...shared, ...deviceOnly }),
    meta: { days: metaDays, settings: Math.max(lm.settings || 0, rm.settings || 0), blocks: metaBlocks, gone: metaGone },
    devices: mergeDevices(local.devices, remote.devices),
  };
}
