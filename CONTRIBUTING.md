# Adding yourself and your builds

Everything on the site comes from two files: `data/brothers.js` and `data/games.js`. You don't need to touch the HTML or CSS.

## 1. Make your bro

Open `data/brothers.js` and find a placeholder (`bro1` … `bro5`). Then:

1. **Change `id` once** to something short and lowercase, like your first name (`"yaakov"`). Games point to you by this id, so don't change it again later.
2. Fill in `name`, `title` (a fun role, like `"Level Designer"`), `bio`, `funFacts` and `github` (your GitHub username, without the @).
3. Design your pixel look:

| Field | Options |
|---|---|
| `hat` | `"kippah"`, `"fedora"` or `"cap"` |
| `hatColor`, `hair`, `skin`, `shirt`, `pants`, `shoes` | any hex color, like `"#e52521"` |
| `beard`, `glasses`, `peyos` | `true` or `false` |
| `beardColor`, `bandColor` | optional: beard color if it differs from your hair, and the ribbon on a fedora |

Refresh the page to see yourself. Click your character to see your card.

## 2. Add a game

Copy an entry in `data/games.js` and fill it in:

| Field | What to put |
|---|---|
| `id` | short, lowercase, unique: `"purim-pictionary"` |
| `title`, `hebrew` | display name, plus an optional Hebrew name |
| `blurb` | one or two sentences on what you do in it |
| `url` | where to play it (`https://…`). Leave it empty while it's not live. |
| `repo` | the GitHub repo (optional) |
| `emoji` | shown on the card when there's no thumbnail |
| `image` | `assets/shots/<id>.jpg`, or `""` |
| `type` | `"game"`, `"study"` or `"app"` |
| `holidays` | one or more of: `year-round`, `yamim-noraim`, `sukkot`, `chanukah`, `purim`, `pesach`, `shavuot`, `tisha-bav` |
| `ages` | one or more of: `kids`, `family`, `teens`, `adults` |
| `by` | your brother id(s): `["yaakov"]`. Two names if you built it together. |
| `status` | `"live"`, or `"soon"` for the In the Workshop list |

To add a new holiday or age group, add it to `JB_TAGS` at the top of the same file first.

**Thumbnail:** once the game is live, run `node tools/screenshot.js <id>` (it needs Playwright). You can also save any 1280×800-ish screenshot as `assets/shots/<id>.jpg`.

**Link back:** add the badge to your game, as described in the [README](README.md#link-a-game-back-to-the-hub).

## 3. Check and send

```bash
node tools/check-data.js     # catches typos, unknown tags, missing fields
python3 -m http.server 8000  # look at it at http://localhost:8000
```

Then open a pull request. The same check runs automatically on every PR.

## Content guidelines

- Keep it wholesome and kid-safe on every page someone can reach from here.
- Where a game teaches Torah, cite the source (Sefaria links are great).
- Use honest `ages` tags. Parents use them to decide what their kids play.
