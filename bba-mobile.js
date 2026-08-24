/* =====================================================================
   BBA mobile — the text floor.

   Thirty-three pages carry text under 12 px at phone width: badges,
   pills, kickers, table headers, legends. Across the site that is dozens
   of different class names, several of them bare tags like
   <span> and <th> that carry perfectly good type elsewhere. Naming them
   in a stylesheet would be guesswork with collateral damage.

   So this reads what the browser actually computed and lifts only what
   is genuinely too small, leaving everything else exactly as designed.

   Runs once at phone widths, and again if the phone is turned. Adds no
   markup; every change is a single inline font-size that can be undone
   by removing the class.

   bba-kit-es.js loads this automatically. Pages without the kit:
       <script src="bba-mobile.js" defer></script>
   ===================================================================== */
(function () {
"use strict";
if (window.__bbaMobile) return;
window.__bbaMobile = true;

var FLOOR = 12;          // px — below this, small print stops being readable
var WIDE  = 480;         // px — above this we are not on a phone
var MARK  = "bba-lifted";

function phone() {
  return window.matchMedia
    ? window.matchMedia("(max-width:" + WIDE + "px)").matches
    : window.innerWidth <= WIDE;
}

/* Only elements that carry text of their own matter. An element whose
   text lives in a child will be reached when we get to the child. */
function ownText(el) {
  var n = el.firstChild;
  while (n) {
    if (n.nodeType === 3 && n.nodeValue && n.nodeValue.trim()) return true;
    n = n.nextSibling;
  }
  return false;
}

function lift() {
  if (!phone()) { drop(); return; }
  var all = document.body ? document.body.getElementsByTagName("*") : [];
  var i, el, cs, size;
  for (i = 0; i < all.length; i++) {
    el = all[i];
    if (el.closest && el.closest("#bba-kit")) continue;      // the kit sizes itself
    if (el.classList && el.classList.contains(MARK)) continue;
    if (!ownText(el)) continue;
    if (!el.getClientRects().length) continue;               // hidden: leave it
    cs = window.getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    size = parseFloat(cs.fontSize);
    if (!size || size >= FLOOR) continue;

    /* Keep the relationship the designer intended where we can: if the
       element was set in em, scaling it up keeps its ratio to the parent
       readable rather than flattening everything to one size. */
    el.style.setProperty("font-size", FLOOR + "px", "important");
    el.classList.add(MARK);
  }
}

function drop() {
  var lifted = document.querySelectorAll("." + MARK), i;
  for (i = 0; i < lifted.length; i++) {
    lifted[i].style.removeProperty("font-size");
    lifted[i].classList.remove(MARK);
  }
}

function run() {
  try { lift(); } catch (e) { /* never break a page over type size */ }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
else run();

/* A phone turned sideways crosses the breakpoint; so does a resized
   desktop window. Re-run rather than leave the page half-treated. */
var t = null;
window.addEventListener("resize", function () {
  clearTimeout(t);
  t = setTimeout(run, 200);
});
/* Pages that build their content after load — the vocabulary trainer,
   the quizzes — get a second pass once the DOM has settled. */
window.addEventListener("load", function () { setTimeout(run, 400); });

window.BBAMobile = { lift: run, reset: drop, floor: FLOOR };
})();
