import { tagClasses, tagsIn, tagOf, tagColor, TAG_COLORS, addClass, renameClass, archiveClass, addTag, renameTag, archiveTag, colorTag, lastUsed } from '../core/tags.js';
import { todayStr } from '../core/session.js';
import { iso, addDays, parseISO } from '../core/time.js';
import { t } from '../i18n/index.js';
import { $, $$, esc, cardHead } from '../ui/dom.js';
import { ICON } from '../ui/icons.js';
import { rerender } from '../ui/nav.js';
import { showDialog, dialogHead, closeDialog } from '../ui/dialog.js';

const ACTIVE_DAYS = 90;
const chip = x => `<button type="button" class="tagchip" data-tag="${x.id}"><i class="tag-dot" style="background:${tagColor(x)}"></i>${esc(x.name)}</button>`;

// Entries used (or created) in the last three months are shown; older ones wait behind "more", with a search.
function classBlock(c, used) {
  const since = iso(addDays(parseISO(todayStr()), -ACTIVE_DAYS)), recentlyMade = Date.now() - ACTIVE_DAYS * 86_400_000;
  const all = tagsIn(c.id);
  const active = all.filter(x => (used[x.id] ? used[x.id] >= since : (x.u || 0) >= recentlyMade));
  const older = all.filter(x => !active.includes(x));
  const more = older.length ? `<button type="button" class="tagchip add" data-older="${c.id}">${t('tags.showOlder', { n: older.length })}</button>` : '';
  return `<div class="tagclass" data-class="${c.id}">
    <div class="tagclass-head"><input type="text" data-cname="${c.id}" value="${esc(c.name)}" maxlength="40" aria-label="${t('tags.className')}">
      <button class="btn btn-icon btn-ghost" data-cdel="${c.id}" aria-label="${t('tags.removeClass')}">${ICON.close}</button></div>
    <div class="toggles">${active.map(chip).join('')}<button type="button" class="tagchip add" data-addtag="${c.id}">${ICON.plus}${t('tags.addTag')}</button>${more}</div>
    ${older.length ? `<div class="older" hidden>
      <label class="sheet-search">${ICON.search}<input type="text" data-filter placeholder="${t('tags.search')}" autocomplete="off"></label>
      <div class="toggles">${older.map(chip).join('')}</div></div>` : ''}</div>`;
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
  const draw = () => {
    const tag = tagOf(id);
    const swatches = TAG_COLORS.map((col, i) => `<button type="button" class="swatch ${i === tag.col % TAG_COLORS.length ? 'on' : ''}" data-col="${i}" style="background:${col}" aria-label="${t('tags.color')} ${i + 1}"></button>`).join('');
    showDialog(`${dialogHead(t('tags.editTag'))}
      <label class="field"><span>${t('tags.name')}</span><input type="text" id="tagName" value="${esc(tag.name)}" maxlength="40"></label>
      <div class="field dlg-section"><span>${t('tags.color')}</span><div class="swatches">${swatches}</div></div>
      <div class="dlg-foot">
        <button type="button" class="btn btn-ghost danger" id="tagArchive">${t('tags.archive')}</button>
        <span class="spacer"></span>
        <button type="button" class="btn btn-primary" id="tagOk">${t('common.save')}</button>
      </div>`, dlg => {
      $$('[data-col]', dlg).forEach(b => (b.onclick = () => { colorTag(id, +b.dataset.col); draw(); }));
      $('#tagArchive', dlg).onclick = () => { if (confirm(t('tags.confirmArchive'))) { archiveTag(id); closeDialog(); rerender(); } };
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
      <p class="hint">${t('tags.hint')}</p></section>`;
  },
  bind: view => {
    $('#addClass', view).onclick = e => inlineAdd(e.currentTarget, t('tags.newClassPrompt'), addClass);
    $$('[data-cname]', view).forEach(inp => (inp.onchange = () => { renameClass(inp.dataset.cname, inp.value); rerender(); }));
    $$('[data-cdel]', view).forEach(b => (b.onclick = () => { if (confirm(t('tags.confirmRemoveClass'))) { archiveClass(b.dataset.cdel); rerender(); } }));
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
