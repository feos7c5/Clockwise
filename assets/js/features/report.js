import { iso, parseISO, range, fmtDur, pad, addDays } from '../core/time.js';
import { vacationValue } from '../core/codes.js';
import { holidayOn } from '../core/holidays.js';
import { dayStats, sumRange, balance, pauseMin, grossMin, vacationAccount } from '../core/calc.js';
import { store } from '../core/store.js';
import { now, todayStr } from '../core/session.js';
import { t, weekdayShort, formatDayMonth, formatDate, monthName, formatNumber } from '../i18n/index.js';
import { codeLabel, holidayLabel } from '../ui/dom.js';
import { PdfDoc, A4, fit } from './pdf.js';
import { shareOrDownload } from './export.js';

const M = 48;
const LINE = 12.5, SIZE = 9;
const COL = { day: M, in: 122, out: 162, pause: 236, ist: 284, soll: 330, diff: 378, note: 392 };
const NOTE_W = A4.w - M - COL.note;
const plain = m => fmtDur(m, true).replace('−', '-');

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

  if (yPos > A4.h - 190) { doc.newPage(); yPos = 70; }
  yPos += 14;
  const sumRow = (label, value, bold = false) => {
    doc.text(M, yPos, label, { bold });
    doc.text(A4.w - M, yPos, value, { bold, align: 'right' });
    yPos += 15;
  };
  sumRow(t('print.carryPrev'), plain(carry));
  sumRow(t('print.target'), fmtDur(sum.soll));
  sumRow(t('print.actual'), fmtDur(sum.ist));
  doc.line(M, yPos - 10, A4.w - M, yPos - 10, { gray: 0.6 });
  sumRow(t('print.carryNext'), plain(carry + sum.diff), true);
  sumRow(t('print.absences'), t('print.absenceDays', { vac: formatNumber(totals.vac), sick: totals.sick, ho: totals.ho }));
  const vac = vacationAccount(store.state, y);
  const usedToDate = Object.entries(store.state.days)
    .filter(([ds]) => ds.startsWith(String(y)) && ds <= last)
    .reduce((a, [, d]) => a + vacationValue(d.code), 0);
  sumRow(t('print.vacation', { year: y }), t('print.vacationValue', {
    total: formatNumber(vac.total), used: formatNumber(usedToDate), left: formatNumber(vac.total - usedToDate),
  }));

  const signY = Math.min(yPos + 55, A4.h - 60);
  doc.line(M, signY, 260, signY, { gray: 0, width: 0.6 });
  doc.line(A4.w - M - 212, signY, A4.w - M, signY, { gray: 0, width: 0.6 });
  doc.text(M, signY + 12, t('print.signEmployee'), { size: 8, gray: 0.4 });
  doc.text(A4.w - M - 212, signY + 12, t('print.signEmployer'), { size: 8, gray: 0.4 });
  doc.text(M, A4.h - 28, t('print.created', { date: formatDate(n) }), { size: 7, gray: 0.6 });
  return doc.toBytes();
}

export function exportMonthPdf(y, m) {
  const bytes = buildMonthPdf(y, m);
  return shareOrDownload(t('print.file', { year: y, month: pad(m + 1) }), bytes, 'application/pdf');
}

const GREEN = [0.184, 0.420, 0.333], AMBER = [0.580, 0.392, 0.078], EMPTY = [0.937, 0.937, 0.925];

function yearCalendar(doc, y, top, n) {
  const perRow = 6, gap = 14, w = (A4.w - 2 * M - gap * (perRow - 1)) / perRow, c = w / 7;
  for (let m = 0; m < 12; m++) {
    const x0 = M + (m % perRow) * (w + gap), y0 = top + Math.floor(m / perRow) * (c * 6 + 26);
    doc.text(x0, y0, monthName(m), { size: 8, bold: true, gray: 0.35 });
    const first = new Date(y, m, 1), lead = (first.getDay() + 6) % 7;
    for (let d = 0; d < new Date(y, m + 1, 0).getDate(); d++) {
      const i = lead + d, st = dayStats(store.state, iso(addDays(first, d)), n), code = st.day.code;
      const off = !st.ist && code && !['G', 'H', 'D'].includes(code);
      const [rgb, alpha] = st.ist ? [GREEN, [0.35, 0.55, 0.8, 1][Math.min(3, Math.ceil(st.ist / 150) - 1)]] : off ? [AMBER, 0.5] : [EMPTY, 1];
      doc.rect(x0 + (i % 7) * c, y0 + 6 + Math.floor(i / 7) * c, c - 1.2, c - 1.2, rgb, alpha);
    }
  }
  return top + 2 * (c * 6 + 26);
}

export function buildYearPdf(y) {
  const n = now(), s = store.state.settings, doc = new PdfDoc();
  const last = `${y}-12-31` < todayStr() ? `${y}-12-31` : todayStr();
  const carry = balance(store.state, `${y - 1}-12-31`, n);
  doc.text(M, 62, t('print.yearTitle', { year: y }), { size: 16, bold: true });
  const meta = [s.name, s.pnr && t('print.pnr', { pnr: s.pnr })].filter(Boolean).join(' · ');
  if (meta) doc.text(M, 80, meta, { size: 9, gray: 0.4 });

  let yPos = yearCalendar(doc, y, 108, n) + 10;
  const C = { m: M, ist: 230, soll: 300, diff: 370, bal: 440, vac: 495, sick: A4.w - M };
  const head = (x, label, align = 'right') => doc.text(x, yPos, label, { size: 8, bold: true, gray: 0.45, align });
  head(C.m, t('year.month'), 'left'); head(C.ist, t('common.ist')); head(C.soll, t('common.soll')); head(C.diff, t('common.diff'));
  head(C.bal, t('common.balance')); head(C.vac, t('year.vacation')); head(C.sick, t('year.sick'));
  doc.line(M, yPos + 5, A4.w - M, yPos + 5, { gray: 0.6 });
  yPos += 18;

  const total = { ist: 0, soll: 0, diff: 0, vac: 0, sick: 0, ho: 0 };
  for (let m = 0; m < 12; m++) {
    const first = iso(new Date(y, m, 1)), end = iso(new Date(y, m + 1, 0));
    const r = sumRange(store.state, first, end, n);
    const codes = range(first, end).map(ds => store.state.days[ds]?.code);
    const vac = codes.reduce((a, c) => a + vacationValue(c), 0), sick = codes.filter(c => c === 'K' || c === 'KR').length;
    total.ist += r.ist; total.soll += r.soll; total.diff += r.diff; total.vac += vac; total.sick += sick; total.ho += codes.filter(c => c === 'H').length;
    const gray = r.ist || r.soll ? 0 : 0.6;
    doc.text(C.m, yPos, monthName(m), { gray });
    if (r.ist || r.soll) {
      doc.text(C.ist, yPos, fmtDur(r.ist), { align: 'right' });
      doc.text(C.soll, yPos, fmtDur(r.soll), { align: 'right' });
      doc.text(C.diff, yPos, plain(r.diff), { align: 'right' });
      doc.text(C.bal, yPos, plain(balance(store.state, end, n)), { align: 'right' });
    }
    if (vac) doc.text(C.vac, yPos, formatNumber(vac), { align: 'right' });
    if (sick) doc.text(C.sick, yPos, String(sick), { align: 'right' });
    doc.line(M, yPos + 4, A4.w - M, yPos + 4, { gray: 0.9 });
    yPos += LINE + 3;
  }
  const bold = { bold: true, align: 'right' };
  doc.text(C.m, yPos, t('common.total'), { bold: true });
  doc.text(C.ist, yPos, fmtDur(total.ist), bold); doc.text(C.soll, yPos, fmtDur(total.soll), bold);
  doc.text(C.diff, yPos, plain(total.diff), bold); doc.text(C.vac, yPos, formatNumber(total.vac), bold); doc.text(C.sick, yPos, String(total.sick), bold);
  doc.line(M, yPos - 10, A4.w - M, yPos - 10, { gray: 0.6 });

  yPos += 30;
  const sumRow = (label, value, isBold = false) => {
    doc.text(M, yPos, label, { bold: isBold });
    doc.text(A4.w - M, yPos, value, { bold: isBold, align: 'right' });
    yPos += 15;
  };
  const vac = vacationAccount(store.state, y);
  sumRow(t('print.carryPrevYear'), plain(carry));
  sumRow(t('print.yearChange'), plain(total.diff));
  doc.line(M, yPos - 10, A4.w - M, yPos - 10, { gray: 0.6 });
  sumRow(t('print.balanceAt', { date: formatDate(parseISO(last)) }), plain(carry + total.diff), true);
  sumRow(t('print.vacation', { year: y }), t('print.vacationValue', { total: formatNumber(vac.total), used: formatNumber(vac.used), left: formatNumber(vac.left) }));
  sumRow(t('print.yearAbsences'), t('print.absenceDays', { vac: formatNumber(total.vac), sick: total.sick, ho: total.ho }));

  const signY = Math.min(yPos + 45, A4.h - 60);
  doc.line(M, signY, 260, signY, { gray: 0, width: 0.6 });
  doc.line(A4.w - M - 212, signY, A4.w - M, signY, { gray: 0, width: 0.6 });
  doc.text(M, signY + 12, t('print.signEmployee'), { size: 8, gray: 0.4 });
  doc.text(A4.w - M - 212, signY + 12, t('print.signEmployer'), { size: 8, gray: 0.4 });
  doc.text(M, A4.h - 28, t('print.created', { date: formatDate(n) }), { size: 7, gray: 0.6 });
  return doc.toBytes();
}

export const exportYearPdf = y => shareOrDownload(t('print.yearFile', { year: y }), buildYearPdf(y), 'application/pdf');
