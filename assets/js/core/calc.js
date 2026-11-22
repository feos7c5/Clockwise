import { iso, parseISO, toMin, fromMin, range, addDays } from './time.js';
import { holidayOn } from './holidays.js';
import { CODES, vacationValue } from './codes.js';

// Results that only depend on the data are cached until the next change (see invalidateCalc).
let sortedPeriods = new WeakMap();
const periodsOf = settings => {
  let sorted = sortedPeriods.get(settings.periods);
  if (!sorted) sortedPeriods.set(settings.periods, (sorted = [...settings.periods].sort((a, b) => a.from.localeCompare(b.from))));
  return sorted;
};

export function periodAt(settings, ds) {
  let current = null;
  for (const p of periodsOf(settings)) if (p.from <= ds) current = p;
  return current;
}

export function contractMin(settings, ds) {
  const current = periodAt(settings, ds);
  return current ? current.min[(parseISO(ds).getDay() + 6) % 7] || 0 : 0;
}

// Average target of a working day in the schedule valid on `ds`.
export function avgWorkdayMin(settings, ds) {
  const days = (periodAt(settings, ds)?.min || []).filter(m => m > 0);
  return days.length ? days.reduce((a, b) => a + b, 0) / days.length : 480;
}

export function grossMin(day, nowMin = null) {
  let sum = 0;
  for (const b of day.blocks || []) {
    const start = toMin(b.in);
    let end = b.out ? toMin(b.out) : nowMin;
    if (start == null || end == null) continue;
    if (end < start) end += 1440;
    sum += end - start;
  }
  return sum;
}

export function gapMin(day) {
  const blocks = (day.blocks || []).filter(b => b.in);
  let gaps = 0;
  for (let i = 1; i < blocks.length; i++) {
    if (!blocks[i - 1].out) continue;
    let d = toMin(blocks[i].in) - toMin(blocks[i - 1].out);
    if (d < 0) d += 1440;
    gaps += d;
  }
  return gaps;
}

export const legalPause = gross => (gross > 540 ? 45 : gross > 360 ? 30 : 0);

export const PAUSE_AFTER = 360;

// While a block is running the break is deducted once more than 6 h are worked (§ 4 ArbZG), so the clock
// runs from clock-in and keeps running after the deduction.
export function pauseMin(settings, day, gross) {
  if (day.pause != null) return day.pause;
  const blocks = day.blocks || [];
  if (!blocks.length) return 0;
  const base = settings.pauseMode === 'gesetz' ? legalPause(gross) : settings.pauseMin;
  const due = Math.max(0, base - gapMin(day));
  return blocks.some(b => !b.out) && gross <= PAUSE_AFTER ? 0 : due;
}

export function istMin(settings, day, nowMin = null) {
  const gross = grossMin(day, nowMin);
  return Math.max(0, gross - pauseMin(settings, day, gross));
}

// First minute at which clocking out would book at least `target` minutes of work.
export function reachMin(settings, day, target, from) {
  for (let m = from; m <= from + 1440; m++) {
    const closed = { ...day, blocks: day.blocks.map(b => (b.out ? b : { ...b, out: fromMin(m) })) };
    if (istMin(settings, closed) >= target) return m;
  }
  return null;
}

export function pauseWarning(settings, day, nowMin = null) {
  const gross = grossMin(day, nowMin), gaps = gapMin(day);
  return pauseMin(settings, day, gross) + gaps < legalPause(gross - gaps);
}

export function sollMin(settings, ds, day, ist) {
  const az = contractMin(settings, ds);
  const hol = holidayOn(settings, ds);
  const code = day && day.code;
  if (!code) return hol ? hol.f * az : az;
  const c = CODES[code];
  if (!c) return az;
  if (typeof c.f !== 'number') return ist;
  if (!hol) return c.f * az;
  if (hol.f === 0.5) return code === 'G' || code === 'H' ? 0.5 * c.f * az : 0;
  return hol.f * c.f * az;
}

let generation = 0;
export const invalidateCalc = () => { generation++; sortedPeriods = new WeakMap(); };
const caches = new WeakMap();
function cacheFor(state) {
  let c = caches.get(state);
  if (!c || c.gen !== generation) caches.set(state, (c = { gen: generation, first: undefined, cum: new Map(), cumEnd: null }));
  return c;
}

export function firstDay(state) {
  const c = cacheFor(state);
  if (c.first === undefined) {
    let first = null;
    for (const ds in state.days) if (first === null || ds < first) first = ds;
    c.first = first;
  }
  return c.first;
}

export function dayStats(state, ds, now) {
  const s = state.settings, day = state.days[ds] || { blocks: [] };
  const today = iso(now), yesterday = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const running = (day.blocks || []).some(b => !b.out);
  const live = !running ? null : ds === today ? nowMin : ds === yesterday ? nowMin + 1440 : null;
  const ist = istMin(s, day, live);
  const soll = sollMin(s, ds, day, ist);
  const first = firstDay(state);
  const started = first !== null && ds >= first;
  const counts = started && (ds < today || (ds === today && Boolean((day.blocks || []).length || day.code)));
  return { ist, soll, diff: counts ? ist - soll : 0, counts, running, day };
}

export function sumRange(state, fromStr, toStr, now) {
  let ist = 0, soll = 0, diff = 0;
  for (const ds of range(fromStr, toStr)) {
    const st = dayStats(state, ds, now);
    ist += st.ist;
    diff += st.diff;
    if (st.counts) soll += st.soll;
  }
  return { ist, soll, diff };
}

// Days before yesterday are final: their difference no longer depends on the current time, so the running
// total up to each of them is computed once and reused.
function finalTotal(state, first, until, now) {
  const c = cacheFor(state);
  if (c.cum.has(until)) return c.cum.get(until);
  let total = 0, start = first;
  if (c.cumEnd && c.cumEnd < until) { total = c.cum.get(c.cumEnd); start = iso(addDays(parseISO(c.cumEnd), 1)); }
  for (const ds of range(start, until)) { total += dayStats(state, ds, now).diff; c.cum.set(ds, total); }
  if (!c.cumEnd || until > c.cumEnd) c.cumEnd = until;
  return total;
}

export function balance(state, toStr, now) {
  const carry = state.settings.carry || 0;
  const first = firstDay(state);
  if (!first || first > toStr) return carry;
  const final = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2));
  const until = toStr < final ? toStr : final;
  if (until < first) return carry + sumRange(state, first, toStr, now).diff;
  const rest = until < toStr ? sumRange(state, iso(addDays(parseISO(until), 1)), toStr, now).diff : 0;
  return carry + finalTotal(state, first, until, now) + rest;
}

export function vacationUsed(state, year) {
  let n = 0;
  for (const [ds, day] of Object.entries(state.days)) if (ds.startsWith(year)) n += vacationValue(day.code);
  return n;
}

export function vacationAnnual(settings, year) {
  const years = Object.keys(settings.vacation).map(Number).filter(y => y <= year).sort((a, b) => a - b);
  return years.length ? settings.vacation[years[years.length - 1]] : 0;
}

const DAY_MS = 86_400_000;

export function prorateFactor(settings, year) {
  const start = settings.vacationProrate && settings.vacationStart;
  if (!start) return 1;
  const startYear = +start.slice(0, 4);
  if (year < startYear) return 0;
  if (year > startYear) return 1;
  const end = Date.UTC(year + 1, 0, 1);
  const from = Date.UTC(year, +start.slice(5, 7) - 1, +start.slice(8, 10));
  return (end - from) / (end - Date.UTC(year, 0, 1));
}

export function vacationBase(settings, year) {
  const factor = prorateFactor(settings, year);
  return factor === 1 ? vacationAnnual(settings, year) : Math.round(vacationAnnual(settings, year) * factor * 2) / 2;
}

function firstTrackedYear(state) {
  const years = [...Object.keys(state.settings.vacation).map(Number), ...Object.keys(state.days).map(ds => +ds.slice(0, 4))];
  return years.length ? Math.min(...years) : null;
}

export function vacationAccount(state, year) {
  const base = vacationBase(state.settings, year);
  const manual = state.settings.vacationCarry[year];
  const first = firstTrackedYear(state);
  const autoCarry = first !== null && year > first ? vacationAccount(state, year - 1).left : 0;
  const carry = manual ?? autoCarry;
  const used = vacationUsed(state, String(year));
  const prorated = prorateFactor(state.settings, year) < 1;
  return { base, prorated, carry, autoCarry, manual: manual != null, total: base + carry, used, left: base + carry - used };
}

// Worked minutes per tag, for every class: { classId: { tagId | '': minutes } }, plus the total and the days
// behind each tag. The break of a day is spread over its blocks by their length, so every class adds up to
// exactly the booked time. Blocks without a tag of a class are counted under ''. With `only` ({ classId, tagId })
// just the blocks of that tag count, e.g. how the time of one project splits into activities.
export function tagTotals(state, from, to, now, only = null) {
  const byClass = {}, days = {};
  const today = iso(now), yesterday = iso(addDays(now, -1)), nowMin = now.getHours() * 60 + now.getMinutes();
  let total = 0;
  for (const ds of range(from, to)) {
    const day = state.days[ds];
    if (!day?.blocks.length) continue;
    const live = ds === today ? nowMin : ds === yesterday ? nowMin + 1440 : null;
    const gross = grossMin(day, live);
    if (!gross) continue;
    const worked = Math.max(0, gross - pauseMin(state.settings, day, gross));
    if (!only) total += worked;
    for (const b of day.blocks) {
      const share = (grossMin({ blocks: [b] }, live) / gross) * worked;
      if (!share || (only && (b.t?.[only.classId] || '') !== only.tagId)) continue;
      if (only) total += share;
      for (const classId of Object.keys(state.tags?.classes || {})) {
        const tagId = b.t?.[classId] || '';
        ((byClass[classId] ||= {})[tagId] ||= 0);
        byClass[classId][tagId] += share;
        const list = ((days[classId] ||= {})[tagId] ||= {});
        list[ds] = (list[ds] || 0) + share;
      }
    }
  }
  return { byClass, days, total };
}
