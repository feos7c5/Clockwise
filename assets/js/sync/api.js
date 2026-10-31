import { SYNC_URL } from './config.js';

class SyncHttpError extends Error {
  constructor(status, body) { super(`HTTP ${status}`); this.status = status; this.body = body; }
}

async function request(method, path, { token, body, keepalive = false } = {}) {
  const json = body === undefined ? undefined : JSON.stringify(body);
  const res = await fetch(SYNC_URL + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: json,
    signal: AbortSignal.timeout(15000),
    keepalive: keepalive && json !== undefined && json.length < 60_000,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok && res.status !== 409) throw new SyncHttpError(res.status, data);
  return { status: res.status, data };
}

export async function getVault(token) {
  try {
    return (await request('GET', '/v1/vault', { token })).data;
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

export async function putVault(token, version, blob, { keepalive = false } = {}) {
  const { status, data } = await request('PUT', '/v1/vault', { token, body: { version, blob }, keepalive });
  return status === 409 ? { conflict: true, ...data } : data;
}

export const deleteVault = token => request('DELETE', '/v1/vault', { token });

export const createPairing = (lookup, payload) => request('POST', '/v1/pair', { body: { lookup, payload } });

export async function claimPairing(lookup) {
  try {
    return (await request('POST', '/v1/pair/claim', { body: { lookup } })).data.payload;
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}
