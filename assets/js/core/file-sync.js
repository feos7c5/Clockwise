import { store, onSave, save, replaceState, isValidState } from './store.js';
import { t, formatDateTime } from '../i18n/index.js';

export const canFileSync = 'showSaveFilePicker' in window;
export const sync = { handle: null, perm: 'none', last: null, error: '' };

const listeners = new Set();
export const onSyncChange = fn => listeners.add(fn);
const changed = () => listeners.forEach(fn => fn());

const db = (() => {
  let p;
  const open = () => p ||= new Promise((resolve, reject) => {
    const r = indexedDB.open('stempeluhr', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  const tx = async (mode, fn) => {
    const d = await open();
    return new Promise(resolve => {
      const t = d.transaction('kv', mode), q = fn(t.objectStore('kv'));
      t.oncomplete = () => resolve(q.result);
      t.onerror = () => resolve(null);
    });
  };
  return {
    get: k => tx('readonly', s => s.get(k)),
    set: (k, v) => tx('readwrite', s => s.put(v, k)),
    del: k => tx('readwrite', s => s.delete(k)),
  };
})();

let timer;
function write() {
  if (!sync.handle || sync.perm !== 'granted') return;
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      const w = await sync.handle.createWritable();
      await w.write(JSON.stringify(store.state, null, 1));
      await w.close();
      sync.last = new Date();
      sync.error = '';
    } catch (e) {
      sync.perm = 'prompt';
      sync.error = e.message;
    }
    changed();
  }, 500);
}
onSave(write);

export async function initFileSync() {
  if (!canFileSync) return;
  try {
    sync.handle = await db.get('file');
    if (sync.handle) {
      sync.perm = await sync.handle.queryPermission({ mode: 'readwrite' });
      write();
    }
  } catch (e) {
    sync.error = e.message;
  }
  changed();
}

const picker = () => ({ types: [{ description: t('sync.fileType'), accept: { 'application/json': ['.json'] } }] });

export async function connectFile(existing) {
  try {
    const h = existing
      ? (await showOpenFilePicker(picker()))[0]
      : await showSaveFilePicker({ ...picker(), suggestedName: 'Clockwise-Daten.json' });
    if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') return;
    if (existing) {
      const data = JSON.parse(await (await h.getFile()).text());
      const when = data.savedAt ? formatDateTime(new Date(data.savedAt)) : t('sync.unknown');
      if (isValidState(data) && confirm(t('sync.loadFrom', { file: h.name, when }))) {
        replaceState(data);
      }
    }
    sync.handle = h;
    sync.perm = 'granted';
    await db.set('file', h);
    save();
  } catch (e) {
    if (e.name !== 'AbortError') alert(t('sync.connectFailed', { error: e.message }));
  }
  changed();
}

export async function reconnectFile() {
  if (!sync.handle) return;
  sync.perm = await sync.handle.requestPermission({ mode: 'readwrite' });
  write();
  changed();
}

export async function disconnectFile() {
  await db.del('file');
  Object.assign(sync, { handle: null, perm: 'none', last: null, error: '' });
  changed();
}
