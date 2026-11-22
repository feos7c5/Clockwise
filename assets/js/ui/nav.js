import { now } from '../core/session.js';

// "overview" shows the month or the year (nav.scope); "stats" is the analysis by category and its setup.
export const TABS = ['today', 'overview', 'stats', 'settings'];
const hash = location.hash.slice(1);

export const nav = {
  tab: TABS.includes(hash) ? hash : hash === 'month' || hash === 'year' ? 'overview' : 'today',
  scope: hash === 'year' ? 'year' : 'month',
  month: { y: now().getFullYear(), m: now().getMonth() },
  year: now().getFullYear(),
};

let renderFn = () => {};
export const setRenderer = fn => (renderFn = fn);
export const rerender = () => renderFn();

export function goTo(tab) {
  nav.tab = tab;
  history.replaceState(null, '', '#' + tab);
  rerender();
  window.scrollTo(0, 0);
}

export function setScope(scope) {
  nav.scope = scope;
  rerender();
}

export function stepPeriod(dir) {
  if (nav.scope === 'month') {
    const d = new Date(nav.month.y, nav.month.m + dir, 1);
    nav.month = { y: d.getFullYear(), m: d.getMonth() };
  } else {
    nav.year += dir;
  }
  rerender();
}

export function resetPeriod() {
  const n = now();
  nav.month = { y: n.getFullYear(), m: n.getMonth() };
  nav.year = n.getFullYear();
  rerender();
}

export function isCurrentPeriod() {
  const n = now();
  return nav.scope === 'month'
    ? nav.month.y === n.getFullYear() && nav.month.m === n.getMonth()
    : nav.year === n.getFullYear();
}
