import { iso, toMin, fromMin, addDays, parseISO } from './time.js';
import { sollMin, reachMin } from './calc.js';
import { store, getDay, save } from './store.js';

export const now = () => new Date();
export const todayStr = () => iso(now());
export const nowMin = () => { const n = now(); return n.getHours() * 60 + n.getMinutes(); };
export const hhmm = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export const atMin = (ds, min) => { const d = parseISO(ds); d.setMinutes(min); return d; };

export function running() {
  const t = now();
  for (const ds of [iso(t), iso(addDays(t, -1))]) {
    const day = store.state.days[ds];
    const i = day ? day.blocks.findIndex(b => !b.out) : -1;
    if (i >= 0) return { ds, i, block: day.blocks[i] };
  }
  return null;
}

export function onBreak() {
  const day = store.state.days[todayStr()];
  const last = day && day.blocks[day.blocks.length - 1];
  return !running() && last && last.out && last.brk ? last : null;
}

export function isWorkday(ds) {
  const day = store.state.days[ds];
  return !(day && day.code) && sollMin(store.state.settings, ds, day, 0) > 0;
}

export function missingStamp() {
  const ds = todayStr(), day = store.state.days[ds];
  return isWorkday(ds) && !(day && day.blocks.length) && nowMin() >= toMin(store.state.settings.remind.at);
}

export function stamp(kind) {
  const t = hhmm(now()), r = running(), brk = onBreak();
  if (kind === 'in') {
    if (brk) delete brk.brk;
    getDay(todayStr()).blocks.push({ in: t, out: null });
  } else if (kind === 'pause' && r) {
    r.block.out = t;
    r.block.brk = true;
  } else if (kind === 'out' && r) {
    r.block.out = t;
  } else if (kind === 'end' && brk) {
    delete brk.brk;
  }
  save();
}

export function clockOutDue() {
  const r = running(), limit = store.state.settings.remind.forgot * 60;
  if (!r || !limit) return null;
  const min = reachMin(store.state.settings, store.state.days[r.ds], limit, toMin(r.block.in));
  return min == null ? null : { ...r, min, at: atMin(r.ds, min) };
}

export function autoClockOut() {
  const due = clockOutDue();
  if (!due || due.at > now()) return false;
  due.block.out = fromMin(due.min);
  save();
  return true;
}
