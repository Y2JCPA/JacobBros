/*
 * The list view under the game: searchable, filterable catalog of every
 * world, plus the Meet the Bros cards. Re-renders when the language changes.
 */
(function () {
  const JB = window.JB;
  const TAGS = window.JB_TAGS;
  const GAMES = window.JB_GAMES;
  const BROS = window.JB_BROTHERS;
  const broById = Object.fromEntries(BROS.map(function (b) { return [b.id, b]; }));
  const $ = function (sel) { return document.querySelector(sel); };
  const esc = JB.esc, t = JB.t, tr = JB.tr;

  const gamesBy = function (id) { return GAMES.filter(function (g) { return (g.by || []).indexOf(id) !== -1; }); };

  // ---- bros ----
  function renderBroCards() {
    $("#bro-cards").innerHTML = BROS.map(function (b) {
      const n = gamesBy(b.id).length;
      return '<button class="bro-card panel" type="button" data-bro="' + esc(b.id) + '">' +
        '<span class="bro-card-sprite">' + JB.spriteImg(b) + "</span>" +
        '<span class="bro-card-text">' +
          '<span class="bro-card-title">' + esc(tr(b, "title")) + "</span>" +
          '<span class="bro-card-name">' + esc(tr(b, "name")) + "</span>" +
          '<span class="bro-card-count">' + esc(n ? (n === 1 ? t("bros.build") : t("bros.builds", { n: n })) : t("bros.none")) + "</span>" +
        "</span></button>";
    }).join("");
  }
  $("#bro-cards").addEventListener("click", function (e) {
    const card = e.target.closest(".bro-card");
    if (card) openBro(card.dataset.bro);
  });

  function openBro(id) {
    const b = broById[id];
    if (!b) return;
    const builds = gamesBy(id);
    const facts = tr(b, "funFacts") || [];
    $("#bro-dialog-body").innerHTML =
      '<div class="bro-dialog-head">' +
        '<span class="bro-dialog-sprite">' + JB.spriteImg(b, tr(b, "name")) + "</span>" +
        "<div>" +
          '<p class="bro-dialog-title">' + esc(tr(b, "title")) + "</p>" +
          '<h3 id="bro-dialog-name" class="bro-dialog-name">' + esc(tr(b, "name")) + "</h3>" +
          (b.github ? '<a class="bro-dialog-gh" dir="ltr" href="https://github.com/' + esc(b.github) + '">@' + esc(b.github) + "</a>" : "") +
        "</div>" +
      "</div>" +
      '<p class="bro-dialog-bio">' + esc(tr(b, "bio")) + "</p>" +
      (facts.length ? '<ul class="bro-dialog-facts">' + facts.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul>" : "") +
      '<p class="bro-dialog-sub">' + esc(builds.length ? t("dialog.builds") : t("dialog.noBuilds")) + "</p>" +
      (builds.length ? '<div class="bro-dialog-builds">' + builds.map(function (g) {
        return '<a class="chip" href="' + esc(g.url || "#worlds") + '">' + esc(g.emoji) + " " + esc(tr(g, "title")) + "</a>";
      }).join("") + "</div>" +
      '<button class="btn btn-small" type="button" data-filter-bro="' + esc(b.id) + '">' + esc(t("dialog.seeAll")) + "</button>" : "");
    $("#bro-dialog").showModal();
  }

  const dlg = $("#bro-dialog");
  dlg.addEventListener("click", function (e) {
    if (e.target === dlg) dlg.close();
    const f = e.target.closest("[data-filter-bro]");
    if (f) {
      dlg.close();
      state = { q: "", holiday: "", age: "", type: "", by: f.dataset.filterBro };
      syncControls(); render(); writeUrl();
      $("#worlds").scrollIntoView({ behavior: "smooth" });
    }
  });

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
      holiday: { field: "holidays", tags: "holidays" },
      age:     { field: "ages",     tags: "ages" },
      type:    { field: "type",     tags: "types" },
    };
    Object.keys(groups).forEach(function (key) {
      const g = groups[key];
      const inUse = used(g.field);
      let html = chip(key, "", t("filter." + key));
      Object.keys(TAGS[g.tags]).forEach(function (k) {
        if (inUse.has(k)) html += chip(key, k, TAGS[g.tags][k].emoji + " " + JB.tag(g.tags, k));
      });
      document.querySelector('.filter-group[data-group="' + key + '"]').innerHTML = html;
    });
    const credited = used("by");
    const broGroup = document.querySelector('.filter-group[data-group="by"]');
    const credBros = BROS.filter(function (b) { return credited.has(b.id); });
    broGroup.hidden = credBros.length === 0;
    broGroup.innerHTML = chip("by", "", t("filter.by")) + credBros.map(function (b) {
      return chip("by", b.id, tr(b, "name"), '<span class="chip-sprite">' + JB.spriteImg(b) + "</span>");
    }).join("");
    syncControls();
  }

  document.querySelector(".filters").addEventListener("click", function (e) {
    const c = e.target.closest(".chip[data-group]");
    if (!c) return;
    state[c.dataset.group] = c.dataset.value;
    syncControls(); render(); writeUrl();
  });
  $("#q").addEventListener("input", function (e) { state.q = e.target.value; render(); writeUrl(); });
  $("#clear-filters").addEventListener("click", function () {
    state = { q: "", holiday: "", age: "", type: "", by: "" };
    syncControls(); render(); writeUrl();
  });

  function syncControls() {
    $("#q").value = state.q;
    document.querySelectorAll(".filters .chip[data-group]").forEach(function (c) {
      c.setAttribute("aria-pressed", String(state[c.dataset.group] === c.dataset.value));
    });
  }

  function writeUrl() {
    const p = new URLSearchParams(location.search);
    Object.keys(state).forEach(function (k) { if (state[k]) p.set(k, state[k]); else p.delete(k); });
    const qs = p.toString();
    try { history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash); } catch (e) { /* sandboxed frame */ }
  }

  // Search matches English and Hebrew text, whatever language is showing
  function haystack(g) {
    const bros = (g.by || []).map(function (id) { const b = broById[id]; return b ? b.name + " " + (b.he ? b.he.name : "") : ""; });
    const tagText = (g.holidays || []).concat(g.ages || []).map(function (k) {
      const h = TAGS.holidays[k] || TAGS.ages[k];
      return h ? h.label + " " + h.he : "";
    });
    return [g.title, g.blurb, g.label, g.type, g.he && g.he.title, g.he && g.he.blurb]
      .concat(g.holidays, g.ages, bros, tagText).join(" ").toLowerCase();
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
    const other = JB.lang === "he" ? g.title : g.he && g.he.title;
    const screen = g.image ? '<img src="' + esc(g.image) + '" alt="" loading="lazy" onerror="this.remove()">' : "";
    const tags = (g.holidays || []).filter(function (h) { return h !== "year-round"; }).map(function (h) {
      return TAGS.holidays[h] ? '<span class="tag">' + TAGS.holidays[h].emoji + " " + esc(JB.tag("holidays", h)) + "</span>" : "";
    }).concat((g.ages || []).map(function (a) {
      return TAGS.ages[a] ? '<span class="tag tag-age">' + esc(JB.tag("ages", a)) + "</span>" : "";
    })).join("");
    const bros = (g.by || []).map(function (id) {
      const b = broById[id];
      return b ? '<button class="by-bro" type="button" data-bro="' + esc(b.id) + '" title="' + esc(t("card.by", { name: tr(b, "name") })) + '">' +
        JB.spriteImg(b, t("card.by", { name: tr(b, "name") })) + "</button>" : "";
    }).join("");
    const typeTag = TAGS.types[g.type] ? TAGS.types[g.type].emoji : "";

    return '<article class="card panel' + (live ? "" : " card-soon") + (highlight ? " card-next" : "") + '" data-next="' + esc(t("card.next")) + '">' +
      '<div class="card-screen" data-emoji="' + esc(g.emoji) + '">' + screen +
        (live ? "" : '<span class="soon-block" aria-hidden="true"></span>') +
        '<span class="card-type" title="' + esc(JB.tag("types", g.type)) + '">' + typeTag + "</span>" +
      "</div>" +
      '<div class="card-body">' +
        '<h3 class="card-title">' + esc(tr(g, "title")) + "</h3>" +
        (other ? '<p class="card-other" dir="auto">' + esc(other) + "</p>" : "") +
        '<p class="card-blurb">' + esc(tr(g, "blurb")) + "</p>" +
        '<div class="card-tags">' + tags + "</div>" +
      "</div>" +
      '<div class="card-foot">' +
        (bros ? '<div class="card-bros">' + bros + "</div>" : "<span></span>") +
        (live ? '<a class="btn btn-play" href="' + esc(g.url) + '">' + esc(t("card.play")) + "</a>"
              : '<span class="btn btn-play is-disabled" aria-disabled="true">' + esc(t("card.soon")) + "</span>") +
      "</div>" +
    "</article>";
  }

  // Suggestions for visitors who arrive from one of our games (?from=dreidel)
  const from = GAMES.find(function (g) { return g.id === params.get("from"); });
  const nextUp = from ? GAMES.filter(function (o) {
    if (o.id === from.id || o.status !== "live") return false;
    const holiday = (o.holidays || []).some(function (h) { return h !== "year-round" && (from.holidays || []).indexOf(h) !== -1; });
    const age = (o.ages || []).some(function (a) { return (from.ages || []).indexOf(a) !== -1; });
    return holiday || age;
  }).map(function (o) { return o.id; }) : [];

  function renderFromBanner() {
    if (!from) return;
    const el = $("#from-banner");
    el.hidden = false;
    el.innerHTML = '<p class="from-title">' + esc(t("from.title", { title: tr(from, "title") })) + "</p>" +
      "<p>" + esc(nextUp.length ? t("from.next") : t("from.pick")) + "</p>";
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
    const parts = [];
    if (live) parts.push(t("results.play", { n: live }));
    if (list.length > live) parts.push(t("results.soon", { n: list.length - live }));
    $("#results-count").textContent = parts.join(" · ");
  }

  $("#grid").addEventListener("click", function (e) {
    const b = e.target.closest(".by-bro");
    if (b) openBro(b.dataset.bro);
  });

  function renderAll() {
    renderBroCards();
    renderFilters();
    renderFromBanner();
    render();
  }
  document.addEventListener("jb:lang", renderAll);
  renderAll();
})();
