import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmtDur, parseDur } from '../assets/js/core/time.js';
import { easter, holidays } from '../assets/js/core/holidays.js';
import { pauseMin, istMin, sollMin, dayStats, sumRange, balance, vacationUsed, vacationAccount, vacationBase, pauseWarning, reachMin, invalidateCalc } from '../assets/js/core/calc.js';

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
  invalidateCalc();
  assert.equal(balance(state, '2026-10-31', NOW), 15);
  assert.equal(vacationUsed(state, '2026'), 1);
});

test('today only counts once clocked in', () => {
  const state = { settings, days: {} };
  const fri = new Date(2026, 9, 30, 9, 0);
  assert.equal(dayStats(state, '2026-10-30', fri).counts, false);
  state.days['2026-10-30'] = day(['08:00', null]);
  invalidateCalc();
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
  assert.equal(istMin(settings, day(['08:00', '12:00'], ['12:30', null]), 780), 270);
  assert.equal(reachMin(settings, day(['22:00', null]), 600, 1320), 1320 + 645);
});

test('break is deducted once more than 6 h are worked while clocked in', () => {
  const s = { ...settings, pauseMode: 'gesetz' };
  assert.equal(istMin(settings, day(['08:20', null]), 502), 2);
  assert.equal(istMin(settings, day(['08:00', null]), 480 + 360), 360);
  assert.equal(istMin(settings, day(['08:00', null]), 480 + 361), 316);
  assert.equal(istMin(settings, day(['08:00', null]), 480 + 390), 345);
  assert.equal(istMin(settings, day(['08:00', null]), 480 + 420), 375);
  assert.equal(istMin(settings, day(['08:00', '08:02']), 482), 0);
  assert.equal(istMin(settings, day(['08:00', '12:00'], ['12:30', null]), 750 + 120), 360);
  assert.equal(istMin(s, day(['08:00', null]), 480 + 400), 370);
  assert.equal(reachMin(settings, day(['08:20', null]), 420, 502), 500 + 465);
  assert.equal(reachMin(settings, day(['08:20', null]), 600, 502), 500 + 645);
});

test('target is reached when clocking out would book it', () => {
  const short = { ...settings, periods: [{ from: '2026-01-01', min: [360, 360, 360, 360, 360, 0, 0] }] };
  assert.equal(reachMin(short, day(['08:00', null]), 360, 480), 480 + 405);
  assert.equal(reachMin({ ...settings, pauseMode: 'gesetz' }, day(['08:00', null]), 360, 480), 480 + 360);
  assert.equal(reachMin({ ...settings, pauseMode: 'gesetz' }, day(['08:00', null]), 361, 480), 480 + 391);
});

test('Buß- und Bettag is the last Wednesday before 23 November', async () => {
  const { holidays } = await import('../assets/js/core/holidays.js');
  const day = y => Object.entries(holidays(y, 'SN', false)).find(([, h]) => h.id === 'repentance')[0];
  assert.deepEqual([2026, 2027, 2033, 2039].map(day), ['2026-11-18', '2027-11-17', '2033-11-16', '2039-11-16']);
});

test('cached balance equals a fresh day-by-day sum and follows changes', async () => {
  const { balance, sumRange, invalidateCalc, avgWorkdayMin } = await import('../assets/js/core/calc.js');
  const s = { ...settings, carry: 30 };
  const days = {};
  for (let d = new Date(2025, 0, 1); d < new Date(2026, 10, 16); d.setDate(d.getDate() + 1)) {
    if (d.getDay() % 6) days[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`] = { blocks: [{ in: '08:00', out: d.getDate() % 3 ? '16:30' : '15:00' }] };
  }
  days['2026-11-16'] = { blocks: [{ in: '08:00', out: null }] };
  const state = { settings: s, days };
  const now = new Date(2026, 10, 16, 12, 0);
  for (const to of ['2025-03-31', '2026-10-31', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-30']) {
    assert.equal(balance(state, to, now), 30 + sumRange(state, '2025-01-01', to, now).diff, to);
  }
  state.days['2025-02-03'].blocks[0].out = '20:00';
  invalidateCalc();
  assert.equal(balance(state, '2026-11-16', now), 30 + sumRange(state, '2025-01-01', '2026-11-16', now).diff);
  assert.equal(avgWorkdayMin({ periods: [{ from: '2026-01-01', min: [480, 480, 480, 480, 300, 0, 0] }] }, '2026-11-16'), 444);
});

test('schedule edits made in place are picked up after a save', async () => {
  const { contractMin, invalidateCalc } = await import('../assets/js/core/calc.js');
  const s = { periods: [{ from: '2026-01-01', min: [480, 480, 480, 480, 480, 0, 0] }] };
  assert.equal(contractMin(s, '2026-11-16'), 480);
  s.periods.push({ from: '2026-11-01', min: [240, 240, 240, 240, 240, 0, 0] });
  invalidateCalc();
  assert.equal(contractMin(s, '2026-11-16'), 240);
});

test('tag totals: each class adds up to the booked time, the break is spread by block length', async () => {
  const { tagTotals } = await import('../assets/js/core/calc.js');
  const state = {
    settings,
    tags: { classes: { p: { name: 'Projekt' }, a: { name: 'Tätigkeit' } }, items: {} },
    days: {
      '2026-11-16': { blocks: [{ in: '08:00', out: '12:00', t: { p: 'x', a: 'm' } }, { in: '12:00', out: '17:00', t: { p: 'y' } }] },
      '2026-11-17': { blocks: [{ in: '08:00', out: '10:00', t: { p: 'x' } }] },
    },
  };
  const r = tagTotals(state, '2026-11-01', '2026-11-30', new Date(2026, 10, 20, 12, 0));
  assert.equal(r.total, 540 - 45 + 120 - 45);
  assert.equal(Math.round(r.byClass.p.x), Math.round((240 / 540) * 495) + 75);
  assert.equal(Math.round(r.byClass.p.y), Math.round((300 / 540) * 495));
  for (const c of ['p', 'a']) assert.equal(Math.round(Object.values(r.byClass[c]).reduce((x, y) => x + y, 0)), r.total);
  assert.equal(Math.round(r.byClass.a['']), r.total - Math.round((240 / 540) * 495));
  assert.deepEqual(Object.keys(r.days.p.x), ['2026-11-16', '2026-11-17']);
});
