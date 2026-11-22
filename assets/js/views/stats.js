import { iso, parseISO, fmtDur } from '../core/time.js';
import { tagTotals } from '../core/calc.js';
import { store } from '../core/store.js';
import { tagClasses, hasTagClasses, tagOf, tagColor } from '../core/tags.js';
import { tagManager, tagIntro } from './tag-manager.js';
import { now } from '../core/session.js';
import { t, weekdayShort, monthName } from '../i18n/index.js';
import { $, $$, esc, cardHead } from '../ui/dom.js';
import { ICON } from '../ui/icons.js';
import { nav } from '../ui/nav.js';
import { showDialog, dialogHead } from '../ui/dialog.js';
import { exportStatsPdf } from '../features/report.js';

export function statsPeriod() {
  if (nav.scope === 'year') return [`${nav.year}-01-01`, `${nav.year}-12-31`];
  const { y, m } = nav.month;
  return [iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0))];
}

// Rows of one class, largest first, "not assigned" last.
export function classRows(classId, minutes) {
  return Object.entries(minutes).filter(([, min]) => Math.round(min) > 0)
    .map(([id, min]) => ({ id, min, tag: tagOf(id), name: id ? tagOf(id)?.name || '?' : t('tags.unassigned') }))
    .sort((a, b) => (!a.id - !b.id) || b.min - a.min);
}

const SHOWN = 8;

function tagRow(c, r, total) {
  const pct = total ? (r.min / total) * 100 : 0, color = r.id ? tagColor(r.tag) : 'var(--muted)';
  const el = r.id ? 'button' : 'div';
  return `<${el} class="tagrow ${r.id ? '' : 'none'}" data-class="${c.id}" data-tag="${r.id}">
    <i class="tag-dot" style="background:${color}"></i><span class="tag-name">${esc(r.name)}</span>
    <span class="tag-val">${fmtDur(Math.round(r.min))} h</span><span class="tag-pct">${Math.round(pct)} %</span>
    <span class="tag-bar"><i style="width:${pct}%;background:${color}"></i></span></${el}>`;
}

// The largest entries one by one, all others folded into one row that opens in place.
function classCard(c, minutes, total) {
  const rows = classRows(c.id, minutes), named = rows.filter(r => r.id), none = rows.find(r => !r.id);
  const top = named.slice(0, SHOWN), rest = named.slice(SHOWN);
  const restMin = rest.reduce((sum, r) => sum + r.min, 0);
  const more = rest.length ? `<button class="tagrow more" data-more>
      <span class="tag-more">${ICON.plus}</span><span class="tag-name">${t('tags.more', { n: rest.length })}</span>
      <span class="tag-val">${fmtDur(Math.round(restMin))} h</span><span class="tag-pct">${Math.round(total ? (restMin / total) * 100 : 0)} %</span></button>
    <div class="more-rows" hidden>${rest.map(r => tagRow(c, r, total)).join('')}</div>` : '';
  const body = [...top.map(r => tagRow(c, r, total)), more, none ? tagRow(c, none, total) : ''].join('');
  return `<section class="card">${cardHead(esc(c.name), `<span class="muted">${fmtDur(Math.round(total))} h</span>`)}
    ${body || `<div class="empty-text">${t('tags.noTimes')}</div>`}</section>`;
}

// One entry in detail: how its time splits over the other classes (e.g. a project into activities), then
// its days by month.
function openDetail(classId, tagId, days) {
  const [from, to] = statsPeriod(), tag = tagOf(tagId);
  const split = tagTotals(store.state, from, to, now(), { classId, tagId });
  const splits = tagClasses().filter(c => c.id !== classId).map(c => {
    const rows = classRows(c.id, split.byClass[c.id] || {});
    if (!rows.some(r => r.id)) return '';
    return `<div class="split"><div class="pick-label">${esc(c.name)}</div>${rows.map(r => {
      const pct = split.total ? (r.min / split.total) * 100 : 0, color = r.id ? tagColor(r.tag) : 'var(--muted)';
      return `<div class="tagrow ${r.id ? '' : 'none'}"><i class="tag-dot" style="background:${color}"></i><span class="tag-name">${esc(r.name)}</span>
        <span class="tag-val">${fmtDur(Math.round(r.min))} h</span><span class="tag-pct">${Math.round(pct)} %</span>
        <span class="tag-bar"><i style="width:${pct}%;background:${color}"></i></span></div>`;
    }).join('')}</div>`;
  }).join('');

  const byMonth = new Map();
  for (const [ds, min] of Object.entries(days).sort(([x], [y]) => x.localeCompare(y))) {
    const key = ds.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push([ds, min]);
  }
  const groups = [...byMonth].map(([key, list]) => {
    const sum = list.reduce((acc, [, min]) => acc + min, 0), [y, m] = key.split('-').map(Number);
    const rows = list.map(([ds, min]) => {
      const d = parseISO(ds);
      return `<li><span><span class="muted">${weekdayShort(d.getDay())}</span> ${d.getDate()}.</span><span>${fmtDur(Math.round(min))} h</span></li>`;
    }).join('');
    return `<div class="dayfold"><div class="dayfold-head"><b>${monthName(m - 1)} ${y}</b><span>${fmtDur(Math.round(sum))} h</span></div>
      <ul class="list compact">${rows}</ul></div>`;
  }).join('');
  const title = `<i class="tag-dot" style="background:${tagColor(tag)}"></i> ${esc(tag?.name || '')} <span class="muted">${fmtDur(Math.round(split.total))} h</span>`;
  showDialog(`${dialogHead(title)}${splits}${splits ? `<div class="pick-label">${t('tags.days')}</div>` : ''}${groups}`, undefined, { light: true });
}

export function renderStats(view) {
  if (!hasTagClasses()) {
    view.innerHTML = `<div class="stack">${tagIntro.html()}</div>`;
    return tagIntro.bind(view);
  }
  const [from, to] = statsPeriod();
  const { byClass, days, total } = tagTotals(store.state, from, to, now());
  view.innerHTML = `<div class="stack">
    ${tagClasses().map(c => classCard(c, byClass[c.id] || {}, total)).join('')}
    <div class="btn-row"><button class="btn btn-raised" id="printStats" ${total ? '' : 'disabled'}>${ICON.print}${t('month.print')}</button></div>
    <p class="hint">${t('tags.statsHint')}</p>
    ${tagManager.html()}
  </div>`;
  tagManager.bind(view);
  $$('[data-more]', view).forEach(b => (b.onclick = () => { b.nextElementSibling.hidden = false; b.remove(); }));
  $$('button.tagrow[data-tag]', view).forEach(b => (b.onclick = () => openDetail(b.dataset.class, b.dataset.tag, days[b.dataset.class]?.[b.dataset.tag] || {})));
  $('#printStats', view).onclick = () => exportStatsPdf(from, to);
}
