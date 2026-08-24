/* =====================================================================
   BBA activity kit — Spanish — v2.1
   Drop-in replacement for bba-kit-es.js. Same <script src> tag, no page
   edits required.

   v1 gave you:  accent pad · tolerant marking · CSV download with a name.
   v2.1 adds:
     · autosave + resume        nothing is lost when the tab closes
     · Enter to submit          one field at a time, hands stay on keys
     · two attempts             a clue first, the answer only after that
     · spoken feedback          aria-live, so marking is announced
     · score hand-off           real scores stored for the hub to read
     · no duplicate pads        the kit's pad hides if the page has its own
     · phone fixes              loads bba-mobile.css and bba-mobile.js

   It also speaks Spanish. The previous version's interface was in
   English on a Spanish site; the wording here follows the vocabulary
   the activities already use — Comprobar, Pista, Descargar, Reiniciar.

   The marking engine is shared with the French kit, and LANG below
   switches it onto the Spanish rules: a written stress mark that carries
   the tense (hablo / habló) must be exact, ñ is a letter and not an
   accent, and the pairs si/sí, tu/tú, el/él, mas/más are never
   interchangeable.

   Self-contained. No dependencies. Safe to paste into any page.
   ===================================================================== */
(function () {
"use strict";
if (window.__bbaKit) return;            // never install twice
window.__bbaKit = true;

/* ---- optional switches -------------------------------------------------
   Put this BEFORE the kit if a page needs different behaviour:
       window.BBA_KIT = {pad:false, save:false};   (script tag above this one)
   Keys and defaults:
     pad       true   floating accent pad (auto-off if the page has its own)
     name      true   name box
     check     true   "Comprobar" button
     download  true   "Descargar" button
     save      true   autosave and resume
     enter     true   Enter submits the focused field
     tries     2      wrong attempts allowed before the answer is shown
                      (set to 1 for the old behaviour, 0 for never reveal)
   ---------------------------------------------------------------------- */
var OPT   = window.BBA_KIT || {};
var ON    = function(k){ return OPT[k] !== false; };
var TRIES = (typeof OPT.tries === "number") ? OPT.tries : 2;

var LANG  = "es";                 // switches the shared engine onto the Spanish accent rules
var PAD   = ["á", "é", "í", "ó", "ú", "ü", "ñ", "¿", "¡", "«", "»"];
var PADUP = ["Á", "É", "Í", "Ó", "Ú", "Ü", "Ñ", "¿", "¡", "«", "»"];

var T = {
  "name": "Tu nombre", "caps": "Mayúsculas", "check": "Comprobar", "download": "Descargar",
  "hide": "Reducir",
  "ready": "Escribe tu nombre. Escribe la respuesta y pulsa « Intro » para comprobarla al momento; « Descargar » para entregar tu trabajo.",
  "right": "Correcto.",
  "accOk": "Falta una tilde o sobra — aquí no penaliza, pero corrígela.",
  "accGram": "Esta tilde cambia la palabra o el tiempo verbal: hay que escribirla exactamente.",
  "typo": "Errata tolerada — la terminación es correcta.",
  "wrong": "Todavía no.", "blank": "No has escrito nada.",
  "exact": "exactas", "accSlip": "tildes", "typoSlip": "erratas", "wrongN": "mal", "blankN": "en blanco",
  "nameFirst": "Archivo descargado — acuérdate de escribir tu nombre antes de entregarlo.",
  "noName": "(sin nombre)",
  "noKeyTitle": "Esta página no lleva solucionario.",
  "noKey": "El teclado de acentos y la descarga funcionan igualmente: tus respuestas se guardan tal cual para que las corrija tu profesor.",
  "noKeyCsv": "Esta página no contiene un solucionario legible — la corrige el profesor.",
  "hStudent": "Alumno/a", "hActivity": "Actividad", "hLink": "Enlace", "hDate": "Fecha",
  "hScore": "Puntuación", "hBreak": "Desglose", "hReview": "Para repasar",
  "cItem": "Pregunta", "cAnswer": "Tu respuesta", "cExpected": "Esperado",
  "cVerdict": "Resultado", "cNote": "Comentario", "cTries": "Intentos",
  "codes": {"ok":"Correcto","accent":"Aceptado (tilde)","typo":"Aceptado (errata)","no":"Mal","empty":"En blanco"},
  /* v2 */
  "again": "Casi — reinténtalo.",
  "tryAgain": "Todavía no — reinténtalo.",
  "seeAnswer": "Ver la respuesta",
  "answerIs": "Respuesta:",
  "resumeQ": "Ya habías empezado esta actividad.",
  "resumeYes": "Continuar", "resumeNo": "Empezar de nuevo",
  "restored": "Se han recuperado tus respuestas.",
  "cleared": "Actividad reiniciada.",
  "saved": "guardado",
  "reset": "Reiniciar",
  "resetQ": "¿Borrar tus respuestas en esta actividad?",
  "clueWords": function(n){ return n === 1 ? "1 palabra" : n + " palabras"; },
  "clueLetters": function(n){ return n + " letras"; },
  "clueGenderM": "masculino (el / un)",
  "clueGenderF": "femenino (la / una)",
  "cluePlural": "plural (los / las)",
  "clueEnding": "La palabra es correcta; lo que falla es la terminación.",
  "clueClose": "Casi — fíjate bien en la ortografía.",
  "clueStart": "Empieza por:"
};

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
    if (/é(e?s?)$/.test(w) !== /é(e?s?)$/.test(g)) return true;
    if (/^(a|à|ou|où|la|là|sur|sûr|du|dû|mur|mûr)$/.test(w) && w!==g) return true;
  } else {
    if (/[áéíóú]$/.test(w) !== /[áéíóú]$/.test(g)) return true;
    if (/í(a|as|an|amos|ais)$/.test(w) !== /í(a|as|an|amos|ais)$/.test(g)) return true;
    if (/^(si|sí|el|él|tu|tú|mi|mí|te|té|mas|más|se|sé|de|dé|solo|sólo|aun|aún|que|qué|como|cómo|cuando|cuándo|donde|dónde|porque|porqué)$/.test(w) && w!==g) return true;
    if (w.indexOf("ñ")>=0 !== (g.indexOf("ñ")>=0)) return true;
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
    if(b.length<5) return false;
    if(a.slice(-2)!==b.slice(-2)) return false;
    if(lev(a.slice(0,-2), b.slice(0,-2))>1) return false;
    if(++slips>1) return false;
  }
  return slips===1;
}
/* ------------------------------------------------------------- marking */
/* Variants are written "a | b" or "a // b". Some older pages use "a,b" —
   accepted too, but only when no comma is followed by a space, so a prose
   answer like "En France, le système scolaire" is never split. */
function variants(expected){
  var s = String(expected);
  if (/\||\/\//.test(s)) return s.split(/\s*(?:\||\/\/)\s*/).filter(Boolean);
  if (/,(?!\s)/.test(s) && !/,\s/.test(s)) return s.split(/\s*,\s*/).filter(Boolean);
  return [s];
}
function judge(given, expected){
  var wants = variants(expected).filter(Boolean);
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

/* ==========================================================  v2: CLUES  */
/* A clue narrows the search without handing the answer over. It is graded:
   shape of the answer first, then the specific slip if we can name it.    */
/* Two words count as the same word with a different ending when they share
   most of their opening letters — "alle" / "allee", "venue" / "venues". */
function sharedStem(a, b){
  var n = Math.min(a.length, b.length), i = 0;
  while(i < n && a.charAt(i) === b.charAt(i)) i++;
  return i >= Math.max(3, Math.ceil(Math.min(a.length,b.length) * 0.6));
}
function clueFor(given, want){
  var w = variants(want)[0].trim();
  var bits = [];

  var g = norm(given), nw = norm(w);

  // Name the slip when we can — this is worth more than any shape hint.
  var gw = g.split(" "), ww = nw.split(" ");
  if (g && gw.length === ww.length){
    var sameStems = true, endingWrong = false, i;
    for (i=0;i<ww.length;i++){
      if (gw[i] === ww[i]) continue;
      if (ww[i].length > 3 && sharedStem(gw[i], ww[i])) { endingWrong = true; }
      else { sameStems = false; break; }
    }
    if (sameStems && endingWrong) bits.push(T.clueEnding);
  }
  if (!bits.length && g && lev(g, nw) <= Math.max(2, Math.round(nw.length*0.2))) bits.push(T.clueClose);

  // Shape of the answer.
  var words = w.split(/\s+/).filter(Boolean);
  var shape = T.clueWords(words.length) + " · " + T.clueLetters(w.replace(/[^A-Za-zÀ-ÿ]/g,"").length);
  bits.push(shape);

  // Gender and number, when the answer carries an article. Spanish marks
  // both on the article, so this is a real hint and not a giveaway.
  var art = words[0] ? words[0].toLowerCase().replace(/[^a-zá-ú\u00f1']/g, "") : "";
  if (/^(el|un|del|al|este|ese|aquel)$/.test(art))        bits.push(T.clueGenderM);
  else if (/^(la|una|esta|esa|aquella)$/.test(art))       bits.push(T.clueGenderF);
  else if (/^(los|las|unos|unas|estos|estas)$/.test(art)) bits.push(T.cluePlural);

  // Initials.
  var initials = words.map(function(x){
    var m = x.match(/[A-Za-zÀ-ÿ]/);
    return m ? m[0] + "…" : "";
  }).filter(Boolean).join(" ");
  if (initials) bits.push(T.clueStart + " " + initials);

  return bits.join(" · ");
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
/* The label that reaches the teacher's CSV should be the question, not the
   word next to the box. We read the item the field sits in, minus the hint
   panel and the box's own label, and fall back to the label if that is empty. */
function cleanText(node, skip){
  var out = "";
  Array.prototype.forEach.call(node.childNodes, function(n){
    if(n.nodeType === 3){ out += n.nodeValue; return; }
    if(n.nodeType !== 1) return;
    if(n === skip) return;
    var tag = n.tagName;
    if(tag === "DETAILS" || tag === "SCRIPT" || tag === "STYLE" ||
       tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" ||
       tag === "BUTTON" || n.classList.contains("bba-tip")) return;
    out += cleanText(n, skip);
  });
  return out;
}
function labelFor(el){
  var lab = "";
  var labNode = null;
  if (el.id){ labNode = document.querySelector('label[for="'+el.id+'"]'); }
  if (!labNode) labNode = el.closest("label");
  if (labNode) lab = labNode.textContent.replace(el.value, "");
  if (!lab) lab = el.getAttribute("aria-label") || el.getAttribute("placeholder") || "";
  lab = (lab || "").replace(/\s+/g," ").trim();

  var q = "";
  var row = el.closest(".item,li,tr,fieldset,p,div");
  if (row) q = cleanText(row, labNode).replace(/\s+/g," ").trim();

  /* Prefer the question. "Ta réponse" is never worth carrying to a teacher. */
  var t = (q && q.length >= 6) ? q : (lab || q);
  t = (t || el.name || el.id || "").replace(/\s+/g," ").trim();
  return t.length > 90 ? t.slice(0,90) + "…" : t;
}
function answerOf(el, key){
  var want=null, i;
  for(i=0;i<ANSWER_ATTRS.length;i++){
    var v=el.getAttribute(ANSWER_ATTRS[i]);
    if(v!=null && v!==""){ want=v; break; }
  }
  if(want==null && el.id   && key[el.id]!=null)   want=key[el.id];
  if(want==null && el.name && key[el.name]!=null) want=key[el.name];
  return want;
}
function marked(el){
  var ty=(el.type||"").toLowerCase();
  if (ty==="hidden"||ty==="button"||ty==="submit"||ty==="reset"||ty==="file") return false;
  if (el.closest("#bba-kit")) return false;
  return true;
}
function allFields(){
  return Array.prototype.filter.call(
    document.querySelectorAll("input,textarea,select"), marked);
}
function fields(){
  var key = externalKey(), out = [], seen = 0;
  allFields().forEach(function(el){
    var ty=(el.type||"").toLowerCase();
    var want = answerOf(el, key);
    if(want!=null) seen++;
    var val;
    if (ty==="radio"||ty==="checkbox") { if(!el.checked) return; val = el.value||"on"; }
    else if (el.tagName==="SELECT")    { val = el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : ""; }
    else                                { val = el.value; }
    out.push({el:el, label:labelFor(el), value:val, want:want, key:fieldKey(el)});
  });
  out.__withAnswers = seen;
  return out;
}

/* =====================================================  v2: PERSISTENCE */
/* A key that survives a reload. ids and names first; otherwise position,
   which is stable because these pages are static.                        */
var KEYCACHE = null;
function fieldKey(el){
  if (el.id)   return "#"+el.id;
  if (el.name && (el.type==="radio"||el.type==="checkbox")) return "@"+el.name+"="+el.value;
  if (el.name) return "@"+el.name;
  if (!KEYCACHE){
    KEYCACHE = new Map();
    allFields().forEach(function(e,i){ KEYCACHE.set(e, "~"+i); });
  }
  return KEYCACHE.get(el) || "~?";
}
function storeKey(){
  var f = decodeURIComponent(location.pathname.split("/").pop() || "index");
  return "bba2:" + f;
}
var S = {v:2, name:"", ans:{}, tries:{}, done:{}, shown:{}, t:0};
var SAVE_OK = ON("save");
function loadState(){
  if(!SAVE_OK) return;
  try{
    var raw = localStorage.getItem(storeKey());
    if(raw){ var s = JSON.parse(raw); if(s && s.v===2){ S = s; S.ans=S.ans||{}; S.tries=S.tries||{}; S.done=S.done||{}; S.shown=S.shown||{}; } }
  }catch(e){}
}
var saveTimer = null;
function saveState(now){
  if(!SAVE_OK) return;
  clearTimeout(saveTimer);
  var write = function(){
    S.t = Date.now();
    try{ localStorage.setItem(storeKey(), JSON.stringify(S)); }
    catch(e){ /* quota or private mode: fail quietly, never break the page */ }
  };
  if(now) write(); else saveTimer = setTimeout(write, 400);
}
function captureAll(){
  if(!SAVE_OK) return;
  allFields().forEach(function(el){
    var k = fieldKey(el), ty=(el.type||"").toLowerCase();
    if(ty==="radio"||ty==="checkbox") S.ans[k] = el.checked ? 1 : 0;
    else if(el.tagName==="SELECT")    S.ans[k] = el.selectedIndex;
    else                              S.ans[k] = el.value;
  });
  saveState();
}
function hasSavedWork(){
  if(!SAVE_OK) return false;
  var k;
  for(k in S.ans){
    var v = S.ans[k];
    if(typeof v === "string" && v.trim()) return true;
    if(v === 1) return true;
    if(typeof v === "number" && v > 0) return true;
  }
  return !!(S.name && S.name.trim());
}
/* How many fields would actually change if we restored right now? Zero means
   the page has already restored its own state, and the prompt would be noise. */
function pendingRestore(){
  var n = 0;
  allFields().forEach(function(el){
    var v = S.ans[fieldKey(el)], ty=(el.type||"").toLowerCase();
    if(v===undefined || v===null) return;
    if(ty==="radio"||ty==="checkbox"){ if(!el.checked && v===1) n++; }
    else if(el.tagName==="SELECT"){ if(el.selectedIndex<=0 && v>0) n++; }
    else if(!el.value && typeof v==="string" && v.trim()) n++;
  });
  return n;
}
/* Restore only into fields the page has left empty, so a page with its own
   restore logic always wins and nothing is overwritten. */
function restoreAll(){
  var n = 0;
  allFields().forEach(function(el){
    var k = fieldKey(el), v = S.ans[k], ty=(el.type||"").toLowerCase();
    if(v===undefined || v===null) return;
    var changed = false;
    if(ty==="radio"||ty==="checkbox"){ if(!el.checked && v===1){ el.checked = true; changed = true; } }
    else if(el.tagName==="SELECT"){ if(el.selectedIndex<=0 && v>0){ el.selectedIndex = v; changed = true; } }
    else if(!el.value && v){ el.value = v; changed = true; }
    if(changed){
      n++;
      el.dispatchEvent(new Event("input",{bubbles:true}));
      el.dispatchEvent(new Event("change",{bubbles:true}));
    }
  });
  return n;
}
function clearState(){
  S = {v:2, name:S.name, ans:{}, tries:{}, done:{}, shown:{}, t:0};
  try{ localStorage.removeItem(storeKey()); }catch(e){}
}
/* Real scores, in one shared place the hub can read later. */
function publishScore(scored, total){
  try{
    var all = JSON.parse(localStorage.getItem("bba-scores") || "{}");
    var f = decodeURIComponent(location.pathname.split("/").pop() || "index");
    var prev = all[f] || {};
    all[f] = {
      title: (document.title||"").slice(0,120),
      score: scored, total: total,
      best: Math.max(scored, prev.best||0),
      attempts: (prev.attempts||0) + 1,
      t: Date.now()
    };
    localStorage.setItem("bba-scores", JSON.stringify(all));
  }catch(e){}
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
+ "#bba-kit .act .rs{background:transparent;color:rgba(255,255,255,.8);border:1px solid rgba(255,255,255,.3)!important;font-weight:500}"
+ "#bba-kit .act .min{background:transparent;color:rgba(255,255,255,.75);border:1px solid rgba(255,255,255,.3)!important;padding:0 10px!important}"
+ "#bba-kit .msg{padding:0 12px 9px;max-width:1180px;margin:0 auto;font-size:12.5px;color:#cfe0f5}"
+ "#bba-kit .msg b{color:#fff}"
+ "#bba-kit .sv{font-size:11px;color:rgba(255,255,255,.5);white-space:nowrap}"
+ "#bba-kit.small .bar .pad,#bba-kit.small .bar .nm,#bba-kit.small .msg,#bba-kit.small .sv{display:none}"
/* resume prompt */
+ "#bba-resume{position:fixed;left:50%;transform:translateX(-50%);bottom:84px;z-index:2147483001;"
+ "max-width:min(560px,94vw);background:#fff;color:#14283f;border:1px solid #cfd8e6;border-left:5px solid #b8860b;"
+ "border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,.24);padding:14px 16px;"
+ "font:14px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}"
+ "#bba-resume p{margin:0 0 10px}"
+ "#bba-resume .r{display:flex;gap:8px;flex-wrap:wrap}"
+ "#bba-resume button{font:inherit;font-weight:600;border-radius:6px;padding:7px 14px;cursor:pointer;border:1px solid #cfd8e6;background:#fff;color:#14283f}"
+ "#bba-resume button.go{background:#2e7d52;border-color:#2e7d52;color:#fff}"
/* per-field marking */
+ ".bba-ok{outline:2px solid #2e7d52!important;outline-offset:1px}"
+ ".bba-warn{outline:2px solid #b8860b!important;outline-offset:1px}"
+ ".bba-bad{outline:2px solid #c0392b!important;outline-offset:1px}"
+ ".bba-tip{display:block;font:12.5px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"
+ "margin-top:4px;color:#7a5c00}"
+ ".bba-tip.bad{color:#a5281b}.bba-tip.good{color:#1d5a3a}"
+ ".bba-tip .rv{font:inherit;background:none;border:0;border-bottom:1px dotted currentColor;color:inherit;"
+ "cursor:pointer;padding:0;margin-left:8px}"
+ ".bba-sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}";

/* ------------------------------------------------------------------ UI */
var last = null;                          // last focused text field
function isTypable(el){
  return el && (el.tagName==="TEXTAREA" ||
    (el.tagName==="INPUT" && /^(text|search|email|url|tel|)$/i.test(el.type)));
}
document.addEventListener("focusin", function(e){
  var el=e.target;
  if(el && !el.closest("#bba-kit") && isTypable(el)) last = el;
});

var UI = null;                            // {msg, live, name()}

function build(){
  if(!ON("pad") && !ON("name") && !ON("check") && !ON("download")) return;
  var st=document.createElement("style"); st.textContent=CSS; document.head.appendChild(st);

  var kit=document.createElement("div"); kit.id="bba-kit";
  var bar=document.createElement("div"); bar.className="bar";

  var nm=document.createElement("input");
  nm.className="nm"; nm.type="text"; nm.placeholder=T.name; nm.setAttribute("aria-label",T.name);
  try{ nm.value = S.name || localStorage.getItem("bba-name") || ""; }catch(e){}
  nm.addEventListener("input",function(){
    S.name = nm.value.trim();
    try{ localStorage.setItem("bba-name", S.name); }catch(e){}
    saveState();
  });
  if(ON("name")) bar.appendChild(nm);

  /* The kit's pad steps aside when the page already has one of its own. */
  var ownPad = !!document.querySelector(
    "#accentPad,#padToggle,#padtoggle,#pad,#teclado,#clavier,#keyboard,#accentKeyboard,#virtualKeyboard,.accent-pad,.accent-row,#accent-row-primary,.accent-key,.accent-btn,.btn-accent,.accent-keyboard,.accent-buttons,.keyboard,.keyboard-btn,.keyboard-keys,.floating-keyboard,[data-accent-pad]");
  var wantPad = (OPT.pad === true) || (ON("pad") && !ownPad);

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
  if(wantPad) bar.appendChild(pad);

  var sv=document.createElement("span"); sv.className="sv";

  var act=document.createElement("div"); act.className="act";
  var chk=document.createElement("button"); chk.type="button"; chk.className="chk"; chk.textContent=T.check;
  var dl =document.createElement("button"); dl.type="button";  dl.className="dl";  dl.textContent=T.download;
  var rs =document.createElement("button"); rs.type="button";  rs.className="rs";  rs.textContent=T.reset;
  var min=document.createElement("button"); min.type="button"; min.className="min"; min.textContent="–";
  min.title=T.hide;
  min.addEventListener("click",function(){
    kit.classList.toggle("small");
    min.textContent = kit.classList.contains("small") ? "+" : "–";
    pack();
  });
  act.appendChild(sv);
  if(ON("check")) act.appendChild(chk);
  if(ON("download")) act.appendChild(dl);
  if(SAVE_OK) act.appendChild(rs);
  act.appendChild(min);
  bar.appendChild(act);

  var msg=document.createElement("div"); msg.className="msg";
  msg.setAttribute("aria-live","polite");
  msg.setAttribute("role","status");
  msg.textContent = (ON("check")||ON("download")) ? T.ready : "";

  var live=document.createElement("div");
  live.className="bba-sr"; live.setAttribute("aria-live","polite"); live.setAttribute("role","status");

  kit.appendChild(bar); kit.appendChild(msg); kit.appendChild(live);
  document.body.appendChild(kit);

  chk.addEventListener("click", function(){ check(msg); });
  dl .addEventListener("click", function(){ download(nm.value.trim(), msg); });
  rs .addEventListener("click", function(){
    if(!confirm(T.resetQ)) return;
    clearState(); clearTips();
    allFields().forEach(function(el){
      var ty=(el.type||"").toLowerCase();
      if(ty==="radio"||ty==="checkbox") el.checked=false;
      else if(el.tagName==="SELECT") el.selectedIndex=0;
      else el.value="";
    });
    msg.textContent = T.cleared;
  });

  function pack(){ document.body.style.paddingBottom = (kit.offsetHeight+12)+"px"; }
  pack(); window.addEventListener("resize", pack);

  /* On a narrow screen the bar must not swallow the page. */
  if (window.matchMedia && window.matchMedia("(max-width:640px)").matches){
    kit.classList.add("small"); min.textContent="+"; pack();
  }

  UI = {msg:msg, live:live, sv:sv, kit:kit, pack:pack, name:function(){return nm.value.trim();}};
  return UI;
}
function say(text){ if(UI && UI.live) UI.live.textContent = text; }
function flashSaved(){
  if(!UI || !UI.sv) return;
  UI.sv.textContent = T.saved;
  clearTimeout(flashSaved._t);
  flashSaved._t = setTimeout(function(){ if(UI&&UI.sv) UI.sv.textContent=""; }, 1400);
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

/* ===============================================  v2: RESUME / AUTOSAVE */
function wireAutosave(){
  if(!SAVE_OK) return;
  document.addEventListener("input", function(e){
    if(!e.target || e.target.closest("#bba-kit") || !marked(e.target)) return;
    var el = e.target, k = fieldKey(el);
    S.ans[k] = (el.tagName==="SELECT") ? el.selectedIndex : el.value;
    saveState(); flashSaved();
  }, true);
  document.addEventListener("change", function(e){
    if(!e.target || e.target.closest("#bba-kit") || !marked(e.target)) return;
    var el = e.target, ty=(el.type||"").toLowerCase(), k = fieldKey(el);
    if(ty==="radio"||ty==="checkbox") S.ans[k] = el.checked ? 1 : 0;
    else if(el.tagName==="SELECT")    S.ans[k] = el.selectedIndex;
    else                              S.ans[k] = el.value;
    saveState(); flashSaved();
  }, true);
  window.addEventListener("beforeunload", function(){ saveState(true); });
  window.addEventListener("pagehide",     function(){ saveState(true); });
  document.addEventListener("visibilitychange", function(){
    if(document.visibilityState === "hidden") saveState(true);
  });
}
function offerResume(){
  if(!SAVE_OK || !hasSavedWork()) return;
  if(!pendingRestore()) return;      // the page restored itself; say nothing
  var box = document.createElement("div");
  box.id = "bba-resume";
  box.setAttribute("role","dialog");
  box.setAttribute("aria-label", T.resumeQ);
  var p = document.createElement("p"); p.textContent = T.resumeQ;
  var row = document.createElement("div"); row.className = "r";
  var go = document.createElement("button"); go.type="button"; go.className="go"; go.textContent = T.resumeYes;
  var no = document.createElement("button"); no.type="button"; no.textContent = T.resumeNo;
  row.appendChild(go); row.appendChild(no);
  box.appendChild(p); box.appendChild(row);
  document.body.appendChild(box);
  go.addEventListener("click", function(){
    var n = restoreAll();
    box.remove();
    if(UI) UI.msg.textContent = T.restored;
    say(T.restored);
  });
  no.addEventListener("click", function(){ clearState(); box.remove(); });
  go.focus();
}

/* =========================================  v2: ENTER + FOCUS MOVEMENT */
function nextField(from){
  var list = allFields().filter(isTypable);
  var i = list.indexOf(from);
  for(var j=i+1;j<list.length;j++){ if(!list[j].value.trim()) return list[j]; }
  return list[i+1] || null;
}
function focusBelowBar(el){
  if(!el) return;
  el.focus();
  try{
    var kit = document.getElementById("bba-kit");
    var pad = kit ? kit.offsetHeight + 24 : 24;
    var r = el.getBoundingClientRect();
    if(r.bottom > window.innerHeight - pad) window.scrollBy(0, r.bottom - (window.innerHeight - pad));
  }catch(e){}
}
/* Bubble phase, and we stand down if the page already handled the key.
   A page with its own Enter behaviour keeps it; the kit only fills the gap. */
function wireEnter(){
  if(OPT.enter === false) return;
  document.addEventListener("keydown", function(e){
    var el = e.target;
    if(e.defaultPrevented) return;
    if(!el || el.closest("#bba-kit") || !marked(el) || !isTypable(el)) return;
    if(e.key !== "Enter") return;
    // In a textarea Enter is a newline; Ctrl/Cmd+Enter submits instead.
    if(el.tagName === "TEXTAREA" && !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    var key = externalKey(), want = answerOf(el, key);
    if(want == null){ focusBelowBar(nextField(el)); return; }
    var v = checkOne(el, want);
    if(v && (v.code === "ok" || v.code === "accent" || v.code === "typo")) focusBelowBar(nextField(el));
  }, false);
}

/* ==============================================  v2: PER-FIELD MARKING */
function tipFor(el){
  var n = el.nextSibling;
  while(n){ if(n.nodeType===1 && n.classList && n.classList.contains("bba-tip")) return n; n = n.nextSibling; }
  return null;
}
function setTip(el, text, cls, revealFn){
  var tip = tipFor(el);
  if(!tip){
    tip = document.createElement("small");
    tip.className = "bba-tip";
    if(el.parentNode) el.parentNode.insertBefore(tip, el.nextSibling);
  }
  tip.className = "bba-tip" + (cls ? " " + cls : "");
  tip.textContent = text;
  if(revealFn){
    var b = document.createElement("button");
    b.type = "button"; b.className = "rv"; b.textContent = T.seeAnswer;
    b.addEventListener("click", revealFn);
    tip.appendChild(b);
  }
  return tip;
}
function paint(el, cls){
  el.classList.remove("bba-ok","bba-warn","bba-bad");
  if(cls) el.classList.add(cls);
}
/* Marks a single field, honouring the two-attempt rule.
   Returns the verdict, or null when the field has no answer key. */
function checkOne(el, want){
  if(want == null) return null;
  var k = fieldKey(el);
  var val = (el.tagName === "SELECT")
      ? (el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : "")
      : el.value;
  var v = judge(val, want);

  if(v.code === "empty"){ paint(el, null); setTip(el, T.blank, ""); say(T.blank); return v; }

  if(v.code === "ok" || v.code === "accent" || v.code === "typo"){
    S.done[k] = 1; saveState();
    paint(el, v.code === "ok" ? "bba-ok" : "bba-warn");
    if(v.code === "ok"){ var t = tipFor(el); if(t) t.remove(); }
    else setTip(el, v.note, "good");
    say(v.code === "ok" ? T.right : v.note);
    return v;
  }

  // Wrong.
  var n = (S.tries[k] || 0) + 1;
  S.tries[k] = n; saveState();
  var reveal = function(){
    S.shown[k] = 1; saveState();
    paint(el, "bba-bad");
    setTip(el, T.answerIs + " " + v.want + (v.note && v.note !== T.wrong ? "  —  " + v.note : ""), "bad");
    say(T.answerIs + " " + v.want);
  };
  if(TRIES > 0 && n < TRIES && !S.shown[k]){
    paint(el, "bba-warn");
    var msg = (v.note && v.note !== T.wrong ? v.note + "  " : T.tryAgain + "  ") + clueFor(val, v.want);
    setTip(el, msg, "", reveal);
    say(msg);
  } else {
    reveal();
  }
  return v;
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
    say(T.noKeyTitle);
    return null;
  }
  var ok=0,acc=0,typo=0,bad=0,blank=0,rows=[];
  F.forEach(function(f){
    if(f.want==null) return;
    var before = S.tries[f.key] || 0;
    var v = checkOne(f.el, f.want);
    rows.push({label:f.label, given:f.value, want:v.want, code:v.code, note:v.note,
               tries:(v.code==="ok"||v.code==="accent"||v.code==="typo") ? before+1 : (S.tries[f.key]||before)||""});
    if(v.code==="ok")ok++; else if(v.code==="accent")acc++; else if(v.code==="typo")typo++;
    else if(v.code==="empty")blank++; else bad++;
  });
  var scored = ok+acc+typo, total = rows.length-blank;
  LAST_RESULT = {rows:rows, ok:ok, acc:acc, typo:typo, bad:bad, blank:blank, scored:scored, total:total};
  publishScore(scored, rows.length);
  var line = "<b>"+scored+" / "+(rows.length)+"</b> · "
    + T.exact+": "+ok+" · "+T.accSlip+": "+acc+" · "+T.typoSlip+": "+typo
    + " · "+T.wrongN+": "+bad + (blank?" · "+T.blankN+": "+blank:"");
  msg.innerHTML = line;
  say(scored + " / " + rows.length);
  saveState(true);
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
    L.push([T.cItem,T.cAnswer,T.cExpected,T.cVerdict,T.cTries,T.cNote].map(csvCell).join(","));
    R.rows.forEach(function(r){
      L.push([r.label, r.given, r.want, T.codes[r.code], r.tries||"", r.note].map(csvCell).join(","));
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
  if(!name){ msg.innerHTML="<b>"+T.nameFirst+"</b>"; say(T.nameFirst); }
}
/* ------------------------------------------------------------- mobile */
/* The phone fixes live in two files so any page can use them, with or
   without this kit. Loading them here means the 91 pages that already
   carry the kit needed no edit at all. */
function mobileAssets(){
  try {
    var here = (document.currentScript && document.currentScript.src) || "";
    var base = here ? here.replace(/[^\/]*$/, "") : "";
    if (!document.querySelector('link[href$="bba-mobile.css"]')){
      var l = document.createElement("link");
      l.rel = "stylesheet"; l.href = base + "bba-mobile.css";
      document.head.appendChild(l);
    }
    if (!window.__bbaMobile && !document.querySelector('script[src$="bba-mobile.js"]')){
      var s = document.createElement("script");
      s.src = base + "bba-mobile.js"; s.defer = true;
      document.head.appendChild(s);
    }
  } catch(e){ /* a missing phone stylesheet must never break the page */ }
}
mobileAssets();

/* ---------------------------------------------------------------- boot */
function boot(){
  loadState();
  build();
  wireAutosave();
  wireEnter();
  // Let a page's own restore logic run first; the kit only fills the gaps.
  setTimeout(offerResume, 350);
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
else boot();

/* A small public surface, for pages that want to drive the kit themselves. */
window.BBA = {
  check: function(){ return UI ? check(UI.msg) : null; },
  checkField: checkOne,
  save: function(){ captureAll(); saveState(true); },
  reset: clearState,
  scores: function(){ try{ return JSON.parse(localStorage.getItem("bba-scores")||"{}"); }catch(e){ return {}; } },
  version: 2.1
};
})();
