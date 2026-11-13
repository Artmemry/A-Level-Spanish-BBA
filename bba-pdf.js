/* =====================================================================
   BBA PDF — a drop-in replacement for jsPDF, with no CDN.

   The four pages that offered a "PDF report" loaded jsPDF from
   cdnjs.cloudflare.com. Filtered school networks block that host, and a
   page that reaches outside itself cannot be dropped onto SharePoint or
   opened from a memory stick. This file produces a real PDF in the
   browser, offline, in about 9 kB.

   It implements only the jsPDF surface those pages actually use:

     new jsPDF()                     millimetres, A4 (jsPDF's default)
     new jsPDF({unit:'pt', format:'a4'})
     .setFont(family, style)         helvetica · normal | bold | italic
     .setFontSize(pt)
     .setTextColor(r,g,b) | (grey) | ('#rrggbb')
     .splitTextToSize(text, width)   wraps on real Helvetica widths
     .text(str | string[], x, y, {align:'left'|'center'|'right'})
     .addPage()
     .save(filename)
     .output('blob' | 'datauristring' | 'arraybuffer')

   Text is written with WinAnsiEncoding, so é è à ç ù œ « » — all the
   French a student can type — come out correctly.

   Load it exactly where jsPDF used to be loaded:
       <script src="bba-pdf.js"></script>
   ===================================================================== */
(function () {
"use strict";
if (window.jspdf && window.jspdf.__bba) return;

/* ---------------------------------------------------------- metrics */
/* Adobe's Helvetica widths, 1000 units to the em, for ASCII 32–126.
   Accented letters borrow the width of their base letter, which is exact
   for every Latin-1 accent Helvetica carries. */
var W_REG = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,
  556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,
  667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,
  278,278,278,469,556,333,
  556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,
  334,260,334,584];
var W_BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,
  556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,
  722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,
  333,278,333,584,556,333,
  556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,
  389,280,389,584];

/* Unicode → WinAnsi for the characters outside Latin-1 that a French
   keyboard, a word processor or this site's own copy actually produces. */
var WIN = {
  0x20AC:0x80, 0x201A:0x82, 0x0192:0x83, 0x201E:0x84, 0x2026:0x85, 0x2020:0x86,
  0x2021:0x87, 0x02C6:0x88, 0x2030:0x89, 0x0160:0x8A, 0x2039:0x8B, 0x0152:0x8C,
  0x017D:0x8E, 0x2018:0x91, 0x2019:0x92, 0x201C:0x93, 0x201D:0x94, 0x2022:0x95,
  0x2013:0x96, 0x2014:0x97, 0x02DC:0x98, 0x2122:0x99, 0x0161:0x9A, 0x203A:0x9B,
  0x0153:0x9C, 0x017E:0x9E, 0x0178:0x9F
};
/* Symbols Helvetica has no glyph for. Real jsPDF prints these as blanks or
   question marks; a report that says "OK" beats one that says "?". */
var SUB = {
  0x2713:'OK', 0x2714:'OK', 0x2705:'OK',                       // ✓ ✔ ✅
  0x2717:'X',  0x2718:'X',  0x2715:'X', 0x2716:'X', 0x274C:'X', // ✗ ✘ ✕ ✖ ❌
  0x2248:'~',  0x2192:'->', 0x2190:'<-', 0x21B3:'->',           // ≈ → ← ↳
  0x25B2:'^',  0x25BC:'v',  0x25B6:'>',  0x25C0:'<',            // ▲ ▼ ▶ ◀
  0x270F:'',   0xFE0F:'',   0x200D:''                           // ✏ and the emoji joiners
};
/* Anything with no WinAnsi slot at all falls back to its unaccented form
   rather than a row of question marks. */
function fold(ch) {
  var n = ch.normalize ? ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : ch;
  return n && n.charCodeAt(0) < 256 ? n : '?';
}
function toWinAnsi(str) {
  var out = '', i, c, code;
  str = String(str == null ? '' : str);
  for (i = 0; i < str.length; i++) {
    c = str.charCodeAt(i);
    if (c === 9) { out += '    '; continue; }          // tabs are not a PDF thing
    if (c < 32) continue;
    if (c < 256) { out += String.fromCharCode(c); continue; }
    code = WIN[c];
    if (code) { out += String.fromCharCode(code); continue; }
    if (SUB[c] !== undefined) { out += SUB[c]; continue; }
    /* Emoji and other astral characters carry no meaning a mark scheme
       needs; drop them rather than litter the report with question marks. */
    if (c >= 0xD800 && c <= 0xDBFF) { i++; continue; }          // surrogate pair
    if (c >= 0x2190 && c <= 0x2BFF) continue;                   // arrows, shapes, dingbats
    out += fold(str.charAt(i));
  }
  return out;
}
function widthOf(str, size, bold) {
  var table = bold ? W_BOLD : W_REG, total = 0, i, c;
  var s = toWinAnsi(str);
  for (i = 0; i < s.length; i++) {
    c = s.charCodeAt(i);
    if (c >= 32 && c <= 126) total += table[c - 32];
    else if (c >= 0xC0) {                              // accented letter
      var base = fold(s.charAt(i)).charCodeAt(0);
      total += (base >= 32 && base <= 126) ? table[base - 32] : 556;
    }
    else total += 556;
  }
  return total * size / 1000;
}
function esc(str) {
  return toWinAnsi(str).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/* ------------------------------------------------------------ sizes */
var FORMATS = {                      // in PDF points
  a4:     [595.28, 841.89],
  a5:     [419.53, 595.28],
  letter: [612, 792],
  legal:  [612, 1008]
};

function jsPDF(opts) {
  if (!(this instanceof jsPDF)) return new jsPDF(opts);
  opts = opts || {};
  if (typeof opts === 'string') opts = { orientation: opts };

  var unit = (opts.unit || 'mm').toLowerCase();
  this._k = unit === 'pt' ? 1
          : unit === 'mm' ? 72 / 25.4
          : unit === 'cm' ? 72 / 2.54
          : unit === 'in' ? 72
          : unit === 'px' ? 72 / 96
          : 72 / 25.4;

  var fmt = FORMATS[String(opts.format || 'a4').toLowerCase()] || FORMATS.a4;
  var landscape = /landscape/i.test(opts.orientation || '');
  this._w = landscape ? fmt[1] : fmt[0];
  this._h = landscape ? fmt[0] : fmt[1];

  this._pages = [[]];                // each page is a list of content ops
  this._page = 0;
  this._size = 16;                   // jsPDF's default
  this._bold = false;
  this._italic = false;
  this._rgb = [0, 0, 0];

  /* Some pages read these to work out where the margin is. */
  var self = this;
  this.internal = {
    pageSize: {
      width:  this._w / this._k,  height: this._h / this._k,
      getWidth:  function () { return self._w / self._k; },
      getHeight: function () { return self._h / self._k; }
    },
    getNumberOfPages: function () { return self._pages.length; }
  };
}

jsPDF.prototype.setFont = function (family, style) {
  style = String(style || '').toLowerCase();
  if (style) { this._bold = /bold/.test(style); this._italic = /italic|oblique/.test(style); }
  return this;
};
jsPDF.prototype.setFontSize = function (n) { this._size = +n || this._size; return this; };
jsPDF.prototype.getFontSize = function () { return this._size; };
jsPDF.prototype.setTextColor = function (r, g, b) {
  if (typeof r === 'string') {
    var m = /^#?([0-9a-f]{6})$/i.exec(r.trim());
    if (m) { var v = parseInt(m[1], 16); this._rgb = [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255]; return this; }
    r = parseFloat(r);
  }
  if (g === undefined) { var t = (+r || 0) / 255; this._rgb = [t, t, t]; }
  else this._rgb = [(+r || 0) / 255, (+g || 0) / 255, (+b || 0) / 255];
  return this;
};
jsPDF.prototype.setLineHeightFactor = function () { return this; };
jsPDF.prototype.setDrawColor = jsPDF.prototype.setFillColor = function () { return this; };

/* Wrap on real glyph widths, so a wrapped paragraph fills the line. */
jsPDF.prototype.splitTextToSize = function (text, maxWidth) {
  var self = this;
  var limit = (+maxWidth || 0) * this._k;
  if (!limit) return [String(text == null ? '' : text)];
  var out = [];
  String(text == null ? '' : text).split(/\r?\n/).forEach(function (para) {
    if (!para) { out.push(''); return; }
    var line = '', words = para.split(/(\s+)/);
    words.forEach(function (w) {
      if (!w) return;
      var trial = line + w;
      if (line && widthOf(trial, self._size, self._bold) > limit) {
        out.push(line.replace(/\s+$/, ''));
        line = /^\s+$/.test(w) ? '' : w;
      } else {
        line = trial;
      }
    });
    out.push(line.replace(/\s+$/, ''));
  });
  return out;
};

jsPDF.prototype.addPage = function () {
  this._pages.push([]);
  this._page = this._pages.length - 1;
  return this;
};
jsPDF.prototype.setPage = function (n) {
  var i = Math.max(1, Math.min(this._pages.length, +n || 1)) - 1;
  this._page = i; return this;
};

jsPDF.prototype.text = function (txt, x, y, options) {
  options = options || {};
  var lines = Array.isArray(txt) ? txt : String(txt == null ? '' : txt).split(/\r?\n/);
  var px = (+x || 0) * this._k;
  var py = (+y || 0) * this._k;
  var lead = this._size * (options.lineHeightFactor || 1.15);
  var font = this._bold ? (this._italic ? '/F4' : '/F2') : (this._italic ? '/F3' : '/F1');
  var col = this._rgb.map(function (v) { return Math.round(v * 1000) / 1000; }).join(' ');
  var self = this;

  lines.forEach(function (line, i) {
    var s = String(line == null ? '' : line);
    var w = widthOf(s, self._size, self._bold);
    var tx = px;
    if (options.align === 'center') tx = px - w / 2;
    else if (options.align === 'right') tx = px - w;
    var ty = self._h - (py + i * lead);          // jsPDF measures y from the top
    self._pages[self._page].push(
      'BT ' + col + ' rg ' + font + ' ' + self._size + ' Tf ' +
      (Math.round(tx * 100) / 100) + ' ' + (Math.round(ty * 100) / 100) + ' Td (' + esc(s) + ') Tj ET');
  });
  return this;
};

/* -------------------------------------------------------- assembly */
jsPDF.prototype._build = function () {
  var objs = [], self = this;
  function add(body) { objs.push(body); return objs.length; }        // 1-based

  var catalog = add(null);                                          // 1
  var pagesId = add(null);                                          // 2
  var f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  var f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  var f3 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>');
  var f4 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique /Encoding /WinAnsiEncoding >>');
  var res = '<< /Font << /F1 ' + f1 + ' 0 R /F2 ' + f2 + ' 0 R /F3 ' + f3 + ' 0 R /F4 ' + f4 + ' 0 R >> >>';

  var kids = [];
  this._pages.forEach(function (ops) {
    var stream = ops.join('\n');
    var contentId = add('<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream');
    var pageId = add('<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 ' +
      (Math.round(self._w * 100) / 100) + ' ' + (Math.round(self._h * 100) / 100) + '] /Resources ' +
      res + ' /Contents ' + contentId + ' 0 R >>');
    kids.push(pageId + ' 0 R');
  });

  objs[catalog - 1] = '<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>';
  objs[pagesId - 1] = '<< /Type /Pages /Count ' + kids.length + ' /Kids [' + kids.join(' ') + '] >>';

  var out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  var offsets = [];
  objs.forEach(function (body, i) {
    offsets.push(out.length);
    out += (i + 1) + ' 0 obj\n' + body + '\nendobj\n';
  });
  var xref = out.length;
  out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
  offsets.forEach(function (o) {
    out += ('0000000000' + o).slice(-10) + ' 00000 n \n';
  });
  out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + catalog + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF';

  /* Every character above is already one byte wide, so the offsets are
     byte offsets — but only if we write bytes, not UTF-8. */
  var bytes = new Uint8Array(out.length);
  for (var i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xFF;
  return bytes;
};

jsPDF.prototype.output = function (type) {
  var bytes = this._build();
  if (type === 'arraybuffer') return bytes.buffer;
  if (type === 'datauristring' || type === 'dataurlstring') {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return 'data:application/pdf;filename=generated.pdf;base64,' + btoa(bin);
  }
  return new Blob([bytes], { type: 'application/pdf' });   // 'blob' and the default
};

jsPDF.prototype.save = function (filename) {
  var name = String(filename || 'document.pdf');
  if (!/\.pdf$/i.test(name)) name += '.pdf';
  var url = URL.createObjectURL(this.output('blob'));
  var a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  return this;
};

jsPDF.API = {};
window.jspdf = { jsPDF: jsPDF, __bba: true };
window.jsPDF = jsPDF;                 // older pages reach for the bare name
})();
