import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmtDur, parseDur } from '../assets/js/core/time.js';
import { easter, holidays } from '../assets/js/core/holidays.js';
import { pauseMin, istMin, sollMin, dayStats, sumRange, balance, vacationUsed, vacationAccount, vacationBase, pauseWarning, reachMin } from '../assets/js/core/calc.js';

const settings = {
  land: 'NW', halfHolidays: true, pauseMode: 'fix', pauseMin: 45, carry: 0,
  periods: [{ from: '2026-01-01', min: [420, 420, 420, 420, 420, 0, 0] }],
};
const day = (...blocks) => ({ blocks: blocks.map(([i, o]) => ({ in: i, out: o })) });
const NOW = new Date(2026, 9, 31, 12, 0);

test('duration formatting', () => {
  assert.equal(fmtDur(450), '7:30');
  assert.equal(fmtDur(-90), '−1:30');
  assert.equal(fmtDur(15, true), '+0:15');
  assert.equal(parseDur('7,5'), 450);
  assert.equal(parseDur('-2:15'), -135);
});

test('Easter and NRW public holidays', () => {
  assert.equal(easter(2026).toDateString(), new Date(2026, 3, 5).toDateString());
  const h = holidays(2026, 'NW', true);
  assert.equal(h['2026-06-04'].id, 'corpusChristi');
  assert.equal(h['2026-11-01'].id, 'allSaints');
  assert.equal(h['2026-10-31'], undefined);
  assert.equal(h['2026-12-24'].f, 0.5);
});

test('fixed break, clocked breaks count towards it', () => {
  assert.equal(pauseMin(settings, day(['08:00', '16:00']), 480), 45);
  assert.equal(pauseMin(settings, day(['08:00', '12:00'], ['12:30', '16:45']), 495), 15);
  assert.equal(istMin(settings, day(['08:14', '17:34'])), 515);
});

test('statutory break (ArbZG)', () => {
  const s = { ...settings, pauseMode: 'gesetz' };
  assert.equal(pauseMin(s, day(['08:00', '13:00']), 300), 0);
  assert.equal(pauseMin(s, day(['08:00', '15:00']), 420), 30);
  assert.equal(pauseMin(s, day(['08:00', '18:00']), 600), 45);
});

test('warns about too short breaks', () => {
  assert.equal(pauseWarning(settings, { ...day(['08:00', '18:00']), pause: 15 }), true);
  assert.equal(pauseWarning(settings, day(['08:00', '16:00'])), false);
});

test('target time by day type and holiday', () => {
  assert.equal(sollMin(settings, '2026-10-30', undefined, 0), 420);
  assert.equal(sollMin(settings, '2026-10-31', undefined, 0), 0);
  assert.equal(sollMin(settings, '2026-06-04', undefined, 0), 0);
  assert.equal(sollMin(settings, '2026-10-30', { code: 'U' }, 0), 0);
  assert.equal(sollMin(settings, '2026-10-30', { code: 'UH' }, 0), 210);
  assert.equal(sollMin(settings, '2026-10-30', { code: 'G' }, 0), 420);
  assert.equal(sollMin(settings, '2026-10-30', { code: 'KR' }, 200), 200);
  assert.equal(sollMin(settings, '2026-12-24', undefined, 0), 210);
});

test('balance starts at the first recorded day', () => {
  const state = { settings, days: {} };
  assert.equal(balance(state, '2026-10-31', NOW), 0);
  state.days['2026-10-29'] = day(['08:00', '16:00']);
  state.days['2026-10-30'] = { blocks: [], code: 'U' };
  assert.equal(balance(state, '2026-10-31', NOW), 15);
  assert.equal(vacationUsed(state, '2026'), 1);
});

test('today only counts once clocked in', () => {
  const state = { settings, days: {} };
  const fri = new Date(2026, 9, 30, 9, 0);
  assert.equal(dayStats(state, '2026-10-30', fri).counts, false);
  state.days['2026-10-30'] = day(['08:00', null]);
  const st = dayStats(state, '2026-10-30', fri);
  assert.equal(st.counts, true);
  assert.equal(st.running, true);
});

test('nothing before the first entry counts, not even in totals', () => {
  const state = { settings, days: { '2026-10-29': day(['08:00', '16:00']) } };
  const jan = sumRange(state, '2026-01-01', '2026-01-31', NOW);
  assert.deepEqual(jan, { ist: 0, soll: 0, diff: 0 });
  assert.equal(dayStats(state, '2026-10-28', NOW).counts, false);
  assert.equal(sumRange(state, '2026-01-01', '2026-10-31', NOW).diff, balance(state, '2026-10-31', NOW));
});

test('vacation: entitlement continues, remaining days carry over', () => {
  const state = {
    settings: { ...settings, vacation: { 2026: 21 }, vacationCarry: {} },
    days: { '2026-07-06': { blocks: [], code: 'U' }, '2026-07-07': { blocks: [], code: 'UH' }, '2027-03-01': { blocks: [], code: 'U' } },
  };
  assert.deepEqual([vacationAccount(state, 2026).carry, vacationAccount(state, 2026).left], [0, 19.5]);
  const y27 = vacationAccount(state, 2027);
  assert.deepEqual([y27.base, y27.carry, y27.left], [21, 19.5, 39.5]);
  state.settings.vacationCarry[2027] = 5;
  assert.deepEqual([vacationAccount(state, 2027).carry, vacationAccount(state, 2028).carry], [5, 25]);
  state.settings.vacation[2028] = 30;
  assert.equal(vacationAccount(state, 2029).base, 30);
});

test('vacation prorated in the first year (by day, half days)', () => {
  const s = { ...settings, vacation: { 2026: 30 }, vacationCarry: {}, vacationProrate: true, vacationStart: '2026-04-20' };
  assert.equal(vacationBase(s, 2026), 21);
  assert.equal(vacationBase(s, 2027), 30);
  assert.equal(vacationBase(s, 2025), 0);
  assert.equal(vacationBase({ ...s, vacationStart: '2026-07-01' }, 2026), 15);
  assert.equal(vacationBase({ ...s, vacationProrate: false }, 2026), 30);
});

test('minute at which net work time reaches a target', () => {
  assert.equal(reachMin(settings, day(['08:24', null]), 600, 504), 504 + 645);
  assert.equal(reachMin(settings, day(['08:00', '12:00'], ['12:30', null]), 600, 750), 750 + 375);
  assert.equal(istMin(settings, day(['08:00', '12:00'], ['12:30', null]), 780), 240 + 30 - 15);
  assert.equal(reachMin(settings, day(['22:00', null]), 600, 1320), 1320 + 645);
});
