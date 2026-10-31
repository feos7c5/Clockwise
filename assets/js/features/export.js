// Backup (JSON) und CSV-Export für Excel.
import { iso, parseISO, range, fmtDur } from '../core/time.js';
import { holidayOn } from '../core/holidays.js';
import { dayStats, balance, pauseMin, grossMin } from '../core/calc.js';
import { store, replaceState, isValidState } from '../core/store.js';
import { now, todayStr } from '../core/session.js';
import { t, weekdayShort, formatDate } from '../i18n/index.js';
import { holidayLabel } from '../ui/dom.js';

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Auf Touch-Geräten über das Teilen-Menü (→ „In Dateien sichern“ → iCloud Drive)
export async function shareOrDownload(name, text, type) {
  const file = new File([text], name, { type });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  download(name, text, type);
}

export const saveBackup = () =>
  shareOrDownload(`Clockwise-Backup-${todayStr()}.json`, JSON.stringify(store.state, null, 1), 'application/json');

export async function loadBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (!isValidState(data)) throw new Error(t('backup.invalid'));
    if (!confirm(t('backup.confirmReplace'))) return false;
    replaceState(data);
    return true;
  } catch (err) {
    alert(t('backup.importFailed', { error: err.message }));
    return false;
  }
}

const csvCell = v => (/[;"\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v);
const plain = m => fmtDur(m).replace('−', '-');

// Gleiche Spalten wie die ursprüngliche Excel-Vorlage (Überschriften übersetzt)
export function exportCSV(year) {
  const n = now(), s = store.state.settings;
  const lines = [t('csv.columns')];
  let bal = balance(store.state, iso(new Date(year, 0, 0)), n);

  for (const ds of range(`${year}-01-01`, `${year}-12-31`)) {
    const st = dayStats(store.state, ds, n), b = st.day.blocks, d = parseISO(ds), hol = holidayOn(s, ds);
    bal += st.diff;
    if (!(b.length || st.day.code || st.day.note || hol) && !st.soll) continue;
    lines.push([
      formatDate(d), weekdayShort(d.getDay()), hol ? holidayLabel(hol) : '',
      b[0]?.in || '', b[0]?.out || '', b[1]?.in || '', b[1]?.out || '',
      b.slice(2).map(x => `${x.in}-${x.out || ''}`).join(' '),
      b.length ? fmtDur(pauseMin(s, st.day, grossMin(st.day))) : '',
      st.day.code || '', fmtDur(st.ist), fmtDur(st.soll),
      st.counts ? plain(st.diff) : '', plain(bal), st.day.note || '',
    ]);
  }
  const csv = '\uFEFF' + lines.map(l => l.map(csvCell).join(';')).join('\r\n');
  shareOrDownload(t('csv.file', { year }), csv, 'text/csv');
}
