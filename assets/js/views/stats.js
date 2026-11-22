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

function classCard(c, minutes, total) {
  const rows = classRows(c.id, minutes).map(r => {
    const pct = total ? (r.min / total) * 100 : 0, color = r.id ? tagColor(r.tag) : 'var(--muted)';
    const tag = r.id ? 'button' : 'div';
    return `<${tag} class="tagrow ${r.id ? '' : 'none'}" data-class="${c.id}" data-tag="${r.id}">
      <i class="tag-dot" style="background:${color}"></i><span class="tag-name">${esc(r.name)}</span>
      <span class="tag-val">${fmtDur(Math.round(r.min))} h</span><span class="tag-pct">${Math.round(pct)} %</span>
      <span class="tag-bar"><i style="width:${pct}%;background:${color}"></i></span></${tag}>`;
  }).join('');
  return `<section class="card">${cardHead(esc(c.name), `<span class="muted">${fmtDur(Math.round(total))} h</span>`)}
    ${rows || `<div class="empty-text">${t('tags.noTimes')}</div>`}</section>`;
}

function openDays(name, days) {
  const byMonth = new Map();
  for (const [ds, min] of Object.entries(days).sort(([x], [y]) => x.localeCompare(y))) {
    const key = ds.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push([ds, min]);
  }
  const groups = [...byMonth].map(([key, list]) => {
    const total = list.reduce((sum, [, min]) => sum + min, 0), [y, m] = key.split('-').map(Number);
    const rows = list.map(([ds, min]) => {
      const d = parseISO(ds);
      return `<li><span><span class="muted">${weekdayShort(d.getDay())}</span> ${d.getDate()}.</span><span>${fmtDur(Math.round(min))} h</span></li>`;
    }).join('');
    return `<div class="dayfold"><div class="dayfold-head"><b>${monthName(m - 1)} ${y}</b><span>${fmtDur(Math.round(total))} h</span></div>
      <ul class="list compact">${rows}</ul></div>`;
  }).join('');
  showDialog(`${dialogHead(esc(name))}${groups}`, undefined, { light: true });
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
  $$('button.tagrow', view).forEach(b => (b.onclick = () => openDays($('.tag-name', b).textContent, days[b.dataset.class]?.[b.dataset.tag] || {})));
  $('#printStats', view).onclick = () => exportStatsPdf(from, to);
}
