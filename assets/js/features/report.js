// Monatsnachweis als PDF – wird geteilt (iPhone: Drucken, Dateien, Mail) oder heruntergeladen.
import { iso, parseISO, range, fmtDur, pad } from '../core/time.js';
import { vacationValue } from '../core/codes.js';
import { holidayOn } from '../core/holidays.js';
import { dayStats, sumRange, balance, pauseMin, grossMin } from '../core/calc.js';
import { store } from '../core/store.js';
import { now } from '../core/session.js';
import { t, weekdayShort, formatDayMonth, formatDate, monthName, formatNumber } from '../i18n/index.js';
import { codeLabel, holidayLabel } from '../ui/dom.js';
import { PdfDoc, A4, fit } from './pdf.js';
import { shareOrDownload } from './export.js';

const M = 48;                       // Seitenrand
const LINE = 12.5, SIZE = 9;
const COL = { day: M, in: 122, out: 162, pause: 236, ist: 284, soll: 330, diff: 378, note: 392 };
const NOTE_W = A4.w - M - COL.note;
const plain = m => fmtDur(m, true).replace('−', '-'); // mit Vorzeichen, ASCII-Minus

function tableHead(doc, y) {
  const h = (x, key, align) => doc.text(x, y, t(key), { size: 8, bold: true, gray: 0.45, align });
  h(COL.day, 'print.day'); h(COL.in, 'print.clockIn'); h(COL.out, 'print.clockOut');
  h(COL.pause, 'print.pause', 'right'); h(COL.ist, 'common.ist', 'right'); h(COL.soll, 'common.soll', 'right');
  h(COL.diff, 'common.diff', 'right'); h(COL.note, 'common.note');
  doc.line(M, y + 5, A4.w - M, y + 5, { gray: 0.6 });
  return y + 18;
}

function dayRow(doc, y, ds, n, totals) {
  const s = store.state.settings, st = dayStats(store.state, ds, n), b = st.day.blocks, d = parseISO(ds), wd = d.getDay();
  const code = st.day.code, hol = holidayOn(s, ds);
  totals.vac += vacationValue(code); totals.sick += code === 'K' ? 1 : 0; totals.ho += code === 'H' ? 1 : 0;
  const gray = wd === 0 || wd === 6 ? 0.55 : 0;
  const lines = Math.max(1, b.length);
  b.forEach((x, i) => {
    doc.text(COL.in, y + i * LINE, x.in, { gray });
    doc.text(COL.out, y + i * LINE, x.out || '', { gray });
  });
  doc.text(COL.day, y, `${weekdayShort(wd)} ${formatDayMonth(d)}`, { gray });
  if (b.length) doc.text(COL.pause, y, String(pauseMin(s, st.day, grossMin(st.day))), { gray, align: 'right' });
  if (st.ist) doc.text(COL.ist, y, fmtDur(st.ist), { gray, align: 'right' });
  if (st.soll && st.counts) doc.text(COL.soll, y, fmtDur(st.soll), { gray, align: 'right' });
  if (st.counts && (st.ist || st.soll)) doc.text(COL.diff, y, plain(st.diff), { gray, align: 'right' });
  const note = [hol && holidayLabel(hol), code && codeLabel(code), st.day.note].filter(Boolean).join(' · ');
  if (note) doc.text(COL.note, y, fit(note, SIZE, NOTE_W), { gray, size: 8 });
  const next = y + lines * LINE + 3;
  doc.line(M, next - 9, A4.w - M, next - 9, { gray: 0.9 });
  return next;
}

export function buildMonthPdf(y, m) {
  const n = now(), s = store.state.settings;
  const first = iso(new Date(y, m, 1)), last = iso(new Date(y, m + 1, 0));
  const carry = balance(store.state, iso(new Date(y, m, 0)), n);
  const sum = sumRange(store.state, first, last, n);
  const totals = { vac: 0, sick: 0, ho: 0 };
  const doc = new PdfDoc();

  const header = () => {
    doc.text(M, 62, t('print.title', { month: monthName(m), year: y }), { size: 16, bold: true });
    const meta = [s.name, s.pnr && t('print.pnr', { pnr: s.pnr })].filter(Boolean).join(' · ');
    if (meta) doc.text(M, 80, meta, { size: 9, gray: 0.4 });
    return tableHead(doc, 106);
  };

  let yPos = header();
  for (const ds of range(first, last)) {
    if (yPos > A4.h - 70) { doc.newPage(); yPos = header(); }
    yPos = dayRow(doc, yPos, ds, n, totals);
  }

  // Zusammenfassung
  if (yPos > A4.h - 190) { doc.newPage(); yPos = 70; }
  yPos += 14;
  const sumRow = (label, value, bold = false) => {
    doc.text(M, yPos, label, { bold });
    doc.text(COL.ist + 16, yPos, value, { bold, align: 'right' });
    yPos += 15;
  };
  sumRow(t('print.carryPrev'), plain(carry));
  sumRow(t('print.target'), fmtDur(sum.soll));
  sumRow(t('print.actual'), fmtDur(sum.ist));
  doc.line(M, yPos - 10, COL.ist + 16, yPos - 10, { gray: 0.6 });
  sumRow(t('print.carryNext'), plain(carry + sum.diff), true);
  sumRow(t('print.absences'), t('print.absenceDays', { vac: formatNumber(totals.vac), sick: totals.sick, ho: totals.ho }));

  // Unterschriften
  const signY = Math.min(yPos + 55, A4.h - 60);
  doc.line(M, signY, 260, signY, { gray: 0, width: 0.6 });
  doc.line(A4.w - M - 212, signY, A4.w - M, signY, { gray: 0, width: 0.6 });
  doc.text(M, signY + 12, t('print.signEmployee'), { size: 8, gray: 0.4 });
  doc.text(A4.w - M - 212, signY + 12, t('print.signEmployer'), { size: 8, gray: 0.4 });
  doc.text(M, A4.h - 28, t('print.created', { date: formatDate(n) }), { size: 7, gray: 0.6 });
  return doc.toBytes();
}

export function exportMonthPdf(y, m) {
  const bytes = buildMonthPdf(y, m); // synchron vor dem Teilen (iOS verlangt die Nutzeraktion)
  return shareOrDownload(t('print.file', { year: y, month: pad(m + 1) }), bytes, 'application/pdf');
}
