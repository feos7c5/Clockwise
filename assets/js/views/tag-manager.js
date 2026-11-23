import {
  tagClasses, tagsIn, tagOf, classOf, tagColor, TAG_COLORS, addClass, renameClass, archiveClass, restoreClass, deleteClass, classUsed,
  addTag, renameTag, archiveTag, restoreTag, deleteTag, colorTag, lastUsed, usedTags,
} from '../core/tags.js';
import { todayStr } from '../core/session.js';
import { iso, addDays, parseISO } from '../core/time.js';
import { t } from '../i18n/index.js';
import { $, $$, esc, cardHead } from '../ui/dom.js';
import { ICON } from '../ui/icons.js';
import { rerender } from '../ui/nav.js';
import { showDialog, dialogHead, closeDialog } from '../ui/dialog.js';

const ACTIVE_DAYS = 90, SHOWN = 12;
const chip = x => `<button type="button" class="tagchip" data-tag="${x.id}"><i class="tag-dot" style="background:${tagColor(x)}"></i>${esc(x.name)}</button>`;

// At most 12 entries used (or created) in the last three months are shown, newest use first; all others wait
// behind "more", with a search – so even hundreds of projects stay a short list.
function classBlock(c, used) {
  const since = iso(addDays(parseISO(todayStr()), -ACTIVE_DAYS)), recentlyMade = Date.now() - ACTIVE_DAYS * 86_400_000;
  const all = tagsIn(c.id);
  const fresh = x => (used[x.id] ? used[x.id] >= since : (x.u || 0) >= recentlyMade);
  const active = all.filter(fresh).sort((a, b) => (used[b.id] || '9').localeCompare(used[a.id] || '9')).slice(0, SHOWN);
  const older = all.filter(x => !active.includes(x));
  const more = older.length ? `<button type="button" class="tagchip add" data-older="${c.id}">${t('tags.showOlder', { n: older.length })}</button>` : '';
  return `<div class="tagclass" data-class="${c.id}">
    <button type="button" class="tagclass-head" data-cedit="${c.id}"><span>${esc(c.name)}</span>${ICON.edit}</button>
    <div class="toggles">${active.map(chip).join('')}<button type="button" class="tagchip add" data-addtag="${c.id}">${ICON.plus}${t('tags.addTag')}</button>${more}</div>
    ${older.length ? `<div class="older" hidden>
      <label class="sheet-search">${ICON.search}<input type="text" data-filter placeholder="${t('tags.search')}" autocomplete="off"></label>
      <div class="toggles">${older.map(chip).join('')}</div></div>` : ''}</div>`;
}

// Archived classes and entries, out of the way but always restorable.
function archive() {
  const classes = tagClasses({ archived: true });
  const groups = tagClasses().map(c => ({ c, tags: tagsIn(c.id, { archived: true }) })).filter(g => g.tags.length);
  const n = classes.length + groups.reduce((sum, g) => sum + g.tags.length, 0);
  if (!n) return '';
  return `<div class="tag-archive">
    <button type="button" class="tagchip add" data-archive aria-expanded="false">${t('tags.archived', { n })}${ICON.right}</button>
    <div class="archive-list" hidden>
      ${classes.length ? `<div class="pick-label">${t('tags.classes')}</div><div class="toggles">${classes.map(c =>
        `<button type="button" class="tagchip muted" data-cedit="${c.id}">${esc(c.name)}</button>`).join('')}</div>` : ''}
      ${groups.map(g => `<div class="pick-label">${esc(g.c.name)}</div><div class="toggles">${g.tags.map(x =>
        `<button type="button" class="tagchip muted" data-tag="${x.id}"><i class="tag-dot" style="background:${tagColor(x)}"></i>${esc(x.name)}</button>`).join('')}</div>`).join('')}
    </div></div>`;
}

// A destructive button asks once more on the button itself instead of in a popup.
function confirmTap(button, question, action) {
  let armed = false, timer = 0;
  const label = button.innerHTML;
  button.onclick = () => {
    if (armed) { clearTimeout(timer); action(); return; }
    armed = true;
    button.classList.add('armed');
    button.textContent = question;
    timer = setTimeout(() => { armed = false; button.classList.remove('armed'); button.innerHTML = label; }, 4000);
  };
}

// Never used: delete. Used: archive (and restore from the archive).
function removeButtons(archived, used) {
  if (archived) {
    return `<button type="button" class="btn btn-ghost" id="restore">${t('tags.restore')}</button>
      ${used ? '' : `<button type="button" class="btn btn-ghost danger" id="remove" data-mode="delete">${t('tags.delete')}</button>`}`;
  }
  return used
    ? `<button type="button" class="btn btn-ghost danger" id="remove" data-mode="archive">${t('tags.archive')}</button>`
    : `<button type="button" class="btn btn-ghost danger" id="remove" data-mode="delete">${t('tags.delete')}</button>`;
}

function bindRemove(dlg, { kind, id, archive: doArchive, restore, remove }) {
  const done = () => { closeDialog(); rerender(); };
  $('#restore', dlg)?.addEventListener('click', () => { restore(id); done(); });
  const btn = $('#remove', dlg);
  if (!btn) return;
  const del = btn.dataset.mode === 'delete';
  confirmTap(btn, t(del ? 'tags.confirmDelete' : 'tags.confirmArchiveShort'), () => { (del ? remove : doArchive)(id); done(); });
  $('#removeHint', dlg).textContent = t(del ? `tags.deleteHint.${kind}` : `tags.archiveHint.${kind}`);
}

function openClassDialog(id) {
  const c = classOf(id), archived = Boolean(c.off), used = classUsed(id);
  showDialog(`${dialogHead(t('tags.editClass'))}
    <label class="field"><span>${t('tags.name')}</span><input type="text" id="className" value="${esc(c.name)}" maxlength="40"></label>
    <p class="hint" id="removeHint"></p>
    <div class="dlg-foot">${removeButtons(archived, used)}<span class="spacer"></span>
      <button type="button" class="btn btn-primary" id="classOk">${t('common.save')}</button></div>`, dlg => {
    bindRemove(dlg, { kind: 'class', id, archive: archiveClass, restore: restoreClass, remove: deleteClass });
    if (archived) $('#removeHint', dlg).textContent = t('tags.archivedHint.class');
    $('#classOk', dlg).onclick = () => { renameClass(id, $('#className', dlg).value); closeDialog(); rerender(); };
  });
}

// A button that turns into a text field; Enter (or leaving the field) creates the entry.
function inlineAdd(button, placeholder, create) {
  const input = document.createElement('input');
  Object.assign(input, { type: 'text', placeholder, maxLength: 40, className: `inline-add ${button.classList.contains('btn-block') ? 'block' : ''}`, enterKeyHint: 'done' });
  button.replaceWith(input);
  input.focus();
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    if (input.value.trim()) create(input.value);
    rerender();
  };
  input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); finish(); } if (e.key === 'Escape') { input.value = ''; finish(); } };
  input.onblur = finish;
}

function openTagDialog(id) {
  const used = usedTags().has(id);
  const draw = () => {
    const tag = tagOf(id), archived = Boolean(tag.off);
    const swatches = TAG_COLORS.map((col, i) => `<button type="button" class="swatch ${i === tag.col % TAG_COLORS.length ? 'on' : ''}" data-col="${i}" style="background:${col}" aria-label="${t('tags.color')} ${i + 1}"></button>`).join('');
    showDialog(`${dialogHead(t('tags.editTag'))}
      <label class="field"><span>${t('tags.name')}</span><input type="text" id="tagName" value="${esc(tag.name)}" maxlength="40"></label>
      <div class="field dlg-section"><span>${t('tags.color')}</span><div class="swatches">${swatches}</div></div>
      <p class="hint" id="removeHint"></p>
      <div class="dlg-foot">${removeButtons(archived, used)}<span class="spacer"></span>
        <button type="button" class="btn btn-primary" id="tagOk">${t('common.save')}</button></div>`, dlg => {
      $$('[data-col]', dlg).forEach(b => (b.onclick = () => { renameTag(id, $('#tagName', dlg).value); colorTag(id, +b.dataset.col); draw(); }));
      bindRemove(dlg, { kind: 'tag', id, archive: archiveTag, restore: restoreTag, remove: deleteTag });
      if (archived) $('#removeHint', dlg).textContent = t('tags.archivedHint.tag');
      $('#tagOk', dlg).onclick = () => { renameTag(id, $('#tagName', dlg).value); closeDialog(); rerender(); };
    });
  };
  draw();
}

// Without any class: what this is for and how to start.
export const tagIntro = {
  html: () => `<section class="card"><h2 class="intro-title">${t('tags.introTitle')}</h2>
    <p class="hint">${t('tags.introText')}</p>
    <button class="btn btn-primary btn-block section-actions" id="addClass">${ICON.plus}${t('tags.addFirstClass')}</button></section>`,
  bind: view => { $('#addClass', view).onclick = e => inlineAdd(e.currentTarget, t('tags.newClassPrompt'), addClass); },
};

export const tagManager = {
  html: () => {
    const used = lastUsed();
    return `<section class="card">
      ${cardHead(t('tags.title'), `<button class="btn btn-sm btn-ghost accent" id="addClass">${ICON.plus}${t('tags.addClass')}</button>`)}
      ${tagClasses().map(c => classBlock(c, used)).join('')}
      ${archive()}
      <p class="hint">${t('tags.hint')}</p></section>`;
  },
  bind: view => {
    $('#addClass', view).onclick = e => inlineAdd(e.currentTarget, t('tags.newClassPrompt'), addClass);
    $$('[data-cedit]', view).forEach(b => (b.onclick = () => openClassDialog(b.dataset.cedit)));
    $('[data-archive]', view)?.addEventListener('click', e => {
      const list = e.currentTarget.nextElementSibling;
      list.hidden = !list.hidden;
      e.currentTarget.setAttribute('aria-expanded', String(!list.hidden));
    });
    $$('[data-addtag]', view).forEach(b => (b.onclick = () => inlineAdd(b, t('tags.newTagPrompt'), name => addTag(b.dataset.addtag, name))));
    $$('[data-older]', view).forEach(b => (b.onclick = () => {
      const box = b.closest('.tagclass').querySelector('.older');
      box.hidden = false;
      b.remove();
      $('[data-filter]', box).focus();
    }));
    $$('[data-filter]', view).forEach(inp => (inp.oninput = () => {
      const q = inp.value.trim().toLocaleLowerCase();
      $$('.tagchip[data-tag]', inp.closest('.older')).forEach(c => { c.hidden = Boolean(q) && !c.textContent.toLocaleLowerCase().includes(q); });
    }));
    $$('.tagchip[data-tag]', view).forEach(b => (b.onclick = () => openTagDialog(b.dataset.tag)));
  },
};
