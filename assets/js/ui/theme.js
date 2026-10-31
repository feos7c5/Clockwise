// Hell/Dunkel: "system" folgt prefers-color-scheme, sonst fest.
import { store } from '../core/store.js';
import { $$ } from './dom.js';

const LIGHT = '#f4f4f2';
const DARK = '#111112';

export function applyTheme() {
  const t = store.state.settings.theme, root = document.documentElement;
  if (t === 'system') delete root.dataset.theme;
  else root.dataset.theme = t;

  // Statusleisten-Farbe (zwei Meta-Tags mit media-Query: hell, dunkel)
  const [light, dark] = $$('meta[name="theme-color"]');
  light.content = t === 'dark' ? DARK : LIGHT;
  dark.content = t === 'light' ? LIGHT : DARK;
}
