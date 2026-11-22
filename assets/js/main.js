import { fmtDur } from './core/time.js';
import { balance } from './core/calc.js';
import { store } from './core/store.js';
import { now, todayStr, autoClockOut } from './core/session.js';
import { initFileSync, onSyncChange } from './core/file-sync.js';
import { t, setLanguage, formatLongDate, monthName } from './i18n/index.js';
import { $, $$, tone } from './ui/dom.js';
import { ICON } from './ui/icons.js';
import { applyTheme } from './ui/theme.js';
import { dialogOpen } from './ui/dialog.js';
import { nav, TABS, setRenderer, goTo, setScope, stepPeriod, resetPeriod, isCurrentPeriod } from './ui/nav.js';
import { hasTagClasses } from './core/tags.js';
import { renderStats } from './views/stats.js';
import { renderToday, tickTimer } from './views/today.js';
import { renderMonth } from './views/month.js';
import { renderYear } from './views/year.js';
import { renderSettings } from './views/settings/index.js';
import { startReminders, checkReminders } from './features/reminders.js';
import { initSync, onSyncStatus, onRemoteData } from './sync/engine.js';
import { onInstallChange } from './features/install.js';
import { registerServiceWorker } from './features/update.js';
import { saveBackup } from './features/export.js';
import { esc } from './ui/dom.js';

// Overview and analysis share the header: the period small on top, the topic below.
const periodLabel = () => (nav.scope === 'month' ? `${monthName(nav.month.m)} ${nav.month.y}` : String(nav.year));

const VIEWS = {
  today: { render: renderToday, title: () => [t('nav.today'), formatLongDate(now())] },
  overview: {
    render: view => (nav.scope === 'month' ? renderMonth : renderYear)(view),
    title: () => [t('nav.overview'), periodLabel()],
  },
  stats: {
    render: renderStats,
    title: () => [t('nav.stats'), hasTagClasses() ? periodLabel() : ''],
  },
  settings: { render: renderSettings, title: () => [t('nav.settings'), ''] },
};

const PERIOD_TABS = ['overview', 'stats'];

// Month or year: one switch for the overview and the evaluation, at the top of both.
function renderScopeSwitch() {
  const stack = $('#view .stack');
  if (!stack || !PERIOD_TABS.includes(nav.tab) || (nav.tab === 'stats' && !hasTagClasses())) return;
  stack.insertAdjacentHTML('afterbegin', `<div class="seg">${['month', 'year'].map(s =>
    `<button data-scope="${s}" class="${nav.scope === s ? 'on' : ''}">${t(`nav.${s}`)}</button>`).join('')}</div>`);
  $$('[data-scope]', stack).forEach(b => (b.onclick = () => setScope(b.dataset.scope)));
}

function headActionsHtml() {
  if (nav.tab === 'today') {
    const b = balance(store.state, todayStr(), now());
    return `<div class="chip"><span class="muted">${t('head.balance')}</span><span class="${tone(b)}">${fmtDur(b, true)} h</span></div>`;
  }
  if (nav.tab === 'overview' || (nav.tab === 'stats' && hasTagClasses())) {
    return `<div class="nav-group">
      <button class="btn btn-icon btn-sm" data-nav="prev" aria-label="${t('nav.back')}">${ICON.left}</button>
      <button class="btn btn-sm" data-nav="now" ${isCurrentPeriod() ? 'disabled' : ''}>${t('nav.current')}</button>
      <button class="btn btn-icon btn-sm" data-nav="next" aria-label="${t('nav.forward')}">${ICON.right}</button></div>`;
  }
  return '';
}

function renderHeadActions(title, subtitle) {
  const html = headActionsHtml();
  $('#headRight').innerHTML = html;
  $('#compactRight').innerHTML = html;
  const both = PERIOD_TABS.includes(nav.tab) && subtitle;
  $('#compactTitle').textContent = both ? `${title} ${subtitle}` : title;
}

const NAV_ACTIONS = { prev: () => stepPeriod(-1), next: () => stepPeriod(1), now: resetPeriod };
for (const el of [$('#headRight'), $('#compactRight')]) {
  el.addEventListener('click', e => { const b = e.target.closest('[data-nav]'); if (b && !b.disabled) NAV_ACTIONS[b.dataset.nav](); });
}

function renderTabs() {
  const tabs = $('.tabs');
  tabs.setAttribute('aria-label', t('nav.main'));
  tabs.style.setProperty('--tab', TABS.indexOf(nav.tab));
  $$('.tabs button').forEach(b => {
    b.classList.toggle('on', b.dataset.tab === nav.tab);
    $('span', b).textContent = t(`nav.${b.dataset.tab}`);
  });
}

function render() {
  setLanguage(store.state.settings.language);
  document.body.dataset.tab = nav.tab;
  const view = VIEWS[nav.tab];
  const [title, subtitle] = view.title();
  $('#title').textContent = title;
  $('#subtitle').textContent = subtitle;
  renderTabs();
  try {
    view.render($('#view'));
    renderScopeSwitch();
  } catch (e) {
    renderFailure(e);
  }
  renderHeadActions(title, subtitle);
  markScrolled();
  renderedMinute = Math.floor(Date.now() / 60_000);
  renderPending = false;
}

// A broken view must never lock the user out of the app or their data.
function renderFailure(e) {
  console.error(e);
  $('#view').innerHTML = `<div class="stack"><section class="card">
    <p class="hint flush">${t('backup.renderFailed')}<br><small>${esc(e.message)}</small></p>
    <div class="btn-row section-actions"><button class="btn" id="failSave">${t('backup.saveData')}</button>
    <button class="btn btn-primary" id="failReload">${t('backup.reload')}</button></div></section></div>`;
  $('#failSave').onclick = saveBackup;
  $('#failReload').onclick = () => location.reload();
}

setRenderer(render);

let scrollFrame = 0;
function markScrolled() {
  if (document.body.style.position === 'fixed') return;
  const collapsed = $('.top').getBoundingClientRect().bottom < $('.compact-bar').offsetHeight;
  document.body.classList.toggle('compact', collapsed);
  $('.compact-bar').inert = !collapsed;
}
window.addEventListener('scroll', () => { cancelAnimationFrame(scrollFrame); scrollFrame = requestAnimationFrame(markScrolled); }, { passive: true });
$$('.tabs button').forEach(b => (b.onclick = () => goTo(b.dataset.tab)));
onSyncChange(() => { if (nav.tab === 'settings') render(); });
const typing = () => document.activeElement?.matches('textarea, input, select');

// The page is rebuilt on a new minute or new data, but never while a finger is on the screen: a tap that
// started on the old page would otherwise be lost.
let renderedMinute = 0, renderPending = false, touching = false, touchTimer = 0;
document.addEventListener('pointerdown', () => { clearTimeout(touchTimer); touching = true; }, true);
const release = () => { clearTimeout(touchTimer); touchTimer = setTimeout(() => (touching = false), 400); };
document.addEventListener('pointerup', release, true);
document.addEventListener('pointercancel', release, true);
const busy = () => touching || dialogOpen() || typing();
const renderWhenIdle = () => { if (busy()) renderPending = true; else render(); };

onSyncStatus(s => {
  if (nav.tab === 'settings') renderWhenIdle();
  if (s.status !== 'syncing') checkReminders();
});
onRemoteData(renderWhenIdle);
onInstallChange(() => { if (nav.tab === 'today') renderWhenIdle(); });

setInterval(() => {
  if (document.hidden) return;
  if (nav.tab === 'today') tickTimer();
  const minuteChanged = nav.tab === 'today' && Math.floor(Date.now() / 60_000) !== renderedMinute;
  if ((minuteChanged || renderPending) && !busy()) render();
}, 1000);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  render();
  checkReminders();
});

applyTheme();
autoClockOut();
render();
initFileSync();
initSync();
startReminders();

registerServiceWorker();
