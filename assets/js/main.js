// Einstiegspunkt: Navigation, Kopfzeile, Timer, Service Worker.
import { fmtDur } from './core/time.js';
import { balance } from './core/calc.js';
import { store } from './core/store.js';
import { now, todayStr } from './core/session.js';
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

// Rechts in der Kopfzeile: Saldo (Heute) oder Blättern (Monat/Jahr)
function renderHeadActions() {
  const el = $('#headRight');
  if (nav.tab === 'today') {
    const b = balance(store.state, todayStr(), now());
    el.innerHTML = `<div class="chip"><span class="muted">${t('head.balance')}</span><span class="${tone(b)}">${fmtDur(b, true)} h</span></div>`;
  } else if (nav.tab === 'month' || nav.tab === 'year') {
    el.innerHTML = `<div class="nav-group">
      <button class="btn btn-icon btn-sm" id="navPrev" aria-label="${t('nav.back')}">${ICON.left}</button>
      <button class="btn btn-sm" id="navNow" ${isCurrentPeriod() ? 'disabled' : ''}>${t('nav.current')}</button>
      <button class="btn btn-icon btn-sm" id="navNext" aria-label="${t('nav.forward')}">${ICON.right}</button></div>`;
    $('#navPrev').onclick = () => stepPeriod(-1);
    $('#navNext').onclick = () => stepPeriod(1);
    $('#navNow').onclick = resetPeriod;
  } else {
    el.innerHTML = '';
  }
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
  renderHeadActions();
  renderBanner();
}

// Seitenübergreifend oben: neue Version verfügbar
function renderBanner() {
  const el = $('#banner');
  el.innerHTML = updateAvailable()
    ? notice({ id: 'update', title: t('update.title'), text: t('update.text'), action: `<button class="btn btn-sm btn-primary" id="applyUpdate">${t('update.action')}</button>` })
    : '';
  $('#applyUpdate', el)?.addEventListener('click', applyUpdate);
  $('[data-dismiss]', el)?.addEventListener('click', e => { e.stopImmediatePropagation(); hideUpdate(); });
}

setRenderer(render);

// Trennlinie unter der festen Kopfzeile, sobald Inhalt darunter durchscrollt
const markScrolled = () => document.body.classList.toggle('scrolled', window.scrollY > 4);
window.addEventListener('scroll', markScrolled, { passive: true });
$$('.tabs button').forEach(b => (b.onclick = () => goTo(b.dataset.tab)));
onSyncChange(() => { if (nav.tab === 'settings') render(); });
const typing = () => document.activeElement?.matches('textarea, input, select');
onSyncStatus(() => { if (nav.tab === 'settings' && !dialogOpen() && !typing()) render(); });
// Neue Daten von einem anderen Gerät: neu zeichnen, außer der Nutzer tippt gerade
onRemoteData(() => { if (!dialogOpen() && !typing()) render(); });
onInstallChange(() => { if (nav.tab === 'today') render(); });
onUpdateChange(renderBanner);

// Timer jede Sekunde, volles Neu-Zeichnen jede Minute (außer beim Tippen)
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
render();
initFileSync();
initSync();
startReminders();

registerServiceWorker();
