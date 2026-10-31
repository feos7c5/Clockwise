import { store, onSave, applyMerged, save } from '../core/store.js';
import { iso } from '../core/time.js';
import { SYNC_AVAILABLE } from './config.js';
import * as api from './api.js';
import { openLive, closeLive, liveConnected } from './live.js';
import { merge, payload, canonical } from './merge.js';
import {
  deriveKeys, seal, unseal, newSecret, newPairCode, formatPairCode, normalizePairCode,
  pairKeys, toRecoveryKey, parseRecoveryKey,
} from './crypto.js';

const CONFIG_KEY = 'clockwise-sync';
const PUSH_DELAY_MS = 3_000;
const POLL_MS = 2 * 60_000;
const LIVE_POLL_MS = 10 * 60_000;
const MIN_PULL_GAP_MS = 20_000;
const RETRY_MS = [5_000, 15_000, 60_000, 5 * 60_000];
const REMOVED_KEY = 'clockwise-removed';
const DEVICE_KEY = 'clockwise-device';
const LOCAL_DATA_KEYS = ['stempeluhr-v1', CONFIG_KEY, 'stempeluhr-notified', DEVICE_KEY];

export const syncState = { status: 'off', last: null, error: '', pending: false };

const statusListeners = new Set(), dataListeners = new Set();
export const onSyncStatus = fn => statusListeners.add(fn);
export const onRemoteData = fn => dataListeners.add(fn);
const setStatus = (status, error = '') => {
  Object.assign(syncState, { status, error, pending: Boolean(config?.dirty) }, status === 'ok' ? { last: new Date() } : {});
  statusListeners.forEach(fn => fn(syncState));
};

let config = null, keys = null, running = null, again = null;
let pushTimer = null, retryTimer = null, retries = 0, lastPull = 0, localRevision = 0, leaving = false;

function deviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

let fingerprint = '';
async function computeFingerprint() {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(keys.token)));
  const hex = [...hash.slice(0, 3)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  fingerprint = `${hex.slice(0, 3)}-${hex.slice(3)}`;
}
export const syncFingerprint = () => fingerprint;

const readConfig = () => { try { return JSON.parse(localStorage.getItem(CONFIG_KEY)); } catch { return null; } };
const writeConfig = () => (config ? localStorage.setItem(CONFIG_KEY, JSON.stringify(config)) : localStorage.removeItem(CONFIG_KEY));

export const syncEnabled = () => Boolean(config);

function markDirty() {
  localRevision++;
  if (!config.dirty) { config.dirty = true; writeConfig(); }
}

async function applyRemote(remote) {
  const data = await unseal(keys.key, remote.blob);
  const merged = merge(store.state, data);
  if (canonical(payload(merged)) !== canonical(payload(store.state))) {
    applyMerged(merged);
    dataListeners.forEach(fn => fn());
  }
  config.version = remote.version;
  if (canonical(payload(store.state)) !== canonical(data)) config.dirty = true;
  writeConfig();
}

async function pull(force) {
  if (!force && Date.now() - lastPull < MIN_PULL_GAP_MS) return;
  const remote = await api.getVault(keys.token, config.version);
  lastPull = Date.now();
  if (!remote) {
    config.version = 0;
    config.dirty = true;
    writeConfig();
  } else if (!remote.unchanged) {
    await applyRemote(remote);
  }
}

async function push(keepalive) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const revision = localRevision;
    const blob = await seal(keys.key, payload(store.state));
    const result = await api.putVault(keys.token, config.version, blob, { keepalive });
    if (!result.conflict) {
      config.version = result.version;
      if (revision === localRevision) config.dirty = false;
      writeConfig();
      return;
    }
    if (result.blob) await applyRemote({ version: result.version, blob: result.blob });
    else { config.version = 0; writeConfig(); }
  }
  throw new Error('conflict');
}

async function cycle({ forcePull = false, keepalive = false }) {
  if (config.dirty) await push(keepalive);
  else await pull(forcePull);
  if (config.dirty) await push(keepalive);
}

function scheduleRetry() {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => syncNow({ forcePull: true }), RETRY_MS[Math.min(retries++, RETRY_MS.length - 1)]);
}

export function syncNow(options = {}) {
  if (!keys) return Promise.resolve();
  if (navigator.onLine === false) { setStatus('offline'); return Promise.resolve(); }
  if (running) { again = { ...again, ...options }; return running; }
  setStatus('syncing');
  running = (async () => {
    let opts = options;
    try {
      while (opts) {
        again = null;
        await cycle(opts);
        opts = again;
      }
      retries = 0;
      clearTimeout(retryTimer);
      if (wasRemoved()) return wipeRemovedDevice();
      registerDevice();
      setStatus('ok');
    } catch (e) {
      const offline = navigator.onLine === false || e.name === 'TypeError' || e.name === 'TimeoutError';
      setStatus(offline ? 'offline' : 'error', e.message);
      scheduleRetry();
    } finally {
      running = null;
    }
  })();
  return running;
}

function startLive() {
  if (!keys || document.hidden) return;
  openLive(keys.token, version => { if (config && version > config.version) syncNow({ forcePull: true }); });
}

function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushTimer = null; syncNow(); }, PUSH_DELAY_MS);
}

function flush() {
  if (!pushTimer) return;
  clearTimeout(pushTimer);
  pushTimer = null;
  syncNow({ keepalive: true });
}

function defaultDeviceName() {
  const ua = navigator.userAgent;
  const device = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iPad'
    : /Android/.test(ua) ? 'Android' : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Browser';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : 'Safari';
  return device === 'iPhone' || device === 'iPad' ? device : `${device} · ${browser}`;
}

function registerDevice() {
  if (leaving) return;
  const devices = (store.state.devices ||= {});
  const me = devices[config.device], today = iso(new Date());
  if (me && me.seen === today && !me.left) return;
  devices[config.device] = { name: me?.name || defaultDeviceName(), seen: today, updated: Date.now() };
  save();
}

const wasRemoved = () => Boolean(store.state.devices?.[config.device]?.removed);

function wipeRemovedDevice() {
  closeLive();
  clearTimeout(pushTimer);
  clearTimeout(retryTimer);
  config = null; keys = null;
  LOCAL_DATA_KEYS.forEach(k => localStorage.removeItem(k));
  localStorage.setItem(REMOVED_KEY, iso(new Date()));
  location.reload();
}

export const removedNotice = () => localStorage.getItem(REMOVED_KEY);

export function listDevices() {
  if (!config) return [];
  return Object.entries(store.state.devices || {})
    .filter(([, d]) => !d.removed && !d.left)
    .map(([id, d]) => ({ id, ...d, self: id === config.device }))
    .sort((a, b) => (b.self - a.self) || (b.seen || '').localeCompare(a.seen || ''));
}

export function renameDevice(id, name) {
  const d = store.state.devices?.[id];
  if (!d || !name.trim()) return;
  Object.assign(d, { name: name.trim().slice(0, 40), updated: Date.now() });
  save();
}

export function removeDevice(id) {
  const d = store.state.devices?.[id];
  if (!d || id === config.device) return;
  Object.assign(d, { removed: true, updated: Date.now() });
  save();
}

export async function initSync() {
  if (!SYNC_AVAILABLE) return;
  onSave(() => { if (keys) { markDirty(); schedulePush(); } });
  window.addEventListener('online', () => { syncNow({ forcePull: true }); startLive(); });
  window.addEventListener('offline', () => { if (keys) setStatus('offline'); closeLive(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { flush(); closeLive(); } else { syncNow(); startLive(); }
  });
  window.addEventListener('pagehide', flush);
  setInterval(() => {
    if (document.hidden) return;
    if (!liveConnected() || Date.now() - lastPull > LIVE_POLL_MS) syncNow();
  }, POLL_MS);
  config = readConfig();
  if (!config) return;
  config.version ??= 0;
  config.dirty ??= false;
  if (config.device && !localStorage.getItem(DEVICE_KEY)) localStorage.setItem(DEVICE_KEY, config.device);
  config.device = deviceId();
  writeConfig();
  keys = await deriveKeys(config.secret);
  await computeFingerprint();
  syncNow({ forcePull: true });
  startLive();
}

async function activate(secret, { fresh }) {
  config = { secret, version: 0, dirty: fresh, device: deviceId() };
  writeConfig();
  keys = await deriveKeys(secret);
  await computeFingerprint();
  startLive();
  return syncNow({ forcePull: true });
}

export const enableSync = () => activate(newSecret(), { fresh: true });

export async function createPairCode() {
  await syncNow();
  const code = newPairCode();
  const { lookup, key } = await pairKeys(code);
  await api.createPairing(lookup, await seal(key, config.secret));
  return formatPairCode(code);
}

export async function joinSync(input) {
  const recovered = parseRecoveryKey(input);
  if (recovered) return activate(recovered, { fresh: false });
  const code = normalizePairCode(input);
  if (!code) throw new Error('invalid_code');
  const { lookup, key } = await pairKeys(code);
  const sealed = await api.claimPairing(lookup);
  if (!sealed) throw new Error('unknown_code');
  return activate(await unseal(key, sealed), { fresh: false });
}

export const recoveryKey = () => (config ? toRecoveryKey(config.secret) : null);

export async function disableSync({ wipe = false } = {}) {
  if (wipe && keys) await api.deleteVault(keys.token);
  else if (keys && store.state.devices?.[config.device]) {
    leaving = true;
    Object.assign(store.state.devices[config.device], { left: true, updated: Date.now() });
    save();
    clearTimeout(pushTimer);
    pushTimer = null;
    await syncNow().catch(() => {});
  }
  leaving = false;
  clearTimeout(pushTimer);
  clearTimeout(retryTimer);
  closeLive();
  config = null; keys = null;
  writeConfig();
  setStatus('off');
}
