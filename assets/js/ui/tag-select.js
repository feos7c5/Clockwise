import { tagClasses, tagsIn, tagOf, tagColor, addTag } from '../core/tags.js';
import { t } from '../i18n/index.js';
import { $$, esc } from './dom.js';

const NEW = '+';

// One native picker per class: no tag, the tags of the class, and "new". `current` is { classId: tagId }.
export function tagSelects(current = {}, attrs = '') {
  return tagClasses().map(c => {
    const chosen = tagOf(current[c.id]);
    const tags = tagsIn(c.id);
    if (chosen && chosen.c === c.id && !tags.some(x => x.id === current[c.id])) tags.push({ id: current[c.id], ...chosen });
    const options = tags.map(x => `<option value="${x.id}" ${x.id === current[c.id] ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
    return `<label class="tag-pick ${chosen ? 'set' : ''}"><i class="tag-dot" style="background:${chosen ? tagColor(chosen) : 'var(--line)'}"></i>
      <select data-class="${c.id}" ${attrs} aria-label="${esc(c.name)}">
        <option value="">${esc(c.name)}</option>${options}<option value="${NEW}">${t('tags.newTag')}</option>
      </select></label>`;
  }).join('');
}

// Calls onPick(classId, tagId, select) after a choice; "new" asks for a name and creates the tag first.
export function bindTagSelects(root, onPick) {
  $$('select[data-class]', root).forEach(sel => (sel.onchange = () => {
    let id = sel.value;
    if (id === NEW) {
      id = addTag(sel.dataset.class, prompt(t('tags.newTagPrompt')) || '');
      if (!id) { sel.value = sel.dataset.prev || ''; return; }
    }
    onPick(sel.dataset.class, id, sel);
  }));
  $$('select[data-class]', root).forEach(sel => { sel.dataset.prev = sel.value; });
}

// "● Customer A · ● Meeting" for a block, empty without tags.
export function tagLabels(block) {
  return tagClasses().map(c => tagOf(block.t?.[c.id])).filter(Boolean)
    .map(tag => `<span class="tag-label"><i class="tag-dot" style="background:${tagColor(tag)}"></i>${esc(tag.name)}</span>`).join('');
}
