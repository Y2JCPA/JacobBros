/*
 * Shared bits for the whole site: language (English / Hebrew), UI strings,
 * the Hebrew year, coins, and small helpers. Loaded before app.js and game.js.
 */
(function () {
  const STRINGS = {
    en: {
      "skip": "Skip to the list of games",
      "hud.coins": "COINS",
      "hud.worlds": "WORLDS",
      "hud.world": "WORLD",
      "lang.switch": "עברית",
      "lang.label": "Switch to Hebrew",
      "select.title": "PICK YOUR BRO",
      "select.tagline": "Torah games & builds by five brothers",
      "select.step1": "Pick a brother",
      "select.step2": "Jump into a pomegranate block",
      "select.step3": "Play that game!",
      "select.keys": "← → move · SPACE jump",
      "select.touch": "Joystick to move · JUMP to jump",
      "select.list": "Just want the list? ↓",
      "play.change": "Change bro",
      "play.tip.keys": "← → to move, SPACE to jump. Jump up into a block to open it!",
      "play.tip.touch": "Use the joystick to move and JUMP to jump. Jump up into a block to open it!",
      "play.jump": "JUMP",
      "zone.games": "GAMES",
      "zone.study": "STUDY",
      "zone.apps": "APPS",
      "zone.soon": "COMING SOON",
      "sign.welcome": "WELCOME TO\nYERUSHALAYIM",
      "sign.end": "MORE WORLDS\nCOMING SOON",
      "popup.play": "PLAY ▶",
      "popup.keep": "Keep exploring",
      "popup.soon": "COMING SOON",
      "popup.soonText": "This one is still in the workshop. Check back soon!",
      "worlds.title": "ALL WORLDS",
      "worlds.search": "Search… dreidel, Rambam, Purim",
      "worlds.searchLabel": "Search games",
      "filter.holiday": "All holidays",
      "filter.age": "All ages",
      "filter.type": "Everything",
      "filter.by": "All bros",
      "results.play": "{n} to play",
      "results.soon": "{n} coming soon",
      "empty.title": "NO WORLDS HERE… YET!",
      "empty.text": "Try another filter, or",
      "empty.clear": "clear them all",
      "from.title": "WELCOME BACK FROM {title}!",
      "from.next": "Worlds marked NEXT UP are a good next pick.",
      "from.pick": "Pick your next world below.",
      "card.play": "PLAY ▶",
      "card.soon": "COMING SOON",
      "card.next": "NEXT UP",
      "card.by": "Built by {name}",
      "bros.title": "MEET THE BROS",
      "bros.sub": "Five brothers, one mission: Torah that's fun to play. Tap a brother to see what he's built.",
      "bros.builds": "{n} builds",
      "bros.build": "1 build",
      "bros.none": "Builds coming soon",
      "dialog.builds": "BUILDS",
      "dialog.noBuilds": "BUILDS: COMING SOON",
      "dialog.seeAll": "See all his worlds ▶",
      "dialog.close": "Close",
      "footer.title": "THANK YOU FOR PLAYING!",
      "footer.text": "Built by the Jacob Bros, l'shem Shamayim. Sources are linked inside each game wherever we could.",
      "footer.join": "Join the build on GitHub",
    },
    he: {
      "skip": "דלגו לרשימת המשחקים",
      "hud.coins": "מטבעות",
      "hud.worlds": "עולמות",
      "hud.world": "עולם",
      "lang.switch": "English",
      "lang.label": "Switch to English",
      "select.title": "בחרו אח",
      "select.tagline": "משחקי תורה ועוד, מחמישה אחים",
      "select.step1": "בוחרים אח",
      "select.step2": "קופצים לתוך קוביית רימון",
      "select.step3": "משחקים!",
      "select.keys": "חיצים לזוז · רווח לקפוץ",
      "select.touch": "ג׳ויסטיק לזוז · כפתור לקפוץ",
      "select.list": "רוצים רק את הרשימה? ↓",
      "play.change": "החלפת אח",
      "play.tip.keys": "חיצים לזוז, רווח לקפוץ. קופצים מלמטה לתוך קובייה כדי לפתוח אותה!",
      "play.tip.touch": "הג׳ויסטיק מזיז, הכפתור קופץ. קופצים מלמטה לתוך קובייה כדי לפתוח אותה!",
      "play.jump": "קפיצה",
      "zone.games": "משחקים",
      "zone.study": "לימוד",
      "zone.apps": "אפליקציות",
      "zone.soon": "בקרוב",
      "sign.welcome": "ברוכים הבאים\nלירושלים",
      "sign.end": "עוד עולמות\nבקרוב",
      "popup.play": "שחקו ◀",
      "popup.keep": "להמשיך לטייל",
      "popup.soon": "בקרוב",
      "popup.soonText": "המשחק הזה עוד בסדנה. תבדקו שוב בקרוב!",
      "worlds.title": "כל העולמות",
      "worlds.search": "חיפוש… סביבון, רמב״ם, פורים",
      "worlds.searchLabel": "חיפוש משחקים",
      "filter.holiday": "כל החגים",
      "filter.age": "כל הגילאים",
      "filter.type": "הכול",
      "filter.by": "כל האחים",
      "results.play": "{n} לשחק",
      "results.soon": "{n} בקרוב",
      "empty.title": "אין כאן עולמות… עדיין!",
      "empty.text": "נסו סינון אחר, או",
      "empty.clear": "נקו את כל הסינונים",
      "from.title": "ברוכים השבים מ{title}!",
      "from.next": "עולמות שמסומנים ״הבא בתור״ הם בחירה טובה להמשך.",
      "from.pick": "בחרו את העולם הבא למטה.",
      "card.play": "שחקו ◀",
      "card.soon": "בקרוב",
      "card.next": "הבא בתור",
      "card.by": "נבנה על ידי {name}",
      "bros.title": "הכירו את האחים",
      "bros.sub": "חמישה אחים, משימה אחת: תורה שכיף לשחק בה. לחצו על אח כדי לראות מה הוא בנה.",
      "bros.builds": "{n} יצירות",
      "bros.build": "יצירה אחת",
      "bros.none": "יצירות בקרוב",
      "dialog.builds": "יצירות",
      "dialog.noBuilds": "יצירות: בקרוב",
      "dialog.seeAll": "כל העולמות שלו ◀",
      "dialog.close": "סגירה",
      "footer.title": "תודה ששיחקתם!",
      "footer.text": "נבנה על ידי האחים של יעקב, לשם שמיים. בכל מקום שיכולנו, המקורות מקושרים בתוך המשחקים.",
      "footer.join": "הצטרפו לבנייה ב־GitHub",
    },
  };

  const FACTS = {
    en: [
      "Yaakov Avinu had twelve sons, and they became the twelve tribes of Israel.",
      "The Torah has 613 mitzvot: 248 positive and 365 negative (Makkot 23b).",
      "A pomegranate is said to have 613 seeds, like the 613 mitzvot.",
      "The Mishneh Torah has 14 books. That's why it's called the Yad: י״ד = 14.",
      "Outside Israel the dreidel says נ ג ה ש: Nes Gadol Haya Sham, a great miracle happened there.",
      "Purim has four mitzvot: Megillah, Mishloach Manot, Matanot La'evyonim and the Seudah.",
      "One cycle of Daf Yomi covers all 2,711 dapim of Talmud Bavli in about seven and a half years.",
      "The Menorah in the Beit HaMikdash had seven branches and was hammered from one block of gold.",
      "Every morning in the Beit HaMikdash began when the lookout called \"Barkai!\" at first light (Tamid 3:2).",
      "There are ten sefirot, from Keter down to Malchut.",
    ],
    he: [
      "ליעקב אבינו היו שנים עשר בנים, והם נהיו שנים עשר שבטי ישראל.",
      "בתורה יש 613 מצוות: 248 מצוות עשה ו־365 מצוות לא תעשה (מכות כג, ב).",
      "אומרים שברימון יש 613 גרעינים, כמו 613 המצוות.",
      "במשנה תורה יש 14 ספרים, ולכן הוא נקרא ״היד החזקה״: י״ד = 14.",
      "בחוץ לארץ כתוב על הסביבון נ ג ה ש: נס גדול היה שם.",
      "בפורים יש ארבע מצוות: מקרא מגילה, משלוח מנות, מתנות לאביונים וסעודה.",
      "מחזור אחד של דף יומי עובר על כל 2,711 הדפים של התלמוד הבבלי בכשבע וחצי שנים.",
      "למנורה בבית המקדש היו שבעה קנים, והיא נעשתה מקשה אחת של זהב.",
      "כל בוקר בבית המקדש התחיל כשהצופה קרא ״ברקאי!״ עם עלות השחר (תמיד ג, ב).",
      "יש עשר ספירות, מכתר ועד מלכות.",
    ],
  };

  // ---- storage (per visitor, optional) ----
  function load(key, fallback) {
    try { const v = localStorage.getItem("jb:" + key); return v == null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem("jb:" + key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  // ---- language ----
  const params = new URLSearchParams(location.search);
  let lang = params.get("lang") === "he" || params.get("lang") === "en" ? params.get("lang") : load("lang", null);
  if (lang !== "he" && lang !== "en") lang = (navigator.language || "").slice(0, 2) === "he" ? "he" : "en";

  function t(key, vars) {
    let s = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
    return s;
  }

  // Picks the right language for a data object: tr(game, "title") reads game.he.title in Hebrew.
  function tr(obj, field) {
    if (lang === "he" && obj && obj.he && obj.he[field] != null) return obj.he[field];
    return obj ? obj[field] : "";
  }
  function tag(group, key) {
    const t0 = window.JB_TAGS[group][key];
    return t0 ? (lang === "he" && t0.he ? t0.he : t0.label) : key;
  }

  function applyStatic() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.dataset.i18nAttr.split(",").forEach(function (pair) {
        const [attr, key] = pair.split(":");
        el.setAttribute(attr, t(key));
      });
    });
  }

  function setLang(next) {
    if (next === lang) return;
    lang = next;
    save("lang", lang);
    const p = new URLSearchParams(location.search);
    if (p.has("lang")) {
      p.set("lang", lang);
      try { history.replaceState(null, "", location.pathname + "?" + p + location.hash); } catch (e) { /* sandboxed frame */ }
    }
    applyStatic();
    renderHud();
    document.dispatchEvent(new CustomEvent("jb:lang", { detail: lang }));
  }

  // ---- Hebrew year ----
  function hebrewYearNumber(date) {
    try {
      const s = new Intl.DateTimeFormat("en-u-ca-hebrew", { year: "numeric" }).format(date);
      const n = parseInt(s.replace(/\D/g, ""), 10);
      return n > 5000 ? n : 5787;
    } catch (e) { return 5787; }
  }
  // 5787 → תשפ״ז (thousands dropped, as usual)
  function gematria(n) {
    n = n % 1000;
    const H = [[400, "ת"], [300, "ש"], [200, "ר"], [100, "ק"]];
    const T = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
    const O = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
    let out = "";
    for (const [v, ch] of H) while (n >= v) { out += ch; n -= v; }
    if (n === 15) out += "טו";
    else if (n === 16) out += "טז";
    else out += T[Math.floor(n / 10)] + O[n % 10];
    return out.length > 1 ? out.slice(0, -1) + "״" + out.slice(-1) : out + "׳";
  }

  // ---- coins + HUD ----
  let coins = load("coins", 0);
  const pad2 = function (n) { return n < 10 ? "0" + n : String(n); };
  function renderHud() {
    const year = hebrewYearNumber(new Date());
    const set = function (id, v) { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("hud-coins", "×" + pad2(coins));
    set("hud-worlds", "×10");
    set("hud-year", lang === "he" ? gematria(year) : String(year));
  }
  function addCoin() { coins++; save("coins", coins); renderHud(); }

  const esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  // Adds the sprite's version (from data/sprites.js) so a redrawn bro shows up right away
  const spriteUrl = function (b, file) {
    const s = (window.JB_SPRITES || {})[b.id];
    return file + (s && s.v ? "?v=" + s.v : "");
  };
  const spriteImg = function (b, alt) {
    return '<img class="sprite sprite-' + esc((b.look && b.look.body) || "short") + '" src="' + esc(spriteUrl(b, b.sprite)) +
      '" alt="' + esc(alt || "") + '" draggable="false">';
  };

  window.JB = {
    get lang() { return lang; },
    t: t, tr: tr, tag: tag, setLang: setLang, applyStatic: applyStatic,
    facts: function () { return FACTS[lang]; },
    gematria: gematria, hebrewYearNumber: hebrewYearNumber,
    addCoin: addCoin, renderHud: renderHud,
    load: load, save: save, esc: esc, spriteImg: spriteImg, spriteUrl: spriteUrl,
    isTouch: function () {
      return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    },
  };

  applyStatic();
  document.addEventListener("DOMContentLoaded", function () {
    applyStatic();
    renderHud();
    document.querySelectorAll("[data-lang-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () { setLang(lang === "he" ? "en" : "he"); });
    });
  });
})();
