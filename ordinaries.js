/*
 * Grailwind CSS: ordinaries, e.g. `fess-or`.
 */
import plugin from "tailwindcss/plugin";
import { FURS, furBackground } from "./furs.js";

const TINCTURES = ["or", "argent", "gules", "azure", "vert", "purpure", "sable"];

// prettier-ignore
const ORDINARIES = {
  pale: [[35, 0], [65, 0], [65, 100], [35, 100]],
  fess: [[0, 30], [100, 30], [100, 60], [0, 60]],
  bend: [[0, 0], [20, 0], [100, 80], [100, 100], [80, 100], [0, 20]],
  "bend-sinister": [[100, 0], [80, 0], [0, 80], [0, 100], [20, 100], [100, 20]],
  chevron: [[50, 25], [100, 75], [100, 95], [50, 45], [0, 95], [0, 75]],
  cross: [
    [40, 0], [60, 0], [60, 35], [100, 35], [100, 55], [60, 55],
    [60, 100], [40, 100], [40, 55], [0, 55], [0, 35], [40, 35],
  ],
  saltire: [
    [0, 0], [15, 0], [50, 35], [85, 0], [100, 0], [100, 15], [65, 50], [100, 85],
    [100, 100], [85, 100], [50, 65], [15, 100], [0, 100], [0, 85], [35, 50], [0, 15],
  ],
  pall: [
    [0, 0], [15, 0], [50, 35], [85, 0], [100, 0], [100, 15],
    [60, 55], [60, 100], [40, 100], [40, 55], [0, 15],
  ],
  chief: [[0, 0], [100, 0], [100, 30], [0, 30]],
};

const num = (v) => +v.toFixed(3);
const pct = (v) => (num(v) === 0 ? "0" : `${num(v)}%`);
const point = ([x, y]) => `${pct(x)} ${pct(y)}`;
const polygon = (vertices) => `polygon(${vertices.map(point).join(", ")})`;

const PSEUDO = { chief: "&::after" };

// A y in % of the field, as % of the whole shield when a chief takes the top of it.
const belowChief = (y) =>
  y === 100 ? "100%" : `calc(${num(y)}% + var(--field-top, 0%) * ${num(1 - y / 100)})`;

// Fimbriation: the ordinary's clip is widened and filled with the fimbriation
// tincture, and the ordinary's own tincture is painted over it as gradient
// bands.
const W = 100;
const H = 120;
const FIMBRIATION = 3;

const real = ([x, y]) => [(x * W) / 100, (y * H) / 100];
const onShieldEdge = (a, b) =>
  (a[0] === b[0] && (a[0] === 0 || a[0] === 100)) ||
  (a[1] === b[1] && (a[1] === 0 || a[1] === 100));
const signedArea = (vertices) =>
  vertices.reduce((sum, [x1, y1], i) => {
    const [x2, y2] = vertices[(i + 1) % vertices.length];
    return sum + x1 * y2 - x2 * y1;
  }, 0) / 2;

// The edge a→b as a line n·p = c, moved outward by `distance` real units.
const offsetLine = (a, b, outward, distance) => {
  const [ax, ay] = real(a);
  const [bx, by] = real(b);
  const length = Math.hypot(bx - ax, by - ay);
  const n = [(outward * (by - ay)) / length, (outward * (ax - bx)) / length];
  return { n, c: n[0] * ax + n[1] * ay + distance };
};

// How far each vertex moves, in %, when fimbriated. Sides on the shield's edge
// don't move, so their vertices slide along it.
const widen = (vertices) => {
  const outward = Math.sign(signedArea(vertices));
  const count = vertices.length;
  const line = (i) => {
    const a = vertices[i];
    const b = vertices[(i + 1) % count];
    return offsetLine(a, b, outward, onShieldEdge(a, b) ? 0 : FIMBRIATION);
  };
  return vertices.map((v, i) => {
    const p = line((i - 1 + count) % count);
    const q = line(i);
    const det = p.n[0] * q.n[1] - p.n[1] * q.n[0];
    const [x, y] = [(p.c * q.n[1] - q.c * p.n[1]) / det, (p.n[0] * q.c - q.n[0] * p.c) / det];
    const [rx, ry] = real(v);
    return [((x - rx) * 100) / W, ((y - ry) * 100) / H];
  });
};

const shift = (v, d) =>
  num(d) === 0
    ? pct(v)
    : `calc(${num(v)}% ${d < 0 ? "-" : "+"} ${num(Math.abs(d))}% * var(--fimbriated, 0))`;
const widenedPolygon = (vertices) => {
  const offsets = widen(vertices);
  const points = vertices.map(
    ([x, y], i) => `${shift(x, offsets[i][0])} ${shift(y, offsets[i][1])}`,
  );
  return `polygon(${points.join(", ")})`;
};

// The ordinary's tincture, top layer first. `x`/`y` bands run between two x or y
// values in %; `u-v`/`u+v` are diagonal, between values of x − y or x + y.
// A `tile` [x0, y0, x1, y1] confines a layer to part of the box (square, if
// diagonal). Stripes repaint the fimbriation where one arm's band runs on into
// another's.
const S = 12;
const band = (kind, from, to, tile) => ({ kind, from, to, tile });
const stripe = (kind, from, to, tile) => ({ kind, from, to, tile, stripe: true });
// prettier-ignore
const BANDS = {
  pale: [band("x", 35, 65)],
  fess: [band("y", 30, 60)],
  bend: [band("u-v", -20, 20)],
  "bend-sinister": [band("u+v", 80, 120)],
  chevron: [
    stripe("u+v", 75 - S, 75),
    stripe("u-v", 25, 25 + S),
    band("u+v", 75, 95),
    band("u-v", 5, 25),
  ],
  cross: [band("x", 40, 60), band("y", 35, 55)],
  saltire: [band("u-v", -15, 15), band("u+v", 85, 115)],
  pall: [
    stripe("x", 60, 60 + S, [0, 55, 100, 100]),
    stripe("x", 40 - S, 40, [0, 55, 100, 100]),
    stripe("u+v", 115, 115 + S, [60, 30, 100, 70]),
    stripe("u-v", -15 - S, -15, [0, 30, 40, 70]),
    band("u-v", -15, 15),
    band("u+v", 85, 115),
    band("x", 40, 60, [0, 55, 100, 100]),
  ],
};

const DIRECTION = {
  x: "to right",
  y: "to bottom",
  "u-v": "to top right",
  "u+v": "to bottom right",
};

// A band's edges as % along its gradient, within its tile.
const stop = ({ kind, tile: [x0, y0, x1, y1] = [0, 0, 100, 100] }, value) => {
  const w = x1 - x0;
  const h = y1 - y0;
  if (kind.length > 1 && w !== h) throw new Error("diagonal bands need a square tile");
  switch (kind) {
    case "x":
      return ((value - x0) * 100) / w;
    case "y":
      return ((value - y0) * 100) / h;
    case "u-v":
      return ((value - (x0 - y0)) * 100) / w / 2 + 50;
    case "u+v":
      return ((value - x0 - y0) * 100) / w / 2;
  }
};

// Soften each edge by a pixel, as hard gradient stops aren't antialiased.
const gradient = (layer, colour) => {
  const a = num(stop(layer, layer.from));
  const b = num(stop(layer, layer.to));
  return (
    `linear-gradient(${DIRECTION[layer.kind]}, transparent calc(${a}% - 0.5px), ` +
    `${colour} calc(${a}% + 0.5px) calc(${b}% - 0.5px), transparent calc(${b}% + 0.5px))`
  );
};

const tilePosition = (start, size) => (size === 100 ? "0" : pct((start * 100) / (100 - size)));

const bands = (layers, tincture) => ({
  "background-image": layers
    .map((l) =>
      gradient(l, l.stripe ? "var(--fimbriation, transparent)" : `var(--color-${tincture})`),
    )
    .join(", "),
  "background-size": layers
    .map(({ tile: [x0, y0, x1, y1] = [0, 0, 100, 100] }) => `${pct(x1 - x0)} ${pct(y1 - y0)}`)
    .join(", "),
  "background-position": layers
    .map(
      ({ tile: [x0, y0, x1, y1] = [0, 0, 100, 100] }) =>
        `${tilePosition(x0, x1 - x0)} ${tilePosition(y0, y1 - y0)}`,
    )
    .join(", "),
  "background-repeat": "no-repeat",
});

// Lines of partition. Scallops are round on the 5:6 shield; below a chief the
// box is shorter, so they are slightly squashed.
const SCALLOP = 14;
const SCALLOPS = { chevron: 10 };
const DEPTH = 0.35;

const at = ([x, y]) => point([(x * 100) / W, (y * 100) / H]);

// Arcs along an edge, in real units: { to, r, sweep }.
const arcs = (a, b, scallop, sweep) => {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.round(length / scallop));
  const chord = length / n;
  const depth = chord * DEPTH;
  const r = (chord * chord) / 4 / (2 * depth) + depth / 2;
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / n;
    return { to: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], r, sweep };
  });
};

// Each line maps an edge to arcs; `inward` is the sweep that bulges into the ordinary.
const LINES = {
  engrailed: (a, b, scallop, inward) => arcs(a, b, scallop, inward),
  invected: (a, b, scallop, inward) => arcs(a, b, scallop, inward === "cw" ? "ccw" : "cw"),
};

const side = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

// Centre of the minor arc from a to b.
const centre = (a, b, { r, sweep }) => {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const len = Math.hypot(dx, dy);
  const k = Math.sqrt(Math.max(0, r * r - (len / 2) ** 2)) * (sweep === "cw" ? 1 : -1);
  return [(a[0] + b[0]) / 2 - (k * dy) / len, (a[1] + b[1]) / 2 + (k * dx) / len];
};

// Where the arc a→v crosses the arc v→b, if it does. Two circles through v meet
// again at v's reflection across the line between their centres.
const crossing = (a, v, b, first, second) => {
  const c1 = centre(a, v, first);
  const c2 = centre(v, b, second);
  const [dx, dy] = [c2[0] - c1[0], c2[1] - c1[1]];
  const t = ((v[0] - c1[0]) * dx + (v[1] - c1[1]) * dy) / (dx * dx + dy * dy);
  const p = [2 * (c1[0] + t * dx) - v[0], 2 * (c1[1] + t * dy) - v[1]];
  const onArc = (from, to, c) => Math.sign(side(from, to, p)) === -Math.sign(side(from, to, c));
  return Math.hypot(p[0] - v[0], p[1] - v[1]) > 1e-6 && onArc(a, v, c1) && onArc(v, b, c2)
    ? p
    : null;
};

const shape = (vertices, line, scallop) => {
  const inward = signedArea(vertices) > 0 ? "ccw" : "cw";
  const pts = vertices.map(real);
  const edges = pts.map((a, i) => {
    const j = (i + 1) % pts.length;
    return onShieldEdge(vertices[i], vertices[j])
      ? [{ to: pts[j] }]
      : line(a, pts[j], scallop, inward);
  });

  // Where arcs cross at a corner, e.g. a chevron engrailed's peak, end both at the
  // crossing; otherwise the loop beyond it is filled.
  let start = pts[0];
  edges.forEach((edge, i) => {
    const last = edge.at(-1);
    const first = edges[(i + 1) % edges.length][0];
    if (!last.r || !first.r) {
      return;
    }
    const from = edge.length > 1 ? edge.at(-2).to : pts[i];
    const p = crossing(from, last.to, first.to, last, first);
    if (!p) {
      return;
    }
    last.to = p;
    if (i === edges.length - 1) {
      start = p;
    }
  });

  const commands = edges
    .flat()
    .map(({ to, r, sweep }) =>
      r
        ? `arc to ${at(to)} of ${pct((r / W) * 100)} ${pct((r / H) * 100)} ${sweep}`
        : `line to ${at(to)}`,
    );
  return `shape(from ${at(start)}, ${commands.join(", ")}, close)`;
};

// Where charges go for "between", as [left%, top%], plus their size as % of width.
// prettier-ignore
const BETWEEN = {
  pale: { size: 18, points: [[18, 42], [82, 42]] },
  fess: { size: 20, points: [[30, 15], [70, 15], [50, 78]] },
  bend: { size: 24, points: [[70, 26], [30, 68]] },
  "bend-sinister": { size: 24, points: [[30, 26], [70, 68]] },
  chevron: { size: 22, points: [[24, 22], [76, 22], [50, 70]] },
  cross: { size: 18, points: [[20, 17], [80, 17], [24, 72], [76, 72]] },
  saltire: { size: 16, points: [[50, 13], [14, 50], [86, 50], [50, 84]] },
  pall: { size: 18, points: [[50, 11], [18, 56], [82, 56]] },
};

// Where charges go for "on", along the ordinary's centre line, by number of charges.
// prettier-ignore
const ON = {
  pale: { size: 20, counts: { 1: [[50, 45]], 2: [[50, 28], [50, 62]], 3: [[50, 18], [50, 45], [50, 72]] } },
  fess: { size: 22, counts: { 1: [[50, 45]], 2: [[30, 45], [70, 45]], 3: [[20, 45], [50, 45], [80, 45]] } },
  bend: { size: 18, counts: { 1: [[50, 50]], 2: [[33, 33], [67, 67]], 3: [[24, 24], [50, 50], [76, 76]] } },
  "bend-sinister": { size: 18, counts: { 1: [[50, 50]], 2: [[67, 33], [33, 67]], 3: [[76, 24], [50, 50], [24, 76]] } },
  chevron: { size: 12, counts: { 1: [[50, 36]], 3: [[20, 65], [50, 36], [80, 65]] } },
  cross: { size: 15, counts: { 1: [[50, 45]], 5: [[50, 15], [18, 45], [50, 45], [82, 45], [50, 80]] } },
  saltire: { size: 14, counts: { 1: [[50, 50]], 5: [[22, 22], [78, 22], [50, 50], [22, 78], [78, 78]] } },
  pall: { size: 14, counts: { 1: [[50, 50]], 3: [[22, 22], [78, 22], [50, 75]] } },
};

const betweenVars = ({ size, points }) => {
  const vars = { "--between-size": `${size}%` };
  points.forEach(([left, top], i) => {
    vars[`--between-${i + 1}-x`] = `${left}%`;
    vars[`--between-${i + 1}-y`] = `${top}%`;
  });
  return vars;
};

const onVars = ({ size, counts }) => {
  const vars = { "--on-size": `${size}%` };
  for (const [count, points] of Object.entries(counts)) {
    points.forEach(([left, top], i) => {
      vars[`--on-${count}-${i + 1}-x`] = `${left}%`;
      vars[`--on-${count}-${i + 1}-y`] = `${top}%`;
    });
  }
  return vars;
};

export default plugin(({ addUtilities, theme }) => {
  const utilities = {};

  for (const tincture of TINCTURES) {
    utilities[`.fimbriated-${tincture}`] = {
      "--fimbriated": "1",
      "--fimbriation": `var(--color-${tincture})`,
    };
  }

  // Isolated, so an ordinary in a quarter paints under the shield's own ordinary.
  // The chief's ::after stays unraised, so charges on it stay on top.
  const ordinaryRules = (ordinary, pseudo) => ({
    position: "relative",
    isolation: "isolate",
    ...(BETWEEN[ordinary] && betweenVars(BETWEEN[ordinary])),
    ...(ON[ordinary] && onVars(ON[ordinary])),
    // With a chief, everything else is drawn in the field below it.
    ...(ordinary === "chief" && {
      "--field-top": "30%",
      // The chief's centre line, relative to the charges container below it.
      "--chief-points-y": "calc(-15% / 0.7)",
      "--chief-points-size": "18%",
    }),
    [PSEUDO[ordinary] ?? "&::before"]: {
      content: '""',
      position: "absolute",
      ...(!PSEUDO[ordinary] && { "z-index": "1" }),
      ...pseudo,
    },
  });

  for (const [ordinary, vertices] of Object.entries(ORDINARIES)) {
    // Covers the whole shield, so the swapped field lines up with the real one,
    // and the clip moves the ordinary below any chief instead.
    utilities[`.${ordinary}-counterchanged`] = ordinaryRules(ordinary, {
      inset: "0",
      // Registered not to inherit, so a shield inside another can't pick up its swap.
      ...Object.fromEntries(
        ["color", "image", "size", "position", "repeat"].map((n) => [
          `--counterchange-${n}`,
          "inherit",
        ]),
      ),
      "background-color": "var(--counterchange-color, transparent)",
      "background-image": "var(--counterchange-image, none)",
      "background-size": "var(--counterchange-size, auto)",
      "background-position": "var(--counterchange-position, 0 0)",
      "background-repeat": "var(--counterchange-repeat, repeat)",
      "clip-path":
        ordinary === "chief"
          ? polygon(vertices)
          : `polygon(${vertices.map(([x, y]) => `${pct(x)} ${belowChief(y)}`).join(", ")})`,
    });

    for (const tincture of TINCTURES) {
      utilities[`.${ordinary}-${tincture}`] = ordinaryRules(ordinary, {
        inset: ordinary === "chief" ? "0" : "var(--field-top, 0%) 0 0",
        ...(BANDS[ordinary]
          ? {
              "--fimbriated": "inherit",
              "--fimbriation": "inherit",
              "background-color": `var(--fimbriation, var(--color-${tincture}))`,
              ...bands(BANDS[ordinary], tincture),
              "clip-path": widenedPolygon(vertices),
            }
          : {
              "background-color": `var(--color-${tincture})`,
              "clip-path": polygon(vertices),
            }),
      });
      // Not fimbriated. Browsers without shape() keep the straight polygon.
      for (const [name, line] of Object.entries(LINES)) {
        utilities[`.${ordinary}-${name}-${tincture}`] = ordinaryRules(ordinary, {
          inset: ordinary === "chief" ? "0" : "var(--field-top, 0%) 0 0",
          "background-color": `var(--color-${tincture})`,
          "clip-path": [polygon(vertices), shape(vertices, line, SCALLOPS[ordinary] ?? SCALLOP)],
        });
      }
    }

    // A plain polygon, without the fimbriation vars, so fimbriated-* can't reach a fur ordinary.
    for (const fur of Object.keys(FURS)) {
      const pseudo = {
        inset: ordinary === "chief" ? "0" : "var(--field-top, 0%) 0 0",
        ...furBackground(fur, theme),
      };
      utilities[`.${ordinary}-${fur}`] = ordinaryRules(ordinary, {
        ...pseudo,
        "clip-path": polygon(vertices),
      });
      for (const [name, line] of Object.entries(LINES)) {
        utilities[`.${ordinary}-${name}-${fur}`] = ordinaryRules(ordinary, {
          ...pseudo,
          "clip-path": [polygon(vertices), shape(vertices, line, SCALLOPS[ordinary] ?? SCALLOP)],
        });
      }
    }
  }

  addUtilities(utilities);
});
