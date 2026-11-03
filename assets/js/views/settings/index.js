import { appearance, reminders, person } from './general.js';
import { schedule, pause, accounts } from './worktime.js';
import { storage, reset } from './data.js';
import { cloud } from './cloud.js';
import { VERSION } from '../../version.js';

const SECTIONS = [cloud, appearance, reminders, storage, person, schedule, pause, accounts, reset];

export function renderSettings(view) {
  view.innerHTML = `<div class="stack">${SECTIONS.map(s => s.html()).join('')}<p class="hint version">Version ${VERSION}</p></div>`;
  SECTIONS.forEach(s => s.bind(view));
}
