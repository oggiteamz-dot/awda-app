/**
 * ornament.js — the geometry. Constructed, never traced.
 *
 * Every mark here is generated from real girih construction at runtime, which is
 * why it stays crisp at any size and why changing one number changes the whole
 * family. Nothing in this file knows a colour: everything strokes or fills
 * `currentColor`, so ornament inherits whatever token the surface sets.
 *
 * ─── WHAT IS HERE, AND WHY EACH ONE EARNED ITS PLACE ────────────────────────
 * Verdicts below are from docs/research/SHIA-ICONOGRAPHY.md, which checked every
 * candidate symbol against Shia sources rather than against what looks Islamic.
 *
 *   rosette12   USE   — the 12-point girih rosette. Native to Persian and Iraqi
 *                       shrine girih (where 14-fold is NOT), and reads as the
 *                       Twelve Imams to someone who is looking for it. It is the
 *                       brand mark.
 *   kufic       USE   — square Kufic (bannā'ī). Pixel-native, historically laid
 *                       in brick, scales perfectly. Pattern only, never text the
 *                       user must read.
 *   muqarnas    USE   — the muqarnas cell profile. Shrine-coded container shape
 *                       with no sectarian charge. Used as a card silhouette.
 *   turbah      USE   — the muhr. The most Shia-specific everyday devotional
 *                       object there is, and the right mark for the qaḍāʾ module.
 *   facet       USE   — āyina-kārī mirror-work. The strongest "shrine interior,
 *                       not generic Islamic" cue available.
 *   arch        USE   — the pointed/multifoil arch (pishtaq). Composition
 *                       grammar, and the prayer icon.
 *   jarida      USE   — the fresh green twig placed with the body. The single
 *                       green element permitted on the الكفن ground.
 *   astro       USE   — an astrolabe limb: a graduated arc with tick marks. Not
 *                       a religious symbol at all — it is the instrument that
 *                       Muslim astronomers built to find the qibla and fix the
 *                       prayer times, and it is the bridge between "scientific"
 *                       and "connected to God" that this app is built on.
 *
 * ─── WHAT IS DELIBERATELY ABSENT ────────────────────────────────────────────
 * No crescent-and-star, no mosque silhouette, no lantern, no prayer beads, no
 * Rub el Hizb ۞ as a brand mark — that is the pan-Islamic category default with
 * zero Shia specificity, and using it is how an app announces it is like every
 * other app.
 * No ʿalam, no Dhū al-Fiqār, no panja/khamsa, no tulip, no lion, no «نادِ علياً»,
 * no mirrored «علي» roundel, no figural depiction of the Imams — each is either
 * militia-coded, politically coded, talismanically coded, or prohibited outright
 * by a named Shia jurist.
 * And NO QURʾĀNIC TEXT IS EVER SHAPED INTO A FORM. Not into the rosette, not
 * into a loading animation, not into a logo. That is the one hard prohibition
 * with an explicit Fiqh Council ruling behind it.
 */

const TAU = Math.PI * 2;
const pt = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const fx = (n) => (Math.round(n * 100) / 100).toString();
const poly = (pts, close = true) =>
  'M' + pts.map(([x, y]) => `${fx(x)} ${fx(y)}`).join('L') + (close ? 'Z' : '');

/** A regular n-gon, optionally phase-shifted. */
function ngon(cx, cy, r, n, phase = 0) {
  return Array.from({ length: n }, (_, i) => pt(cx, cy, r, phase + (i * TAU) / n));
}

/**
 * The star polygon {n/step} — connect every `step`-th vertex of an n-gon.
 * {12/5} is the classic dense twelve-point star of shrine girih.
 * When gcd(n,step) > 1 the figure is several separate closed paths, which is
 * correct and intended: {12/3} really is three squares at 30°, and that is a
 * genuine girih move, not a bug.
 */
function starPolygon(cx, cy, r, n, step, phase = 0) {
  const seen = new Set();
  const paths = [];
  for (let s = 0; s < n; s++) {
    if (seen.has(s)) continue;
    const ring = [];
    let i = s;
    do { seen.add(i); ring.push(pt(cx, cy, r, phase + (i * TAU) / n)); i = (i + step) % n; } while (i !== s);
    if (ring.length > 2) paths.push(poly(ring));
  }
  return paths.join('');
}

/**
 * rosette12 — THE BRAND MARK.
 * Six concentric constructions on one twelve-fold grid: the limb, the {12/5}
 * star, three squares as {12/3}, a petal ring, an inner dodecagon, and twelve
 * radial hairlines. Strapwork weight only — no fills — because girih is an
 * interlace, and a filled star is a sticker.
 */
export function rosette12({ size = 240, weight = 1, detail = 'full', id = '' } = {}) {
  const c = size / 2, R = size * 0.46;
  const inner = R * 0.42;
  const parts = [];
  parts.push(`<circle cx="${fx(c)}" cy="${fx(c)}" r="${fx(R)}" fill="none" stroke="currentColor" stroke-width="${weight}" opacity=".55"/>`);
  parts.push(`<path d="${starPolygon(c, c, R, 12, 5, -Math.PI / 2)}" fill="none" stroke="currentColor" stroke-width="${weight}" stroke-linejoin="miter" opacity=".95"/>`);
  if (detail !== 'min') {
    parts.push(`<path d="${starPolygon(c, c, R * 0.86, 12, 3, -Math.PI / 2)}" fill="none" stroke="currentColor" stroke-width="${weight}" opacity=".5"/>`);
    // the petal ring: twelve kites between the inner dodecagon and the star points
    const petals = [];
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + (i * TAU) / 12;
      const tip = pt(c, c, R * 0.62, a);
      const l = pt(c, c, inner, a - TAU / 24);
      const r2 = pt(c, c, inner, a + TAU / 24);
      const base = pt(c, c, inner * 0.55, a);
      petals.push(poly([base, l, tip, r2]));
    }
    parts.push(`<path d="${petals.join('')}" fill="none" stroke="currentColor" stroke-width="${weight}" opacity=".42"/>`);
  }
  parts.push(`<path d="${poly(ngon(c, c, inner, 12, -Math.PI / 2))}" fill="none" stroke="currentColor" stroke-width="${weight}" opacity=".8"/>`);
  if (detail === 'full') {
    const spokes = [];
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + (i * TAU) / 12;
      spokes.push(poly([pt(c, c, inner, a), pt(c, c, R, a)], false));
    }
    parts.push(`<path d="${spokes.join('')}" fill="none" stroke="currentColor" stroke-width="${weight}" opacity=".22"/>`);
  }
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" ${id ? `id="${id}"` : ''} aria-hidden="true" focusable="false" class="orn orn-rosette">${parts.join('')}</svg>`;
}

/**
 * kufic — a square-Kufic (bannā'ī) lattice, as a tiling <pattern>.
 * Bannā'ī is laid in brick on shrine walls: the grammar is orthogonal strokes on
 * a square grid with a constant gap. Ornament only — this carries no words,
 * deliberately, so nothing readable is ever turned into wallpaper.
 */
export function kuficPattern(id, { unit = 48, weight = 2, opacity = 0.07 } = {}) {
  const u = unit, h = u / 2, q = u / 4;
  const d = [
    `M0 ${h}H${q}V${q}H${h}V0`, `M${h} ${u}V${h + q}H${u - q}V${h}H${u}`,
    `M${q} ${u}V${h + q}`, `M${u - q} 0V${q}`, `M0 ${u - q}H${q}`, `M${u - q} ${h}H${u}`,
  ].join('');
  return `<pattern id="${id}" width="${u}" height="${u}" patternUnits="userSpaceOnUse">
    <path d="${d}" fill="none" stroke="currentColor" stroke-width="${weight}" opacity="${opacity}"/>
  </pattern>`;
}

/** A full-bleed square-Kufic field, for use behind a header block. */
export function kuficField({ id = 'kf', unit = 48, weight = 2, opacity = 0.07 } = {}) {
  return `<svg class="orn orn-kufic" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
    <defs>${kuficPattern(id, { unit, weight, opacity })}</defs>
    <rect width="100%" height="100%" fill="url(#${id})"/></svg>`;
}

/**
 * muqarnas — the cell profile, as a card silhouette.
 * Muqarnas is a corbel of stacked niches. Flattened to two dimensions it gives a
 * stepped shoulder that is unmistakably shrine architecture and still clips a
 * rectangle cleanly. The research is explicit that muqarnas should be treated as
 * MOTION rather than layout, so this is used sparingly — section headers, not
 * every card.
 */
export function muqarnasPath(w, h, { step = 3, shoulder = 0.16, inset = 0.10 } = {}) {
  const run = w * inset, sh = h * shoulder;
  const dx = run / step, dy = sh / step;
  const right = [], left = [];
  for (let i = 1; i <= step; i++) {
    right.push([w - run + dx * (i - 1), dy * (i - 1)], [w - run + dx * i, dy * (i - 1)], [w - run + dx * i, dy * i]);
    left.push([run - dx * (i - 1), dy * (i - 1)], [run - dx * i, dy * (i - 1)], [run - dx * i, dy * i]);
  }
  return poly([[run, 0], [w - run, 0], ...right, [w, h], [0, h], ...left.reverse()]);
}

/**
 * turbah — the muhr: the disc of Karbala clay prostrated on.
 * Drawn as the object actually is — a low disc with a bevelled rim and an
 * inscribed octagonal field — not as a symbol of one. It marks the qaḍāʾ module,
 * because it is the most Shia-specific everyday devotional object there is, and
 * because it is what goes under the forehead in every single sajda: the most
 * repeated act in the whole obligation, and the right emblem for a debt of it.
 *
 * Nothing is written on it. A real muhr often carries an inscription; this one
 * does not, because putting Qurʾānic or devotional text inside a decorative disc
 * is exactly the "shaping the words into a form" that the research rules out.
 */
export function turbah({ size = 64, weight = 1.5 } = {}) {
  const c = size / 2;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true" focusable="false" class="orn orn-turbah">
    <circle cx="${c}" cy="${c}" r="${fx(size * 0.42)}" fill="none" stroke="currentColor" stroke-width="${weight}"/>
    <circle cx="${c}" cy="${c}" r="${fx(size * 0.33)}" fill="none" stroke="currentColor" stroke-width="${weight}" opacity=".55"/>
    <path d="${poly(ngon(c, c, size * 0.22, 8, Math.PI / 8))}" fill="none" stroke="currentColor" stroke-width="${weight}" opacity=".8"/>
    <circle cx="${c}" cy="${c}" r="${fx(size * 0.06)}" fill="currentColor" opacity=".5"/>
  </svg>`;
}

/**
 * arch — the pointed arch / pishtaq, as a path.
 * `foils` > 0 gives a multifoil (scalloped) intrados, which is the Iraqi shrine
 * register rather than the Maghrebi one.
 */
export function archPath(w, h, { rise = 0.42, foils = 0 } = {}) {
  const springer = h * (1 - rise), apex = 0;
  if (!foils) {
    return `M0 ${fx(h)}V${fx(springer)}Q0 ${fx(springer * 0.22)} ${fx(w / 2)} ${apex}Q${fx(w)} ${fx(springer * 0.22)} ${fx(w)} ${fx(springer)}V${fx(h)}Z`;
  }
  const seg = [];
  const n = foils;
  for (let i = 0; i < n; i++) {
    const x0 = (w / n) * i, x1 = (w / n) * (i + 1);
    const y = springer * (0.32 + 0.5 * Math.abs(i - (n - 1) / 2) / n);
    seg.push(`Q${fx((x0 + x1) / 2)} ${fx(y - springer * 0.3)} ${fx(x1)} ${fx(y)}`);
  }
  return `M0 ${fx(h)}V${fx(springer)}${seg.join('')}V${fx(h)}Z`;
}

/** jarida — the fresh green twig placed with the body. The one green element on الكفن. */
export function jarida({ size = 48, weight = 1.5 } = {}) {
  const w = size, h = size;
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true" focusable="false" class="orn orn-jarida">
    <path d="M${w / 2} ${h * 0.95}C${w / 2} ${h * 0.6} ${w / 2} ${h * 0.35} ${w / 2} ${h * 0.08}" fill="none" stroke="currentColor" stroke-width="${weight}" stroke-linecap="round"/>
    ${[0.28, 0.44, 0.60, 0.74].map((t, i) => {
      const y = h * t, s = (i % 2 ? 1 : -1), L = w * (0.30 - i * 0.045);
      return `<path d="M${w / 2} ${fx(y)}Q${fx(w / 2 + s * L * 0.6)} ${fx(y - h * 0.10)} ${fx(w / 2 + s * L)} ${fx(y - h * 0.02)}Q${fx(w / 2 + s * L * 0.55)} ${fx(y + h * 0.05)} ${fx(w / 2)} ${fx(y)}Z" fill="none" stroke="currentColor" stroke-width="${weight}" opacity=".85"/>`;
    }).join('')}
  </svg>`;
}

/**
 * astro — an astrolabe limb: a graduated arc with major and minor ticks.
 * This is the instrument register. The astrolabe, the zīj tables and the mīqāt
 * were built by Muslim astronomers TO DO RELIGION PRECISELY — to find the qibla
 * and fix the hours of prayer. Drawing one is not decoration borrowed from
 * science; it is the app saying what it is.
 *
 * `from`/`to` in degrees, `value` 0..1 draws the filled portion.
 */
export function astroArc({ size = 200, from = -200, to = 20, value = 0, weight = 2, ticks = 24, label = '' } = {}) {
  const c = size / 2, R = size * 0.42, rad = (d) => (d * Math.PI) / 180;
  const arc = (r, a0, a1) => {
    const [x0, y0] = pt(c, c, r, rad(a0)), [x1, y1] = pt(c, c, r, rad(a1));
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    return `M${fx(x0)} ${fx(y0)}A${fx(r)} ${fx(r)} 0 ${large} 1 ${fx(x1)} ${fx(y1)}`;
  };
  const t = [];
  for (let i = 0; i <= ticks; i++) {
    const a = rad(from + ((to - from) * i) / ticks);
    const major = i % 6 === 0;
    const r0 = R - (major ? size * 0.055 : size * 0.028);
    t.push(poly([pt(c, c, r0, a), pt(c, c, R, a)], false));
  }
  const len = Math.abs(to - from);
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true" focusable="false" class="orn orn-astro">
    <path d="${arc(R, from, to)}" fill="none" stroke="currentColor" stroke-width="${weight}" opacity=".34"/>
    <path d="${t.join('')}" fill="none" stroke="currentColor" stroke-width="${weight * 0.7}" opacity=".46"/>
    ${value > 0 ? `<path class="arc-draw" d="${arc(R, from, from + len * Math.min(1, value))}" fill="none" stroke="currentColor" stroke-width="${weight * 1.7}" stroke-linecap="round"/>` : ''}
    ${label ? `<text x="${c}" y="${fx(c + size * 0.02)}" text-anchor="middle" class="astro-label">${label}</text>` : ''}
  </svg>`;
}

/**
 * facet — āyina-kārī. Shrine interiors are faced in thousands of small mirror
 * shards, so the surface is never one flat plane; it fractures the light.
 * Here that is a set of low-opacity triangles over a panel, and a single
 * specular sweep on tap (motion.js: الوميض). It is the cheapest, most specific
 * "this is a shrine, not a mosque stock photo" cue in the whole system.
 */
export function facetField({ id = 'fc', cells = 17 } = {}) {
  const tri = [];
  for (let i = 0; i < cells; i++) {
    const x = (100 / cells) * i;
    tri.push(`<polygon points="${fx(x)},0 ${fx(x + 100 / cells)},0 ${fx(x + 50 / cells)},100" opacity="${(0.004 + (i % 3) * 0.004).toFixed(3)}"/>`);
    tri.push(`<polygon points="${fx(x + 50 / cells)},0 ${fx(x + 100 / cells)},100 ${fx(x)},100" opacity="${(0.002 + ((i + 1) % 3) * 0.003).toFixed(3)}"/>`);
  }
  return `<svg class="orn orn-facet" id="${id}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false" fill="currentColor">${tri.join('')}</svg>`;
}
