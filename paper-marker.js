/* BBA Paper 1 training – automatic marking (v2, Oct 2026): Sections A, B and C.
   Each item lists mark points; a point is scored when one of its
   alternatives is found, and an alternative is found when every group
   in it has at least one of its stems in the answer (accents ignored). */
(function(){
"use strict";
var KEY = JSON.parse(document.getElementById("lp-key").textContent);
function norm(t){
  return " " + String(t||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")
    .replace(/[’`´]/g,"'").replace(/œ/g,"oe").replace(/\s+/g," ").trim() + " ";
}
function get(path){ return path.split(".").reduce(function(o,k){ return o==null?o:o[k]; }, KEY); }
function hit(text, alt){ return alt.every(function(g){ return g.some(function(st){ return text.indexOf(norm(st).trim())>=0; }); }); }
function scoreOpen(text, k, max){
  var t = norm(text); if(!t.trim()) return 0;
  var n = 0;
  k.pts.forEach(function(point){ if(point.some(function(alt){ return hit(t, alt); })) n++; });
  return Math.min(n, max);
}
function items(){ return Array.prototype.slice.call(document.querySelectorAll(".item[data-k]")); }
function feedbackFor(item){
  var nx = item.nextElementSibling;
  if (nx && nx.classList.contains("mark")) nx = nx.nextElementSibling;
  if (nx && nx.classList.contains("fb")) return nx;
  var fb = document.createElement("div"); fb.className = "fb";
  var anchor = item.nextElementSibling && item.nextElementSibling.classList.contains("mark") ? item.nextElementSibling : item;
  anchor.insertAdjacentElement("afterend", fb);
  return fb;
}
var RESULT = null;
function secOf(path){ return path.indexOf("B.")===0 ? "B" : (path==="C" ? "C" : "A"); }
function scoreTrans(text){
  var t = norm(text), rows = [], n = 0;
  KEY.C.forEach(function(c){
    var ok = !!t.trim() && c.pts.some(function(point){ return point.some(function(alt){ return hit(t, alt); }); });
    if (ok) n++; rows.push({fr:c.es||c.fr, ans:c.ans, ok:ok});
  });
  return {score:n, rows:rows};
}
var DONE = {};   /* results per section: A, B, C */
var MAXSEC = {A:30, B:30, C:20}, NAMES = {A:"Section A Listening", B:"Section B Reading", C:"Section C Translation"};
function mark(which){
  var secs = which && which !== "all" ? [which] : ["A","B","C"];
  secs.forEach(function(sc){
    var rows = [], total = 0;
    items().filter(function(item){ return secOf(item.dataset.k) === sc; }).forEach(function(item){
      var path = item.dataset.k, max = +item.dataset.max, t = item.dataset.t, given, got, model, extra = "";
      if (t === "mc"){
        var want = get(path);
        given = item.querySelector(".mcval").value;
        got = (given === want) ? 1 : 0; model = want;
        item.querySelectorAll(".opt").forEach(function(b){ b.classList.toggle("right", b.dataset.v === want); });
      } else if (t === "tick"){
        var keys = get(path); given = item.querySelector(".mcval").value;
        var picked = given.split("").filter(Boolean), right = picked.filter(function(x){ return keys.indexOf(x) >= 0; }).length;
        got = Math.max(0, right - Math.max(0, picked.length - max)); model = keys.join(", ");
        item.querySelectorAll(".opt").forEach(function(b){ b.classList.toggle("right", keys.indexOf(b.dataset.v) >= 0); });
        if (picked.length > max) extra = "You ticked " + picked.length + " boxes: one mark is lost for each box over " + max + ". ";
      } else if (t === "trans"){
        given = item.querySelector("textarea").value;
        var r = scoreTrans(given); got = r.score; model = r.rows.map(function(x){ return x.ans; }).join(" ");
        item._trans = r.rows;
      } else {
        var k = get(path);
        given = item.querySelector("textarea").value;
        got = scoreOpen(given, k, max); model = k.ans;
      }
      total += got;
      rows.push({lab:item.dataset.lab, given:given, got:got, max:max, model:model});
      var fb = feedbackFor(item);
      fb.className = "fb " + (got===max ? "full" : got>0 ? "part" : "zero");
      if (t === "trans"){
        fb.className += " trans-fb";
        fb.innerHTML = "<b>" + got + " / " + max + "</b>" + (given.trim() ? "One mark for each part of the text you translated accurately." : "No answer.") +
          "<table>" + item._trans.map(function(x){ return "<tr><td class='" + (x.ok?"ok'>✓":"no'>✗") + "</td><td>" + esc(x.fr) + "</td><td>" + esc(x.ans) + "</td></tr>"; }).join("") + "</table>";
      } else {
        fb.innerHTML = "<b>" + got + " / " + max + "</b>" + extra + (String(given).trim() ? "" : "No answer. ") +
          (got===max && (t==="mc"||t==="tick") ? "" : "Mark scheme: " + esc(model));
      }
      item.classList.add("locked");
      var ta = item.querySelector("textarea"); if (ta) ta.readOnly = true;
    });
    DONE[sc] = {rows:rows, total:total};
    var box = document.getElementById("lp-res-" + sc);
    if (box){ box.hidden = false;
      box.innerHTML = "<p><b>" + NAMES[sc] + ": " + total + " / " + MAXSEC[sc] + "</b></p>" +
        "<p>The computer marks key ideas, so it can miss an answer that means the same thing. Read each mark-scheme line under your answers; if you think yours deserves the mark, tell your teacher.</p>"; }
  });
  summary();
  return result();
}
function result(){
  var rows = [], total = 0, max = 0, sec = {};
  ["A","B","C"].forEach(function(sc){ if (DONE[sc]){ rows = rows.concat(DONE[sc].rows); total += DONE[sc].total; max += MAXSEC[sc]; sec[sc] = DONE[sc].total; } });
  return {rows:rows, total:total, max:max, sec:sec};
}
function summary(){
  var R = result(), res = document.getElementById("lp-res");
  if (!R.max){ res.hidden = true; return; }
  res.hidden = false;
  res.innerHTML = "<p><b>Marked so far: " + R.total + " / " + R.max + "</b>" + (R.max === 80 ? " (whole paper)" : "") + "</p><p>" +
    ["A","B","C"].map(function(sc){ return NAMES[sc] + ": " + (DONE[sc] ? DONE[sc].total + " / " + MAXSEC[sc] : "not marked yet"); }).join(" · ") + "</p>";
  publish(R.total, R.max, R.rows.filter(function(r){ return String(r.given||"").trim(); }).length);
}
/* same record the activity kit writes, so the hub tile and the Progress code show the mark */
function publish(scored, total, answered){
  try{
    var all = JSON.parse(localStorage.getItem("bba-scores") || "{}");
    var f = decodeURIComponent(location.pathname.split("/").pop() || "index");
    var prev = all[f] || {};
    var rec = all[f] = { title:(document.title||"").slice(0,120), score:scored, total:total,
      best: Math.max(scored/total, prev.best || 0), attempts:(prev.attempts||0)+1, t:Date.now() };
    rec.ans = (prev.ans||0) + answered;
    rec.lg = {}; for (var k in (prev.lg||{})) rec.lg[k] = prev.lg[k];
    var day = String(Math.floor(Date.now()/86400000)); if (answered) rec.lg[day] = (rec.lg[day]||0) + answered;
    localStorage.setItem("bba-scores", JSON.stringify(all));
  }catch(e){}
}
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function csv(v){ return '"' + String(v==null?"":v).replace(/"/g,'""').replace(/\r?\n/g," ") + '"'; }
function download(){
  var R = result(); if (!R.max) R = mark("all");
  var name = (document.getElementById("cand").value || "").trim();
  var title = document.title.replace(/[\\\/:*?"<>|]/g,"-");
  var d = new Date(), p2 = function(n){ return (n<10?"0":"")+n; };
  var stamp = d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate());
  var L = [[ "Student", name || "(no name)" ],[ "Paper", title ],[ "Date", stamp+" "+p2(d.getHours())+":"+p2(d.getMinutes()) ],
           [ "Mark (automatic)", R.total+" / "+R.max ],[ "Sections marked", ["A","B","C"].map(function(sc){ return sc+": "+(sc in R.sec ? R.sec[sc]+" / "+MAXSEC[sc] : "not marked"); }).join(" · ") ],[],[ "Question","Answer","Mark","Out of","Mark scheme" ]].map(function(r){ return r.map(csv).join(","); });
  R.rows.forEach(function(r){ L.push([r.lab, r.given, r.got, r.max, r.model].map(csv).join(",")); });
  var defi = document.querySelectorAll(".defi textarea");
  var dl = (document.querySelector(".defi") || {dataset:{}}).dataset.label || "Défi";
  if (defi.length){ L.push(""); L.push(csv(dl+" (not marked)")); defi.forEach(function(t,i){ if(t.value.trim()) L.push([ dl+" "+(i+1), t.value ].map(csv).join(",")); }); }
  var blob = new Blob(["﻿"+L.join("\r\n")], {type:"text/csv;charset=utf-8;"});
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = (name ? name+" - " : "") + title + " - " + stamp + ".csv";
  document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 0);
}
function reset(){
  if (!confirmReset()) return;
  document.querySelectorAll("textarea.ans").forEach(function(t){ t.readOnly=false; t.value=""; t.dispatchEvent(new Event("input",{bubbles:true})); });
  document.querySelectorAll(".mcval").forEach(function(f){ f.value=""; f.dispatchEvent(new Event("input",{bubbles:true})); });
  document.querySelectorAll(".fb").forEach(function(f){ f.remove(); });
  document.querySelectorAll(".opt.right").forEach(function(b){ b.classList.remove("right"); });
  document.querySelectorAll(".item.locked").forEach(function(i){ i.classList.remove("locked"); }); document.querySelectorAll(".lpres").forEach(function(b){ b.hidden = true; }); DONE = {};
  window.scrollTo(0,0);
}
var armed = 0;
function confirmReset(){
  var b = document.getElementById("lp-reset");
  if (armed && Date.now()-armed < 4000){ armed = 0; b.textContent = "Start again"; return true; }
  armed = Date.now(); b.textContent = "Click again to clear all answers"; 
  setTimeout(function(){ if(armed){ armed=0; b.textContent="Start again"; } }, 4000);
  return false;
}
document.querySelectorAll("[data-mark]").forEach(function(b){ b.addEventListener("click", function(){ var w = b.dataset.mark; mark(w); var box = document.getElementById(w === "all" ? "lp-res" : "lp-res-" + w); if (box) box.scrollIntoView({behavior:"smooth",block:"center"}); }); });
document.getElementById("lp-dl").addEventListener("click", download);
document.getElementById("lp-reset").addEventListener("click", reset);
window.LPMark = {norm:norm, scoreOpen:scoreOpen, get:get, mark:mark};
})();
