/* BBA Paper 1 training – automatic marking (v3, 30 Oct 2026): Sections A, B and C.
   v3: every item shows the answers that score, point by point (found / not found),
   and students may award themselves a mark with a reason; the automatic mark and
   the student's own mark are kept apart in the results file.
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
function hits(text, k){ var t = norm(text); return k.pts.map(function(point){ return !!t.trim() && point.some(function(alt){ return hit(t, alt); }); }); }
function splitAns(ans, n){
  var s = String(ans).replace(/^Any \d+( from \d+)?:\s*/, "").replace(/^\(1 from \d+\)\s*/, "");
  var parts = s.split(/\s+(?:–|AND)\s+/);
  return parts.length === n ? parts : null;
}
(function(){ var st = document.createElement("style"); st.textContent =
  ".fb .pts{margin:6px 0 4px;padding-left:0;list-style:none}.fb .pts li{margin:2px 0;padding-left:22px;text-indent:-22px}" +
  ".fb .pts li.ok::before{content:'\\2713';display:inline-block;width:22px;text-indent:0;color:#2e7d52;font-weight:bold}" +
  ".fb .pts li.no::before{content:'\\25CB';display:inline-block;width:22px;text-indent:0;color:#8a8a8a}" +
  ".fb .hd{display:block;margin-top:4px;font-weight:bold}.fb .claim{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin-top:8px;padding-top:6px;border-top:1px dashed #c8c8c8}" +
  ".fb .claim select,.fb .claim input{font:inherit;font-size:14px;padding:3px 6px;border:1px solid #888;border-radius:3px}.fb .claim input{flex:1;min-width:180px}" +
  ".fb .note{font-size:13px;color:#555}.trans-fb td.c{white-space:nowrap;font-size:13px}@media print{.fb .claim{display:none}}";
  document.head.appendChild(st); })();
function claimRow(id, got, max){
  if (got >= max) return "";
  var o = ""; for (var i = 0; i <= max; i++) o += "<option value='" + i + "'" + (i === got ? " selected" : "") + ">" + i + "</option>";
  return "<div class='claim'><span>Does your answer say the same thing in other words? Your own mark:</span><select data-claim='" + id + "'>" + o + "</select>" +
    "<input type='text' data-why='" + id + "' placeholder='Why? (optional – your teacher will check)'></div>";
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
      var path = item.dataset.k, max = +item.dataset.max, t = item.dataset.t, given, got, model, html = "", id = sc + ":" + rows.length;
      if (t === "mc"){
        var want = get(path);
        given = item.querySelector(".mcval").value;
        got = (given === want) ? 1 : 0;
        var wb = item.querySelector('.opt[data-v="' + want + '"] .ot'); model = want + (wb ? " – " + wb.textContent : "");
        item.querySelectorAll(".opt").forEach(function(b){ b.classList.toggle("right", b.dataset.v === want); });
        html = got ? "Correct: " + esc(model) : (given ? "You chose " + esc(given) + ". " : "No answer. ") + "<span class='hd'>Correct answer: " + esc(model) + "</span>";
      } else if (t === "tick"){
        var keys = get(path); given = item.querySelector(".mcval").value;
        var picked = given.split("").filter(Boolean), right = picked.filter(function(x){ return keys.indexOf(x) >= 0; }).length;
        got = Math.max(0, right - Math.max(0, picked.length - max)); model = keys.join(", ");
        item.querySelectorAll(".opt").forEach(function(b){ b.classList.toggle("right", keys.indexOf(b.dataset.v) >= 0); });
        if (picked.length > max) html += "You ticked " + picked.length + " boxes: one mark is lost for each box over " + max + ". ";
        html += "<span class='hd'>The four correct statements:</span><ul class='pts'>" + keys.map(function(x){
          var b = item.querySelector('.opt[data-v="' + x + '"] .ot'); return "<li class='" + (picked.indexOf(x) >= 0 ? "ok" : "no") + "'>" + x + (b ? " – " + esc(b.textContent) : "") + "</li>"; }).join("") + "</ul>";
      } else if (t === "trans"){
        given = item.querySelector("textarea").value;
        var r = scoreTrans(given); got = r.score; model = r.rows.map(function(x){ return x.ans; }).join(" ");
        html = (given.trim() ? "One mark for each part of the text you translated accurately. ✓ = the computer found the key words. ○ = not found: compare with the model translation, and if yours means the same, tick the box." : "No answer.") +
          "<table>" + r.rows.map(function(x, j){ return "<tr><td class='" + (x.ok ? "ok'>✓" : "no'>○") + "</td><td>" + esc(x.fr) + "</td><td>" + esc(x.ans) + "</td><td class='c'>" +
            (x.ok || !given.trim() ? "" : "<label><input type='checkbox' data-tclaim='" + id + "' data-j='" + j + "'> mine is right</label>") + "</td></tr>"; }).join("") + "</table>";
      } else {
        var k = get(path);
        given = item.querySelector("textarea").value;
        got = scoreOpen(given, k, max); model = k.ans;
        var hv = hits(given, k), parts = splitAns(k.ans, k.pts.length), any = /^Any \d+( from \d+)?:/.exec(k.ans);
        if (!String(given).trim()) html += "No answer. ";
        if (parts && parts.length > 1){
          html += "<span class='hd'>Answers that score" + (any ? " (" + any[0].replace(/^Any/, "any").replace(/:$/, "") + ")" : "") + ":</span><ul class='pts'>" +
            parts.map(function(p, j){ return "<li class='" + (hv[j] ? "ok" : "no") + "'>" + esc(p) + "</li>"; }).join("") + "</ul>";
        } else {
          html += "<span class='hd'>Answer that scores:</span><ul class='pts'><li class='" + (got ? "ok" : "no") + "'>" + esc(String(k.ans).replace(/^Any \d+( from \d+)?:\s*/, "")) + "</li></ul>";
        }
      }
      total += got;
      rows.push({lab:item.dataset.lab, given:given, got:got, max:max, model:model, claim:got, why:"", t:t});
      var fb = feedbackFor(item);
      fb.className = "fb " + (got===max ? "full" : got>0 ? "part" : "zero") + (t === "trans" ? " trans-fb" : "");
      fb.innerHTML = "<b>" + got + " / " + max + "</b>" + html + (t !== "open" || !String(given).trim() ? "" : claimRow(id, got, max));
      item.classList.add("locked");
      var ta = item.querySelector("textarea"); if (ta) ta.readOnly = true;
    });
    DONE[sc] = {rows:rows, total:total};
    sectionBox(sc);
  });
  summary();
  return result();
}
function claimed(sc){ return DONE[sc].rows.reduce(function(a, r){ return a + r.claim; }, 0); }
function sectionBox(sc){
  var box = document.getElementById("lp-res-" + sc); if (!box) return;
  var c = claimed(sc), tot = DONE[sc].total;
  box.hidden = false;
  box.innerHTML = "<p><b>" + NAMES[sc] + ": " + tot + " / " + MAXSEC[sc] + "</b>" + (c !== tot ? " · with your own corrections: <b>" + c + " / " + MAXSEC[sc] + "</b> (your teacher will check them)" : "") + "</p>" +
    "<p>The computer marks key ideas, so it can miss an answer that means the same thing. Under each answer you can see the answers that score: ✓ = the computer found this idea in your answer, ○ = not found; a slash ( / ) separates answers that are equally good. If yours says the same in other words, give yourself the mark and say why: your teacher sees both marks in your results file.</p>";
}
document.addEventListener("change", function(e){
  var el = e.target, id = el.dataset.claim || el.dataset.tclaim; if (!id) return;
  var sc = id.split(":")[0], r = DONE[sc] && DONE[sc].rows[+id.split(":")[1]]; if (!r) return;
  if (el.dataset.claim) r.claim = +el.value;
  else r.claim = r.got + document.querySelectorAll("[data-tclaim='" + id + "']:checked").length;
  sectionBox(sc); summary();
});
document.addEventListener("input", function(e){
  var id = e.target.dataset.why; if (!id) return;
  var r = DONE[id.split(":")[0]] && DONE[id.split(":")[0]].rows[+id.split(":")[1]]; if (r) r.why = e.target.value;
});
function result(){
  var rows = [], total = 0, max = 0, sec = {};
  var cl = 0;
  ["A","B","C"].forEach(function(sc){ if (DONE[sc]){ rows = rows.concat(DONE[sc].rows); total += DONE[sc].total; cl += claimed(sc); max += MAXSEC[sc]; sec[sc] = DONE[sc].total; } });
  return {rows:rows, total:total, max:max, sec:sec, claimed:cl};
}
function summary(){
  var R = result(), res = document.getElementById("lp-res");
  if (!R.max){ res.hidden = true; return; }
  res.hidden = false;
  res.innerHTML = "<p><b>Marked so far: " + R.total + " / " + R.max + "</b>" + (R.max === 80 ? " (whole paper)" : "") + (R.claimed !== R.total ? " · with your own corrections: <b>" + R.claimed + " / " + R.max + "</b>" : "") + "</p><p>" +
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
           [ "Mark (automatic)", R.total+" / "+R.max ],[ "Mark with the student's own corrections (to be checked)", R.claimed+" / "+R.max ],[ "Sections marked", ["A","B","C"].map(function(sc){ return sc+": "+(sc in R.sec ? R.sec[sc]+" / "+MAXSEC[sc] : "not marked"); }).join(" · ") ],[],[ "Question","Answer","Mark (automatic)","Out of","Student's own mark","Student's reason","Mark scheme" ]].map(function(r){ return r.map(csv).join(","); });
  R.rows.forEach(function(r){ L.push([r.lab, r.given, r.got, r.max, r.claim !== r.got ? r.claim : "", r.why, r.model].map(csv).join(",")); });
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
