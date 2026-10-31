// Läuft gegen `npm run dev` (http://localhost:8787) oder SYNC_URL
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';

const BASE = process.env.SYNC_URL || 'http://localhost:8787';
const token = () => randomBytes(32).toString('base64url');
const lookup = () => createHash('sha256').update(randomBytes(16)).digest('hex');
const call = (method, path, { auth, body } = {}) => fetch(BASE + path, {
  method,
  headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8765', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
});

test('Tresor: anlegen, lesen, Versionskonflikt', async () => {
  const t = token();
  assert.equal((await call('GET', '/v1/vault', { auth: t })).status, 404);

  const created = await call('PUT', '/v1/vault', { auth: t, body: { version: 0, blob: 'A' } });
  assert.equal(created.status, 200);
  assert.deepEqual(await created.json(), { version: 1 });

  const again = await call('PUT', '/v1/vault', { auth: t, body: { version: 0, blob: 'B' } });
  assert.equal(again.status, 409);
  assert.deepEqual(await again.json(), { version: 1, blob: 'A' });

  assert.equal((await call('PUT', '/v1/vault', { auth: t, body: { version: 1, blob: 'C' } })).status, 200);
  assert.deepEqual(await (await call('GET', '/v1/vault', { auth: t })).json(), { version: 2, blob: 'C' });

  assert.equal((await call('DELETE', '/v1/vault', { auth: t })).status, 204);
  assert.equal((await call('GET', '/v1/vault', { auth: t })).status, 404);
});

test('Tresor: ohne gültiges Token kein Zugriff', async () => {
  assert.equal((await call('GET', '/v1/vault')).status, 401);
  assert.equal((await call('GET', '/v1/vault', { auth: 'kurz' })).status, 401);
});

test('Tresore sind voneinander getrennt', async () => {
  const a = token(), b = token();
  await call('PUT', '/v1/vault', { auth: a, body: { version: 0, blob: 'nur-a' } });
  assert.equal((await call('GET', '/v1/vault', { auth: b })).status, 404);
});

test('Kopplung: genau einmal abholbar', async () => {
  const l = lookup();
  assert.equal((await call('POST', '/v1/pair', { body: { lookup: l, payload: 'geheim' } })).status, 201);
  const first = await call('POST', '/v1/pair/claim', { body: { lookup: l } });
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { payload: 'geheim' });
  assert.equal((await call('POST', '/v1/pair/claim', { body: { lookup: l } })).status, 404);
});

test('Kopplung: unbekannter Code und ungültige Eingaben', async () => {
  assert.equal((await call('POST', '/v1/pair/claim', { body: { lookup: lookup() } })).status, 404);
  assert.equal((await call('POST', '/v1/pair', { body: { lookup: 'x', payload: 'p' } })).status, 400);
});

test('CORS nur für erlaubte Herkunft', async () => {
  const res = await fetch(BASE + '/v1/vault', { method: 'OPTIONS', headers: { Origin: 'http://localhost:8765' } });
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'http://localhost:8765');
  const evil = await fetch(BASE + '/v1/vault', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } });
  assert.notEqual(evil.headers.get('Access-Control-Allow-Origin'), 'https://evil.example');
});
