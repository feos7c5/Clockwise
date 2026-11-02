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
import { nav, TABS, setRenderer, goTo, stepPeriod, resetPeriod, isCurrentPeriod } from './ui/nav.js';
import { renderToday, tickTimer } from './views/today.js';
import { renderMonth } from './views/month.js';
import { renderYear } from './views/year.js';
import { renderSettings } from './views/settings/index.js';
import { startReminders, checkReminders } from './features/reminders.js';
import { initSync, onSyncStatus, onRemoteData } from './sync/engine.js';
import { onInstallChange } from './features/install.js';
import { registerServiceWorker, onUpdateChange, updateAvailable, applyUpdate, hideUpdate } from './features/update.js';
import { notice } from './ui/notice.js';

const VIEWS = {
  today: { render: renderToday, title: () => [t('nav.today'), formatLongDate(now())] },
  month: { render: renderMonth, title: () => [monthName(nav.month.m), String(nav.month.y)] },
  year: { render: renderYear, title: () => [String(nav.year), t('head.yearOverview')] },
  settings: { render: renderSettings, title: () => [t('nav.settings'), ''] },
};

function headActionsHtml() {
  if (nav.tab === 'today') {
    const b = balance(store.state, todayStr(), now());
    return `<div class="chip"><span class="muted">${t('head.balance')}</span><span class="${tone(b)}">${fmtDur(b, true)} h</span></div>`;
  }
  if (nav.tab === 'month' || nav.tab === 'year') {
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
  $('#compactTitle').textContent = nav.tab === 'month' ? `${title} ${subtitle}` : title;
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
  view.render($('#view'));
  renderHeadActions(title, subtitle);
  renderBanner();
  markScrolled();
}

function renderBanner() {
  const el = $('#banner');
  el.innerHTML = updateAvailable()
    ? notice({ id: 'update', title: t('update.title'), text: t('update.text'), action: `<button class="btn btn-sm btn-primary" id="applyUpdate">${t('update.action')}</button>` })
    : '';
  $('#applyUpdate', el)?.addEventListener('click', applyUpdate);
  $('[data-dismiss]', el)?.addEventListener('click', e => { e.stopImmediatePropagation(); hideUpdate(); });
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
onSyncStatus(() => { if (nav.tab === 'settings' && !dialogOpen() && !typing()) render(); });
onRemoteData(() => { if (!dialogOpen() && !typing()) render(); });
onInstallChange(() => { if (nav.tab === 'today') render(); });
onUpdateChange(renderBanner);

setInterval(() => {
  if (nav.tab !== 'today' || document.hidden) return;
  tickTimer();
  const typing = document.activeElement?.matches('textarea, input');
  if (now().getSeconds() === 0 && !typing && !dialogOpen()) render();
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
