/* bba-theme.js — dark mode for the A-Level sites, switched on only by the student.
   One switch for all four A-Level sites: they share one address on GitHub, so the
   choice ("bba-theme" in this browser's storage) follows the student from site to
   site on the same device. Nothing changes until the button is pressed.

   Pages built on the sites' colour scheme (the home pages, the vocabulary apps,
   the dashboard) get a proper dark palette. Activity pages, each styled on its
   own, are shown through an inverting filter that leaves pictures and video as
   they are. Printing is always light. */
(function(){
  "use strict";
  if (window.__bbaTheme) return; window.__bbaTheme = true;
  var KEY = "bba-theme", root = document.documentElement;
  var get = function(){ try{ return localStorage.getItem(KEY) === "dark" ? "dark" : "light"; }catch(e){ return "light"; } };
  var set = function(v){ try{ if (v === "dark") localStorage.setItem(KEY, "dark"); else localStorage.removeItem(KEY); }catch(e){} };

  var CSS =
  /* pages with the sites' own colour variables */
  'html[data-theme=dark][data-theme-mode=vars]{color-scheme:dark;' +
    '--paper:#12151C;--card:#1B202B;--ink:#E7E9EF;--ink-soft:#B9BFCD;--muted:#8D94A6;' +
    '--accent:#F07A86;--rouge:#F07A86;--bleu:#8FB1F7;--bleu-pale:#1F2C47;--vert:#6FCF97;--vert-pale:#18301F;' +
    '--rouge-pale:#3A1D22;--or:#E5B84B;--or-pale:#33290F;--line:#2C3242;--line-strong:#3F4759;' +
    '--shadow:0 1px 2px rgba(0,0,0,.4)}' +
  'html[data-theme=dark][data-theme-mode=vars] body{background:var(--paper);color:var(--ink)}' +
  'html[data-theme=dark][data-theme-mode=vars] input,html[data-theme=dark][data-theme-mode=vars] textarea,' +
  'html[data-theme=dark][data-theme-mode=vars] select{background:#0F1218;color:var(--ink);border-color:var(--line-strong)}' +
  'html[data-theme=dark][data-theme-mode=vars] ::placeholder{color:#717889}' +
  'html[data-theme=dark][data-theme-mode=vars] .hdr-link{color:var(--ink-soft)!important}' +
  'html[data-theme=dark][data-theme-mode=vars] .hdr-link:hover{color:var(--ink)!important}' +
  'html[data-theme=dark][data-theme-mode=vars] img,html[data-theme=dark][data-theme-mode=vars] video{filter:brightness(.9)}' +
  'html[data-theme=dark][data-theme-mode=vars] .howto{background:var(--card)!important;color:var(--ink)!important;border-color:var(--line-strong)!important}' +
  'html[data-theme=dark][data-theme-mode=vars] .howto h3{color:var(--ink)!important}' +
  'html[data-theme=dark][data-theme-mode=vars] .howto summary,html[data-theme=dark][data-theme-mode=vars] .howto a{color:var(--bleu)!important}' +
  'html[data-theme=dark][data-theme-mode=vars] .howto>summary{color:var(--ink)!important}' +
  'html[data-theme=dark][data-theme-mode=vars] .howto .who{color:var(--ink-soft)!important}' +
  'html[data-theme=dark][data-theme-mode=vars] .bba-dk-fix{color:#12151C!important}' +
  'html[data-theme=dark][data-theme-mode=vars] .bba-dk-ink{color:var(--bba-fg,var(--ink))!important}' +
  'html[data-theme=dark][data-theme-mode=vars] .bba-dk-bg{background-color:var(--bba-bg,var(--card))!important;border-color:var(--line-strong)!important}' +
  /* the "sent to your teacher" strip on the home pages */
  'html[data-theme=dark][data-theme-mode=vars] .sendbar{color:var(--ink)}' +
  'html[data-theme=dark][data-theme-mode=vars] .sendbar.waiting{background:#33290F!important;border-bottom-color:#6B5520!important}' +
  'html[data-theme=dark][data-theme-mode=vars] .sendbar.waiting .dot{background:var(--or)!important}' +
  'html[data-theme=dark][data-theme-mode=vars] .sendbar.clear{background:var(--vert-pale)!important;border-bottom-color:#2F5A3E!important}' +
  /* status labels: done / to do / opened, and scores */
  'html[data-theme=dark][data-theme-mode=vars] .week .st.done,html[data-theme=dark][data-theme-mode=vars] .tile .score.hi,' +
  'html[data-theme=dark][data-theme-mode=vars] .mark.on{background:#18301F!important;color:#8FE0B0!important}' +
  'html[data-theme=dark][data-theme-mode=vars] .week .st.pending,html[data-theme=dark][data-theme-mode=vars] .tile .score.lo{background:#3A1D22!important;color:#F4A3AB!important}' +
  'html[data-theme=dark][data-theme-mode=vars] .week .st.opened,html[data-theme=dark][data-theme-mode=vars] .tile .score.mid,' +
  'html[data-theme=dark][data-theme-mode=vars] .conf button.on{background:#33290F!important;color:#F0CF7A!important}' +
  'html[data-theme=dark][data-theme-mode=vars] .claimed{background:#2A2414!important;border-color:#5A4A24!important;color:#E6D3A3!important}' +
  /* the link to the sister site, styled in the page itself */
  'html[data-theme=dark][data-theme-mode=vars] a.xsite{color:var(--ink)!important;border-color:var(--ink-soft)!important}' +
  'html[data-theme=dark][data-theme-mode=vars] a.xsite:hover{border-color:var(--bleu)!important;color:var(--bleu)!important}' +
  /* any other page: invert, and turn pictures back */
  'html[data-theme=dark][data-theme-mode=filter]{filter:invert(.92) hue-rotate(180deg);background:#fff}' +
  'html[data-theme=dark][data-theme-mode=filter] img,html[data-theme=dark][data-theme-mode=filter] video,' +
  'html[data-theme=dark][data-theme-mode=filter] picture,html[data-theme=dark][data-theme-mode=filter] iframe,' +
  'html[data-theme=dark][data-theme-mode=filter] canvas,html[data-theme=dark][data-theme-mode=filter] svg image,' +
  'html[data-theme=dark][data-theme-mode=filter] [style*="background-image"],' +
  'html[data-theme=dark][data-theme-mode=filter] #bba-theme-btn,html[data-theme=dark][data-theme-mode=filter] #bba-kit,' +
  'html[data-theme=dark][data-theme-mode=filter] #bba-resume{filter:invert(1) hue-rotate(180deg)}' +
  /* the button */
  '#bba-theme-btn{position:fixed;left:12px;bottom:78px;z-index:2147483002;display:inline-flex;align-items:center;gap:6px;' +
    'font:600 13px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;' +
    'padding:8px 12px;border-radius:999px;border:1px solid rgba(0,0,0,.18);background:#fff;color:#1A2440;' +
    'box-shadow:0 2px 8px rgba(0,0,0,.15);cursor:pointer;opacity:.9}' +
  '#bba-theme-btn:hover,#bba-theme-btn:focus-visible{opacity:1}' +
  'html[data-theme=dark][data-theme-mode=vars] #bba-theme-btn{background:#1B202B;color:#E7E9EF;border-color:#3F4759}' +
  '@media print{html[data-theme=dark]{filter:none!important;color-scheme:light}#bba-theme-btn{display:none!important}}';

  function mode(){
    if (window.__bbaThemeMode) return window.__bbaThemeMode;   /* activity pages: always the filter */
    try{ return getComputedStyle(root).getPropertyValue("--paper").trim() ? "vars" : "filter"; }catch(e){ return "filter"; }
  }
  function apply(v){
    if (v === "dark"){ root.setAttribute("data-theme", "dark"); root.setAttribute("data-theme-mode", mode()); queueFix(); }
    else { root.removeAttribute("data-theme"); clearFix(); }
    var b = document.getElementById("bba-theme-btn");
    if (b){
      b.textContent = v === "dark" ? "☀ Light mode" : "☾ Dark mode";
      b.setAttribute("aria-pressed", v === "dark" ? "true" : "false");
      b.title = v === "dark" ? "Switch back to the light pages" : "Switch to dark pages (remembered on this device)";
    }
  }
  /* After the palette changes, some colours written into a page itself stay as
     they were: a pale tinted box (now bright behind light text), dark text (now
     on a dark ground), white text on what is now a light fill. Each piece of
     text is checked against the colour actually behind it, and anything hard to
     read is given a dark version of its box colour or a light version of its
     own colour, keeping the hue (green stays green, red stays red).
     Runs only while the dark palette is on; switching back removes it all. */
  var fixT = null;
  function rgb(c){ var m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(c || "");
    if (!m) return null; return {r:+m[1], g:+m[2], b:+m[3], a:m[4] === undefined ? 1 : +m[4]}; }
  function rl(o){ function ch(v){ v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }
    return 0.2126*ch(o.r) + 0.7152*ch(o.g) + 0.0722*ch(o.b); }
  function ratio(a, b){ var x = rl(a), y = rl(b); return (Math.max(x,y) + 0.05) / (Math.min(x,y) + 0.05); }
  function hsl(o){ var r = o.r/255, g = o.g/255, b = o.b/255, mx = Math.max(r,g,b), mn = Math.min(r,g,b), h = 0, s = 0, l = (mx+mn)/2, d = mx-mn;
    if (d){ s = l > .5 ? d/(2-mx-mn) : d/(mx+mn);
      h = mx === r ? (g-b)/d + (g < b ? 6 : 0) : mx === g ? (b-r)/d + 2 : (r-g)/d + 4; h *= 60; }
    return {h:h, s:s, l:l}; }
  function hslStr(h, s, l){ return "hsl(" + Math.round(h) + "," + Math.round(s*100) + "%," + Math.round(l*100) + "%)"; }
  var PAPER = {r:18, g:21, b:28, a:1};
  function behind(e){                      /* the colour actually behind an element */
    for (var n = e; n && n.nodeType === 1; n = n.parentElement){
      var c = rgb(getComputedStyle(n).backgroundColor); if (c && c.a >= .5) return c; }
    return PAPER; }
  function ownText(e){ for (var c = e.firstChild; c; c = c.nextSibling) if (c.nodeType === 3 && /\S/.test(c.nodeValue)) return true;
    return /^(INPUT|BUTTON|SELECT|TEXTAREA)$/.test(e.tagName); }
  function fixContrast(){
    fixT = null;
    if (root.getAttribute("data-theme") !== "dark" || root.getAttribute("data-theme-mode") !== "vars" || !document.body) return;
    var els = document.body.querySelectorAll("*");
    for (var i = 0; i < els.length && i < 8000; i++){
      var e = els[i];
      if (e.id === "bba-theme-btn" || e.closest("svg,#bba-theme-btn") || e.classList.contains("bba-dk-skip")) continue;
      var cs = getComputedStyle(e); if (cs.display === "none") continue;
      var fg = rgb(cs.color), bg = rgb(cs.backgroundColor);
      /* 1. a pale box written into the page (beige, pale green, pale red, white):
            give it a dark box of the same hue */
      if (bg && bg.a >= .5 && !e.classList.contains("bba-dk-bg") && !(fg && fg.r > 250 && fg.g > 250 && fg.b > 250)){
        var hb = hsl(bg);
        if (hb.l > .86 && !(bg.r === 231 && bg.g === 233 && bg.b === 239)){
          e.style.setProperty("--bba-bg", hb.s < .12 ? "#1B202B" : hslStr(hb.h, Math.min(hb.s, .45), .15));
          e.classList.add("bba-dk-bg"); cs = getComputedStyle(e); fg = rgb(cs.color);
        }
      }
      if (!fg || !ownText(e)) continue;
      var back = behind(e);
      if (ratio(fg, back) >= 3.6) continue;
      if (rl(back) > .3){                  /* light ground (a button filled with link blue): dark text */
        e.classList.add("bba-dk-fix");
      } else {                             /* dark ground: a light version of the text's own colour */
        var hf = hsl(fg);
        e.style.setProperty("--bba-fg", hf.s < .15 ? "#E7E9EF" : hslStr(hf.h, Math.min(Math.max(hf.s, .45), .75), .76));
        e.classList.add("bba-dk-ink");
      }
    }
  }
  function queueFix(){ if (!fixT) fixT = setTimeout(fixContrast, 250); }
  function clearFix(){ var f = document.querySelectorAll(".bba-dk-fix,.bba-dk-ink,.bba-dk-bg");
    for (var i = 0; i < f.length; i++){ f[i].classList.remove("bba-dk-fix", "bba-dk-ink", "bba-dk-bg");
      f[i].style.removeProperty("--bba-fg"); f[i].style.removeProperty("--bba-bg");
      if (f[i].getAttribute("style") === "") f[i].removeAttribute("style"); } }
  function addStyle(){
    if (document.getElementById("bba-theme-css")) return;
    var s = document.createElement("style"); s.id = "bba-theme-css"; s.textContent = CSS;
    (document.head || root).appendChild(s);
  }
  function addButton(){
    if (document.getElementById("bba-theme-btn") || !document.body) return;
    var b = document.createElement("button");
    b.id = "bba-theme-btn"; b.type = "button";
    b.addEventListener("click", function(){ var v = get() === "dark" ? "light" : "dark"; set(v); apply(v); });
    document.body.appendChild(b);
    apply(get());
  }
  addStyle();
  if (get() === "dark") apply("dark");           /* as early as possible, to avoid a white flash */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function(){ apply(get()); addButton(); });
  else addButton();
  /* pages that redraw (tabs, sessions, tables) get the contrast fix again */
  try{ new MutationObserver(function(){ if (root.getAttribute("data-theme") === "dark") queueFix(); })
         .observe(document.documentElement, {childList: true, subtree: true}); }catch(e){}
  /* another tab on the same site changed it */
  window.addEventListener("storage", function(e){ if (e.key === KEY) apply(get()); });
})();
