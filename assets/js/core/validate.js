import { DEFAULT_STATE } from './defaults.js';
import { CODES } from './codes.js';

// Data from storage, backups, files or other devices is brought into a known shape before the app uses it,
// so a damaged entry can never stop the app from starting.

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const obj = v => (isObject(v) ? v : {});
const num = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const time = v => (typeof v === 'string' && TIME_RE.test(v) ? v : null);

const numberMap = v => Object.fromEntries(Object.entries(obj(v)).filter(([, n]) => typeof n === 'number' && Number.isFinite(n)));

// Blocks from before ids existed get one derived from their start time, so every device that still has the
// same old block gives it the same id.
export function withIds(blocks) {
  const ids = new Set(blocks.map(b => b.id).filter(id => typeof id === 'string' && id && id.length <= 24));
  const seen = new Set();
  return blocks.map(b => {
    let id = typeof b.id === 'string' && b.id && b.id.length <= 24 && !seen.has(b.id) ? b.id : `L${String(b.in).replace(':', '')}`;
    while (seen.has(id) || (id !== b.id && ids.has(id))) id += 'x';
    seen.add(id);
    return id === b.id ? b : { ...b, id };
  });
}

function cleanDay(day) {
  if (!isObject(day)) return null;
  const out = { blocks: [] };
  const valid = (Array.isArray(day.blocks) ? day.blocks : []).filter(b => isObject(b) && time(b.in));
  withIds(valid).forEach(b => {
    const block = { id: b.id, in: b.in, out: time(b.out) };
    if (b.brk === true && block.out) block.brk = true;
    if (Number.isInteger(b.s) && b.s > 0 && b.s < 60) block.s = b.s;
    out.blocks.push(block);
  });
  if (typeof day.code === 'string' && CODES[day.code]) out.code = day.code;
  if (typeof day.note === 'string' && day.note.trim()) out.note = day.note.slice(0, 2000);
  if (typeof day.pause === 'number' && Number.isFinite(day.pause) && day.pause >= 0) out.pause = Math.round(day.pause);
  return out;
}

function cleanPeriods(periods) {
  const valid = (Array.isArray(periods) ? periods : []).filter(p => isObject(p) && DATE_RE.test(p.from) && Array.isArray(p.min) && p.min.length === 7)
    .map(p => ({ from: p.from, min: p.min.map(m => Math.max(0, num(m, 0))) }));
  return valid.length ? valid : structuredClone(DEFAULT_STATE.settings.periods);
}

function cleanSettings(s) {
  const d = DEFAULT_STATE.settings, src = obj(s);
  const out = { ...structuredClone(d), ...src };
  for (const [k, v] of Object.entries(d)) {
    if (typeof v === 'string' && typeof out[k] !== 'string') out[k] = v;
    if (typeof v === 'boolean' && typeof out[k] !== 'boolean') out[k] = v;
    if (typeof v === 'number') out[k] = num(out[k], v);
  }
  out.periods = cleanPeriods(src.periods);
  out.vacation = numberMap(src.vacation);
  out.vacationCarry = numberMap(src.vacationCarry);
  const r = obj(src.remind);
  out.remind = {
    on: typeof r.on === 'boolean' ? r.on : d.remind.on,
    at: time(r.at) || d.remind.at,
    soll: typeof r.soll === 'boolean' ? r.soll : d.remind.soll,
    forgot: num(r.forgot, d.remind.forgot),
  };
  return out;
}

function cleanMeta(m) {
  const src = obj(m);
  const nested = v => Object.fromEntries(Object.entries(obj(v)).map(([ds, ids]) => [ds, numberMap(ids)]));
  return { days: numberMap(src.days), settings: num(src.settings, 0), blocks: nested(src.blocks), gone: nested(src.gone) };
}

export function normalizeState(input) {
  const src = obj(input);
  const days = {};
  for (const [ds, day] of Object.entries(obj(src.days))) {
    if (!DATE_RE.test(ds)) continue;
    const clean = cleanDay(day);
    if (clean) days[ds] = clean;
  }
  const out = { ...src, version: 1, settings: cleanSettings(src.settings), days };
  if (src.meta !== undefined) out.meta = cleanMeta(src.meta);
  if (src.devices !== undefined) out.devices = Object.fromEntries(Object.entries(obj(src.devices)).filter(([, d]) => isObject(d)));
  return out;
}

export const isValidState = data => isObject(data) && isObject(data.days) && isObject(data.settings);
