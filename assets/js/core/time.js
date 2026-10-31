export const pad = n => String(n).padStart(2, '0');

export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseISO = s => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const toMin = s => {
  if (!s) return null;
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

export const fromMin = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;

export function fmtDur(m, sign = false) {
  const neg = m < 0;
  m = Math.abs(Math.round(m));
  const s = `${Math.floor(m / 60)}:${pad(m % 60)}`;
  return neg ? '−' + s : sign && m ? '+' + s : s;
}

export function parseDur(input) {
  let s = String(input || '').trim().replace(',', '.').replace('−', '-');
  if (!s) return null;
  const neg = s.startsWith('-');
  if (neg) s = s.slice(1);
  let m;
  if (s.includes(':')) {
    const [h, mi] = s.split(':');
    m = (+h || 0) * 60 + (+mi || 0);
  } else {
    m = Math.round(parseFloat(s) * 60);
  }
  return isNaN(m) ? null : neg ? -m : m;
}

export function range(fromStr, toStr) {
  const out = [], d = parseISO(fromStr), end = parseISO(toStr);
  while (d <= end) { out.push(iso(d)); d.setDate(d.getDate() + 1); }
  return out;
}

export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
