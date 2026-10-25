/*
 * The playable world: pick a brother, walk the Old City, and jump into a
 * pomegranate block to open a game. Built from data/games.js, so a new game
 * gets its own block automatically.
 */
(function () {
  const A = window.JB_ART;
  const JB = window.JB;
  const GAMES = window.JB_GAMES;
  const BROS = window.JB_BROTHERS;

  const T = 16;                 // tile size
  const G = 12;                 // ground row (rows 12-13 are ground)
  const VIEW_H = A.H;           // 224

  const PHYS = {
    gravity: 1500, jump: 520, jumpCut: 210, maxFall: 520,
    run: 118, accel: 1000, airAccel: 760, friction: 1400,
    coyote: 0.09, buffer: 0.13,
  };

  const $ = function (s) { return document.querySelector(s); };
  const stage = $("#play");
  if (!stage) return;
  const display = $("#game");
  const dctx = display.getContext("2d");
  const buffer = document.createElement("canvas");
  const ctx = buffer.getContext("2d");

  // ---------------- level ----------------
  const ZONES = [
    { key: "games", icon: "🎮", match: function (g) { return g.status === "live" && g.type === "game"; } },
    { key: "study", icon: "📜", match: function (g) { return g.status === "live" && g.type === "study"; } },
    { key: "apps",  icon: "📱", match: function (g) { return g.status === "live" && g.type === "app"; } },
    { key: "soon",  icon: "🔨", match: function (g) { return g.status !== "live"; } },
  ];

  function buildLevel() {
    const solids = new Map();      // "tx,ty" → "stone"
    const blocks = new Map();      // "tx,ty" → block
    const zones = [], gates = [], signs = [];
    const key = function (x, y) { return x + "," + y; };
    const stone = function (x, y) { solids.set(key(x, y), "stone"); };
    const addBlock = function (x, y, b) { b.tx = x; b.ty = y; b.bump = 0; blocks.set(key(x, y), b); };

    // Kotel plaza: spawn, welcome sign, two fact blocks
    signs.push({ x: 5 * T, w: 96, text: "sign.welcome" });
    addBlock(13, G - 4, { kind: "fact" });
    addBlock(14, G - 4, { kind: "fact" });
    let cx = 19;

    ZONES.forEach(function (zone) {
      const items = GAMES.filter(zone.match);
      if (!items.length) return;
      gates.push({ x: cx * T, zone: zone });
      zones.push({ zone: zone, spawnX: (cx + 4) * T, startX: cx * T });
      cx += 5;
      items.forEach(function (game, i) {
        const kind = game.status === "live" ? "item" : "soon";
        const pattern = i % 3;
        if (pattern === 0) {
          addBlock(cx + 3, G - 4, { kind: kind, game: game });
          if (i % 2 === 0) { addBlock(cx + 2, G - 4, { kind: "fact" }); addBlock(cx + 4, G - 4, { kind: "fact" }); }
          cx += 8;
        } else if (pattern === 1) {
          // a raised stone terrace to jump onto, with the block above it
          for (let x = cx + 1; x <= cx + 5; x++) { stone(x, G - 2); stone(x, G - 1); }
          addBlock(cx + 3, G - 6, { kind: kind, game: game });
          cx += 9;
        } else {
          stone(cx + 1, G - 1);
          stone(cx + 2, G - 1); stone(cx + 2, G - 2);
          for (let x = cx + 3; x <= cx + 4; x++) for (let y = G - 3; y <= G - 1; y++) stone(x, y);
          addBlock(cx + 4, G - 7, { kind: kind, game: game });
          cx += 9;
        }
      });
      cx += 3;
    });
    signs.push({ x: (cx + 1) * T, w: 96, text: "sign.end" });
    cx += 10;
    zones.forEach(function (z, i) { z.endX = i + 1 < zones.length ? zones[i + 1].startX : cx * T; });
    return { cols: cx, width: cx * T, solids: solids, blocks: blocks, zones: zones, gates: gates, signs: signs, key: key };
  }

  const level = buildLevel();
  const MAX_VIEW = 720;
  const MIN_VIEW = 256;
  const art = {
    tiles: A.makeTiles(),
    clouds: A.makeClouds(level.width * 0.08 + MAX_VIEW),
    hills: A.makeHills(level.width * 0.15 + MAX_VIEW),
    city: A.makeCity(level.width * 0.4 + MAX_VIEW),
    trees: A.makeTrees(level.width * 0.7 + MAX_VIEW),
    kotel: A.makeKotel(),
  };

  function solidAt(tx, ty) {
    if (tx < 0 || tx >= level.cols) return true;
    if (ty < 0) return false;
    if (ty >= G) return true;
    const k = level.key(tx, ty);
    return level.solids.has(k) || level.blocks.has(k);
  }

  // ---------------- brother sprites ----------------
  const sheets = {};
  BROS.forEach(function (b) {
    const img = new Image();
    img.src = b.sprite.replace(/\.png$/, "-side.png");
    sheets[b.id] = img;
  });

  // ---------------- state ----------------
  let mode = "select";          // "select" | "play"
  let paused = false;
  let bro = null;
  let cam = 0;
  let time = 0;
  let viewW = 320;
  let viewH = VIEW_H;
  let yOff = 0;               // extra sky above the world on tall screens
  let scale = 1;
  let inView = true;
  let factIndex = Math.floor(Math.random() * 10);
  const particles = [];
  const P = { x: 4 * T, y: 0, w: 12, h: 30, vx: 0, vy: 0, onGround: false, face: 1, coyote: 0, buffer: 0, walkT: 0 };

  const input = { left: false, right: false, joy: 0, jumpHeld: false, jumpPressed: false };

  // ---------------- sizing ----------------
  function resize() {
    const rect = display.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    display.width = Math.max(1, Math.round(rect.width * dpr));
    display.height = Math.max(1, Math.round(rect.height * dpr));
    // Show the full world height, and at least MIN_VIEW pixels across (phones held upright)
    scale = Math.min(display.height / VIEW_H, display.width / MIN_VIEW);
    viewW = Math.min(MAX_VIEW, Math.ceil(display.width / scale));
    viewH = Math.ceil(display.height / scale);
    yOff = viewH - VIEW_H;
    buffer.width = viewW;
    buffer.height = viewH;
    ctx.imageSmoothingEnabled = false;
  }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(display);
  else window.addEventListener("resize", resize);

  // ---------------- player ----------------
  function placeAt(x) {
    const img = sheets[bro.id];
    P.h = (img.naturalHeight || 33) - 3;
    P.x = x; P.y = G * T - P.h; P.vx = 0; P.vy = 0; P.onGround = true;
    cam = clampCam(P.x + P.w / 2 - viewW * 0.42);
  }

  function step(dt) {
    const axis = Math.max(-1, Math.min(1, (input.right ? 1 : 0) - (input.left ? 1 : 0) + input.joy));
    const accel = P.onGround ? PHYS.accel : PHYS.airAccel;
    if (axis) {
      P.vx += axis * accel * dt;
      const max = PHYS.run * Math.abs(axis);
      if (Math.abs(P.vx) > max) P.vx = Math.sign(P.vx) * max;
      P.face = axis > 0 ? 1 : -1;
    } else if (P.onGround) {
      const f = PHYS.friction * dt;
      P.vx = Math.abs(P.vx) <= f ? 0 : P.vx - Math.sign(P.vx) * f;
    }

    P.coyote = P.onGround ? PHYS.coyote : P.coyote - dt;
    P.buffer = input.jumpPressed ? PHYS.buffer : P.buffer - dt;
    input.jumpPressed = false;
    if (P.buffer > 0 && P.coyote > 0) {
      P.vy = -PHYS.jump; P.buffer = 0; P.coyote = 0; P.onGround = false;
    }
    if (!input.jumpHeld && P.vy < -PHYS.jumpCut) P.vy = -PHYS.jumpCut;
    P.vy = Math.min(PHYS.maxFall, P.vy + PHYS.gravity * dt);

    // horizontal
    P.x += P.vx * dt;
    const top = Math.floor(P.y / T), bottom = Math.floor((P.y + P.h - 0.01) / T);
    if (P.vx > 0) {
      const col = Math.floor((P.x + P.w - 0.01) / T);
      for (let ty = top; ty <= bottom; ty++) if (solidAt(col, ty)) { P.x = col * T - P.w; P.vx = 0; break; }
    } else if (P.vx < 0) {
      const col = Math.floor(P.x / T);
      for (let ty = top; ty <= bottom; ty++) if (solidAt(col, ty)) { P.x = (col + 1) * T; P.vx = 0; break; }
    }

    // vertical
    P.y += P.vy * dt;
    P.onGround = false;
    const left = Math.floor(P.x / T), right = Math.floor((P.x + P.w - 0.01) / T);
    if (P.vy > 0) {
      const row = Math.floor((P.y + P.h - 0.01) / T);
      for (let tx = left; tx <= right; tx++) if (solidAt(tx, row)) { P.y = row * T - P.h; P.vy = 0; P.onGround = true; break; }
    } else if (P.vy < 0) {
      const row = Math.floor(P.y / T);
      let hit = null, best = Infinity, blocked = false;
      for (let tx = left; tx <= right; tx++) {
        if (!solidAt(tx, row)) continue;
        blocked = true;
        // the block nearest the player's head is the one that gets bumped
        const b = level.blocks.get(level.key(tx, row));
        const d = Math.abs((tx + 0.5) * T - (P.x + P.w / 2));
        if (b && d < best) { best = d; hit = b; }
      }
      if (blocked) { P.y = (row + 1) * T; P.vy = 40; }
      if (hit) bump(hit);
    }

    P.walkT = P.onGround && Math.abs(P.vx) > 8 ? P.walkT + dt * (Math.abs(P.vx) / PHYS.run) : 0;
    cam += (clampCam(P.x + P.w / 2 - viewW * 0.42) - cam) * Math.min(1, dt * 8);
  }

  function clampCam(x) {
    if (level.width <= viewW) return (level.width - viewW) / 2;
    return Math.max(0, Math.min(level.width - viewW, x));
  }

  // ---------------- blocks ----------------
  let pendingPopup = null;
  function bump(b) {
    if (b.bump > 0) return;
    b.bump = 0.22;
    const x = b.tx * T + T / 2, y = b.ty * T;
    if (b.kind === "fact") {
      particles.push({ img: art.tiles.coin, x: x - 4, y: y - 12, vy: -160, life: 0.5 });
      JB.addCoin();
      const facts = JB.facts();
      factIndex = (factIndex + 1) % facts.length;
      toast(facts[factIndex], 5200);
    } else {
      particles.push({ img: art.tiles.rimon, x: x - 5, y: y - 12, vy: -120, life: 0.45 });
      if (b.kind === "item") JB.addCoin();
      pendingPopup = { game: b.game, t: 0.32 };
    }
  }

  // ---------------- drawing ----------------
  function layer(img, factor, y) {
    const x = -Math.round(cam * factor);
    ctx.drawImage(img, x, y || 0);
  }

  function draw() {
    const W = viewW;
    ctx.fillStyle = "#4f90e0";
    ctx.fillRect(0, 0, W, viewH);
    ctx.save();
    ctx.translate(0, yOff);
    A.drawSky(ctx, W);
    layer(art.clouds, 0.08, 6);
    layer(art.hills, 0.15);
    layer(art.city, 0.4);
    layer(art.trees, 0.7);
    ctx.drawImage(art.kotel, Math.round(-28 - cam * 0.85), 0);

    const c = Math.round(cam);
    const world = mode === "play";
    if (world) level.gates.forEach(function (g) { if (g.x - c > -60 && g.x - c < W + 10) A.drawGate(ctx, g.x, c); });
    if (world) level.signs.forEach(function (s) { if (s.x - c > -s.w && s.x - c < W) A.drawSign(ctx, s.x, c, s.w); });

    // ground
    const t0 = Math.max(0, Math.floor(c / T)), t1 = Math.min(level.cols - 1, Math.floor((c + W) / T) + 1);
    for (let tx = t0; tx <= t1; tx++) {
      ctx.drawImage(art.tiles.groundTop, tx * T - c, G * T);
      ctx.drawImage(art.tiles.groundFill, tx * T - c, (G + 1) * T);
    }
    if (world) level.solids.forEach(function (_, k) {
      const p = k.split(","), tx = +p[0];
      if (tx >= t0 - 1 && tx <= t1) ctx.drawImage(art.tiles.stone, tx * T - c, +p[1] * T);
    });
    const shimmer = [0, 0, 0, 1, 2, 1][Math.floor(time * 6) % 6];
    if (world) level.blocks.forEach(function (b) {
      if (b.tx < t0 - 1 || b.tx > t1) return;
      const off = b.bump > 0 ? -Math.round(Math.sin((1 - b.bump / 0.22) * Math.PI) * 5) : 0;
      const img = b.kind === "item" ? art.tiles.item[shimmer] : b.kind === "soon" ? art.tiles.soon : art.tiles.brick;
      ctx.drawImage(img, b.tx * T - c, b.ty * T + off);
    });

    particles.forEach(function (p) { ctx.drawImage(p.img, Math.round(p.x - c), Math.round(p.y)); });

    if (world && bro) drawPlayer(c);
    ctx.restore();

    // scale up to the screen, then draw text crisp at full resolution
    dctx.imageSmoothingEnabled = false;
    dctx.drawImage(buffer, 0, 0, W, viewH, 0, 0, W * scale, viewH * scale);
    if (world) drawLabels(c);
  }

  function drawPlayer(c) {
    const img = sheets[bro.id];
    if (!img.complete || !img.naturalWidth) return;
    const fw = 23, fh = img.naturalHeight;
    let frame = 0;
    if (!P.onGround) frame = 2;
    else if (P.walkT > 0) frame = Math.floor(P.walkT * 8) % 2 === 0 ? 1 : 0;
    const sy = Math.round(P.y + P.h - (fh - 1));
    const cxp = Math.round(P.x + P.w / 2 - c);
    if (P.face > 0) {
      ctx.drawImage(img, frame * fw, 0, fw, fh, cxp - 11, sy, fw, fh);
    } else {
      ctx.save();
      ctx.translate(cxp + 12, sy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, frame * fw, 0, fw, fh, 0, 0, fw, fh);
      ctx.restore();
    }
  }

  function fontFor(size) {
    return JB.lang === "he"
      ? "700 " + Math.round(size * 1.35 * scale) + 'px "Rubik", system-ui, sans-serif'
      : Math.round(size * scale) + 'px "Press Start 2P", monospace';
  }

  // A label: lines of text centered at (x, y = bottom of the text block), in game pixels
  function label(text, x, y, size, opts) {
    opts = opts || {};
    const lines = String(text).split("\n");
    dctx.font = fontFor(size);
    dctx.textAlign = "center";
    dctx.textBaseline = "alphabetic";
    dctx.direction = JB.lang === "he" ? "rtl" : "ltr";
    const lh = size * (JB.lang === "he" ? 1.5 : 1.35) * scale;
    const widths = lines.map(function (l) { return dctx.measureText(l).width; });
    const w = Math.max.apply(null, widths);
    const sx = x * scale, by = (y + yOff) * scale;
    const h = lh * lines.length;
    if (opts.plaque) {
      const pad = 3 * scale;
      dctx.fillStyle = opts.plaque;
      dctx.fillRect(Math.round(sx - w / 2 - pad), Math.round(by - h - pad + lh * 0.25), Math.round(w + pad * 2), Math.round(h + pad * 1.5));
    }
    lines.forEach(function (l, i) {
      const ly = by - (lines.length - 1 - i) * lh;
      dctx.lineJoin = "round";
      dctx.lineWidth = Math.max(2, scale * 1.6);
      dctx.strokeStyle = opts.stroke || "#20140c";
      dctx.strokeText(l, sx, ly);
      dctx.fillStyle = opts.color || "#ffffff";
      dctx.fillText(l, sx, ly);
    });
  }

  function drawLabels(c) {
    level.blocks.forEach(function (b) {
      if (!b.game) return;
      const x = b.tx * T + T / 2 - c;
      if (x < -60 || x > viewW + 60) return;
      label(JB.tr(b.game, "label") || JB.tr(b.game, "title"), x, b.ty * T - 5, 7,
        { plaque: "rgba(32,20,12,.62)", color: b.kind === "soon" ? "#d9d4e8" : "#fff4c8" });
    });
    level.gates.forEach(function (g) {
      const x = g.x + 24 - c;
      if (x < -80 || x > viewW + 80) return;
      label(g.zone.icon + " " + JB.t("zone." + g.zone.key), x, 94, 7, { plaque: "rgba(122,52,18,.9)" });
    });
    level.signs.forEach(function (s) {
      const x = s.x + s.w / 2 - c;
      if (x < -s.w || x > viewW + s.w) return;
      label(JB.t(s.text), x, 149, 6, { color: "#fff8e0" });
    });
  }

  // ---------------- loop ----------------
  let last = 0, acc = 0;
  const DT = 1 / 120;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!inView || document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    time += dt;

    if (mode === "play" && bro && !paused) {
      acc += dt;
      while (acc >= DT) { step(DT); acc -= DT; }
    } else if (mode === "select") {
      const range = Math.max(0, Math.min(level.width - viewW, 520));
      cam = range * (0.5 - 0.5 * Math.cos(time * 0.07));
    }
    level.blocks.forEach(function (b) { if (b.bump > 0) b.bump = Math.max(0, b.bump - dt); });
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.y += p.vy * dt; p.vy += 500 * dt; p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    if (pendingPopup) {
      pendingPopup.t -= dt;
      if (pendingPopup.t <= 0) { openPopup(pendingPopup.game); pendingPopup = null; }
    }
    if (mode === "play") updateZoneTabs();
    draw();
  }

  // ---------------- UI: select screen ----------------
  const selectEl = $("#select");
  const pickEl = $("#pick");
  const fadeEl = $("#fade");
  const ingameEl = $("#ingame");

  function renderPick() {
    pickEl.innerHTML = BROS.map(function (b, i) {
      return '<button class="pick-bro" type="button" data-bro="' + JB.esc(b.id) + '" style="--i:' + i + '">' +
        '<span class="pick-sprite">' + JB.spriteImg(b) + "</span>" +
        '<span class="pick-name">' + JB.esc(JB.tr(b, "name")) + "</span></button>";
    }).join("");
  }
  pickEl.addEventListener("click", function (e) {
    const btn = e.target.closest(".pick-bro");
    if (btn) choose(btn.dataset.bro, btn);
  });
  pickEl.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const btns = Array.from(pickEl.querySelectorAll(".pick-bro"));
    const i = btns.indexOf(document.activeElement);
    const dir = (e.key === "ArrowRight" ? 1 : -1) * (JB.lang === "he" ? -1 : 1);
    btns[(i + dir + btns.length) % btns.length].focus();
    e.preventDefault();
  });

  function fade(then) {
    fadeEl.classList.add("on");
    setTimeout(function () {
      then();
      setTimeout(function () { fadeEl.classList.remove("on"); }, 60);
    }, 320);
  }

  function choose(id, btn) {
    const b = BROS.find(function (x) { return x.id === id; });
    if (!b) return;
    if (btn) { btn.classList.add("chosen"); }
    JB.save("bro", id);
    const go = function () {
      fade(function () {
        bro = b;
        mode = "play";
        placeAt(4 * T);
        selectEl.hidden = true;
        ingameEl.hidden = false;
        stage.classList.add("playing");
        $("#change-bro").innerHTML = JB.spriteImg(b) + '<span>' + JB.esc(JB.t("play.change")) + "</span>";
        if (btn) btn.classList.remove("chosen");
        toast(JB.t(isTouch() ? "play.tip.touch" : "play.tip.keys"), 6500);
        stage.focus({ preventScroll: true });
      });
    };
    const img = sheets[id];
    if (img.complete) setTimeout(go, 260); else img.onload = function () { setTimeout(go, 100); };
  }

  function backToSelect() {
    fade(function () {
      mode = "select";
      selectEl.hidden = false;
      ingameEl.hidden = true;
      stage.classList.remove("playing");
      const last = pickEl.querySelector('[data-bro="' + (bro && bro.id) + '"]');
      if (last) last.focus({ preventScroll: true });
    });
  }
  $("#change-bro").addEventListener("click", backToSelect);

  // ---------------- UI: zone tabs ----------------
  const tabsEl = $("#zone-tabs");
  function renderTabs() {
    tabsEl.innerHTML = level.zones.map(function (z, i) {
      return '<button class="zone-tab" type="button" data-zone="' + i + '">' + z.zone.icon + " " + JB.esc(JB.t("zone." + z.zone.key)) + "</button>";
    }).join("");
  }
  tabsEl.addEventListener("click", function (e) {
    const btn = e.target.closest(".zone-tab");
    if (!btn) return;
    const z = level.zones[+btn.dataset.zone];
    fade(function () { placeAt(z.spawnX); });
  });
  let lastZone = -1;
  function updateZoneTabs() {
    const x = P.x;
    let current = -1;
    level.zones.forEach(function (z, i) { if (x >= z.startX - T * 2) current = i; });
    if (current === lastZone) return;
    lastZone = current;
    tabsEl.querySelectorAll(".zone-tab").forEach(function (b, i) { b.setAttribute("aria-current", i === current ? "true" : "false"); });
  }

  // ---------------- UI: toast ----------------
  const toastEl = $("#toast");
  let toastTimer = null;
  function toast(text, ms) {
    toastEl.textContent = text;
    toastEl.hidden = false;
    toastEl.classList.remove("show");
    void toastEl.offsetWidth;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, ms || 4000);
  }

  // ---------------- UI: game popup ----------------
  const pop = $("#game-pop");
  function openPopup(game) {
    const live = game.status === "live" && game.url;
    const other = JB.lang === "he" ? game.title : (game.he && game.he.title);
    const tags = (game.holidays || []).filter(function (h) { return h !== "year-round"; })
      .map(function (h) { return '<span class="tag">' + window.JB_TAGS.holidays[h].emoji + " " + JB.esc(JB.tag("holidays", h)) + "</span>"; })
      .concat((game.ages || []).map(function (a) { return '<span class="tag tag-age">' + JB.esc(JB.tag("ages", a)) + "</span>"; }))
      .join("");
    $("#game-pop-body").innerHTML =
      '<div class="pop-screen" data-emoji="' + JB.esc(game.emoji) + '">' +
        (game.image ? '<img src="' + JB.esc(game.image) + '" alt="" onerror="this.remove()">' : "") +
      "</div>" +
      '<h3 class="pop-title" id="game-pop-title">' + JB.esc(JB.tr(game, "title")) + "</h3>" +
      (other ? '<p class="pop-other" dir="auto">' + JB.esc(other) + "</p>" : "") +
      '<p class="pop-blurb">' + JB.esc(live ? JB.tr(game, "blurb") : JB.t("popup.soonText")) + "</p>" +
      '<div class="card-tags">' + tags + "</div>" +
      '<div class="pop-actions">' +
        (live ? '<a class="btn btn-play" href="' + JB.esc(game.url) + '">' + JB.esc(JB.t("popup.play")) + "</a>"
              : '<span class="btn btn-play is-disabled">' + JB.esc(JB.t("popup.soon")) + "</span>") +
        '<button class="btn btn-quiet" type="button" data-close>' + JB.esc(JB.t("popup.keep")) + "</button>" +
      "</div>";
    paused = true;
    clearInput();
    pop.showModal();
    const play = pop.querySelector(".btn-play:not(.is-disabled)");
    (play || pop.querySelector("[data-close]")).focus();
  }
  pop.addEventListener("click", function (e) {
    if (e.target === pop || e.target.closest("[data-close]")) pop.close();
  });
  pop.addEventListener("close", function () { paused = false; clearInput(); stage.focus({ preventScroll: true }); });

  // ---------------- input ----------------
  function clearInput() { input.left = input.right = input.jumpHeld = input.jumpPressed = false; input.joy = 0; }
  const isTyping = function (el) { return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable); };
  const LEFT = ["ArrowLeft", "a", "A"], RIGHT = ["ArrowRight", "d", "D"], JUMP = [" ", "ArrowUp", "w", "W", "z", "Z"];

  window.addEventListener("keydown", function (e) {
    if (mode !== "play" || paused || !inView || isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest("button, a") && (e.key === " " || e.key === "Enter")) return;
    let used = true;
    if (LEFT.includes(e.key)) input.left = true;
    else if (RIGHT.includes(e.key)) input.right = true;
    else if (JUMP.includes(e.key)) { if (!e.repeat) input.jumpPressed = true; input.jumpHeld = true; }
    else used = false;
    if (used) e.preventDefault();
  });
  window.addEventListener("keyup", function (e) {
    if (LEFT.includes(e.key)) input.left = false;
    if (RIGHT.includes(e.key)) input.right = false;
    if (JUMP.includes(e.key)) input.jumpHeld = false;
  });
  window.addEventListener("blur", clearInput);

  // touch: joystick + jump button
  function isTouch() { return stage.classList.contains("touch") || JB.isTouch(); }
  if (JB.isTouch()) stage.classList.add("touch");
  window.addEventListener("touchstart", function () { stage.classList.add("touch"); }, { once: true, passive: true });

  const joy = $("#joy"), knob = joy.querySelector(".joy-knob");
  let joyId = null, joyCx = 0;
  joy.addEventListener("pointerdown", function (e) {
    joyId = e.pointerId;
    const r = joy.getBoundingClientRect();
    joyCx = r.left + r.width / 2;
    joy.setPointerCapture(e.pointerId);
    moveJoy(e);
    e.preventDefault();
  });
  function moveJoy(e) {
    if (e.pointerId !== joyId) return;
    const radius = joy.offsetWidth * 0.36;
    const dx = Math.max(-radius, Math.min(radius, e.clientX - joyCx));
    knob.style.transform = "translateX(" + dx + "px)";
    const a = dx / radius;
    input.joy = Math.abs(a) < 0.2 ? 0 : a;
  }
  joy.addEventListener("pointermove", moveJoy);
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (ev) {
    joy.addEventListener(ev, function (e) {
      if (e.pointerId !== joyId) return;
      joyId = null; input.joy = 0; knob.style.transform = "";
    });
  });

  const jumpBtn = $("#jump-btn");
  jumpBtn.addEventListener("pointerdown", function (e) {
    input.jumpPressed = true; input.jumpHeld = true;
    jumpBtn.setPointerCapture(e.pointerId);
    jumpBtn.classList.add("down");
    e.preventDefault();
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (ev) {
    jumpBtn.addEventListener(ev, function () { input.jumpHeld = false; jumpBtn.classList.remove("down"); });
  });
  [joy, jumpBtn].forEach(function (el) { el.addEventListener("contextmenu", function (e) { e.preventDefault(); }); });

  // only run while the stage is on screen
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (!inView) clearInput();
    }, { threshold: 0.25 }).observe(stage);
  }

  // ---------------- language ----------------
  function relabel() {
    renderPick();
    renderTabs();
    lastZone = -1;
    if (bro) $("#change-bro").innerHTML = JB.spriteImg(bro) + "<span>" + JB.esc(JB.t("play.change")) + "</span>";
    $("#jump-btn").textContent = JB.t("play.jump");
    $("#select-keys").textContent = JB.t(isTouch() ? "select.touch" : "select.keys");
  }
  document.addEventListener("jb:lang", relabel);

  // ---------------- start ----------------
  resize();
  relabel();
  if (document.fonts && document.fonts.load) {
    document.fonts.load('8px "Press Start 2P"');
    document.fonts.load('700 10px "Rubik"');
  }
  requestAnimationFrame(frame);

  window.JB_GAME = { level: level, player: P, input: input, choose: choose, get mode() { return mode; } };
})();
