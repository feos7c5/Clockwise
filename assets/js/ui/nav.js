import { now } from '../core/session.js';

export const TABS = ['today', 'month', 'year', 'settings'];
const hashTab = location.hash.slice(1);

export const nav = {
  tab: TABS.includes(hashTab) ? hashTab : 'today',
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

export function stepPeriod(dir) {
  if (nav.tab === 'month') {
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
  return nav.tab === 'month'
    ? nav.month.y === n.getFullYear() && nav.month.m === n.getMonth()
    : nav.year === n.getFullYear();
}
