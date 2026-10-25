(function () {
  const TAGS = window.JB_TAGS;
  const GAMES = window.JB_GAMES;
  const BROS = window.JB_BROTHERS;
  const broById = Object.fromEntries(BROS.map(function (b) { return [b.id, b]; }));

  const FACTS = [
    "Yaakov Avinu had twelve sons, and they became the twelve tribes of Israel.",
    "The Torah has 613 mitzvot: 248 positive and 365 negative (Makkot 23b).",
    "The Mishneh Torah has 14 books. That's why it's called the Yad: י״ד = 14.",
    "A dreidel outside Israel says נ ג ה ש: Nes Gadol Haya Sham, a great miracle happened there.",
    "In Israel the dreidel says פ instead of ש: Nes Gadol Haya Po, a great miracle happened here.",
    "Purim has four mitzvot: Megillah, Mishloach Manot, Matanot La'evyonim and the Seudah.",
    "\"Ad d'lo yada\" comes from Rava in Masechet Megillah 7b.",
    "One cycle of Daf Yomi covers all 2,711 dapim of Talmud Bavli in about seven and a half years.",
    "The Menorah in the Beit HaMikdash had seven branches and was hammered from one block of gold.",
    "Every morning in the Beit HaMikdash began when the lookout called \"Barkai!\" at first light (Tamid 3:2).",
  ];

  const $ = function (sel) { return document.querySelector(sel); };
  const esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  const pad2 = function (n) { return n < 10 ? "0" + n : String(n); };

  // ---- storage (per-visitor only, and optional) ----
  function load(key, fallback) {
    try { const v = localStorage.getItem("jb:" + key); return v == null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem("jb:" + key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  // ---- HUD ----
  let coins = load("coins", 0);
  function renderCoins() { $("#hud-coins").textContent = "🪙×" + pad2(coins); }
  function addCoin() { coins++; save("coins", coins); renderCoins(); }

  function renderHud() {
    renderCoins();
    $("#hud-games").textContent = "×" + pad2(GAMES.filter(function (g) { return g.status === "live"; }).length);
    $("#hud-bros").textContent = "×" + BROS.length;
    try {
      const year = new Intl.DateTimeFormat("en-u-ca-hebrew", { year: "numeric" }).format(new Date());
      $("#hud-year").textContent = year.replace(/\D/g, "") || year;
    } catch (e) { /* keep the default */ }
  }

  // ---- question blocks ----
  let factIndex = Math.floor(Math.random() * FACTS.length);
  function popCoin(el) {
    const coin = document.createElement("span");
    coin.className = "coin-pop";
    coin.setAttribute("aria-hidden", "true");
    el.appendChild(coin);
    coin.addEventListener("animationend", function () { coin.remove(); });
  }
  function setupBlocks() {
    document.querySelectorAll(".qblock").forEach(function (block) {
      block.addEventListener("click", function () {
        block.classList.remove("bump");
        void block.offsetWidth; // restart the animation
        block.classList.add("bump");
        popCoin(block);
        addCoin();
        factIndex = (factIndex + 1) % FACTS.length;
        $("#fact").textContent = FACTS[factIndex];
      });
    });
  }

  // ---- bros ----
  function gamesBy(id) { return GAMES.filter(function (g) { return (g.by || []).indexOf(id) !== -1; }); }

  function renderStage() {
    const stage = $("#bros-stage");
    stage.innerHTML = BROS.map(function (b, i) {
      return '<button class="bro" type="button" data-bro="' + esc(b.id) + '" style="--i:' + i + '">' +
        window.JB_SPRITE(b.look) +
        '<span class="bro-name">' + esc(b.name) + "</span></button>";
    }).join("");
    stage.addEventListener("click", function (e) {
      const btn = e.target.closest(".bro");
      if (!btn) return;
      btn.classList.remove("jump");
      void btn.offsetWidth;
      btn.classList.add("jump");
      popCoin(btn);
      setTimeout(function () { openBro(btn.dataset.bro); }, 380);
    });
  }

  function renderBroCards() {
    $("#bro-cards").innerHTML = BROS.map(function (b) {
      const n = gamesBy(b.id).length;
      return '<button class="bro-card panel" type="button" data-bro="' + esc(b.id) + '">' +
        '<span class="bro-card-sprite">' + window.JB_SPRITE(b.look) + "</span>" +
        '<span class="bro-card-text">' +
          '<span class="bro-card-title">' + esc(b.title) + "</span>" +
          '<span class="bro-card-name">' + esc(b.name) + "</span>" +
          '<span class="bro-card-count">' + (n ? n + (n === 1 ? " build" : " builds") : "Builds coming soon") + "</span>" +
        "</span></button>";
    }).join("");
    $("#bro-cards").addEventListener("click", function (e) {
      const card = e.target.closest(".bro-card");
      if (card) openBro(card.dataset.bro);
    });
  }

  function openBro(id) {
    const b = broById[id];
    if (!b) return;
    const builds = gamesBy(id);
    $("#bro-dialog-body").innerHTML =
      '<div class="bro-dialog-head">' +
        '<span class="bro-dialog-sprite">' + window.JB_SPRITE(b.look, { label: b.name }) + "</span>" +
        "<div>" +
          '<p class="bro-dialog-title">' + esc(b.title) + "</p>" +
          '<h3 id="bro-dialog-name" class="bro-dialog-name">' + esc(b.name) + "</h3>" +
          (b.github ? '<a class="bro-dialog-gh" href="https://github.com/' + esc(b.github) + '">@' + esc(b.github) + "</a>" : "") +
        "</div>" +
      "</div>" +
      '<p class="bro-dialog-bio">' + esc(b.bio) + "</p>" +
      ((b.funFacts || []).length ? '<ul class="bro-dialog-facts">' + b.funFacts.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul>" : "") +
      '<p class="bro-dialog-sub">' + (builds.length ? "BUILDS" : "BUILDS: COMING SOON") + "</p>" +
      (builds.length ? '<div class="bro-dialog-builds">' + builds.map(function (g) {
        return '<a class="chip" href="' + esc(g.url || "#worlds") + '">' + esc(g.emoji) + " " + esc(g.title) + "</a>";
      }).join("") + "</div>" : "") +
      (builds.length ? '<button class="btn btn-small" type="button" data-filter-bro="' + esc(b.id) + '">See all his worlds ▶</button>' : "");
    const dlg = $("#bro-dialog");
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
  }

  function setupDialog() {
    const dlg = $("#bro-dialog");
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg) dlg.close(); // backdrop click
      const f = e.target.closest("[data-filter-bro]");
      if (f) {
        dlg.close();
        state = { q: "", holiday: "", age: "", type: "", by: f.dataset.filterBro };
        syncControls(); render(); writeUrl();
        $("#worlds").scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  // ---- filters ----
  const params = new URLSearchParams(location.search);
  let state = {
    q: params.get("q") || "",
    holiday: params.get("holiday") || "",
    age: params.get("age") || "",
    type: params.get("type") || "",
    by: params.get("by") || "",
  };

  function used(field) {
    const set = new Set();
    GAMES.forEach(function (g) { [].concat(g[field] || []).forEach(function (v) { set.add(v); }); });
    return set;
  }

  function chip(group, value, label, extra) {
    return '<button class="chip" type="button" data-group="' + group + '" data-value="' + esc(value) + '" aria-pressed="false">' +
      (extra || "") + esc(label) + "</button>";
  }

  function renderFilters() {
    const groups = {
      holiday: { field: "holidays", all: "All holidays", tags: TAGS.holidays },
      age:     { field: "ages",     all: "All ages",     tags: TAGS.ages },
      type:    { field: "type",     all: "Everything",   tags: TAGS.types },
    };
    Object.keys(groups).forEach(function (key) {
      const g = groups[key];
      const inUse = used(g.field);
      let html = chip(key, "", g.all);
      Object.keys(g.tags).forEach(function (k) {
        if (inUse.has(k)) html += chip(key, k, g.tags[k].emoji + " " + g.tags[k].label);
      });
      document.querySelector('.filter-group[data-group="' + key + '"]').innerHTML = html;
    });

    // Only list brothers once at least one game credits them.
    const credited = used("by");
    const broGroup = document.querySelector('.filter-group[data-group="by"]');
    const credBros = BROS.filter(function (b) { return credited.has(b.id); });
    broGroup.hidden = credBros.length === 0;
    broGroup.innerHTML = chip("by", "", "All bros") + credBros.map(function (b) {
      return chip("by", b.id, b.name, '<span class="chip-sprite">' + window.JB_SPRITE(b.look) + "</span>");
    }).join("");

    document.querySelector(".filters").addEventListener("click", function (e) {
      const c = e.target.closest(".chip[data-group]");
      if (!c) return;
      state[c.dataset.group] = c.dataset.value;
      syncControls(); render(); writeUrl();
    });
    $("#q").addEventListener("input", function (e) {
      state.q = e.target.value;
      render(); writeUrl();
    });
    $("#clear-filters").addEventListener("click", function () {
      state = { q: "", holiday: "", age: "", type: "", by: "" };
      syncControls(); render(); writeUrl();
    });
  }

  function syncControls() {
    $("#q").value = state.q;
    document.querySelectorAll(".filters .chip[data-group]").forEach(function (c) {
      c.setAttribute("aria-pressed", String(state[c.dataset.group] === c.dataset.value));
    });
  }

  function writeUrl() {
    const p = new URLSearchParams();
    Object.keys(state).forEach(function (k) { if (state[k]) p.set(k, state[k]); });
    const from = params.get("from");
    if (from) p.set("from", from);
    const qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }

  function haystack(g) {
    const bros = (g.by || []).map(function (id) { return broById[id] ? broById[id].name : ""; });
    return [g.title, g.hebrew, g.blurb, g.type].concat(g.holidays, g.ages, bros)
      .concat((g.holidays || []).map(function (h) { return TAGS.holidays[h] ? TAGS.holidays[h].label : ""; }))
      .join(" ").toLowerCase();
  }

  function matches(g) {
    if (state.holiday && (g.holidays || []).indexOf(state.holiday) === -1) return false;
    if (state.age && (g.ages || []).indexOf(state.age) === -1) return false;
    if (state.type && g.type !== state.type) return false;
    if (state.by && (g.by || []).indexOf(state.by) === -1) return false;
    const q = state.q.trim().toLowerCase();
    if (q && q.split(/\s+/).some(function (w) { return haystack(g).indexOf(w) === -1; })) return false;
    return true;
  }

  // ---- cards ----
  function card(g, highlight) {
    const live = g.status === "live" && g.url;
    const screen = g.image
      ? '<img src="' + esc(g.image) + '" alt="" loading="lazy" onerror="this.remove()">'
      : "";
    const tags = (g.holidays || []).filter(function (h) { return h !== "year-round"; }).map(function (h) {
      const t = TAGS.holidays[h]; return t ? '<span class="tag">' + t.emoji + " " + esc(t.label) + "</span>" : "";
    }).concat((g.ages || []).map(function (a) {
      const t = TAGS.ages[a]; return t ? '<span class="tag tag-age">' + esc(t.label) + "</span>" : "";
    })).join("");
    const bros = (g.by || []).map(function (id) {
      const b = broById[id];
      return b ? '<button class="by-bro" type="button" data-bro="' + esc(b.id) + '" title="Built by ' + esc(b.name) + '">' +
        window.JB_SPRITE(b.look) + '<span class="visually-hidden">Built by ' + esc(b.name) + "</span></button>" : "";
    }).join("");
    const typeTag = TAGS.types[g.type] ? TAGS.types[g.type].emoji : "";

    return '<article class="card panel' + (live ? "" : " card-soon") + (highlight ? " card-next" : "") + '">' +
      '<div class="card-screen" data-emoji="' + esc(g.emoji) + '">' + screen +
        (live ? "" : '<span class="soon-block" aria-hidden="true">?</span>') +
        '<span class="card-type" title="' + esc(TAGS.types[g.type] ? TAGS.types[g.type].label : "") + '">' + typeTag + "</span>" +
      "</div>" +
      '<div class="card-body">' +
        '<h3 class="card-title">' + esc(g.title) + "</h3>" +
        (g.hebrew ? '<p class="card-hebrew" lang="he" dir="rtl">' + esc(g.hebrew) + "</p>" : "") +
        '<p class="card-blurb">' + esc(g.blurb) + "</p>" +
        '<div class="card-tags">' + tags + "</div>" +
      "</div>" +
      '<div class="card-foot">' +
        (bros ? '<div class="card-bros">' + bros + "</div>" : "<span></span>") +
        (live
          ? '<a class="btn btn-play" href="' + esc(g.url) + '">PLAY ▶</a>'
          : '<span class="btn btn-play is-disabled" aria-disabled="true">COMING SOON</span>') +
      "</div>" +
    "</article>";
  }

  // Suggestions for visitors who arrive from one of our games (?from=dreidel).
  const from = GAMES.find(function (g) { return g.id === params.get("from"); });
  function relatedTo(g) {
    return GAMES.filter(function (o) {
      if (o.id === g.id || o.status !== "live") return false;
      const sharedHoliday = (o.holidays || []).some(function (h) { return h !== "year-round" && (g.holidays || []).indexOf(h) !== -1; });
      const sharedAge = (o.ages || []).some(function (a) { return (g.ages || []).indexOf(a) !== -1; });
      return sharedHoliday || sharedAge;
    }).map(function (o) { return o.id; });
  }
  const nextUp = from ? relatedTo(from) : [];

  function renderFromBanner() {
    if (!from) return;
    const el = $("#from-banner");
    el.hidden = false;
    el.innerHTML = '<p class="from-title">WELCOME BACK FROM ' + esc(from.title.toUpperCase()) + "!</p>" +
      "<p>" + (nextUp.length ? "Worlds marked <b>NEXT UP</b> are a good next pick." : "Pick your next world below.") + "</p>";
  }

  function render() {
    const list = GAMES.filter(matches).sort(function (a, b) {
      const live = (b.status === "live") - (a.status === "live");
      if (live) return live;
      return (nextUp.indexOf(b.id) !== -1) - (nextUp.indexOf(a.id) !== -1);
    });
    $("#grid").innerHTML = list.map(function (g) { return card(g, nextUp.indexOf(g.id) !== -1); }).join("");
    $("#empty").hidden = list.length > 0;
    const live = list.filter(function (g) { return g.status === "live"; }).length;
    $("#results-count").textContent = list.length
      ? live + (live === 1 ? " world" : " worlds") + " to play" + (list.length > live ? ", " + (list.length - live) + " coming soon" : "")
      : "";
  }

  $("#grid").addEventListener("click", function (e) {
    const b = e.target.closest(".by-bro");
    if (b) openBro(b.dataset.bro);
  });

  renderHud();
  setupBlocks();
  renderStage();
  renderBroCards();
  setupDialog();
  renderFilters();
  renderFromBanner();
  syncControls();
  render();
})();
