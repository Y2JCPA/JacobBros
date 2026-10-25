/*
 * The five Jacob Bros.
 *
 * Each brother owns his own entry: name, bio, fun facts, and his pixel look.
 * `he` holds the Hebrew version of the text fields.
 * The `id` is what games use in their `by: [...]` list, so keep it stable.
 *
 * After changing a `look`, redraw the sprites with:  node tools/make-bros.js <id>
 *
 * Look options:
 *   body:      "short" | "muscular" | "wide" | "tall" | "lanky"
 *   hat:       "cap" (with `letter` on it) | "kippah" | "fedora"
 *   facial:    "clean" | "mustache" | "zigzag" | "pointy" | "beard" | "full"
 *   chin:      "normal" | "big" | "pointy"
 *   hairStyle: "short" | "long" | "curly"
 *   glasses, peyos: true / false
 *   handDrawn: true if you drew your own PNGs (the tool then skips you)
 *   colors:    cap, shirt, overalls, shoes, skin, hair, and optional
 *              letter, nose, beard, buttons, glasses, hat, band. Hex colors.
 */

window.JB_BROTHERS = [
  {
    id: "yitzi",
    name: "Yitzi",
    title: "Player 1",
    bio: "Bio coming soon.",
    funFacts: [],
    github: "",
    he: { name: "איצי", title: "שחקן 1", bio: "ביוגרפיה בקרוב.", funFacts: [] },
    sprite: "assets/bros/yitzi.png",
    look: {
      body: "short", hat: "cap", letter: "Y", facial: "mustache", hairStyle: "short",
      colors: { cap: "#e52521", shirt: "#e52521", overalls: "#2a4ec8", shoes: "#6b3a12", skin: "#f6c193", hair: "#4a2a14" },
    },
  },
  {
    id: "ovadiah",
    name: "Ovadiah",
    title: "Player 2",
    bio: "Bio coming soon.",
    funFacts: [],
    github: "",
    he: { name: "עובדיה", title: "שחקן 2", bio: "ביוגרפיה בקרוב.", funFacts: [] },
    sprite: "assets/bros/ovadiah.png",
    look: {
      body: "tall", hat: "cap", letter: "O", facial: "mustache", hairStyle: "short",
      colors: { cap: "#2fa52f", shirt: "#2fa52f", overalls: "#2340a8", shoes: "#6b3a12", skin: "#f3c091", hair: "#3d2414" },
    },
  },
  {
    id: "yaacov",
    name: "Yaacov",
    title: "Player 3",
    bio: "Bio coming soon.",
    funFacts: [],
    github: "",
    he: { name: "יעקב", title: "שחקן 3", bio: "ביוגרפיה בקרוב.", funFacts: [] },
    sprite: "assets/bros/yaacov.png",
    look: {
      body: "wide", hat: "cap", letter: "Y", facial: "zigzag", chin: "big", hairStyle: "short",
      colors: {
        cap: "#f8d030", letter: "#2a4ec8", shirt: "#f8d030", overalls: "#7b3fb5", shoes: "#2f8a3a",
        skin: "#f6c193", nose: "#f2a0b4", hair: "#4a2a14", buttons: "#ffffff",
      },
    },
  },
  {
    id: "shimshon",
    name: "Shimshon",
    title: "Player 4",
    bio: "Bio coming soon.",
    funFacts: [],
    github: "",
    he: { name: "שמשון", title: "שחקן 4", bio: "ביוגרפיה בקרוב.", funFacts: [] },
    sprite: "assets/bros/shimshon.png",
    look: {
      body: "lanky", hat: "cap", letter: "S", facial: "pointy", chin: "pointy", hairStyle: "short",
      colors: {
        cap: "#6a2fa6", letter: "#f8c020", shirt: "#6a2fa6", overalls: "#1f1d33", shoes: "#f08a1c",
        skin: "#f3c091", hair: "#2f1c10", buttons: "#f8c020",
      },
    },
  },
  {
    id: "levi",
    name: "Levi",
    title: "Player 5",
    bio: "Bio coming soon.",
    funFacts: [],
    github: "",
    he: { name: "לוי", title: "שחקן 5", bio: "ביוגרפיה בקרוב.", funFacts: [] },
    sprite: "assets/bros/levi.png",
    look: {
      body: "muscular", hat: "cap", letter: "L", facial: "clean", hairStyle: "short",
      colors: { cap: "#1f6fe0", shirt: "#1f6fe0", overalls: "#d12b2b", shoes: "#5a3010", skin: "#f3c091", hair: "#3d2414" },
    },
  },
];
