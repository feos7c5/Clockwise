import { tagClasses, tagsIn, tagOf, tagColor, recentTags, findTags, exactTag, addTag } from '../core/tags.js';
import { t } from '../i18n/index.js';
import { $, $$, esc } from './dom.js';
import { ICON } from './icons.js';
import { lockScroll, unlockScroll } from './dialog.js';

// Assigning categories: one chip per class shows the current entry ("+ Project" when empty). A tap opens a
// sheet with the recently used entries on top and a search field that also creates new entries.

export function tagChips(current = {}) {
  return tagClasses().map(c => {
    const tag = tagOf(current[c.id]);
    return tag
      ? `<button type="button" class="tagchip pick" data-class="${c.id}" aria-label="${esc(c.name)}: ${esc(tag.name)}"><i class="tag-dot" style="background:${tagColor(tag)}"></i>${esc(tag.name)}</button>`
      : `<button type="button" class="tagchip pick empty" data-class="${c.id}">${ICON.plus}${esc(c.name)}</button>`;
  }).join('');
}

// Today: one clear row per class – colour dot, class name, entry and, while clocked in, since when this part runs.
export function tagPanel(current = {}, since = null) {
  return `<div class="assign">${tagClasses().map(c => {
    const tag = tagOf(current[c.id]);
    return `<button type="button" class="assign-row pick ${tag ? '' : 'empty'}" data-class="${c.id}">
      <i class="tag-dot ${tag ? '' : 'hollow'}"${tag ? ` style="background:${tagColor(tag)}"` : ''}></i>
      <span class="assign-text"><small>${esc(c.name)}${tag && since ? ` · ${t('tags.since', { time: since(c.id) })}` : ''}</small>
        <b>${tag ? esc(tag.name) : t('tags.choose')}</b></span>${ICON.right}</button>`;
  }).join('')}</div>`;
}

export function bindTagChips(root, current, onPick) {
  $$('.pick[data-class]', root).forEach(b => (b.onclick = () => {
    const classId = b.dataset.class;
    openTagPicker(classId, current(b)[classId] || '', tagId => onPick(classId, tagId, b));
  }));
}

function sheet() {
  let el = $('#sheet');
  if (!el) {
    el = document.createElement('dialog');
    el.id = 'sheet';
    el.className = 'sheet';
    el.tabIndex = -1;
    el.addEventListener('click', e => { if (e.target === el) el.close(); });
    document.body.append(el);
  }
  return el;
}

// Pulling the sheet down by its top edge closes it.
function swipeToClose(el, handle) {
  let y0 = null, dy = 0;
  handle.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; dy = 0; el.style.transition = 'none'; }, { passive: true });
  handle.addEventListener('touchmove', e => {
    if (y0 === null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    el.style.transform = dy ? `translateY(${dy}px)` : '';
  }, { passive: true });
  handle.addEventListener('touchend', () => {
    el.style.transition = '';
    el.style.transform = '';
    if (y0 !== null && dy > 80) el.close();
    y0 = null;
  });
}

// Opens the sheet with the page behind it locked, and keeps it above the on-screen keyboard (iOS shrinks only
// the visible area, so a sheet at the bottom would otherwise sit under the keyboard).
function openSheet(el) {
  const vv = window.visualViewport;
  const fit = () => {
    const hidden = vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0;
    el.style.marginBottom = hidden ? `${hidden}px` : '';
    el.style.maxHeight = hidden ? `${Math.round(vv.height * .9)}px` : '';
  };
  vv?.addEventListener('resize', fit);
  vv?.addEventListener('scroll', fit);
  el.addEventListener('close', () => {
    vv?.removeEventListener('resize', fit);
    vv?.removeEventListener('scroll', fit);
    Object.assign(el.style, { marginBottom: '', maxHeight: '', transform: '' });
    unlockScroll();
  }, { once: true });
  lockScroll();
  el.showModal();
  el.focus({ preventScroll: true });
}

const row = (tag, current) => `<button type="button" class="pickrow ${tag.id === current ? 'on' : ''}" data-pick="${tag.id}">
  <i class="tag-dot" style="background:${tagColor(tag)}"></i><span>${esc(tag.name)}</span>${tag.id === current ? ICON.check : ''}</button>`;

export function openTagPicker(classId, current, onPick) {
  const el = sheet(), cls = tagClasses().find(c => c.id === classId);
  const pick = id => { el.close(); onPick(id); };

  const list = query => {
    const q = query.trim();
    if (q) {
      const hits = findTags(classId, q).map(x => row(x, current)).join('');
      const create = exactTag(classId, q) ? '' : `<button type="button" class="pickrow create" data-create>${ICON.plus}<span>${t('tags.create', { name: esc(q) })}</span></button>`;
      return hits + create;
    }
    const recent = recentTags(classId);
    const rest = tagsIn(classId).filter(x => !recent.some(r => r.id === x.id));
    return [
      current ? `<button type="button" class="pickrow none" data-pick="">${ICON.close}<span>${t('tags.clear')}</span></button>` : '',
      recent.length ? `<div class="pick-label">${t('tags.recent')}</div>${recent.map(x => row(x, current)).join('')}` : '',
      rest.length ? `<div class="pick-label">${recent.length ? t('tags.all') : ''}</div>${rest.map(x => row(x, current)).join('')}` : '',
    ].join('');
  };

  el.innerHTML = `<div class="sheet-head"><i class="sheet-grab"></i><h3>${esc(cls?.name || '')}</h3>
      <button type="button" class="btn btn-icon btn-ghost" data-close aria-label="${t('common.close')}">${ICON.close}</button></div>
    <label class="sheet-search">${ICON.search}<input type="text" id="pickQuery" placeholder="${t('tags.searchOrCreate')}" autocomplete="off" enterkeyhint="done"></label>
    <div class="sheet-list" id="pickList">${list('')}</div>`;

  const input = $('#pickQuery', el), box = $('#pickList', el);
  const bind = () => {
    $$('[data-pick]', box).forEach(b => (b.onclick = () => pick(b.dataset.pick)));
    $('[data-create]', box)?.addEventListener('click', () => pick(addTag(classId, input.value)));
  };
  input.oninput = () => { box.innerHTML = list(input.value); box.scrollTop = 0; bind(); };
  input.onkeydown = e => {
    if (e.key !== 'Enter' || !input.value.trim()) return;
    e.preventDefault();
    const hits = findTags(classId, input.value);
    pick(exactTag(classId, input.value)?.id || (hits.length === 1 ? hits[0].id : addTag(classId, input.value)));
  };
  $('[data-close]', el).onclick = () => el.close();
  swipeToClose(el, $('.sheet-head', el));
  bind();
  openSheet(el);
  if (tagsIn(classId).length === 0) input.focus();
}

// "● Customer A · ● Meeting" for a block, empty without tags.
export function tagLabels(block) {
  return tagClasses().map(c => tagOf(block.t?.[c.id])).filter(Boolean)
    .map(tag => `<span class="tag-label"><i class="tag-dot" style="background:${tagColor(tag)}"></i>${esc(tag.name)}</span>`).join('');
}
