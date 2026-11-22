import { tagClasses, tagsIn, tagOf, tagColor, TAG_COLORS, addClass, renameClass, archiveClass, addTag, renameTag, archiveTag, colorTag } from '../../core/tags.js';
import { t } from '../../i18n/index.js';
import { $, $$, esc, cardHead } from '../../ui/dom.js';
import { ICON } from '../../ui/icons.js';
import { rerender } from '../../ui/nav.js';
import { showDialog, dialogHead, closeDialog } from '../../ui/dialog.js';

function classBlock(c) {
  const chips = tagsIn(c.id).map(x => `<button class="tagchip" data-tag="${x.id}"><i class="tag-dot" style="background:${tagColor(x)}"></i>${esc(x.name)}</button>`).join('');
  return `<div class="tagclass">
    <div class="tagclass-head"><input type="text" data-cname="${c.id}" value="${esc(c.name)}" maxlength="40" aria-label="${t('tags.className')}">
      <button class="btn btn-icon btn-ghost" data-cdel="${c.id}" aria-label="${t('tags.removeClass')}">${ICON.close}</button></div>
    <div class="toggles">${chips}<button class="tagchip add" data-addtag="${c.id}">${ICON.plus}${t('tags.addTag')}</button></div></div>`;
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

export const tags = {
  html: () => `<section class="card">
    ${cardHead(t('tags.title'), `<button class="btn btn-sm btn-ghost accent" id="addClass">${ICON.plus}${t('tags.addClass')}</button>`)}
    ${tagClasses().map(classBlock).join('')}
    <p class="hint ${tagClasses().length ? '' : 'flush'}">${t('tags.hint')}</p></section>`,
  bind: view => {
    $('#addClass', view).onclick = () => { if (addClass(prompt(t('tags.newClassPrompt')) || '')) rerender(); };
    $$('[data-cname]', view).forEach(inp => (inp.onchange = () => { renameClass(inp.dataset.cname, inp.value); rerender(); }));
    $$('[data-cdel]', view).forEach(b => (b.onclick = () => { if (confirm(t('tags.confirmRemoveClass'))) { archiveClass(b.dataset.cdel); rerender(); } }));
    $$('[data-addtag]', view).forEach(b => (b.onclick = () => { if (addTag(b.dataset.addtag, prompt(t('tags.newTagPrompt')) || '')) rerender(); }));
    $$('.tagchip[data-tag]', view).forEach(b => (b.onclick = () => openTagDialog(b.dataset.tag)));
  },
};
