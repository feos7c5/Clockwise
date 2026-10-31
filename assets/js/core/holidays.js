import { iso } from './time.js';

export const STATES = ['BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH'];

export function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return new Date(y, Math.floor(n / 31) - 1, (n % 31) + 1);
}

const cache = new Map();

export function holidays(year, land, halfDays) {
  const key = `${year}|${land}|${halfDays}`;
  if (cache.has(key)) return cache.get(key);

  const E = easter(year);
  const fromEaster = n => new Date(year, E.getMonth(), E.getDate() + n);
  const D = (m, d) => new Date(year, m - 1, d);
  const repentance = (() => { const d = D(11, 23); while (d.getDay() !== 3) d.setDate(d.getDate() - 1); return d; })();

  const list = [
    [D(1, 1), 'newYear'],
    [D(1, 6), 'epiphany', ['BW', 'BY', 'ST']],
    [D(3, 8), 'womensDay', ['BE', 'MV']],
    [fromEaster(-2), 'goodFriday'],
    [E, 'easterSunday'],
    [fromEaster(1), 'easterMonday'],
    [D(5, 1), 'labourDay'],
    [fromEaster(39), 'ascension'],
    [fromEaster(49), 'whitSunday'],
    [fromEaster(50), 'whitMonday'],
    [fromEaster(60), 'corpusChristi', ['BW', 'BY', 'HE', 'NW', 'RP', 'SL']],
    [D(8, 15), 'assumption', ['SL']],
    [D(9, 20), 'childrensDay', ['TH']],
    [D(10, 3), 'unity'],
    [D(10, 31), 'reformation', ['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH']],
    [D(11, 1), 'allSaints', ['BW', 'BY', 'NW', 'RP', 'SL']],
    [repentance, 'repentance', ['SN']],
    [D(12, 25), 'christmas1'],
    [D(12, 26), 'christmas2'],
  ];

  const out = {};
  for (const [d, id, only] of list) if (!only || only.includes(land)) out[iso(d)] = { id, f: 0 };
  if (halfDays) {
    out[iso(D(12, 24))] = { id: 'christmasEve', f: 0.5 };
    out[iso(D(12, 31))] = { id: 'newYearsEve', f: 0.5 };
  }
  cache.set(key, out);
  return out;
}

export const holidayOn = (settings, ds) => holidays(+ds.slice(0, 4), settings.land, settings.halfHolidays)[ds];
