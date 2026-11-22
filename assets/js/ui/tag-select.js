import { tagClasses, tagsIn, tagOf, tagColor, recentTags, findTags, exactTag, addTag } from '../core/tags.js';
import { t } from '../i18n/index.js';
import { $, $$, esc } from './dom.js';
import { ICON } from './icons.js';

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

export function bindTagChips(root, current, onPick) {
  $$('.tagchip.pick', root).forEach(b => (b.onclick = () => {
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
    el.addEventListener('click', e => { if (e.target === el) el.close(); });
    document.body.append(el);
  }
  return el;
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

  el.innerHTML = `<div class="sheet-head"><h3>${esc(cls?.name || '')}</h3>
      <button type="button" class="btn btn-icon btn-ghost" data-close aria-label="${t('common.close')}">${ICON.close}</button></div>
    <label class="sheet-search">${ICON.search}<input type="text" id="pickQuery" placeholder="${t('tags.searchOrCreate')}" autocomplete="off" enterkeyhint="done"></label>
    <div class="sheet-list" id="pickList">${list('')}</div>`;

  const input = $('#pickQuery', el), box = $('#pickList', el);
  const bind = () => {
    $$('[data-pick]', box).forEach(b => (b.onclick = () => pick(b.dataset.pick)));
    $('[data-create]', box)?.addEventListener('click', () => pick(addTag(classId, input.value)));
  };
  input.oninput = () => { box.innerHTML = list(input.value); bind(); };
  input.onkeydown = e => {
    if (e.key !== 'Enter' || !input.value.trim()) return;
    e.preventDefault();
    const hits = findTags(classId, input.value);
    pick(exactTag(classId, input.value)?.id || (hits.length === 1 ? hits[0].id : addTag(classId, input.value)));
  };
  $('[data-close]', el).onclick = () => el.close();
  bind();
  el.showModal();
  if (tagsIn(classId).length === 0) input.focus();
}

// "● Customer A · ● Meeting" for a block, empty without tags.
export function tagLabels(block) {
  return tagClasses().map(c => tagOf(block.t?.[c.id])).filter(Boolean)
    .map(tag => `<span class="tag-label"><i class="tag-dot" style="background:${tagColor(tag)}"></i>${esc(tag.name)}</span>`).join('');
}
