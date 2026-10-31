import { store, onSave, applyMerged } from '../core/store.js';
import { SYNC_AVAILABLE } from './config.js';
import * as api from './api.js';
import { merge, payload, canonical } from './merge.js';
import {
  deriveKeys, seal, unseal, newSecret, newPairCode, formatPairCode, normalizePairCode,
  pairKeys, toRecoveryKey, parseRecoveryKey,
} from './crypto.js';

const CONFIG_KEY = 'clockwise-sync';
const DEBOUNCE_MS = 1500;
const POLL_MS = 60_000;

export const syncState = { status: 'off', last: null, error: '' };

const statusListeners = new Set(), dataListeners = new Set();
export const onSyncStatus = fn => statusListeners.add(fn);
export const onRemoteData = fn => dataListeners.add(fn);
const setStatus = (status, error = '') => {
  Object.assign(syncState, { status, error }, status === 'ok' ? { last: new Date() } : {});
  statusListeners.forEach(fn => fn(syncState));
};

let config = null, keys = null, running = null, again = false, timer;

const readConfig = () => { try { return JSON.parse(localStorage.getItem(CONFIG_KEY)); } catch { return null; } };
const writeConfig = () => (config ? localStorage.setItem(CONFIG_KEY, JSON.stringify(config)) : localStorage.removeItem(CONFIG_KEY));

export const syncEnabled = () => Boolean(config);

async function activate(secret) {
  config = { secret };
  writeConfig();
  keys = await deriveKeys(secret);
  return syncNow();
}

async function runOnce({ keepalive = false } = {}) {
  let remote = await api.getVault(keys.token);
  for (let attempt = 0; attempt < 4; attempt++) {
    let remoteData = null;
    if (remote) {
      remoteData = await unseal(keys.key, remote.blob);
      const merged = merge(store.state, remoteData);
      if (canonical(payload(merged)) !== canonical(payload(store.state))) {
        applyMerged(merged);
        dataListeners.forEach(fn => fn());
      }
    }
    const local = payload(store.state);
    if (remoteData && canonical(local) === canonical(remoteData)) return;
    const result = await api.putVault(keys.token, remote ? remote.version : 0, await seal(keys.key, local), { keepalive });
    if (!result.conflict) return;
    remote = result.blob ? { version: result.version, blob: result.blob } : null;
  }
  throw new Error('conflict');
}

export function syncNow(options = {}) {
  if (!keys) return Promise.resolve();
  if (running) { again = true; return running; }
  setStatus('syncing');
  running = (async () => {
    try {
      do { again = false; await runOnce(options); } while (again);
      setStatus('ok');
    } catch (e) {
      setStatus(navigator.onLine === false || e.name === 'TypeError' || e.name === 'TimeoutError' ? 'offline' : 'error', e.message);
    } finally {
      running = null;
    }
  })();
  return running;
}

const schedule = () => { clearTimeout(timer); timer = setTimeout(() => { timer = null; syncNow(); }, DEBOUNCE_MS); };

function flush() {
  if (!timer) return;
  clearTimeout(timer); timer = null;
  syncNow({ keepalive: true });
}

export async function initSync() {
  if (!SYNC_AVAILABLE) return;
  onSave(() => { if (keys) schedule(); });
  window.addEventListener('online', () => syncNow());
  document.addEventListener('visibilitychange', () => (document.hidden ? flush() : syncNow()));
  window.addEventListener('pagehide', flush);
  setInterval(() => { if (!document.hidden) syncNow(); }, POLL_MS);
  config = readConfig();
  if (!config) return;
  keys = await deriveKeys(config.secret);
  syncNow();
}

export const enableSync = () => activate(newSecret());

export async function createPairCode() {
  await syncNow();
  const code = newPairCode();
  const { lookup, key } = await pairKeys(code);
  await api.createPairing(lookup, await seal(key, config.secret));
  return formatPairCode(code);
}

export async function joinSync(input) {
  const recovered = parseRecoveryKey(input);
  if (recovered) return activate(recovered);
  const code = normalizePairCode(input);
  if (!code) throw new Error('invalid_code');
  const { lookup, key } = await pairKeys(code);
  const sealed = await api.claimPairing(lookup);
  if (!sealed) throw new Error('unknown_code');
  return activate(await unseal(key, sealed));
}

export const recoveryKey = () => (config ? toRecoveryKey(config.secret) : null);

export async function disableSync({ wipe = false } = {}) {
  if (wipe && keys) await api.deleteVault(keys.token);
  config = null; keys = null;
  writeConfig();
  setStatus('off');
}
