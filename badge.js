/*
 * Jacob Bros badge: credits Jacob Bros and links back to the hub for more games.
 *
 * Add this to any game, with your game's id from data/games.js:
 *
 *   <script src="https://y2jcpa.github.io/JacobBros/badge.js" data-game="dreidel" defer></script>
 *
 * Options (attributes on the script tag):
 *   data-game      your game's id, so the hub can suggest what to play next
 *   data-position  bottom-left (default) | bottom-right | top-left | top-right
 *   data-lang      en | he (default: follows <html lang>, and switches with it)
 *   data-above     CSS selector of a bar along the bottom (like a phone tab bar);
 *                  while it's visible the badge sits just above it
 *   data-show-with CSS selector of your start or menu screen; the badge only
 *                  shows while that screen is visible, so it never covers gameplay
 *
 * To place it inside your own menu instead of floating on the screen, put
 * <div id="jacobbros-badge"></div> wherever you want it.
 */
(function () {
  if (document.querySelector("jacobbros-badge-host")) return;

  const script = document.currentScript;
  const hub = new URL("./", script ? script.src : "https://y2jcpa.github.io/JacobBros/badge.js");
  const game = script && script.dataset.game;
  const position = (script && script.dataset.position) || "bottom-left";
  const fixedLang = script && script.dataset.lang;
  const aboveSel = script && script.dataset.above;
  const showWithSel = script && script.dataset.showWith;
  if (game) hub.searchParams.set("from", game);

  const TEXT = {
    en: { by: "By Jacob Bros", more: "More games ▶", title: "More Torah games from the Jacob Bros" },
    he: { by: "מבית Jacob Bros", more: "עוד משחקים ◀", title: "עוד משחקי תורה מהאחים של יעקב" },
  };
  const langNow = function () {
    if (fixedLang === "he" || fixedLang === "en") return fixedLang;
    return (document.documentElement.lang || "").toLowerCase().indexOf("he") === 0 ? "he" : "en";
  };

  function mount() {
    const slot = document.getElementById("jacobbros-badge");
    const host = document.createElement("jacobbros-badge-host");
    const root = host.attachShadow({ mode: "open" });
    const parts = position.split("-");
    const v = parts[0], h = parts[1];
    const floating = !slot;

    root.innerHTML =
      "<style>" +
      ":host{all:initial;" + (floating
        ? "position:fixed;z-index:2147483000;" +
          (v === "top" ? "top:calc(10px + env(safe-area-inset-top, 0px));" : "bottom:calc(10px + env(safe-area-inset-bottom, 0px));") +
          (h === "right" ? "right:calc(10px + env(safe-area-inset-right, 0px));" : "left:calc(10px + env(safe-area-inset-left, 0px));")
        : "display:inline-block;") + "}" +
      "a{display:inline-flex;align-items:center;gap:8px;padding:6px 10px 5px 7px;" +
      "font:700 11px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.04em;text-transform:uppercase;" +
      "color:#fff;text-decoration:none;text-shadow:1px 1px 0 #000;background:#c84c0c;" +
      "box-shadow:0 -3px 0 #20140c,0 3px 0 #20140c,-3px 0 0 #20140c,3px 0 0 #20140c,inset 3px 3px 0 #fcbcb0,inset -3px -3px 0 #7c2c00;" +
      "opacity:.9;transition:opacity .15s,transform .1s;-webkit-tap-highlight-color:transparent}" +
      "a:hover,a:focus-visible{opacity:1;transform:translateY(-2px)}" +
      "a:focus-visible{outline:2px dashed #fff;outline-offset:4px}" +
      "a[dir=rtl]{font-family:system-ui,'Rubik',sans-serif;letter-spacing:0;padding:6px 7px 5px 10px}" +
      ".r{width:18px;height:20px;flex:none;image-rendering:pixelated;background:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 11' shape-rendering='crispEdges'%3E%3Cg fill='%237c0f1f'%3E%3Crect x='3' width='1' height='1'/%3E%3Crect x='5' width='1' height='1'/%3E%3Crect x='7' width='1' height='1'/%3E%3Crect x='3' y='1' width='5' height='1'/%3E%3C/g%3E%3Cpath fill='%23df2a40' d='M2 2h6v1h1v1h1v4H9v1H8v1H2V9H1V8H0V4h1V3h1z'/%3E%3Cg fill='%23ff8f9c'%3E%3Crect x='3' y='3' width='1' height='1'/%3E%3Crect x='2' y='4' width='2' height='1'/%3E%3C/g%3E%3C/svg%3E\") center/contain no-repeat}" +
      "small{display:block;font-size:8px;opacity:.9;margin-bottom:3px;text-transform:none}" +
      "@media print{:host{display:none}}" +
      "</style>" +
      '<a part="link" href="' + hub.href + '"><span class="r" aria-hidden="true"></span><span><small></small><b></b></span></a>';

    const link = root.querySelector("a");
    function render() {
      const lang = langNow();
      const t = TEXT[lang];
      link.dir = lang === "he" ? "rtl" : "ltr";
      link.title = t.title;
      link.setAttribute("aria-label", t.by + ": " + t.more.replace(/[▶◀]/, "").trim());
      link.querySelector("small").textContent = t.by;
      link.querySelector("b").textContent = t.more;
    }
    render();
    if (!fixedLang && "MutationObserver" in window) {
      new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    }
    (slot || document.body).appendChild(host);

    // Optional: follow a menu screen, or stay clear of a bottom bar
    const visible = function (el) {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    function place() {
      if (showWithSel) host.style.display = visible(document.querySelector(showWithSel)) ? "" : "none";
      if (floating && aboveSel && v !== "top") {
        const bar = document.querySelector(aboveSel);
        const lift = visible(bar) ? Math.max(0, window.innerHeight - bar.getBoundingClientRect().top) : 0;
        host.style.bottom = "calc(" + (10 + lift) + "px + env(safe-area-inset-bottom, 0px))";
      }
    }
    if (showWithSel || aboveSel) {
      place();
      setInterval(place, 400);
      window.addEventListener("resize", place);
    }
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
