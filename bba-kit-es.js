/* =====================================================================
   BBA activity kit — Spanish
   Drop-in add-on for existing A-Level activity pages.
   Adds: a minimalist accent pad, Levenshtein-tolerant answer checking,
   and a CSV download carrying the student's name and feedback.
   Self-contained. No dependencies. Safe to paste into any page.
   ===================================================================== */
(function () {
"use strict";
if (window.__bbaKit) return;            // never install twice
window.__bbaKit = true;

/* ---- optional switches -------------------------------------------------
   Put this BEFORE the kit if a page already has its own accent pad, or if
   you only want part of the kit:
       window.BBA_KIT = {pad:false};      (in a script tag above this one)
   Keys: pad, name, check, download  — set any of them to false.
   ---------------------------------------------------------------------- */
var OPT   = window.BBA_KIT || {};
var ON    = function(k){ return OPT[k] !== false; };

var LANG  = "es";                 // "fr" | "es"
var PAD   = ["á", "é", "í", "ó", "ú", "ü", "ñ", "¿", "¡"];
var PADUP = ["Á", "É", "Í", "Ó", "Ú", "Ü", "Ñ", "¿", "¡"];
var T     = {"name": "Your name", "caps": "Capitals", "check": "Check", "download": "Download", "hide": "Collapse", "ready": "Type your name, then “Check” for a tolerant marking pass and “Download” to hand the work in.", "right": "Correct.", "accOk": "Accent missing or added — no penalty here, but fix it.", "accGram": "This accent changes the word or the tense, so it has to be exact.", "typo": "Typo tolerated — the ending is right.", "wrong": "Not yet.", "blank": "Nothing written.", "exact": "exact", "accSlip": "accents", "typoSlip": "typos", "wrongN": "wrong", "blankN": "blank", "nameFirst": "File downloaded — add your name before you send it.", "noName": "(no name)", "noKeyTitle": "No answer key on this page.", "noKey": "The accent pad and the download still work: your answers are saved as written for your teacher to mark.", "noKeyCsv": "This page carries no readable answer key — to be marked by the teacher.", "hStudent": "Student", "hActivity": "Activity", "hLink": "Link", "hDate": "Date", "hScore": "Score", "hBreak": "Breakdown", "hReview": "To review", "cItem": "Question", "cAnswer": "Your answer", "cExpected": "Expected", "cVerdict": "Result", "cNote": "Comment", "codes": {"ok": "Correct", "accent": "Accepted (accent)", "typo": "Accepted (typo)", "no": "Wrong", "empty": "Blank"}};                      // interface strings

/* ---------------------------------------------------------------- utils */
function deacc(s){ return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").normalize("NFC"); }
function norm(s){
  return deacc(String(s||"")
      .toLowerCase()
      .replace(/[’‘`´]/g,"'")
      .replace(/[«»“”"]/g,"")
      .replace(/[.,;:!?¿¡()\[\]]/g,"")
      .replace(/\s+/g," ")
      .trim());
}
function keep(s){                        // lowercase + tidy, accents KEPT
  return String(s||"").toLowerCase()
      .replace(/[’‘`´]/g,"'").replace(/[«»“”"]/g,"")
      .replace(/[.,;:!?¿¡()\[\]]/g,"").replace(/\s+/g," ").trim();
}
function lev(a,b){
  if(a===b) return 0;
  var m=a.length,n=b.length,i,j,prev,tmp,row=[];
  if(!m) return n; if(!n) return m;
  for(j=0;j<=n;j++) row[j]=j;
  for(i=1;i<=m;i++){
    prev=row[0]; row[0]=i;
    for(j=1;j<=n;j++){
      tmp=row[j];
      row[j]=Math.min(row[j]+1, row[j-1]+1, prev+(a.charAt(i-1)===b.charAt(j-1)?0:1));
      prev=tmp;
    }
  }
  return row[n];
}
/* An accent that carries grammar or changes the word must be exact.
   One that is merely decorative costs no mark in the Edexcel scheme. */
function accentIsGrammatical(given, want){
  var g=keep(given), w=keep(want);
  if (LANG==="fr"){
    // participle / past-tense endings, and the a/à ou/où sur/sûr pairs
    if (/é(e?s?)$/.test(w) !== /é(e?s?)$/.test(g)) return true;
    if (/^(a|à|ou|où|la|là|sur|sûr|du|dû|mur|mûr)$/.test(w) && w!==g) return true;
  } else {
    // written stress marks the tense in Spanish, and separates word pairs
    if (/[áéíóú]$/.test(w) !== /[áéíóú]$/.test(g)) return true;
    if (/í(a|as|an|amos|ais)$/.test(w) !== /í(a|as|an|amos|ais)$/.test(g)) return true;
    if (/^(si|sí|el|él|tu|tú|mi|mí|te|té|mas|más|se|sé|de|dé|solo|sólo|aun|aún|que|qué|como|cómo|cuando|cuándo|donde|dónde|porque|porqué)$/.test(w) && w!==g) return true;
    if (w.indexOf("ñ")>=0 !== (g.indexOf("ñ")>=0)) return true;   // ñ is a letter, not an accent
  }
  return false;
}
/* One slip inside a long word is tolerated; the ending never is. */
function typoOnly(g,w){
  var A=g.split(" "), B=w.split(" "), i, a, b;
  if(A.length!==B.length) return false;
  var slips=0;
  for(i=0;i<A.length;i++){
    a=A[i]; b=B[i];
    if(a===b) continue;
    if(b.length<5) return false;                       // short words must be right
    if(a.slice(-2)!==b.slice(-2)) return false;        // the ending carries the grammar
    if(lev(a.slice(0,-2), b.slice(0,-2))>1) return false;
    if(++slips>1) return false;                        // at most one slip per answer
  }
  return slips===1;
}
/* ------------------------------------------------------------- marking */
function judge(given, expected){
  var wants = String(expected).split(/\s*(?:\||\/\/)\s*/).filter(Boolean);
  var best = {code:"no", note:T.wrong, want:wants[0]};
  for (var i=0;i<wants.length;i++){
    var w = wants[i];
    if (!keep(given)) return {code:"empty", note:T.blank, want:wants[0]};
    if (keep(given)===keep(w))  return {code:"ok",   note:T.right, want:w};
    if (norm(given)===norm(w)){
      if (accentIsGrammatical(given,w)) { best = {code:"no", note:T.accGram, want:w}; continue; }
      return {code:"accent", note:T.accOk, want:w};
    }
    if (typoOnly(norm(given), norm(w))) { if(best.code!=="accent") best={code:"typo", note:T.typo, want:w}; }
  }
  return best;
}
/* -------------------------------------------------- finding the answers */
var ANSWER_ATTRS = ["data-answer","data-ans","data-correct","data-solution","data-respuesta","data-reponse"];
function externalKey(){
  var k = {};
  try {
    var tag = document.getElementById("bba-answers");
    if (tag) k = JSON.parse(tag.textContent);
  } catch(e){}
  if (window.BBA_ANSWERS) { for (var p in window.BBA_ANSWERS) k[p]=window.BBA_ANSWERS[p]; }
  return k;
}
function labelFor(el){
  var t="";
  if (el.id){ var l=document.querySelector('label[for="'+el.id+'"]'); if(l) t=l.textContent; }
  if(!t){ var p=el.closest("label"); if(p) t=p.textContent.replace(el.value,""); }
  if(!t) t=el.getAttribute("aria-label")||el.getAttribute("placeholder")||"";
  if(!t){
    var row=el.closest("li,tr,p,div");
    if(row) t=row.textContent;
  }
  t=(t||el.name||el.id||"").replace(/\s+/g," ").trim();
  return t.length>90 ? t.slice(0,90)+"…" : t;
}
function fields(){
  var key = externalKey(), out = [], seen = 0;
  var nodes = document.querySelectorAll("input,textarea,select");
  Array.prototype.forEach.call(nodes, function(el){
    var ty=(el.type||"").toLowerCase();
    if (ty==="hidden"||ty==="button"||ty==="submit"||ty==="reset"||ty==="file") return;
    if (el.closest("#bba-kit")) return;
    var want=null, i;
    for(i=0;i<ANSWER_ATTRS.length;i++){ var v=el.getAttribute(ANSWER_ATTRS[i]); if(v!=null&&v!==""){ want=v; break; } }
    if(want==null && el.id   && key[el.id]!=null)   want=key[el.id];
    if(want==null && el.name && key[el.name]!=null) want=key[el.name];
    if(want!=null) seen++;
    var val;
    if (ty==="radio"||ty==="checkbox") { if(!el.checked) return; val = el.value||"on"; }
    else if (el.tagName==="SELECT")    { val = el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : ""; }
    else                                { val = el.value; }
    out.push({el:el, label:labelFor(el), value:val, want:want});
  });
  out.__withAnswers = seen;
  return out;
}
/* --------------------------------------------------------------- styles */
var CSS = ""
+ "#bba-kit{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;"
+ "font:14px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"
+ "background:#14283f;color:#fff;box-shadow:0 -2px 14px rgba(0,0,0,.22)}"
+ "#bba-kit *{box-sizing:border-box}"
+ "#bba-kit .bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 12px;max-width:1180px;margin:0 auto}"
+ "#bba-kit .pad{display:flex;gap:4px;flex-wrap:wrap}"
+ "#bba-kit .pad button{min-width:32px!important;width:auto!important;height:32px!important;border:1px solid rgba(255,255,255,.32);background:rgba(255,255,255,.08);"
+ "color:#fff;border-radius:6px;font-size:16px;cursor:pointer;padding:0 6px}"
+ "#bba-kit .pad button:hover{background:rgba(255,255,255,.22)}"
+ "#bba-kit .pad button.shift{font-size:12px;letter-spacing:.04em}"
+ "#bba-kit .pad button.shift.on{background:#fff;color:#14283f;font-weight:700}"
+ "#bba-kit input,#bba-kit button{font-family:inherit!important;margin:0!important;box-shadow:none!important;text-transform:none!important;letter-spacing:normal!important;line-height:normal!important;float:none!important;position:static!important;display:inline-flex!important;align-items:center;justify-content:center;min-height:0!important}"
+ "#bba-kit input.nm{height:32px!important;border-radius:6px;border:1px solid rgba(255,255,255,.32);"
+ "background:rgba(255,255,255,.08);color:#fff;padding:0 9px!important;flex:0 0 190px;width:190px!important;max-width:190px!important;font-size:14px!important;text-align:left}"
+ "#bba-kit input.nm::placeholder{color:rgba(255,255,255,.6)}"
+ "#bba-kit .act{margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap}"
+ "#bba-kit .act button{height:32px!important;width:auto!important;border-radius:6px;border:0;padding:0 14px!important;font-size:13px!important;font-weight:600;cursor:pointer}"
+ "#bba-kit .act .chk{background:#e8eefc;color:#14283f}"
+ "#bba-kit .act .dl{background:#2e7d52;color:#fff}"
+ "#bba-kit .act .min{background:transparent;color:rgba(255,255,255,.75);border:1px solid rgba(255,255,255,.3);padding:0 10px}"
+ "#bba-kit .msg{padding:0 12px 9px;max-width:1180px;margin:0 auto;font-size:12.5px;color:#cfe0f5}"
+ "#bba-kit .msg b{color:#fff}"
+ "#bba-kit.small .bar .pad,#bba-kit.small .bar .nm,#bba-kit.small .msg{display:none}"
+ ".bba-ok{outline:2px solid #2e7d52!important;outline-offset:1px}"
+ ".bba-warn{outline:2px solid #b8860b!important;outline-offset:1px}"
+ ".bba-bad{outline:2px solid #c0392b!important;outline-offset:1px}"
+ ".bba-tip{display:block;font:12px/1.35 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"
+ "margin-top:3px;color:#7a5c00}"
+ ".bba-tip.bad{color:#a5281b}.bba-tip.good{color:#1d5a3a}";

/* ------------------------------------------------------------------ UI */
var last = null;                          // last focused text field
document.addEventListener("focusin", function(e){
  var el=e.target;
  if(el && !el.closest("#bba-kit") &&
     (el.tagName==="TEXTAREA" || (el.tagName==="INPUT" && /^(text|search|email|url|tel|)$/i.test(el.type))))
    last = el;
});

function build(){
  if(!ON("pad") && !ON("name") && !ON("check") && !ON("download")) return;
  var st=document.createElement("style"); st.textContent=CSS; document.head.appendChild(st);

  var kit=document.createElement("div"); kit.id="bba-kit";
  var bar=document.createElement("div"); bar.className="bar";

  var nm=document.createElement("input");
  nm.className="nm"; nm.type="text"; nm.placeholder=T.name; nm.setAttribute("aria-label",T.name);
  try{ nm.value=localStorage.getItem("bba-name")||""; }catch(e){}
  nm.addEventListener("input",function(){ try{localStorage.setItem("bba-name",nm.value.trim());}catch(e){} });
  if(ON("name")) bar.appendChild(nm);

  var pad=document.createElement("div"); pad.className="pad";
  var up=false, keys=[];
  var shift=document.createElement("button");
  shift.type="button"; shift.className="shift"; shift.textContent="ABC";
  shift.title=T.caps;
  shift.addEventListener("click",function(){
    up=!up; shift.classList.toggle("on",up);
    keys.forEach(function(o){ o.b.textContent = up ? o.U : o.l; });
  });
  pad.appendChild(shift);
  PAD.forEach(function(ch,i){
    var b=document.createElement("button"); b.type="button"; b.textContent=ch;
    b.setAttribute("aria-label",ch);
    b.addEventListener("mousedown",function(ev){ ev.preventDefault(); });
    b.addEventListener("click",function(){ insert(up?PADUP[i]:ch); });
    keys.push({b:b,l:ch,U:PADUP[i]});
    pad.appendChild(b);
  });
  if(ON("pad")) bar.appendChild(pad);

  var act=document.createElement("div"); act.className="act";
  var chk=document.createElement("button"); chk.type="button"; chk.className="chk"; chk.textContent=T.check;
  var dl =document.createElement("button"); dl.type="button";  dl.className="dl";  dl.textContent=T.download;
  var min=document.createElement("button"); min.type="button"; min.className="min"; min.textContent="–";
  min.title=T.hide;
  min.addEventListener("click",function(){
    kit.classList.toggle("small");
    min.textContent = kit.classList.contains("small") ? "+" : "–";
    pack();
  });
  if(ON("check")) act.appendChild(chk);
  if(ON("download")) act.appendChild(dl);
  act.appendChild(min);
  bar.appendChild(act);

  var msg=document.createElement("div"); msg.className="msg";
  msg.textContent = (ON("check")||ON("download")) ? T.ready : "";

  kit.appendChild(bar); kit.appendChild(msg);
  document.body.appendChild(kit);

  chk.addEventListener("click", function(){ check(msg); });
  dl .addEventListener("click", function(){ download(nm.value.trim(), msg); });

  function pack(){ document.body.style.paddingBottom = (kit.offsetHeight+12)+"px"; }
  pack(); window.addEventListener("resize", pack);
  return {msg:msg, name:function(){return nm.value.trim();}};
}
function insert(ch){
  var el=last;
  if(!el){ var c=document.querySelector("textarea,input[type=text]"); if(c){ c.focus(); el=last=c; } }
  if(!el) return;
  el.focus();
  var s=el.selectionStart, e=el.selectionEnd;
  if(typeof s==="number"){
    el.value = el.value.slice(0,s) + ch + el.value.slice(e);
    el.selectionStart = el.selectionEnd = s + ch.length;
  } else { el.value += ch; }
  el.dispatchEvent(new Event("input",{bubbles:true}));
  el.dispatchEvent(new Event("change",{bubbles:true}));
}
/* --------------------------------------------------------------- check */
var LAST_RESULT = null;
function clearTips(){
  Array.prototype.forEach.call(document.querySelectorAll(".bba-tip"),function(n){n.remove();});
  Array.prototype.forEach.call(document.querySelectorAll(".bba-ok,.bba-warn,.bba-bad"),function(n){
    n.classList.remove("bba-ok","bba-warn","bba-bad");});
}
function check(msg){
  clearTips();
  var F = fields();
  if(!F.__withAnswers){
    LAST_RESULT = null;
    msg.innerHTML = "<b>"+T.noKeyTitle+"</b> "+T.noKey;
    return null;
  }
  var ok=0,acc=0,typo=0,bad=0,blank=0,rows=[];
  F.forEach(function(f){
    if(f.want==null) return;
    var v=judge(f.value,f.want);
    rows.push({label:f.label, given:f.value, want:v.want, code:v.code, note:v.note});
    var cls = v.code==="ok" ? "bba-ok" : (v.code==="accent"||v.code==="typo") ? "bba-warn"
            : v.code==="empty" ? "" : "bba-bad";
    if(cls) f.el.classList.add(cls);
    if(v.code!=="ok" && v.code!=="empty"){
      var tip=document.createElement("small");
      tip.className="bba-tip"+(v.code==="no"?" bad":"");
      tip.textContent = v.note + (v.code==="no" ? "  →  "+v.want : "");
      if(f.el.parentNode) f.el.parentNode.insertBefore(tip, f.el.nextSibling);
    }
    if(v.code==="ok")ok++; else if(v.code==="accent")acc++; else if(v.code==="typo")typo++;
    else if(v.code==="empty")blank++; else bad++;
  });
  var scored = ok+acc+typo, total = rows.length-blank;
  LAST_RESULT = {rows:rows, ok:ok, acc:acc, typo:typo, bad:bad, blank:blank, scored:scored, total:total};
  msg.innerHTML = "<b>"+scored+" / "+(rows.length)+"</b> · "
    + T.exact+": "+ok+" · "+T.accSlip+": "+acc+" · "+T.typoSlip+": "+typo
    + " · "+T.wrongN+": "+bad + (blank?" · "+T.blankN+": "+blank:"");
  return LAST_RESULT;
}
/* ------------------------------------------------------------ download */
function csvCell(v){ return '"'+String(v==null?"":v).replace(/"/g,'""').replace(/\r?\n/g," ")+'"'; }
function download(name, msg){
  var F = fields();
  var R = LAST_RESULT;
  if(!R && F.__withAnswers) R = check(msg);
  var title = (document.title||"activity").replace(/[\\\/:*?"<>|]/g,"-").trim();
  var d = new Date(), pad2=function(n){return (n<10?"0":"")+n;};
  var stamp = d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());
  var L = [];
  L.push([T.hStudent, name||T.noName].map(csvCell).join(","));
  L.push([T.hActivity, title].map(csvCell).join(","));
  L.push([T.hLink, location.href].map(csvCell).join(","));
  L.push([T.hDate, stamp+" "+pad2(d.getHours())+":"+pad2(d.getMinutes())].map(csvCell).join(","));
  if(R){
    L.push([T.hScore, R.scored+" / "+R.rows.length].map(csvCell).join(","));
    L.push([T.hBreak, T.exact+" "+R.ok+"; "+T.accSlip+" "+R.acc+"; "+T.typoSlip+" "+R.typo
                      +"; "+T.wrongN+" "+R.bad+"; "+T.blankN+" "+R.blank].map(csvCell).join(","));
  }
  L.push("");
  if(R){
    L.push([T.cItem,T.cAnswer,T.cExpected,T.cVerdict,T.cNote].map(csvCell).join(","));
    R.rows.forEach(function(r){
      L.push([r.label, r.given, r.want, T.codes[r.code], r.note].map(csvCell).join(","));
    });
    var review = R.rows.filter(function(r){return r.code==="no"||r.code==="accent"||r.code==="typo";});
    if(review.length){
      L.push(""); L.push([T.hReview].map(csvCell).join(","));
      review.forEach(function(r){ L.push(["", r.want, r.note].map(csvCell).join(",")); });
    }
  } else {
    L.push([T.cItem,T.cAnswer].map(csvCell).join(","));
    F.forEach(function(f){ if(String(f.value||"").trim()) L.push([f.label,f.value].map(csvCell).join(",")); });
    L.push(""); L.push([T.noKeyCsv].map(csvCell).join(","));
  }
  var blob = new Blob(["﻿"+L.join("\r\n")], {type:"text/csv;charset=utf-8;"});
  var a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=(name?name+" - ":"")+title+" - "+stamp+".csv";
  document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },0);
  if(!name) msg.innerHTML="<b>"+T.nameFirst+"</b>";
}
/* ---------------------------------------------------------------- boot */
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",build);
else build();
})();
