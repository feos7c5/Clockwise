import { iso, parseISO, toMin, range } from './time.js';
import { holidayOn } from './holidays.js';
import { CODES, vacationValue } from './codes.js';

export function contractMin(settings, ds) {
  let current = null;
  for (const p of [...settings.periods].sort((a, b) => a.from.localeCompare(b.from))) if (p.from <= ds) current = p;
  return current ? current.min[(parseISO(ds).getDay() + 6) % 7] || 0 : 0;
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

// While a block is running the break is deducted only after 6 h of work, so the clock runs from clock-in.
export function pauseMin(settings, day, gross) {
  if (day.pause != null) return day.pause;
  const blocks = day.blocks || [];
  if (!blocks.length) return 0;
  const base = settings.pauseMode === 'gesetz' ? legalPause(gross) : settings.pauseMin;
  const due = Math.max(0, base - gapMin(day));
  return blocks.some(b => !b.out) ? Math.min(due, Math.max(0, gross - PAUSE_AFTER)) : due;
}

export function istMin(settings, day, nowMin = null) {
  const gross = grossMin(day, nowMin);
  return Math.max(0, gross - pauseMin(settings, day, gross));
}

export function reachMin(settings, day, target, from) {
  for (let m = from; m <= from + 1440; m++) if (istMin(settings, day, m) >= target) return m;
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

export function firstDay(state) {
  let first = null;
  for (const ds in state.days) if (first === null || ds < first) first = ds;
  return first;
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

export function balance(state, toStr, now) {
  const carry = state.settings.carry || 0;
  const first = firstDay(state);
  if (!first || first > toStr) return carry;
  return carry + sumRange(state, first, toStr, now).diff;
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
