# 🟨 Jacob Bros

Torah games, study guides and builds by five brothers, all in one place.

The site is a little platformer set in the Old City of Yerushalayim. Pick one of the five bros, walk past the Kotel, and jump up into a **pomegranate block** to open a game. The world is split into areas (Games, Study, Apps, Coming Soon), and every game in `data/games.js` gets its own block automatically. Brick blocks pop out coins and Torah facts.

Under the game there's a plain list of every world, filterable by **holiday**, **age**, **type** and **brother**. The whole site works in **English and Hebrew**. Use the toggle in the top corner, or link with `?lang=he`.

**Controls:** ← → (or A/D) to move and Space (or ↑) to jump on a computer. On phones and tablets there's a joystick and a JUMP button.

**Live site:** https://y2jcpa.github.io/JacobBros/ (once GitHub Pages is turned on, see below)

## What's here

| Path | What it is |
|---|---|
| `index.html`, `css/` | The page. Plain HTML/CSS/JS with no build step. |
| `js/game.js` | The playable world: physics, controls, level layout, block pop-ups. |
| `js/art.js` | The Old City pixel art (Kotel, walls, Hurva, trees, tiles, blocks), drawn in code. |
| `js/core.js` | English/Hebrew text, the Hebrew year, coins. |
| `js/app.js` | The list of worlds and the Meet the Bros cards. |
| `data/games.js` | **Every game, study guide and app.** Add yours here. |
| `data/brothers.js` | **The five bros**: name, bio, fun facts, pixel look. |
| `assets/bros/` | The bros' sprites: a front portrait and side-view walk/jump frames, drawn by `tools/make-bros.js`. |
| `badge.js` | The "More games" button that games include to link back here. |
| `assets/shots/` | Card thumbnails. `tools/screenshot.js` regenerates them. |
| `tools/check-data.js` | Checks the data files for mistakes. CI runs it on every pull request. |

## Run it locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Link a game back to the hub

Add one line to any game's `index.html`, with the game's `id` from `data/games.js`:

```html
<script src="https://y2jcpa.github.io/JacobBros/badge.js" data-game="dreidel" defer></script>
```

This puts a small **? Jacob Bros: More games ▶** button in the corner. It links to the hub with `?from=dreidel`, and the hub then welcomes the player back and marks related games **NEXT UP**.

- Use `data-position="bottom-right"` (or `top-left` / `top-right`) if the default corner covers your game's controls.
- To put the button inside your own menu or game-over screen, add `<div id="jacobbros-badge"></div>` where you want it.

## Shareable filter links

Filters are kept in the URL, so you can link straight to a slice of the catalog:

- `?holiday=purim`: all the Purim games
- `?age=kids`: everything for kids
- `?type=study`: the study guides
- `?by=<brother-id>`: everything one brother built

## Turning on the live site

1. Merge this work into `main`.
2. In the repo, go to **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, then pick `main` and `/ (root)`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Each brother can add himself and his builds.
