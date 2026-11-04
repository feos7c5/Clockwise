export const A4 = { w: 595.28, h: 841.89 };

const WIDTHS = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667,
  778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222,
  222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];

const EXTRA_WIDTHS = { 'ä': 556, 'ö': 556, 'ü': 556, 'Ä': 667, 'Ö': 778, 'Ü': 722, 'ß': 611, '·': 278, '–': 556, '—': 1000, '…': 1000, '„': 333, '“': 333, '”': 333, '€': 556, '−': 333, '½': 834 };

const WIN_ANSI = { '€': 0x80, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '„': 0x84, '•': 0x95, '–': 0x96, '—': 0x97, '−': 0x2d };

function encode(text) {
  let out = '';
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    const mapped = WIN_ANSI[ch] ?? (code < 256 ? code : 0x3f);
    const c = String.fromCharCode(mapped);
    out += c === '(' || c === ')' || c === '\\' ? '\\' + c : c;
  }
  return out;
}

export function textWidth(text, size, bold = false) {
  let units = 0;
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    units += code >= 32 && code <= 126 ? WIDTHS[code - 32] : EXTRA_WIDTHS[ch] ?? 556;
  }
  return (units * size * (bold ? 1.05 : 1)) / 1000;
}

export function fit(text, size, maxWidth) {
  if (textWidth(text, size) <= maxWidth) return text;
  let t = String(text);
  while (t && textWidth(t + '…', size) > maxWidth) t = t.slice(0, -1);
  return t + '…';
}

export class PdfDoc {
  constructor() { this.pages = []; this.newPage(); }

  newPage() { this.ops = []; this.pages.push(this.ops); }

  text(x, y, text, { size = 9, bold = false, gray = 0, align = 'left' } = {}) {
    const dx = align === 'right' ? x - textWidth(text, size, bold) : x;
    this.ops.push(`BT ${gray} g /${bold ? 'F2' : 'F1'} ${size} Tf ${dx.toFixed(2)} ${(A4.h - y).toFixed(2)} Td (${encode(text)}) Tj ET`);
  }

  rect(x, y, w, h, [r, g, b], alpha = 1) {
    const mix = c => (1 - alpha + alpha * c).toFixed(3);
    this.ops.push(`${mix(r)} ${mix(g)} ${mix(b)} rg ${x.toFixed(2)} ${(A4.h - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  }

  line(x1, y1, x2, y2, { gray = 0.8, width = 0.5 } = {}) {
    this.ops.push(`${gray} G ${width} w ${x1.toFixed(2)} ${(A4.h - y1).toFixed(2)} m ${x2.toFixed(2)} ${(A4.h - y2).toFixed(2)} l S`);
  }

  toBytes() {
    const objects = [];
    const add = body => { objects.push(body); return objects.length; };
    const catalog = add(null), pagesObj = add(null);
    const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const kids = this.pages.map(ops => {
      const stream = ops.join('\n');
      const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      return add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Contents ${content} 0 R /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> >>`);
    });
    objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
    objects[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;

    let pdf = '%PDF-1.4\n';
    const offsets = objects.map((body, i) => { const at = pdf.length; pdf += `${i + 1} 0 obj\n${body}\nendobj\n`; return at; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Uint8Array.from(pdf, c => c.charCodeAt(0));
  }
}
