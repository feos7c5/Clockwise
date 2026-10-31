// Gesetzliche Feiertage je Bundesland. f = Soll-Faktor (0 = frei, 0.5 = halber Tag).
import { iso } from './time.js';

export const LANDS = {
  BW: 'Baden-Württemberg', BY: 'Bayern', BE: 'Berlin', BB: 'Brandenburg', HB: 'Bremen', HH: 'Hamburg',
  HE: 'Hessen', MV: 'Mecklenburg-Vorpommern', NI: 'Niedersachsen', NW: 'Nordrhein-Westfalen',
  RP: 'Rheinland-Pfalz', SL: 'Saarland', SN: 'Sachsen', ST: 'Sachsen-Anhalt', SH: 'Schleswig-Holstein', TH: 'Thüringen',
};

// Gauß'sche Osterformel (gregorianisch)
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
    [D(1, 1), 'Neujahr'],
    [D(1, 6), 'Heilige Drei Könige', ['BW', 'BY', 'ST']],
    [D(3, 8), 'Int. Frauentag', ['BE', 'MV']],
    [fromEaster(-2), 'Karfreitag'],
    [E, 'Ostersonntag'],
    [fromEaster(1), 'Ostermontag'],
    [D(5, 1), 'Maifeiertag'],
    [fromEaster(39), 'Christi Himmelfahrt'],
    [fromEaster(49), 'Pfingstsonntag'],
    [fromEaster(50), 'Pfingstmontag'],
    [fromEaster(60), 'Fronleichnam', ['BW', 'BY', 'HE', 'NW', 'RP', 'SL']],
    [D(8, 15), 'Mariä Himmelfahrt', ['SL']],
    [D(9, 20), 'Weltkindertag', ['TH']],
    [D(10, 3), 'Tag der Deutschen Einheit'],
    [D(10, 31), 'Reformationstag', ['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH']],
    [D(11, 1), 'Allerheiligen', ['BW', 'BY', 'NW', 'RP', 'SL']],
    [repentance, 'Buß- und Bettag', ['SN']],
    [D(12, 25), '1. Weihnachtsfeiertag'],
    [D(12, 26), '2. Weihnachtsfeiertag'],
  ];

  const out = {};
  for (const [d, name, only] of list) if (!only || only.includes(land)) out[iso(d)] = { name, f: 0 };
  if (halfDays) {
    out[iso(D(12, 24))] = { name: 'Heiligabend', f: 0.5 };
    out[iso(D(12, 31))] = { name: 'Silvester', f: 0.5 };
  }
  cache.set(key, out);
  return out;
}

export const holidayOn = (settings, ds) => holidays(+ds.slice(0, 4), settings.land, settings.halfHolidays)[ds];
