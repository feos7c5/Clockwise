// Arbeitszeit-Rechnung: Ist, Soll, Differenz, Saldo.
// Bildet die Regeln der ursprünglichen Excel-Vorlage nach.
import { iso, parseISO, toMin, range } from './time.js';
import { holidayOn } from './holidays.js';
import { CODES, vacationValue } from './codes.js';

// Vertragliche Tages-Sollzeit laut "gilt ab"-Zeiträumen (Wochentag 0 = Montag)
export function contractMin(settings, ds) {
  let current = null;
  for (const p of [...settings.periods].sort((a, b) => a.from.localeCompare(b.from))) if (p.from <= ds) current = p;
  return current ? current.min[(parseISO(ds).getDay() + 6) % 7] || 0 : 0;
}

// Brutto-Anwesenheit; nowMin ergänzt eine laufende Stempelung (über Mitternacht = +24 h)
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

// Summe der Lücken zwischen abgeschlossenen Zeitblöcken (= gestempelte Pausen)
export function gapMin(day) {
  const done = (day.blocks || []).filter(b => b.in && b.out);
  let gaps = 0;
  for (let i = 1; i < done.length; i++) {
    let d = toMin(done[i].in) - toMin(done[i - 1].out);
    if (d < 0) d += 1440;
    gaps += d;
  }
  return gaps;
}

// § 4 ArbZG: mehr als 6 h → 30 min, mehr als 9 h → 45 min
export const legalPause = gross => (gross > 540 ? 45 : gross > 360 ? 30 : 0);

export function pauseMin(settings, day, gross) {
  if (day.pause != null) return day.pause;
  if (!(day.blocks || []).length) return 0;
  const base = settings.pauseMode === 'gesetz' ? legalPause(gross) : settings.pauseMin;
  return Math.max(0, base - gapMin(day));
}

export function istMin(settings, day, nowMin = null) {
  const gross = grossMin(day, nowMin);
  return Math.max(0, gross - pauseMin(settings, day, gross));
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

// Tageswerte. Heute zählt erst mit Stempelung oder Tagesart, die Zukunft nie.
export function dayStats(state, ds, now) {
  const s = state.settings, day = state.days[ds] || { blocks: [] };
  const today = iso(now), yesterday = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const running = (day.blocks || []).some(b => !b.out);
  const live = !running ? null : ds === today ? nowMin : ds === yesterday ? nowMin + 1440 : null;
  const ist = istMin(s, day, live);
  const soll = sollMin(s, ds, day, ist);
  const counts = ds < today || (ds === today && Boolean((day.blocks || []).length || day.code));
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

// Saldo bis einschließlich toStr – zählt ab dem ersten erfassten Tag
export function balance(state, toStr, now) {
  const carry = state.settings.carry || 0;
  const first = Object.keys(state.days).sort()[0];
  if (!first || first > toStr) return carry;
  return carry + sumRange(state, first, toStr, now).diff;
}

export function vacationUsed(state, year) {
  let n = 0;
  for (const [ds, day] of Object.entries(state.days)) if (ds.startsWith(year)) n += vacationValue(day.code);
  return n;
}
