import { store, save } from './store.js';

// Optional categories for time blocks. The user creates classes (e.g. "Project", "Activity"), each class has
// tags, and a block carries at most one tag per class (block.t = { classId: tagId }). Each class therefore
// always adds up to the whole worked time. Entries that were never used can be deleted (they leave a
// small marker `gone`, so the deletion reaches the other devices); used ones can only be archived, so old
// blocks keep their names. Without classes the app shows none of this.

export const TAG_COLORS = ['#5fa883', '#5b8fc7', '#8d7fd0', '#c9785c', '#c7a23f', '#4fa9ad', '#c873a0', '#8b9099'];
const NEXT_KEY = 'clockwise-next-tags';
const MAX_NAME = 40;

const data = () => (store.state.tags ||= { classes: {}, items: {} });
const newId = () => [...crypto.getRandomValues(new Uint8Array(4))].map(b => b.toString(16).padStart(2, '0')).join('');
const clean = name => String(name || '').trim().replace(/\s+/g, ' ').slice(0, MAX_NAME);
const same = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }) === 0;
const byName = (a, b) => a.name.localeCompare(b.name);

export function tagClasses({ archived = false } = {}) {
  return Object.entries(store.state.tags?.classes || {}).filter(([, c]) => !c.gone && archived === Boolean(c.off))
    .map(([id, c]) => ({ id, ...c })).sort((a, b) => (a.pos - b.pos) || byName(a, b));
}
export const hasTagClasses = () => tagClasses().length > 0;

// `archived`: false – in use (default), true – archived only, 'all' – both.
export function tagsIn(classId, { archived = false } = {}) {
  return Object.entries(store.state.tags?.items || {})
    .filter(([, i]) => i.c === classId && !i.gone && (archived === 'all' || archived === Boolean(i.off)))
    .map(([id, i]) => ({ id, ...i })).sort(byName);
}
export const tagOf = id => {
  const tag = store.state.tags?.items?.[id];
  return tag && !tag.gone ? tag : null;
};
export const classOf = id => {
  const c = store.state.tags?.classes?.[id];
  return c && !c.gone ? c : null;
};
export const tagColor = tag => TAG_COLORS[(tag?.col ?? 7) % TAG_COLORS.length];

export function addClass(name) {
  name = clean(name);
  if (!name) return null;
  const d = data();
  const hit = Object.entries(d.classes).find(([, c]) => !c.gone && same(c.name, name));
  if (hit) {
    if (hit[1].off) { delete hit[1].off; hit[1].u = Date.now(); save(); }
    return hit[0];
  }
  const id = newId();
  d.classes[id] = { name, pos: Math.max(-1, ...Object.values(d.classes).filter(c => !c.gone).map(c => c.pos ?? 0)) + 1, u: Date.now() };
  save();
  return id;
}

export function addTag(classId, name) {
  name = clean(name);
  const d = data();
  if (!name || !classOf(classId)) return null;
  const hit = Object.entries(d.items).find(([, i]) => i.c === classId && !i.gone && same(i.name, name));
  if (hit) {
    if (hit[1].off) { delete hit[1].off; hit[1].u = Date.now(); save(); }
    return hit[0];
  }
  const id = newId();
  d.items[id] = { c: classId, name, col: Object.values(d.items).filter(i => !i.gone).length % TAG_COLORS.length, u: Date.now() };
  save();
  return id;
}

function change(entry, fn) {
  if (!entry) return;
  fn(entry);
  entry.u = Date.now();
  save();
}
export const renameClass = (id, name) => clean(name) && change(data().classes[id], c => { c.name = clean(name); });
export const archiveClass = id => change(data().classes[id], c => { c.off = true; });
export const renameTag = (id, name) => clean(name) && change(data().items[id], i => { i.name = clean(name); });
export const archiveTag = id => change(data().items[id], i => { i.off = true; });
export const colorTag = (id, col) => change(data().items[id], i => { i.col = col; });
export const restoreClass = id => change(data().classes[id], c => { delete c.off; });
export const restoreTag = id => change(data().items[id], i => { delete i.off; });

// Ids of all tags that some block carries.
export function usedTags() {
  const out = new Set();
  for (const day of Object.values(store.state.days)) for (const b of day.blocks) for (const id of Object.values(b.t || {})) out.add(id);
  return out;
}
export const classUsed = (classId, used = usedTags()) => tagsIn(classId, { archived: 'all' }).some(x => used.has(x.id));

// Only for entries no block uses; anything else is archived instead.
export function deleteTag(id) {
  const d = data(), tag = d.items[id];
  if (!tag || tag.gone || usedTags().has(id)) return false;
  d.items[id] = { c: tag.c, gone: true, u: Date.now() };
  save();
  return true;
}
export function deleteClass(id) {
  const d = data(), used = usedTags();
  if (!classOf(id) || classUsed(id, used)) return false;
  const now = Date.now();
  for (const [tid, tag] of Object.entries(d.items)) if (tag.c === id && !tag.gone) d.items[tid] = { c: id, gone: true, u: now };
  d.classes[id] = { gone: true, u: now };
  save();
  return true;
}

function latestBlock() {
  let last = null;
  for (const ds in store.state.days) if (store.state.days[ds].blocks.length && (last === null || ds > last)) last = ds;
  return last ? store.state.days[last].blocks.at(-1) : null;
}

const readNext = () => { try { return JSON.parse(localStorage.getItem(NEXT_KEY)) || {}; } catch { return {}; } };

// Tags for the next clock-in: what was chosen while clocked out, otherwise the same as the latest block.
export function nextTags() {
  const picked = { ...(latestBlock()?.t || {}), ...readNext() }, out = {};
  for (const c of tagClasses()) {
    const tag = tagOf(picked[c.id]);
    if (tag && tag.c === c.id && !tag.off) out[c.id] = picked[c.id];
  }
  return out;
}
export const setNextTag = (classId, tagId) => localStorage.setItem(NEXT_KEY, JSON.stringify({ ...readNext(), [classId]: tagId || '' }));
export const clearNextTags = () => localStorage.removeItem(NEXT_KEY);

// Sets or removes one tag of a block, keeping `t` absent when it is empty.
export function setBlockTag(block, classId, tagId) {
  const t = { ...(block.t || {}) };
  if (tagId) t[classId] = tagId; else delete t[classId];
  if (Object.keys(t).length) block.t = t; else delete block.t;
}

// Day on which each tag was last used.
export function lastUsed() {
  const out = {};
  for (const [ds, day] of Object.entries(store.state.days)) {
    for (const b of day.blocks) for (const id of Object.values(b.t || {})) if (!out[id] || ds > out[id]) out[id] = ds;
  }
  return out;
}

export function recentTags(classId, n = 5, used = lastUsed()) {
  return tagsIn(classId).filter(x => used[x.id]).sort((a, b) => used[b.id].localeCompare(used[a.id])).slice(0, n);
}

export const findTags = (classId, query) => {
  const q = clean(query).toLocaleLowerCase();
  return tagsIn(classId).filter(x => x.name.toLocaleLowerCase().includes(q));
};
export const exactTag = (classId, query) => tagsIn(classId).find(x => same(x.name, clean(query))) || null;
