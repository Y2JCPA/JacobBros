# Adding yourself and your builds

Everything on the site comes from two files: `data/brothers.js` and `data/games.js`. You don't need to touch the HTML or CSS.

## 1. Make your bro

Open `data/brothers.js` and find your entry. Then:

1. Your entry's `id` (`yitzi`, `ovadiah`, `yaacov`, `shimshon`, `levi`) is how games point to you, so leave it as it is.
2. Fill in `name`, `title` (a fun role, like `"Level Designer"`), `bio`, `funFacts` and `github` (your GitHub username, without the @). Put the Hebrew versions in `he: { name, title, bio, funFacts }`.
3. Design your pixel look in `look`:

| Field | Options |
|---|---|
| `body` | `"short"`, `"muscular"`, `"wide"` (short builds), `"slim"` (tall and thin) or `"rounded"` (tallest, fuller) |
| `hat` | `"cap"` (with your `letter` on it), `"kippah"` or `"fedora"` |
| `letter` | the letter on your cap |
| `facial` | `"clean"`, `"mustache"`, `"zigzag"`, `"pointy"`, `"beard"` or `"full"` |
| `chin` | `"normal"`, `"big"` or `"pointy"` |
| `hairStyle` | `"short"`, `"long"` or `"curly"` |
| `glasses`, `peyos` | `true` or `false` |
| `colors` | `cap`, `shirt`, `overalls`, `shoes`, `skin`, `hair`, plus optional `letter`, `nose`, `beard`, `buttons`, `glasses`, `hat`, `band`. Use hex colors like `"#e52521"`. |

4. Redraw your sprites with `node tools/make-bros.js <your-id>`. It saves `assets/bros/<your-id>.png` (front portrait), `assets/bros/<your-id>-side.png` (six game frames: stand, four walking steps, jump) and updates `data/sprites.js` with their sizes. Add `--preview preview.png` to get a big copy to look at.

Want to draw yourself by hand instead? Save the two PNGs with transparent backgrounds: a 32-pixel-wide portrait, and a side sheet of 32-pixel-wide frames facing right (stand, walk 1-4, jump). Set `look.handDrawn: true` so the tool won't overwrite them, then run `node tools/make-bros.js` once to record their sizes.

Refresh the page to see yourself. Click your character to see your card.

## 2. Add a game

Copy an entry in `data/games.js` and fill it in. Your game gets a block in the world automatically: live games go in the Games, Study or Apps area by `type`, and `"soon"` ones go in Coming Soon.

| Field | What to put |
|---|---|
| `id` | short, lowercase, unique: `"purim-pictionary"` |
| `title` | display name |
| `label` | the short name over the game's block in the world, 12 characters a line at most (`"GROW A\nGARDEN"`) |
| `he` | the Hebrew `title`, `label` and `blurb` |
| `blurb` | one or two sentences on what you do in it |
| `url` | where to play it (`https://…`). Leave it empty while it's not live. |
| `repo` | the GitHub repo (optional) |
| `emoji` | shown on the card when there's no thumbnail |
| `image` | `assets/shots/<id>.jpg`, or `""` |
| `type` | `"game"`, `"study"` or `"app"` |
| `holidays` | one or more of: `year-round`, `yamim-noraim`, `sukkot`, `chanukah`, `purim`, `pesach`, `shavuot`, `tisha-bav` |
| `ages` | one or more of: `kids`, `family`, `teens`, `adults` |
| `by` | your brother id(s): `["yaacov"]`. Two names if you built it together. |
| `status` | `"live"`, or `"soon"` for the In the Workshop list |

To add a new holiday or age group, add it to `JB_TAGS` at the top of the same file first.

**Thumbnail:** once the game is live, run `node tools/screenshot.js <id>` (it needs Playwright). You can also save any 1280×800-ish screenshot as `assets/shots/<id>.jpg`.

**Link back:** add the badge to your game, as described in the [README](README.md#link-a-game-back-to-the-hub).

## 3. Check and send

```bash
node tools/check-data.js     # catches typos, unknown tags, missing fields
node tools/stamp.js          # updates the version stamps in index.html
python3 -m http.server 8000  # look at it at http://localhost:8000
```

Then open a pull request. The same checks run automatically on every PR.

**Why the stamps:** GitHub Pages lets browsers keep each file for 10 minutes. `tools/stamp.js` adds a short hash of each file to its link (`data/games.js?v=5d31f82f`), so as soon as the page updates, phones load the new files instead of a cached copy. CI fails with a reminder if you forget.

## Content guidelines

- Keep it wholesome and kid-safe on every page someone can reach from here.
- Where a game teaches Torah, cite the source (Sefaria links are great).
- Use honest `ages` tags. Parents use them to decide what their kids play.
