export { VaultChannel } from './channel.js';
import { sendPush } from './webpush.js';

const MAX_BLOB = 2_000_000;
const MAX_PAYLOAD = 2_000;
const PAIR_TTL_MS = 10 * 60 * 1000;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const LOOKUP_RE = /^[0-9a-f]{64}$/;
const KEY_RE = /^[A-Za-z0-9_-]{16,128}$/;
const TAG_RE = /^[\w-]{1,40}$/;
const MAX_JOBS = 20;
const PUSH_RETRY_MS = 15 * 60 * 1000;
const PUSH_IDLE_MS = 60 * 86_400_000;

async function sha256Hex(text) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function cors(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = env.ALLOWED_ORIGINS.split(',').map(s => s.trim());
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, If-None-Match',
    'Access-Control-Expose-Headers': 'ETag',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const json = (body, status, headers) =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { ...headers, ...(body === null ? {} : { 'Content-Type': 'application/json' }) },
  });

async function readJson(request, limit) {
  const text = await request.text();
  if (text.length > limit) throw new HttpError(413, 'too_large');
  try { return JSON.parse(text); } catch { throw new HttpError(400, 'bad_json'); }
}

class HttpError extends Error {
  constructor(status, code) { super(code); this.status = status; }
}

async function vaultId(request) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer /, '');
  if (!TOKEN_RE.test(token)) throw new HttpError(401, 'unauthorized');
  return sha256Hex(token);
}

async function getVault(request, env) {
  const known = Number((request.headers.get('If-None-Match') || '').replace(/\D/g, '')) || 0;
  const row = await env.DB.prepare('SELECT version, CASE WHEN version = ? THEN NULL ELSE blob END AS blob FROM vaults WHERE id = ?')
    .bind(known, await vaultId(request)).first();
  if (!row) throw new HttpError(404, 'not_found');
  if (row.blob === null) return { status: 304, body: null, etag: row.version };
  return { status: 200, body: { version: row.version, blob: row.blob }, etag: row.version };
}

async function putVault(request, env) {
  const id = await vaultId(request);
  const { version, blob } = await readJson(request, MAX_BLOB + 1000);
  if (!Number.isInteger(version) || version < 0 || typeof blob !== 'string' || blob.length > MAX_BLOB) {
    throw new HttpError(400, 'bad_request');
  }
  const now = Date.now();
  const result = version === 0
    ? await env.DB.prepare('INSERT INTO vaults (id, version, blob, updated_at) VALUES (?, 1, ?, ?) ON CONFLICT(id) DO NOTHING')
      .bind(id, blob, now).run()
    : await env.DB.prepare('UPDATE vaults SET version = version + 1, blob = ?, updated_at = ? WHERE id = ? AND version = ?')
      .bind(blob, now, id, version).run();
  if (result.meta.changes === 1) return { status: 200, body: { version: version + 1 }, id };

  const current = await env.DB.prepare('SELECT version, blob FROM vaults WHERE id = ?').bind(id).first();
  return { status: 409, body: current ? { version: current.version, blob: current.blob } : { version: 0, blob: null } };
}

const channel = (env, id) => env.CHANNEL.get(env.CHANNEL.idFromName(id));

async function openLive(request, env) {
  const origin = request.headers.get('Origin');
  if (origin && !env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).includes(origin)) throw new HttpError(403, 'forbidden');
  if (request.headers.get('Upgrade') !== 'websocket') throw new HttpError(426, 'upgrade_required');
  const protocols = (request.headers.get('Sec-WebSocket-Protocol') || '').split(',').map(s => s.trim());
  const token = protocols.find(p => TOKEN_RE.test(p));
  if (protocols[0] !== 'clockwise' || !token) throw new HttpError(401, 'unauthorized');
  return channel(env, await sha256Hex(token)).fetch(request);
}

async function deleteVault(request, env) {
  await env.DB.prepare('DELETE FROM vaults WHERE id = ?').bind(await vaultId(request)).run();
}

async function createPairing(request, env) {
  const { lookup, payload } = await readJson(request, MAX_PAYLOAD + 200);
  if (!LOOKUP_RE.test(lookup || '') || typeof payload !== 'string' || payload.length > MAX_PAYLOAD) {
    throw new HttpError(400, 'bad_request');
  }
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM pairings WHERE expires_at < ?').bind(now),
    env.DB.prepare('INSERT OR REPLACE INTO pairings (lookup, payload, expires_at) VALUES (?, ?, ?)').bind(lookup, payload, now + PAIR_TTL_MS),
  ]);
}

async function claimPairing(request, env) {
  const { lookup } = await readJson(request, 200);
  if (!LOOKUP_RE.test(lookup || '')) throw new HttpError(400, 'bad_request');
  const row = await env.DB.prepare('DELETE FROM pairings WHERE lookup = ? AND expires_at >= ? RETURNING payload')
    .bind(lookup, Date.now()).first();
  if (!row) throw new HttpError(404, 'not_found');
  return { payload: row.payload };
}

function pushSubscription(sub) {
  let url;
  try { url = new URL(sub.endpoint); } catch { throw new HttpError(400, 'bad_request'); }
  if (url.protocol !== 'https:' || sub.endpoint.length > 1000 || !KEY_RE.test(sub.keys?.p256dh || '') || !KEY_RE.test(sub.keys?.auth || '')) {
    throw new HttpError(400, 'bad_request');
  }
  return { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth };
}

const validJob = j => j && TAG_RE.test(j.tag) && Number.isInteger(j.at)
  && typeof j.title === 'string' && j.title.length <= 100 && typeof j.body === 'string' && j.body.length <= 300;

async function putPush(request, env) {
  const { subscription, items } = await readJson(request, 20_000);
  const sub = pushSubscription(subscription || {});
  if (!Array.isArray(items) || items.length > MAX_JOBS || !items.every(validJob)) throw new HttpError(400, 'bad_request');
  const id = await sha256Hex(sub.endpoint), now = Date.now();
  await env.DB.batch([
    env.DB.prepare('INSERT OR REPLACE INTO push_subs (id, endpoint, p256dh, auth, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, sub.endpoint, sub.p256dh, sub.auth, now),
    env.DB.prepare('DELETE FROM push_jobs WHERE sub_id = ? AND at > ?').bind(id, now),
    ...items.filter(j => j.at > now).map(j => env.DB.prepare('INSERT OR REPLACE INTO push_jobs (sub_id, tag, at, title, body) VALUES (?, ?, ?, ?, ?)')
      .bind(id, j.tag, j.at, j.title, j.body)),
  ]);
}

async function testPush(request, env) {
  const { endpoint, title, body } = await readJson(request, 2_000);
  const sub = await env.DB.prepare('SELECT * FROM push_subs WHERE id = ?').bind(await sha256Hex(String(endpoint))).first();
  if (!sub) throw new HttpError(404, 'not_found');
  return { status: await sendPush(sub, { title: String(title).slice(0, 100), body: String(body).slice(0, 300), tag: 'test' }, env).catch(() => 0) };
}

const dropSub = (env, id) => env.DB.batch([
  env.DB.prepare('DELETE FROM push_jobs WHERE sub_id = ?').bind(id),
  env.DB.prepare('DELETE FROM push_subs WHERE id = ?').bind(id),
]);

async function sendDuePushes(env) {
  const now = Date.now();
  const { results } = await env.DB.prepare(`SELECT j.sub_id, j.tag, j.at, j.title, j.body, s.endpoint, s.p256dh, s.auth
    FROM push_jobs j JOIN push_subs s ON s.id = j.sub_id WHERE j.at <= ? ORDER BY j.at LIMIT 200`).bind(now).all();
  await Promise.all(results.map(async job => {
    const status = await sendPush(job, { title: job.title, body: job.body, tag: job.tag }, env).catch(() => 0);
    if (status === 404 || status === 410) return dropSub(env, job.sub_id);
    if (status >= 200 && status < 300 || now - job.at > PUSH_RETRY_MS) {
      await env.DB.prepare('DELETE FROM push_jobs WHERE sub_id = ? AND tag = ? AND at = ?').bind(job.sub_id, job.tag, job.at).run();
    }
  }));
  const { results: idle } = await env.DB.prepare('SELECT id FROM push_subs WHERE updated_at < ?').bind(now - PUSH_IDLE_MS).all();
  await Promise.all(idle.map(s => dropSub(env, s.id)));
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendDuePushes(env));
  },


  async fetch(request, env, ctx) {
    const headers = cors(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const { pathname } = new URL(request.url);
    const route = `${request.method} ${pathname}`;
    try {
      switch (route) {
        case 'GET /v1/vault': { const r = await getVault(request, env); return json(r.body, r.status, { ...headers, ETag: `"${r.etag}"`, 'Cache-Control': 'no-store' }); }
        case 'PUT /v1/vault': {
          const r = await putVault(request, env);
          if (r.id) ctx.waitUntil(channel(env, r.id).fetch('https://channel/notify', { method: 'POST', body: JSON.stringify({ version: r.body.version }) }));
          return json(r.body, r.status, headers);
        }
        case 'GET /v1/live': return await openLive(request, env);
        case 'DELETE /v1/vault': await deleteVault(request, env); return json(null, 204, headers);
        case 'POST /v1/pair': await createPairing(request, env); return json(null, 201, headers);
        case 'POST /v1/pair/claim': return json(await claimPairing(request, env), 200, headers);
        case 'GET /v1/push/key': return json({ key: env.VAPID_PUBLIC_KEY }, 200, headers);
        case 'PUT /v1/push': await putPush(request, env); return json(null, 204, headers);
        case 'POST /v1/push/test': return json(await testPush(request, env), 200, headers);
        case 'GET /': return json({ service: 'clockwise-sync', ok: true }, 200, headers);
        default: return json({ error: 'not_found' }, 404, headers);
      }
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      return json({ error: e instanceof HttpError ? e.message : 'internal' }, status, headers);
    }
  },
};
