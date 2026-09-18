/* =====================================================================
   BBA progress — one place where real scores live.

   Until now the hub counted ticks. A student could mark all 91 activities
   done without opening one, and the code you received said 100 %. The
   activities meanwhile were recording genuine scores and throwing them
   away when the tab closed.

   This file is the bus between the two. Activities call record(); the hub
   and the teacher dashboard read the same store and pack it into a code
   that carries evidence instead of a claim.

       localStorage["bba-scores"]
         "<file.html>": { title, score, total, best, attempts, t, first }

   bba-kit-fr.js v2 already writes that shape, so the 92 kit pages need no
   change. Pages that mark themselves — the translation papers, the
   vocabulary trainer — call BBAProgress.record() when a run finishes.

   Load before any script that uses it:
       <script src="bba-progress.js"></script>
   ===================================================================== */
(function () {
"use strict";
if (window.BBAProgress) return;

var KEY = "bba-scores";

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; }
  catch (e) { return {}; }
}
function writeAll(obj) {
  try { localStorage.setItem(KEY, JSON.stringify(obj)); return true; }
  catch (e) { return false; }        // private mode: the page still works
}
function fileOf(name) {
  if (name) return name;
  return decodeURIComponent((location.pathname.split("/").pop() || "index.html"));
}

/* ------------------------------------------------------------- record */
/* record({score, total})                  the common case
   record({score, total, file, title})     when a page reports for another
   record({score, total, parts:{SP1:[9,15]}})  per-unit detail, kept small */
function record(opts) {
  opts = opts || {};
  var score = Math.max(0, +opts.score || 0);
  var total = Math.max(0, +opts.total || 0);
  if (!total) return null;

  var all = readAll();
  var file = fileOf(opts.file);
  var prev = all[file] || {};

  var rec = {
    title:    opts.title || prev.title || (document.title || file).slice(0, 120),
    score:    score,
    total:    total,
    best:     Math.max(score / total, prev.total ? (prev.best || 0) : 0),
    attempts: (prev.attempts || 0) + 1,
    t:        Date.now(),
    first:    prev.first || Date.now()
  };
  /* best is stored as a fraction so a later change of total cannot corrupt it */
  if (opts.parts) rec.parts = opts.parts;
  all[file] = rec;
  writeAll(all);
  return rec;
}

function forFile(file) {
  var r = readAll()[fileOf(file)];
  return r || null;
}
function pctOf(rec) {
  if (!rec || !rec.total) return null;
  var best = typeof rec.best === "number" ? rec.best : (rec.score / rec.total);
  if (best > 1) best = best / rec.total;              // tolerate an older raw-mark best
  return Math.round(best * 100);
}
function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }

/* --------------------------------------------------------- packing */
/* A code has to be short enough to paste on a phone. Only activities the
   student has actually touched are carried, three bytes each:
     0  index in the hub's catalogue (0–254)
     1  best percentage 0–100, or 255 for "attempted, nothing scorable"
     2  bit0 ticked · bits1–2 confidence 0–3 · bits3–7 attempts, capped 31 */
var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function b64encode(bytes) {
  var out = "", i, a, b, c;
  for (i = 0; i < bytes.length; i += 3) {
    a = bytes[i]; b = bytes[i + 1]; c = bytes[i + 2];
    out += B64.charAt(a >> 2);
    out += B64.charAt(((a & 3) << 4) | ((b === undefined ? 0 : b) >> 4));
    out += b === undefined ? "=" : B64.charAt(((b & 15) << 2) | ((c === undefined ? 0 : c) >> 6));
    out += c === undefined ? "=" : B64.charAt(c & 63);
  }
  return out;
}
function b64decode(str) {
  var clean = String(str || "").replace(/[^A-Za-z0-9+/]/g, ""), out = [], i, n, chunk;
  for (i = 0; i < clean.length; i += 4) {
    chunk = 0; n = 0;
    for (var j = 0; j < 4 && i + j < clean.length; j++) { chunk = (chunk << 6) | B64.indexOf(clean.charAt(i + j)); n++; }
    chunk = chunk << (6 * (4 - n));
    if (n >= 2) out.push((chunk >> 16) & 255);
    if (n >= 3) out.push((chunk >> 8) & 255);
    if (n >= 4) out.push(chunk & 255);
  }
  return out;
}

function pack(rows) {
  var bytes = [];
  rows.forEach(function (r) {
    if (r.index > 254) return;
    bytes.push(r.index & 255);
    bytes.push(r.pct == null ? 255 : Math.max(0, Math.min(100, Math.round(r.pct))));
    bytes.push(((r.ticked ? 1 : 0)) |
               ((Math.max(0, Math.min(3, r.conf || 0))) << 1) |
               ((Math.max(0, Math.min(31, r.attempts || 0))) << 3));
  });
  return b64encode(bytes);
}
function unpack(str) {
  var b = b64decode(str), out = [], i;
  for (i = 0; i + 2 < b.length; i += 3) {
    out.push({
      index:    b[i],
      pct:      b[i + 1] === 255 ? null : b[i + 1],
      ticked:   !!(b[i + 2] & 1),
      conf:     (b[i + 2] >> 1) & 3,
      attempts: (b[i + 2] >> 3) & 31
    });
  }
  return out;
}

/* A catalogue fingerprint, so a dashboard can tell whether the code it is
   reading was made against the same list of activities it knows about. */
function fingerprint(ids) {
  var h = 0x811c9dc5, s = ids.join("|"), i;
  for (i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ("00000000" + h.toString(16)).slice(-8).slice(0, 6);
}

window.BBAProgress = {
  KEY: KEY,
  read: readAll,
  record: record,
  forFile: forFile,
  pct: pctOf,
  clear: clear,
  pack: pack,
  unpack: unpack,
  fingerprint: fingerprint,
  version: 1
};
})();
