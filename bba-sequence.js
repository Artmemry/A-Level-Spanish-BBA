/* ═══════════════════════════════════════════════════════════════════
   BBA · THIS WEEK, IN ORDER — the sequence strip
   ───────────────────────────────────────────────────────────────────
   One homework link can now hold vocabulary lists AND A-Level site
   activities. The teacher ticks them on the dashboard; the student clicks
   one link and is walked through them: Task 1 of 5, 2 of 5 … with a
   Next button. Vocabulary always comes first, then the site activities.

   The same file sits in all four A-Level repositories:
     A-Level-French-Edexcel-Vocab-training   data-site="lex" data-lang="FR"
     A-Level-French-BBA                      data-site="hub" data-lang="FR"
     A-Level-Spanish-Edexcel-Vocabulary-training  lex / ES
     A-Level-Spanish-BBA                     hub / ES
   and is loaded in <head>, before the site's own script, so it reads the
   link (?task=…&step=…) before the site tidies the address bar.

   All four sites live on artmemry.github.io, so they share one browser
   storage: the sequence written here is the one the other site reads.
   Nothing is locked — Next is always there. Nothing is sent anywhere.
   ═══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
var me = document.currentScript || {getAttribute:function(){return "";}};
var SITE = me.getAttribute("data-site") || "";
var LANG = me.getAttribute("data-lang") || "";
var BASES = {
  FR:{lex:"https://artmemry.github.io/A-Level-French-Edexcel-Vocab-training/",
      hub:"https://artmemry.github.io/A-Level-French-BBA/"},
  ES:{lex:"https://artmemry.github.io/A-Level-Spanish-Edexcel-Vocabulary-training/",
      hub:"https://artmemry.github.io/A-Level-Spanish-BBA/"}
};
/* where each site keeps its own task (its storage key + ":task") */
var TASKS = {FR:{lex:"lexique-fr-v2:task", hub:"dossier-fr-v1:task"},
             ES:{lex:"lexico-es-v1:task", hub:"pasaporte-es-v1:task"}};
var OTHER = SITE === "lex" ? "hub" : "lex";
/* the other site gets the task too, filed the way it files its own, so its
   "this week" panel shows it even if the student opens it directly */
function fileOnOther(o){
  try{
    var k = TASKS[LANG][OTHER], st = JSON.parse(localStorage.getItem(k) || "{}") || {};
    if (st.label) st = {all:st};
    st[o.cls || "all"] = o; localStorage.setItem(k, JSON.stringify(st));
  }catch(e){}
}
/* Short, high-frequency words in the target language; sentences in English. */
var W = {
  FR:{go:"Commencer", open:"Ouvrir ↗", next:"Suivant →", back:"← Retour", there:"Y aller →", all:"Liste", close:"Fermer"},
  ES:{go:"Empezar",   open:"Abrir ↗",  next:"Siguiente →", back:"← Atrás", there:"Ir →",     all:"Lista", close:"Cerrar"}
}[LANG] || {go:"Start", open:"Open ↗", next:"Next →", back:"← Back", there:"Go →", all:"List", close:"Close"};
var TAG = {l:"Vocab", a:"A-Level site"};
var KEY = "bba-seq-v1";
if (!BASES[LANG] || (SITE !== "lex" && SITE !== "hub")) return;

function readAll(){ try{ return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; }catch(e){ return {}; } }
function writeAll(o){ try{ localStorage.setItem(KEY, JSON.stringify(o)); }catch(e){} }
function cur(){ var a = readAll()[LANG]; return (a && Array.isArray(a.s) && a.s.length) ? a : null; }
function setCur(fn){ var all = readAll(); if (all[LANG]){ fn(all[LANG]); writeAll(all); } }
function decode(str){
  try{
    var b = String(str||"").replace(/-/g,"+").replace(/_/g,"/");
    while (b.length % 4) b += "=";
    var o = JSON.parse(decodeURIComponent(escape(atob(b))));
    return (o && typeof o === "object") ? o : null;
  }catch(e){ return null; }
}

/* ── 1. read the link ─────────────────────────────────────────────── */
(function(){
  var q = location.search || "";
  var m = /[?&]task=([^&#]+)/.exec(q), sm = /[?&]step=(\d+)/.exec(q);
  if (m){
    var raw = decodeURIComponent(m[1]), all = readAll();
    if (/^(none|clear|off)$/i.test(raw)){
      if (all[LANG]) try{ localStorage.removeItem(TASKS[LANG][OTHER]); }catch(e){}
      delete all[LANG];
    }
    else {
      var o = decode(raw);
      if (o && o.label){
        if (Array.isArray(o.seq) && o.seq.length){
          /* the steps: the lists first, then the activities; o.seq holds their titles */
          var keys = [].concat((o.lessons||[]).map(function(k){ return ["l", k]; }),
                               (o.items||[]).map(function(k){ return ["a", k]; }));
          keys.forEach(function(x, j){ x.push(o.seq[j] || x[1]); });
          var t = o.t || 0, old = all[LANG];
          if (keys.length && (!old || old.t !== t)){
            all[LANG] = {t:t, label:o.label, cls:o.cls||"", raw:raw, s:keys, i:0, done:{}, shut:0};
            o.t = t || Date.now(); fileOnOther(o);
          }
        } else delete all[LANG];          /* a newer one-site task replaces the sequence */
      }
    }
    writeAll(all);
  }
  if (sm){ setCur(function(a){ a.i = Math.max(0, Math.min(a.s.length - 1, +sm[1])); a.shut = 0; }); }
  if (sm){                                   /* tidy ?step= away; leave ?task= for the site */
    try{
      var rest = q.replace(/[?&]step=\d+/, "").replace(/^&/, "?");
      history.replaceState(null, "", location.pathname + (rest.length > 1 ? rest : "") + location.hash);
    }catch(e){}
  }
})();

/* ── 2. moving between steps ──────────────────────────────────────── */
function siteOf(step){ return step[0] === "l" ? "lex" : "hub"; }
function hrefFor(a, i){
  var st = a.s[i], s = siteOf(st);
  return BASES[LANG][s] + "?task=" + encodeURIComponent(a.raw) + "&step=" + i + (s === "lex" ? "#" + st[1] : "");
}
function act(a, i){
  var st = a.s[i];
  if (siteOf(st) !== SITE){ location.href = hrefFor(a, i); return; }
  if (st[0] === "l"){
    if (location.hash.replace(/^#\/?/, "") === st[1]){
      try{ window.dispatchEvent(new HashChangeEvent("hashchange")); }catch(e){ location.hash = ""; location.hash = st[1]; }
    } else location.hash = st[1];
    try{ window.scrollTo(0, 0); }catch(e){}
  } else {
    if (!(window.bbaSeqOpen && window.bbaSeqOpen(st[1]))) window.open(BASES[LANG].hub + encodeURI(st[1]), "_blank", "noopener");
  }
}
function goTo(i, andAct){
  var a = cur(); if (!a) return;
  i = Math.max(0, Math.min(a.s.length - 1, i));
  setCur(function(x){ x.i = i; });
  a.i = i;
  /* a step on the other site is reached by going there; on this site, a
     vocabulary list opens at once and an activity waits for its Open button,
     so no tab appears that the student did not ask for */
  if (siteOf(a.s[i]) !== SITE || (andAct && a.s[i][0] === "l")) act(a, i);
  paint();
}

/* ── 3. the sites tell the strip what is done ─────────────────────── */
window.BBA_SEQ = {
  mark: function(site, key, done){
    var a = cur(); if (!a) return;
    var k = site + ":" + key;
    if (!!(a.done || {})[k] === !!done) return;
    setCur(function(x){ x.done = x.done || {}; if (done) x.done[k] = 1; else delete x.done[k]; });
    paint();
  }
};
function isDone(a, st){ return !!(a.done || {})[siteOf(st) + ":" + st[1]]; }

/* ── 4. the strip ─────────────────────────────────────────────────── */
var CSS = ""
 + "#bbaSeq{position:fixed;left:0;right:0;bottom:0;z-index:900;background:#1A2440;color:#fff;"
 + "font:500 15px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"
 + "box-shadow:0 -4px 18px rgba(0,0,0,.18)}"
 + "#bbaSeq.done{background:#1F6B45}"
 + "#bbaSeq .in{max-width:1100px;margin:0 auto;padding:10px 16px;display:flex;gap:10px 14px;align-items:center;flex-wrap:wrap}"
 + "#bbaSeq .txt{flex:1 1 260px;min-width:0}"
 + "#bbaSeq .top{font-size:.78rem;letter-spacing:.04em;opacity:.8;text-transform:uppercase}"
 + "#bbaSeq .now{font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"
 + "#bbaSeq .tag{display:inline-block;font-size:.7rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;"
 + "border:1px solid rgba(255,255,255,.55);border-radius:20px;padding:1px 8px;margin-right:6px;vertical-align:1px}"
 + "#bbaSeq .ok{color:#9BE3B8;margin-left:6px}"
 + "#bbaSeq button{font:inherit;font-size:.9rem;font-weight:650;border-radius:9px;padding:8px 14px;cursor:pointer;"
 + "border:1.5px solid rgba(255,255,255,.7);background:transparent;color:#fff}"
 + "#bbaSeq button.main{background:#fff;color:#1A2440;border-color:#fff}"
 + "#bbaSeq button[disabled]{opacity:.35;cursor:default}"
 + "#bbaSeq .btns{display:flex;gap:8px;flex-wrap:wrap}"
 + "#bbaSeq ol{list-style:none;margin:0;padding:0 16px 12px;max-width:1100px;margin:0 auto;display:grid;gap:4px}"
 + "#bbaSeq ol button{width:100%;text-align:left;border:0;border-radius:6px;padding:6px 10px;font-weight:500;background:rgba(255,255,255,.08)}"
 + "#bbaSeq ol button.on{background:rgba(255,255,255,.22);font-weight:700}"
 + "@media print{#bbaSeq{display:none}}";
var listOpen = false;
function el(tag, attrs){
  var e = document.createElement(tag);
  for (var k in (attrs||{})){ if (k === "text") e.textContent = attrs[k]; else if (k.slice(0,2) === "on") e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]); }
  for (var i = 2; i < arguments.length; i++){ var c = arguments[i]; if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }
  return e;
}
function paint(){
  var box = document.getElementById("bbaSeq");
  var a = cur();
  if (!a || a.shut){ if (box) box.remove(); document.body.style.paddingBottom = ""; return; }
  if (!box){
    if (!document.getElementById("bbaSeqCss")){ var s = el("style", {id:"bbaSeqCss"}); s.textContent = CSS; document.head.appendChild(s); }
    box = el("div", {id:"bbaSeq", role:"region", "aria-label":"This week's tasks, in order"});
    document.body.appendChild(box);
  }
  var n = a.s.length, i = Math.max(0, Math.min(n - 1, a.i || 0)), st = a.s[i];
  var nDone = a.s.filter(function(x){ return isDone(a, x); }).length, all = nDone === n;
  box.className = all ? "done" : "";
  box.innerHTML = "";
  var here = siteOf(st) === SITE;
  var main = el("button", {"class":"main", type:"button", onclick:function(){ act(a, i); }},
                here ? (st[0] === "l" ? W.go : W.open) : W.there);
  var row = el("div", {"class":"in"},
    el("div", {"class":"txt"},
      el("div", {"class":"top"}, (all ? "All " + n + " tasks done ✓ — send it to your teacher" : "This week · " + a.label)
                               + " · task " + (i + 1) + " of " + n + (all ? "" : " · " + nDone + " done")),
      el("div", {"class":"now"}, el("span", {"class":"tag"}, TAG[st[0]] || ""), st[2] || st[1],
         isDone(a, st) ? el("span", {"class":"ok"}, "✓") : null)),
    el("div", {"class":"btns"},
      el("button", {type:"button", onclick:function(){ goTo(i - 1, true); }}, W.back),
      main,
      el("button", {type:"button", onclick:function(){ goTo(i + 1, true); }}, W.next),
      el("button", {type:"button", "aria-expanded":String(listOpen), onclick:function(){ listOpen = !listOpen; paint(); }}, W.all + (listOpen ? " ▾" : " ▸")),
      all ? el("button", {type:"button", onclick:function(){ setCur(function(x){ x.shut = 1; }); paint(); }}, W.close) : null));
  if (i === n - 1) row.querySelectorAll(".btns button")[2].disabled = true;
  if (i === 0) row.querySelectorAll(".btns button")[0].disabled = true;
  box.appendChild(row);
  if (listOpen){
    var ol = el("ol");
    a.s.forEach(function(x, j){
      ol.appendChild(el("li", null, el("button", {type:"button", "class":j === i ? "on" : "", onclick:function(){ goTo(j, true); }},
        (j + 1) + ". " + (TAG[x[0]] || "") + " · " + (x[2] || x[1]) + (isDone(a, x) ? "  ✓" : ""))));
    });
    box.appendChild(ol);
  }
  document.body.style.paddingBottom = (box.offsetHeight + 12) + "px";
}
window.addEventListener("storage", function(e){ if (!e.key || e.key === KEY) paint(); });
window.addEventListener("resize", function(){ var b = document.getElementById("bbaSeq"); if (b) document.body.style.paddingBottom = (b.offsetHeight + 12) + "px"; });
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paint); else paint();
})();
