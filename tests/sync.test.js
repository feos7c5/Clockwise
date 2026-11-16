import { test } from 'node:test';
import assert from 'node:assert/strict';
import { snapshot, stamp, merge, payload, canonical, mergeDevices } from '../assets/js/sync/merge.js';
import {
  newSecret, deriveKeys, seal, unseal, newPairCode, normalizePairCode, formatPairCode,
  pairKeys, toRecoveryKey, parseRecoveryKey,
} from '../assets/js/sync/crypto.js';

const settings = { land: 'NW', pauseMin: 45, theme: 'dark', language: 'de', remind: { on: true } };
const state = (days = {}, extra = {}) => ({ settings: { ...settings, ...extra }, days: structuredClone(days) });
const day = (i, o) => ({ blocks: [{ in: i, out: o }] });

test('changes are timestamped per day', () => {
  const s = state({ '2026-10-01': day('08:00', '16:00') });
  let snap = snapshot(s);
  s.days['2026-10-02'] = day('09:00', '17:00');
  snap = stamp(s, snap, 100);
  assert.deepEqual(s.meta.days, { '2026-10-02': 100 });
  delete s.days['2026-10-01'];
  stamp(s, snap, 200);
  assert.equal(s.meta.days['2026-10-01'], 200);
});

test('device settings do not trigger a sync timestamp', () => {
  const s = state();
  const snap = snapshot(s);
  s.settings.theme = 'light';
  stamp(s, snap, 100);
  assert.equal(s.meta.settings, 0);
  s.settings.pauseMin = 30;
  stamp(s, snapshot({ ...s, settings: { ...s.settings, pauseMin: 45 } }), 200);
  assert.equal(s.meta.settings, 200);
});

test('merge: newer change wins per day, both sides kept', () => {
  const a = state({ '2026-10-01': day('08:00', '16:00'), '2026-10-02': day('08:00', '12:00') });
  a.meta = { days: { '2026-10-01': 300, '2026-10-02': 100 }, settings: 0 };
  const b = state({ '2026-10-02': day('08:00', '17:00'), '2026-10-03': day('07:00', '15:00') });
  b.meta = { days: { '2026-10-02': 200, '2026-10-03': 250 }, settings: 0 };
  const m = merge(a, b);
  assert.deepEqual(Object.keys(m.days).sort(), ['2026-10-01', '2026-10-02', '2026-10-03']);
  assert.equal(m.days['2026-10-02'].blocks[0].out, '17:00');
});

test('merge: deletion on one device deletes everywhere', () => {
  const a = state({});
  a.meta = { days: { '2026-10-01': 500 }, settings: 0 };
  const b = state({ '2026-10-01': day('08:00', '16:00') });
  b.meta = { days: { '2026-10-01': 100 }, settings: 0 };
  assert.equal('2026-10-01' in merge(a, b).days, false);
  assert.equal('2026-10-01' in merge(b, a).days, false);
});

test('merge: legacy data is combined, device settings stay local', () => {
  const local = state({ '2026-10-01': day('08:00', '16:00') }, { theme: 'light', pauseMin: 30 });
  const remote = state({ '2026-04-20': day('08:30', '16:15') }, { theme: 'dark', pauseMin: 45 });
  const m = merge(local, remote);
  assert.equal(Object.keys(m.days).length, 2);
  assert.equal(m.settings.theme, 'light');
  assert.equal(m.settings.pauseMin, 45);
});

test('merge is idempotent', () => {
  const a = state({ '2026-10-01': day('08:00', '16:00') });
  a.meta = { days: { '2026-10-01': 10 }, settings: 0 };
  const b = state({ '2026-10-02': day('08:00', '16:00') });
  const once = merge(a, b), twice = merge(once, payload(once));
  assert.equal(canonical(payload(once)), canonical(payload(twice)));
});

test('encryption: same secret gives same token, data round-trips', async () => {
  const secret = newSecret();
  const k1 = await deriveKeys(secret), k2 = await deriveKeys(secret);
  assert.equal(k1.token, k2.token);
  assert.match(k1.token, /^[A-Za-z0-9_-]{43}$/);
  const blob = await seal(k1.key, { hallo: 'welt' });
  assert.equal(blob.includes('welt'), false);
  assert.deepEqual(await unseal(k2.key, blob), { hallo: 'welt' });
  await assert.rejects(unseal((await deriveKeys(newSecret())).key, blob));
});

test('pairing code: format, input tolerance, key derivation', async () => {
  const code = newPairCode();
  assert.match(code, /^[2-9A-HJKMNP-Z]{8}$/);
  assert.equal(normalizePairCode(formatPairCode(code).toLowerCase()), code);
  assert.equal(normalizePairCode('ABCD-123'), null);
  const a = await pairKeys(code), b = await pairKeys(code);
  assert.equal(a.lookup, b.lookup);
  assert.deepEqual(await unseal(b.key, await seal(a.key, 'geheim')), 'geheim');
});

test('recovery key', () => {
  const secret = newSecret();
  assert.equal(parseRecoveryKey(` ${toRecoveryKey(secret)} `), secret);
  assert.equal(parseRecoveryKey('CW1-zu-kurz'), null);
});

test('devices: union, newer entry wins, removal is final', () => {
  const local = { a: { name: 'iPhone', seen: '2026-10-31', updated: 200 }, b: { name: 'Mac', updated: 100 } };
  const remote = { b: { name: 'Mac · Chrome', updated: 150 }, c: { name: 'iPad', updated: 50 } };
  const m = mergeDevices(local, remote);
  assert.deepEqual(Object.keys(m).sort(), ['a', 'b', 'c']);
  assert.equal(m.b.name, 'Mac · Chrome');
  const removed = mergeDevices({ b: { name: 'Mac', updated: 900 } }, { b: { name: 'Mac', updated: 100, removed: true } });
  assert.equal(removed.b.removed, true);
  assert.equal(merge({ settings, days: {}, devices: local }, { settings, days: {}, devices: { a: { removed: true, updated: 1 } } }).devices.a.removed, true);
});

test('merge: blocks edited on two devices at the same time are both kept', () => {
  const base = state({ '2026-11-16': { blocks: [{ id: 'a', in: '08:00', out: '12:00' }] } });
  let snap = snapshot(base);
  snap = stamp(base, snap, 100);
  const phone = structuredClone(base), pc = structuredClone(base);
  let ps = snapshot(phone), cs = snapshot(pc);
  phone.days['2026-11-16'].blocks.push({ in: '12:30', out: null });
  ps = stamp(phone, ps, 200);
  pc.days['2026-11-16'].blocks[0].out = '11:45';
  pc.days['2026-11-16'].note = 'Arzt';
  cs = stamp(pc, cs, 300);
  for (const m of [merge(phone, pc), merge(pc, phone)]) {
    const d = m.days['2026-11-16'];
    assert.deepEqual(d.blocks.map(b => `${b.in}-${b.out}`), ['08:00-11:45', '12:30-null']);
    assert.equal(d.note, 'Arzt');
  }
});

test('merge: a deleted block stays deleted, an older edit cannot revive it', () => {
  const a = state({ '2026-11-16': { blocks: [{ id: 'a', in: '08:00', out: '12:00' }, { id: 'b', in: '13:00', out: '17:00' }] } });
  let sa = stamp(a, snapshot(a), 100);
  const b = structuredClone(a);
  let sb = snapshot(b);
  b.days['2026-11-16'].blocks[1].out = '16:00';
  stamp(b, sb, 200);
  a.days['2026-11-16'].blocks.splice(1, 1);
  stamp(a, sa, 300);
  for (const m of [merge(a, b), merge(b, a)]) assert.deepEqual(m.days['2026-11-16'].blocks.map(x => x.id), ['a']);
});

test('merge: a backdated automatic clock-out loses against a real clock-out', () => {
  const start = state({ '2026-11-16': { blocks: [{ id: 'a', in: '08:00', out: null }] } });
  stamp(start, { days: {}, blocks: {}, settings: '' }, 1000);
  const pc = structuredClone(start), phone = structuredClone(start);
  let s = snapshot(pc); pc.days['2026-11-16'].blocks[0].out = '17:00'; stamp(pc, s, 5000);
  s = snapshot(phone); phone.days['2026-11-16'].blocks[0].out = '18:45'; stamp(phone, s, 1001);
  for (const m of [merge(phone, pc), merge(pc, phone)]) assert.equal(m.days['2026-11-16'].blocks[0].out, '17:00');
  const alone = merge(phone, start);
  assert.equal(alone.days['2026-11-16'].blocks[0].out, '18:45');
});

test('merge: an old device without block data still wins with a newer day', () => {
  const now = state({ '2026-11-16': { blocks: [{ id: 'L0', in: '08:00', out: '16:00' }] } });
  stamp(now, { days: {}, blocks: {}, settings: '' }, 100);
  const old = state({ '2026-11-16': { blocks: [{ id: 'L0', in: '08:00', out: '17:30' }] } });
  old.meta = { days: { '2026-11-16': 900 }, settings: 0 };
  assert.equal(merge(now, old).days['2026-11-16'].blocks[0].out, '17:30');
});

test('validation: damaged data is repaired instead of breaking the app', async () => {
  const { normalizeState } = await import('../assets/js/core/validate.js');
  const s = normalizeState({
    settings: { periods: 'x', remind: { at: 'nope', forgot: 'ten' }, pauseMin: null, vacation: { 2026: '30', 2025: 28 } },
    days: { 'bad': {}, '2026-11-16': { blocks: [null, { in: '25:00' }, { in: '08:00', out: 'x' }, { in: '09:00', out: '10:00', id: 'q' }], code: 'ZZ', pause: -5 }, '2026-11-17': 'oops' },
  });
  assert.deepEqual(s.days, { '2026-11-16': { blocks: [{ id: 'L2', in: '08:00', out: null }, { id: 'q', in: '09:00', out: '10:00' }] } });
  assert.equal(s.settings.periods.length, 1);
  assert.deepEqual(s.settings.remind, { on: false, at: '09:00', soll: true, forgot: 10 });
  assert.equal(s.settings.pauseMin, 45);
  assert.deepEqual(s.settings.vacation, { 2025: 28 });
});
