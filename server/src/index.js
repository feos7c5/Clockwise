const MAX_BLOB = 2_000_000;
const MAX_PAYLOAD = 2_000;
const PAIR_TTL_MS = 10 * 60 * 1000;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const LOOKUP_RE = /^[0-9a-f]{64}$/;

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
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
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
  const row = await env.DB.prepare('SELECT version, blob FROM vaults WHERE id = ?').bind(await vaultId(request)).first();
  if (!row) throw new HttpError(404, 'not_found');
  return { version: row.version, blob: row.blob };
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
  if (result.meta.changes === 1) return { status: 200, body: { version: version + 1 } };

  const current = await env.DB.prepare('SELECT version, blob FROM vaults WHERE id = ?').bind(id).first();
  return { status: 409, body: current ? { version: current.version, blob: current.blob } : { version: 0, blob: null } };
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

export default {
  async fetch(request, env) {
    const headers = cors(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const { pathname } = new URL(request.url);
    const route = `${request.method} ${pathname}`;
    try {
      switch (route) {
        case 'GET /v1/vault': return json(await getVault(request, env), 200, headers);
        case 'PUT /v1/vault': { const r = await putVault(request, env); return json(r.body, r.status, headers); }
        case 'DELETE /v1/vault': await deleteVault(request, env); return json(null, 204, headers);
        case 'POST /v1/pair': await createPairing(request, env); return json(null, 201, headers);
        case 'POST /v1/pair/claim': return json(await claimPairing(request, env), 200, headers);
        case 'GET /': return json({ service: 'clockwise-sync', ok: true }, 200, headers);
        default: return json({ error: 'not_found' }, 404, headers);
      }
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      return json({ error: e instanceof HttpError ? e.message : 'internal' }, status, headers);
    }
  },
};
