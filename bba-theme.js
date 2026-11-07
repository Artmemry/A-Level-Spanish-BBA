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
  /* White text sitting on what is now a light colour (a button filled with the
     link blue, a selected chip filled with the ink colour) would vanish: give it
     dark text instead. Runs only while the dark palette is on. */
  var fixT = null;
  function lum(c){ var m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(c || "");
    if (!m || (m[4] !== undefined && +m[4] < .5)) return -1; return (0.2126*m[1] + 0.7152*m[2] + 0.0722*m[3]) / 255; }
  function fixContrast(){
    fixT = null;
    if (root.getAttribute("data-theme") !== "dark" || root.getAttribute("data-theme-mode") !== "vars" || !document.body) return;
    var els = document.body.querySelectorAll("*");
    for (var i = 0; i < els.length && i < 6000; i++){
      var e = els[i]; if (e.id === "bba-theme-btn") continue;
      var cs = getComputedStyle(e);
      if (cs.color !== "rgb(255, 255, 255)") continue;
      if (lum(cs.backgroundColor) > 0.5) e.classList.add("bba-dk-fix");
    }
  }
  function queueFix(){ if (!fixT) fixT = setTimeout(fixContrast, 250); }
  function clearFix(){ var f = document.querySelectorAll(".bba-dk-fix"); for (var i = 0; i < f.length; i++) f[i].classList.remove("bba-dk-fix"); }
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
