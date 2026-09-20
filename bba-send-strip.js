/* =====================================================================
   BBA send — the score, and the one way to send it.

   Almost every activity already ends with the kit's bar: name, accents,
   check, download. A second bar underneath it would be two controls doing
   one job, so where #bba-kit is on the page this joins it, and only where
   there is no kit does it draw a bar of its own.

   The code is still built in the hub, not here — one place, no drift. The
   button opens the hub with ?send=1 and the hub does what its Send does.
   ===================================================================== */
(function () {
"use strict";
if (window.BBAStrip) return;
window.BBAStrip = true;

var T = {recorded:"Recorded:", notYet:"Finish the activity and your score is saved here automatically.", thisTerm:function(n){return n+" activities recorded on this device";}, back:"\u2190 All activities", send:"Enviar a tu profesor \u2192"};
var HUB = "index.html";
var KEY = "bba-scores";

function file() { return decodeURIComponent((location.pathname.split("/").pop() || "").trim()); }
function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; }
  catch (e) { return {}; }
}
function pctOf(r) {
  if (!r || !r.total) return null;
  var best = typeof r.best === "number" ? r.best : (r.score / r.total);
  if (best > 1) best = best / r.total;
  return Math.round(best * 100);
}
/* the shape bba-kit and BBAProgress write, so the hub needs no change */
function record(pct) {
  try {
    var all = readAll(), f = file(), prev = all[f] || {};
    var frac = Math.max(0, Math.min(1, pct / 100));
    all[f] = { title: prev.title || (document.title || f).slice(0, 120),
               score: Math.round(frac * 100), total: 100,
               best: Math.max(frac, prev.total ? (prev.best || 0) : 0),
               attempts: (prev.attempts || 0) + 1,
               t: Date.now(), first: prev.first || Date.now() };
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch (e) {}
}
function howMany() {
  var all = readAll(), n = 0, k;
  for (k in all) if (Object.prototype.hasOwnProperty.call(all, k)) n++;
  return n;
}

var scoreEl, sendEl, ownBar = null;

function paint() {
  if (!scoreEl) return;
  var p = pctOf(readAll()[file()]), n = howMany();
  scoreEl.textContent = p == null ? "" : T.recorded + " " + p + "%";
  scoreEl.title = n ? T.thisTerm(n) : "";
  scoreEl.style.display = p == null ? "none" : "";
}

/* --------------------------------------------------- join the kit's bar */
function joinKit(act) {
  var css = document.createElement("style");
  css.textContent =
    "#bba-kit .act .bba-score{font-weight:700;white-space:nowrap;margin-right:2px}" +
    /* On three pages the bar wraps tightly and the kit's hint line comes to
       lie over the buttons, swallowing the click. The hint is a status line
       with nothing to click in it, so let the clicks through. */
    "#bba-kit .msg{pointer-events:none}" +
    "#bba-kit .act .bba-score,#bba-kit .act .bba-send{position:relative;z-index:3}" +
    "#bba-kit .act .bba-send{background:#B07B12;color:#fff;text-decoration:none;border-radius:6px;" +
    "padding:6px 12px;font-weight:700;white-space:nowrap}" +
    "#bba-kit .act .bba-send:hover{filter:brightness(1.12)}";
  document.head.appendChild(css);

  scoreEl = document.createElement("span");
  scoreEl.className = "bba-score";
  sendEl = document.createElement("a");
  sendEl.className = "bba-send";
  sendEl.href = HUB + "?send=1";
  sendEl.textContent = T.send;

  /* before the minimise button, so the order reads left to right and the
     send survives the bar being collapsed */
  var min = act.querySelector(".min");
  if (min) { act.insertBefore(scoreEl, min); act.insertBefore(sendEl, min); }
  else { act.appendChild(scoreEl); act.appendChild(sendEl); }

  /* Fourteen pages already had a second bar of their own — a .dock, a
     #scoreBar — sitting on top of the kit's, hiding it. That predates the
     send button, but the send button now lives in the hidden bar, so lift
     the kit clear of whatever else is pinned to the foot. */
  var kit = document.getElementById("bba-kit");
  function liftKit() {
    if (!kit) return;
    var h = 0, all = document.body.getElementsByTagName("*"), i, el, st, r;
    for (i = 0; i < all.length; i++) {
      el = all[i];
      if (el === kit || kit.contains(el) || el.contains(kit)) continue;
      st = window.getComputedStyle(el);
      if (st.position !== "fixed" || st.display === "none" || st.visibility === "hidden") continue;
      r = el.getBoundingClientRect();
      if (r.height < 8 || r.width < window.innerWidth * 0.5) continue;
      if (Math.abs(r.bottom - window.innerHeight) > 4) continue;
      if (r.height > h) h = r.height;
    }
    kit.style.bottom = Math.round(h) + "px";
    if (h) document.body.style.paddingBottom =
      Math.round(h + kit.getBoundingClientRect().height + 16) + "px";
  }
  liftKit();
  window.addEventListener("resize", liftKit);
  setTimeout(liftKit, 800);
}

/* ------------------------------------- or draw one, where there is no kit */
function ownStrip() {
  var css = document.createElement("style");
  css.textContent =
    ".bba-strip{position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:center;" +
    "gap:14px;flex-wrap:wrap;padding:10px 18px;background:#FDF9F2;border-top:2px solid #1A2440;" +
    'font:500 15px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1A2440;' +
    "box-shadow:0 -2px 10px rgba(0,0,0,.07)}" +
    ".bba-strip .sp{flex:1}.bba-strip .bba-score{font-weight:700}" +
    ".bba-strip a.bba-send{background:#1A2440;color:#fff;text-decoration:none;padding:9px 16px;" +
    "border-radius:7px;font-weight:600;white-space:nowrap}" +
    ".bba-strip a.bba-send:hover{background:#2B4C9B}.bba-strip a.bba-hub{color:#2B4C9B}" +
    "@media print{.bba-strip{display:none}}";
  document.head.appendChild(css);

  ownBar = document.createElement("div");
  ownBar.className = "bba-strip";
  ownBar.setAttribute("role", "status");
  scoreEl = document.createElement("span"); scoreEl.className = "bba-score";
  ownBar.appendChild(scoreEl);
  ownBar.appendChild(Object.assign(document.createElement("span"), {className: "sp"}));
  var hub = document.createElement("a");
  hub.className = "bba-hub"; hub.href = HUB; hub.textContent = T.back;
  ownBar.appendChild(hub);
  sendEl = document.createElement("a");
  sendEl.className = "bba-send"; sendEl.href = HUB + "?send=1"; sendEl.textContent = T.send;
  ownBar.appendChild(sendEl);
  document.body.appendChild(ownBar);
  lift();
  window.addEventListener("resize", lift);
  setTimeout(lift, 700);
}
/* a page with no kit may still have a bar of its own: sit above it */
function lift() {
  if (!ownBar) return;
  var h = 0, all = document.body.getElementsByTagName("*"), i, el, st, r;
  for (i = 0; i < all.length; i++) {
    el = all[i];
    if (el === ownBar || ownBar.contains(el)) continue;
    st = window.getComputedStyle(el);
    if (st.position !== "fixed" || st.display === "none" || st.visibility === "hidden") continue;
    r = el.getBoundingClientRect();
    if (r.height < 8 || r.width < window.innerWidth * 0.5) continue;
    if (Math.abs(r.bottom - window.innerHeight) > 4) continue;
    if (r.height > h) h = r.height;
  }
  ownBar.style.bottom = Math.round(h) + "px";
  document.body.style.paddingBottom =
    Math.round(h + ownBar.getBoundingClientRect().height + 16) + "px";
}

/* ------------------------------------------- self-marking pages, watched */
function watchScore() {
  var el = document.getElementById("score");
  if (!el) return;
  var touched = false, last = el.textContent;
  document.addEventListener("click", function () { touched = true; }, true);
  new MutationObserver(function () {
    var txt = el.textContent;
    if (txt === last) return;
    last = txt;
    if (!touched) return;
    var m = /-?\d+(\.\d+)?/.exec(txt);
    if (!m) return;
    record(parseFloat(m[0]));
    paint();
  }).observe(el, {childList: true, characterData: true, subtree: true});
}

/* The kit builds its bar in script, so it may not be there on first tick.
   Look a few times, then settle for a strip of our own. */
function start() {
  if (!document.body) return;
  /* A page can switch every kit feature off, and then no bar is ever built.
     Waiting on one would leave the student with no way to send for two
     seconds, so ask first and only wait where a bar is actually coming. */
  var cfg = window.BBA_KIT || {};
  var kitComing = !!document.querySelector('script[src*="bba-kit"]') &&
    !(cfg.check === false && cfg.download === false && cfg.pad === false && cfg.name === false);
  if (!kitComing) { ownStrip(); after(); return; }
  var tries = 0;
  (function look() {
    var act = document.querySelector("#bba-kit .act");
    if (act) { joinKit(act); after(); return; }
    if (++tries < 8) { setTimeout(look, 100); return; }
    ownStrip(); after();
  })();
}
function after() {
  paint();
  watchScore();
  window.addEventListener("pageshow", paint);
  document.addEventListener("visibilitychange", paint);
  setInterval(paint, 4000);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
})();
