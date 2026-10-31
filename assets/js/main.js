// Einstiegspunkt: Navigation, Kopfzeile, Timer, Service Worker.
import { fmtDur } from './core/time.js';
import { balance } from './core/calc.js';
import { store } from './core/store.js';
import { now, todayStr } from './core/session.js';
import { initFileSync, onSyncChange } from './core/file-sync.js';
import { $, $$, tone, longDate, MONTHS } from './ui/dom.js';
import { ICON } from './ui/icons.js';
import { applyTheme } from './ui/theme.js';
import { dialogOpen } from './ui/dialog.js';
import { nav, setRenderer, goTo, stepPeriod, resetPeriod, isCurrentPeriod } from './ui/nav.js';
import { renderToday, tickTimer } from './views/today.js';
import { renderMonth } from './views/month.js';
import { renderYear } from './views/year.js';
import { renderSettings } from './views/settings/index.js';
import { startReminders, checkReminders } from './features/reminders.js';

const VIEWS = {
  heute: { render: renderToday, title: () => ['Heute', longDate(now())] },
  monat: { render: renderMonth, title: () => [MONTHS[nav.month.m], String(nav.month.y)] },
  jahr: { render: renderYear, title: () => [String(nav.year), 'Jahresübersicht'] },
  einst: { render: renderSettings, title: () => ['Einstellungen', ''] },
};

// Rechts in der Kopfzeile: Saldo (Heute) oder Blättern (Monat/Jahr)
function renderHeadActions() {
  const el = $('#headRight');
  if (nav.tab === 'heute') {
    const b = balance(store.state, todayStr(), now());
    el.innerHTML = `<div class="chip"><span class="muted">Saldo</span><span class="${tone(b)}">${fmtDur(b, true)} h</span></div>`;
  } else if (nav.tab === 'monat' || nav.tab === 'jahr') {
    el.innerHTML = `<div class="nav-group">
      <button class="btn btn-icon btn-sm" id="navPrev" aria-label="Zurück">${ICON.left}</button>
      <button class="btn btn-sm" id="navNow" ${isCurrentPeriod() ? 'disabled' : ''}>Heute</button>
      <button class="btn btn-icon btn-sm" id="navNext" aria-label="Weiter">${ICON.right}</button></div>`;
    $('#navPrev').onclick = () => stepPeriod(-1);
    $('#navNext').onclick = () => stepPeriod(1);
    $('#navNow').onclick = resetPeriod;
  } else {
    el.innerHTML = '';
  }
}

function render() {
  const view = VIEWS[nav.tab];
  const [title, subtitle] = view.title();
  $('#title').textContent = title;
  $('#subtitle').textContent = subtitle;
  $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === nav.tab));
  view.render($('#view'));
  renderHeadActions();
}

setRenderer(render);
$$('.tabs button').forEach(b => (b.onclick = () => goTo(b.dataset.tab)));
onSyncChange(() => { if (nav.tab === 'einst') render(); });

// Timer jede Sekunde, volles Neu-Zeichnen jede Minute (außer beim Tippen)
setInterval(() => {
  if (nav.tab !== 'heute' || document.hidden) return;
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
startReminders();

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js');
