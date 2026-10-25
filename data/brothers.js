/*
 * The five Jacob Bros.
 *
 * Each brother owns his own entry: name, bio, fun facts, and his pixel look.
 * The `id` is what games use in their `by: [...]` list, so pick it once and
 * keep it (your first name in lowercase works well).
 *
 * After changing a `look`, redraw the sprites with:  node tools/make-bros.js
 *
 * Look options:
 *   body:      "short" | "tall"
 *   hat:       "cap" (with your letter on it) | "kippah" | "fedora"
 *   letter:    the letter on your cap
 *   facial:    "clean" | "mustache" | "beard" | "full"
 *   hairStyle: "short" | "long" | "curly"
 *   glasses, peyos: true / false
 *   handDrawn: true if you drew your own PNG at `sprite` (the tool skips you)
 *   colors:    cap, shirt, overalls, shoes, skin, hair, and optional
 *              beard, buttons, glasses, hat, band. Any hex color.
 */

window.JB_BROTHERS = [
  {
    id: "bro1",
    name: "Bro #1",
    title: "Player 1",
    bio: "Bio coming soon. Edit data/brothers.js to tell everyone who you are and what you build.",
    funFacts: ["Favorite holiday: ???", "Favorite sefer: ???"],
    github: "",
    sprite: "assets/bros/bro1.png",
    look: {
      body: "short", hat: "cap", letter: "1", facial: "mustache", hairStyle: "short",
      glasses: false, peyos: false,
      colors: { cap: "#e52521", shirt: "#e52521", overalls: "#2a4ec8", shoes: "#6b3a12", skin: "#f6c193", hair: "#4a2a14" },
    },
  },
  {
    id: "bro2",
    name: "Bro #2",
    title: "Player 2",
    bio: "Bio coming soon. Edit data/brothers.js to tell everyone who you are and what you build.",
    funFacts: ["Favorite holiday: ???", "Favorite sefer: ???"],
    github: "",
    sprite: "assets/bros/bro2.png",
    look: {
      body: "tall", hat: "cap", letter: "2", facial: "beard", hairStyle: "short",
      glasses: true, peyos: false,
      colors: { cap: "#2fa52f", shirt: "#2fa52f", overalls: "#23306e", shoes: "#4a2a10", skin: "#eab485", hair: "#241812" },
    },
  },
  {
    id: "bro3",
    name: "Bro #3",
    title: "Player 3",
    bio: "Bio coming soon. Edit data/brothers.js to tell everyone who you are and what you build.",
    funFacts: ["Favorite holiday: ???", "Favorite sefer: ???"],
    github: "",
    sprite: "assets/bros/bro3.png",
    look: {
      body: "short", hat: "cap", letter: "3", facial: "clean", hairStyle: "curly",
      glasses: false, peyos: true,
      colors: { cap: "#2f7fe8", shirt: "#2f7fe8", overalls: "#7a4a22", shoes: "#2b1a0e", skin: "#f8cfa6", hair: "#9a5524" },
    },
  },
  {
    id: "bro4",
    name: "Bro #4",
    title: "Player 4",
    bio: "Bio coming soon. Edit data/brothers.js to tell everyone who you are and what you build.",
    funFacts: ["Favorite holiday: ???", "Favorite sefer: ???"],
    github: "",
    sprite: "assets/bros/bro4.png",
    look: {
      body: "tall", hat: "cap", letter: "4", facial: "full", hairStyle: "short",
      glasses: false, peyos: false,
      colors: { cap: "#8b3fd6", shirt: "#8b3fd6", overalls: "#2b2b38", shoes: "#4a2a10", skin: "#e2a878", hair: "#2a1a10" },
    },
  },
  {
    id: "bro5",
    name: "Bro #5",
    title: "Player 5",
    bio: "Bio coming soon. Edit data/brothers.js to tell everyone who you are and what you build.",
    funFacts: ["Favorite holiday: ???", "Favorite sefer: ???"],
    github: "",
    sprite: "assets/bros/bro5.png",
    look: {
      body: "short", hat: "cap", letter: "5", facial: "mustache", hairStyle: "short",
      glasses: true, peyos: false,
      colors: { cap: "#f39a1e", shirt: "#f39a1e", overalls: "#2a4ec8", shoes: "#6b3a12", skin: "#f3c49a", hair: "#6b3b1a" },
    },
  },
];
