/*
 * Pixel-art bros, drawn from a 16x20 grid.
 *
 * Grid letters:
 *   K hat   R hat band   H hair   p peyos   S skin   E eyes   g glasses
 *   b beard (or skin)   c beard (or shirt)   M mouth   T shirt
 *   P pants   W tzitzit   O shoes   . empty
 */
(function () {
  const HEADS = {
    kippah: [
      "......KKKK......",
      ".....KKKKKK.....",
      "....HHHHHHHH....",
      "...HHHHHHHHHH...",
    ],
    fedora: [
      ".....KKKKKK.....",
      ".....RRRRRR.....",
      "..KKKKKKKKKKKK..",
      "...HHHHHHHHHH...",
    ],
    cap: [
      "................",
      "....KKKKKKKK....",
      "...KKKKKKKKKKKKK",
      "...HHHHHHHHHH...",
    ],
  };

  const BODY = [
    "...HSSSSSSSSH...",
    "..pSgEggggEgSp..",
    "..pSSSSSSSSSSp..",
    "..pSbSSSSSSbSp..",
    "...SbbSMMSbbS...",
    "....bbbbbbbb....",
    "...TTccccccTT...",
    "..TTTTTTTTTTTT..",
    ".TTTTTTTTTTTTTT.",
    ".TTTTTTTTTTTTTT.",
    ".SPPPPPPPPPPPPS.",
    "...WPPPPPPPPW...",
    "...WPPP..PPPW...",
    "...WPPP..PPPW...",
    "....PPP..PPP....",
    "...OOOO..OOOO...",
  ];

  function colorOf(ch, look) {
    const beard = look.beardColor || look.hair;
    switch (ch) {
      case "K": return look.hatColor;
      case "R": return look.bandColor || "#3a3a3a";
      case "H": return look.hair;
      case "p": return look.peyos ? look.hair : null;
      case "S": return look.skin;
      case "E": return look.glasses ? "#dff3ff" : "#111111";
      case "g": return look.glasses ? "#1b1b1b" : look.skin;
      case "b": return look.beard ? beard : (look.skin);
      case "c": return look.beard ? beard : look.shirt;
      case "M": return "#a3322a";
      case "T": return look.shirt;
      case "P": return look.pants;
      case "W": return "#f4f4f4";
      case "O": return look.shoes;
      default:  return null;
    }
  }

  // Returns an SVG string. Horizontal runs of one color become one rect.
  function sprite(look, opts) {
    opts = opts || {};
    const rows = (HEADS[look.hat] || HEADS.kippah).concat(BODY);
    const rects = [];
    rows.forEach(function (row, y) {
      let x = 0;
      while (x < row.length) {
        const fill = colorOf(row[x], look);
        let w = 1;
        while (x + w < row.length && colorOf(row[x + w], look) === fill) w++;
        if (fill) rects.push('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="1" fill="' + fill + '"/>');
        x += w;
      }
    });
    const name = opts.label ? String(opts.label).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    }) : "";
    const label = name ? "<title>" + name + "</title>" : "";
    return '<svg class="sprite" viewBox="0 0 16 20" shape-rendering="crispEdges"' +
      (name ? ' role="img" aria-label="' + name + '"' : ' aria-hidden="true"') + ">" +
      label + rects.join("") + "</svg>";
  }

  window.JB_SPRITE = sprite;
})();
