import { iso, toMin, fromMin, addDays, parseISO } from './time.js';
import { sollMin, reachMin } from './calc.js';
import { store, getDay, save } from './store.js';
import { syncSettled } from '../sync/engine.js';
import { nextTags, clearNextTags, setNextTag, setBlockTag } from './tags.js';

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

const BREAK_MAX_MIN = 12 * 60;

// A break started late in the evening still counts after midnight.
function currentBreak() {
  if (running()) return null;
  const t = now();
  for (const [offset, ds] of [[0, iso(t)], [1440, iso(addDays(t, -1))]]) {
    const last = store.state.days[ds]?.blocks.at(-1);
    if (!last) continue;
    const since = nowMin() + offset - toMin(last.out);
    return last.out && last.brk && since >= 0 && since < BREAK_MAX_MIN ? { block: last, since } : null;
  }
  return null;
}

export const onBreak = () => currentBreak()?.block || null;
export const breakMinutes = () => currentBreak()?.since ?? 0;

export function isWorkday(ds) {
  const day = store.state.days[ds];
  return !(day && day.code) && sollMin(store.state.settings, ds, day, 0) > 0;
}

export function missingStamp() {
  const ds = todayStr(), day = store.state.days[ds];
  return isWorkday(ds) && !(day && day.blocks.length) && nowMin() >= toMin(store.state.settings.remind.at);
}

export function stamp(kind) {
  const n = now(), t = hhmm(n), r = running(), brk = onBreak();
  if (kind === 'in') {
    if (brk) delete brk.brk;
    // `s` is the second of clocking in: only the live clock uses it, all times and reports stay in minutes.
    const block = { in: t, out: null };
    if (n.getSeconds()) block.s = n.getSeconds();
    const tags = nextTags();
    if (Object.keys(tags).length) block.t = tags;
    clearNextTags();
    getDay(todayStr()).blocks.push(block);
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

// Changes the tag of one class. While clocked in, the running block ends now and a new one continues with the
// new tag – without a gap, so worked time, break and the live clock are unaffected. While clocked out, the
// choice is remembered for the next clock-in.
export function chooseTag(classId, tagId) {
  const r = running();
  if (!r) return setNextTag(classId, tagId);
  if ((r.block.t?.[classId] || '') === (tagId || '')) return;
  const t = hhmm(now());
  if (r.ds === todayStr() && r.block.in === t) {
    setBlockTag(r.block, classId, tagId);
  } else {
    const next = { in: t, out: null };
    if (r.block.t) next.t = { ...r.block.t };
    if (r.block.s) next.s = r.block.s;
    setBlockTag(next, classId, tagId);
    r.block.out = t;
    getDay(todayStr()).blocks.push(next);
  }
  save();
}

// Start of the current stretch of work: blocks that follow each other without a gap (e.g. after changing the
// project) count as one. With `classId`, only as long as that class keeps the same entry.
export function runningSince(classId = null) {
  const r = running();
  if (!r) return '';
  const blocks = store.state.days[r.ds].blocks, tag = b => b.t?.[classId] || '';
  let i = r.i;
  while (i > 0 && blocks[i - 1].out === blocks[i].in && !blocks[i - 1].brk && (!classId || tag(blocks[i - 1]) === tag(r.block))) i--;
  return blocks[i].in;
}

export function openBlocks() {
  const out = [];
  for (const [ds, day] of Object.entries(store.state.days)) {
    day.blocks.forEach((block, i) => { if (!block.out) out.push({ ds, i, block }); });
  }
  return out.sort((a, b) => a.ds.localeCompare(b.ds));
}

export function clockOutDue(r = running(), forgot = store.state.settings.remind.forgot) {
  const limit = forgot * 60;
  if (!r || !limit) return null;
  const min = reachMin(store.state.settings, store.state.days[r.ds], limit, toMin(r.block.in));
  return min == null ? null : { ...r, min, at: atMin(r.ds, min) };
}

// Closes every block that has reached the limit, also ones forgotten days ago. It waits until this device has
// fetched the other devices' changes, and the change counts as only just newer than the clock-in, so a real
// clock-out made on another device always wins.
export function autoClockOut() {
  if (!syncSettled()) return false;
  let changed = false;
  for (const r of openBlocks()) {
    const due = clockOutDue(r);
    if (!due || due.at > now()) continue;
    const before = store.state.meta?.days?.[r.ds] || 0;
    r.block.out = fromMin(due.min);
    save({ at: before + 1 });
    changed = true;
  }
  return changed;
}

// A block left open before yesterday that no limit will close: the user has to enter its end.
export function forgottenBlock() {
  const r = running();
  return openBlocks().find(o => !(r && o.ds === r.ds && o.i === r.i) && o.ds < todayStr()) || null;
}
