/*
 * Jacob Bros badge: a small "More games" button that links back to the hub.
 *
 * Add this to any game, with your game's id from data/games.js:
 *
 *   <script src="https://y2jcpa.github.io/JacobBros/badge.js" data-game="dreidel" defer></script>
 *
 * Options (attributes on the script tag):
 *   data-game      your game's id, so the hub can suggest what to play next
 *   data-position  bottom-left (default) | bottom-right | top-left | top-right
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
  if (game) hub.searchParams.set("from", game);

  function mount() {
    const slot = document.getElementById("jacobbros-badge");
    const host = document.createElement("jacobbros-badge-host");
    const root = host.attachShadow({ mode: "open" });
    const [v, h] = position.split("-");
    const floating = !slot;

    root.innerHTML =
      "<style>" +
      ":host{all:initial;" + (floating
        ? "position:fixed;z-index:2147483000;" +
          (v === "top" ? "top:calc(12px + env(safe-area-inset-top));" : "bottom:calc(12px + env(safe-area-inset-bottom));") +
          (h === "right" ? "right:calc(12px + env(safe-area-inset-right));" : "left:calc(12px + env(safe-area-inset-left));")
        : "display:inline-block;") + "}" +
      "a{display:inline-flex;align-items:center;gap:8px;padding:7px 10px 6px 8px;" +
      "font:700 11px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.04em;text-transform:uppercase;" +
      "color:#fff;text-decoration:none;text-shadow:1px 1px 0 #000;background:#c84c0c;" +
      "box-shadow:0 -3px 0 #000,0 3px 0 #000,-3px 0 0 #000,3px 0 0 #000,inset 3px 3px 0 #fcbcb0,inset -3px -3px 0 #7c2c00;" +
      "opacity:.92;transition:opacity .15s,transform .1s}" +
      "a:hover,a:focus-visible{opacity:1;transform:translateY(-2px)}" +
      "a:focus-visible{outline:2px dashed #fff;outline-offset:4px}" +
      ".q{display:grid;place-items:center;width:18px;height:18px;color:#fce0a8;text-shadow:1px 1px 0 #7c2c00;" +
      "background:#f8b800;box-shadow:inset 0 0 0 2px #000,inset 2px 2px 0 #fce0a8,inset -2px -2px 0 #ac7c00}" +
      "small{display:block;font-size:8px;opacity:.85;margin-bottom:3px}" +
      "@media print{:host{display:none}}" +
      "</style>" +
      '<a part="link" href="' + hub.href + '" title="More Torah games from the Jacob Bros">' +
      '<span class="q" aria-hidden="true">?</span><span><small>Jacob Bros</small>More games ▶</span></a>';

    (slot || document.body).appendChild(host);
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
