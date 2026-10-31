import { test } from 'node:test';
import assert from 'node:assert/strict';
import { snapshot, stamp, merge, payload, canonical } from '../assets/js/sync/merge.js';
import {
  newSecret, deriveKeys, seal, unseal, newPairCode, normalizePairCode, formatPairCode,
  pairKeys, toRecoveryKey, parseRecoveryKey,
} from '../assets/js/sync/crypto.js';

const settings = { land: 'NW', pauseMin: 45, theme: 'dark', language: 'de', remind: { on: true } };
const state = (days = {}, extra = {}) => ({ settings: { ...settings, ...extra }, days: structuredClone(days) });
const day = (i, o) => ({ blocks: [{ in: i, out: o }] });

test('Änderungen werden pro Tag gestempelt', () => {
  const s = state({ '2026-10-01': day('08:00', '16:00') });
  let snap = snapshot(s);
  s.days['2026-10-02'] = day('09:00', '17:00');
  snap = stamp(s, snap, 100);
  assert.deepEqual(s.meta.days, { '2026-10-02': 100 });
  delete s.days['2026-10-01'];
  stamp(s, snap, 200);
  assert.equal(s.meta.days['2026-10-01'], 200); // Löschung gestempelt
});

test('Geräte-Einstellungen lösen keinen Sync-Stempel aus', () => {
  const s = state();
  const snap = snapshot(s);
  s.settings.theme = 'light';
  stamp(s, snap, 100);
  assert.equal(s.meta.settings, 0);
  s.settings.pauseMin = 30;
  stamp(s, snapshot({ ...s, settings: { ...s.settings, pauseMin: 45 } }), 200);
  assert.equal(s.meta.settings, 200);
});

test('Merge: neuere Änderung gewinnt je Tag, beide Seiten bleiben erhalten', () => {
  const a = state({ '2026-10-01': day('08:00', '16:00'), '2026-10-02': day('08:00', '12:00') });
  a.meta = { days: { '2026-10-01': 300, '2026-10-02': 100 }, settings: 0 };
  const b = state({ '2026-10-02': day('08:00', '17:00'), '2026-10-03': day('07:00', '15:00') });
  b.meta = { days: { '2026-10-02': 200, '2026-10-03': 250 }, settings: 0 };
  const m = merge(a, b);
  assert.deepEqual(Object.keys(m.days).sort(), ['2026-10-01', '2026-10-02', '2026-10-03']);
  assert.equal(m.days['2026-10-02'].blocks[0].out, '17:00');
});

test('Merge: Löschung auf einem Gerät löscht überall', () => {
  const a = state({});
  a.meta = { days: { '2026-10-01': 500 }, settings: 0 };
  const b = state({ '2026-10-01': day('08:00', '16:00') });
  b.meta = { days: { '2026-10-01': 100 }, settings: 0 };
  assert.equal('2026-10-01' in merge(a, b).days, false);
  assert.equal('2026-10-01' in merge(b, a).days, false);
});

test('Merge: Altdaten ohne Stempel werden vereinigt, Geräte-Einstellungen bleiben lokal', () => {
  const local = state({ '2026-10-01': day('08:00', '16:00') }, { theme: 'light', pauseMin: 30 });
  const remote = state({ '2026-04-20': day('08:30', '16:15') }, { theme: 'dark', pauseMin: 45 });
  const m = merge(local, remote);
  assert.equal(Object.keys(m.days).length, 2);
  assert.equal(m.settings.theme, 'light');   // lokal
  assert.equal(m.settings.pauseMin, 45);     // geteilte Einstellung vom Server bei Gleichstand
});

test('Merge ist stabil: zweimal zusammenführen ändert nichts', () => {
  const a = state({ '2026-10-01': day('08:00', '16:00') });
  a.meta = { days: { '2026-10-01': 10 }, settings: 0 };
  const b = state({ '2026-10-02': day('08:00', '16:00') });
  const once = merge(a, b), twice = merge(once, payload(once));
  assert.equal(canonical(payload(once)), canonical(payload(twice)));
});

test('Verschlüsselung: gleiches Geheimnis → gleiches Token, Daten wieder lesbar', async () => {
  const secret = newSecret();
  const k1 = await deriveKeys(secret), k2 = await deriveKeys(secret);
  assert.equal(k1.token, k2.token);
  assert.match(k1.token, /^[A-Za-z0-9_-]{43}$/);
  const blob = await seal(k1.key, { hallo: 'welt' });
  assert.equal(blob.includes('welt'), false);
  assert.deepEqual(await unseal(k2.key, blob), { hallo: 'welt' });
  await assert.rejects(unseal((await deriveKeys(newSecret())).key, blob));
});

test('Kopplungscode: Format, Eingabe-Toleranz, Ableitung', async () => {
  const code = newPairCode();
  assert.match(code, /^[2-9A-HJKMNP-Z]{8}$/);
  assert.equal(normalizePairCode(formatPairCode(code).toLowerCase()), code);
  assert.equal(normalizePairCode('ABCD-123'), null);
  const a = await pairKeys(code), b = await pairKeys(code);
  assert.equal(a.lookup, b.lookup);
  assert.deepEqual(await unseal(b.key, await seal(a.key, 'geheim')), 'geheim');
});

test('Wiederherstellungsschlüssel', () => {
  const secret = newSecret();
  assert.equal(parseRecoveryKey(` ${toRecoveryKey(secret)} `), secret);
  assert.equal(parseRecoveryKey('CW1-zu-kurz'), null);
});
