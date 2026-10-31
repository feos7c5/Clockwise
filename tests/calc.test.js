import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmtDur, parseDur } from '../assets/js/core/time.js';
import { easter, holidays } from '../assets/js/core/holidays.js';
import { pauseMin, istMin, sollMin, dayStats, balance, vacationUsed, pauseWarning } from '../assets/js/core/calc.js';

const settings = {
  land: 'NW', halfHolidays: true, pauseMode: 'fix', pauseMin: 45, carry: 0,
  periods: [{ from: '2026-01-01', min: [420, 420, 420, 420, 420, 0, 0] }],
};
const day = (...blocks) => ({ blocks: blocks.map(([i, o]) => ({ in: i, out: o })) });
const NOW = new Date(2026, 9, 31, 12, 0); // Sa, 31.10.2026

test('Zeitformat', () => {
  assert.equal(fmtDur(450), '7:30');
  assert.equal(fmtDur(-90), '−1:30');
  assert.equal(fmtDur(15, true), '+0:15');
  assert.equal(parseDur('7,5'), 450);
  assert.equal(parseDur('-2:15'), -135);
});

test('Ostern und Feiertage NRW', () => {
  assert.equal(easter(2026).toDateString(), new Date(2026, 3, 5).toDateString());
  const h = holidays(2026, 'NW', true);
  assert.equal(h['2026-06-04'].id, 'corpusChristi');
  assert.equal(h['2026-11-01'].id, 'allSaints');
  assert.equal(h['2026-10-31'], undefined); // Reformationstag nicht in NRW
  assert.equal(h['2026-12-24'].f, 0.5);
});

test('Feste Pause, gestempelte Pausen werden angerechnet', () => {
  assert.equal(pauseMin(settings, day(['08:00', '16:00']), 480), 45);
  assert.equal(pauseMin(settings, day(['08:00', '12:00'], ['12:30', '16:45']), 495), 15);
  assert.equal(istMin(settings, day(['08:14', '17:34'])), 515);
});

test('Gesetzliche Pause nach ArbZG', () => {
  const s = { ...settings, pauseMode: 'gesetz' };
  assert.equal(pauseMin(s, day(['08:00', '13:00']), 300), 0);
  assert.equal(pauseMin(s, day(['08:00', '15:00']), 420), 30);
  assert.equal(pauseMin(s, day(['08:00', '18:00']), 600), 45);
});

test('Pausenwarnung bei zu kurzer Pause', () => {
  assert.equal(pauseWarning(settings, { ...day(['08:00', '18:00']), pause: 15 }), true);
  assert.equal(pauseWarning(settings, day(['08:00', '16:00'])), false);
});

test('Soll nach Tagesart und Feiertag', () => {
  assert.equal(sollMin(settings, '2026-10-30', undefined, 0), 420);             // Freitag
  assert.equal(sollMin(settings, '2026-10-31', undefined, 0), 0);               // Samstag
  assert.equal(sollMin(settings, '2026-06-04', undefined, 0), 0);               // Fronleichnam
  assert.equal(sollMin(settings, '2026-10-30', { code: 'U' }, 0), 0);           // Urlaub
  assert.equal(sollMin(settings, '2026-10-30', { code: 'UH' }, 0), 210);        // halber Urlaub
  assert.equal(sollMin(settings, '2026-10-30', { code: 'G' }, 0), 420);         // Gleittag
  assert.equal(sollMin(settings, '2026-10-30', { code: 'KR' }, 200), 200);      // Soll = Ist
  assert.equal(sollMin(settings, '2026-12-24', undefined, 0), 210);             // Heiligabend halb
});

test('Saldo zählt ab dem ersten erfassten Tag', () => {
  const state = { settings, days: {} };
  assert.equal(balance(state, '2026-10-31', NOW), 0);
  state.days['2026-10-29'] = day(['08:00', '16:00']);                           // 7:15 → +0:15
  state.days['2026-10-30'] = { blocks: [], code: 'U' };
  assert.equal(balance(state, '2026-10-31', NOW), 15);
  assert.equal(vacationUsed(state, '2026'), 1);
});

test('Heute zählt erst mit Stempelung', () => {
  const state = { settings, days: {} };
  const fri = new Date(2026, 9, 30, 9, 0);
  assert.equal(dayStats(state, '2026-10-30', fri).counts, false);
  state.days['2026-10-30'] = day(['08:00', null]);
  const st = dayStats(state, '2026-10-30', fri);
  assert.equal(st.counts, true);
  assert.equal(st.running, true);
});
