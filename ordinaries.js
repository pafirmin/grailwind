/*
 * Grailwind CSS: ordinaries, e.g. `fess-or`.
 */
import plugin from "tailwindcss/plugin";
import { BETWEEN, FURS, OF_THE_FIRST, ON, TINCTURES, VOIDABLE } from "./data.js";
import { furBackground } from "./furs.js";

// prettier-ignore
const ORDINARIES = {
  pale: [[35, 0], [65, 0], [65, 100], [35, 100]],
  fess: [[0, 30], [100, 30], [100, 60], [0, 60]],
  // Bars that don't touch are one polygon, joined along the shield's dexter edge.
  bar: [[0, 38], [100, 38], [100, 52], [0, 52]],
  "two-bars": [[0, 27], [100, 27], [100, 39], [0, 39], [0, 51], [100, 51], [100, 63], [0, 63]],
  "three-bars": [
    [0, 20], [100, 20], [100, 30], [0, 30], [0, 40], [100, 40],
    [100, 50], [0, 50], [0, 60], [100, 60], [100, 70], [0, 70],
  ],
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
  pile: [[20, 0], [80, 0], [50, 85]],
};

const num = (v) => +v.toFixed(3);
const pct = (v) => (num(v) === 0 ? "0" : `${num(v)}%`);
const point = ([x, y]) => `${pct(x)} ${pct(y)}`;
const polygon = (vertices) => `polygon(${vertices.map(point).join(", ")})`;

const PSEUDO = { chief: "&::after" };

// The chief surmounts a bordure.
const INSET = "var(--bordure-inset)";
const OVER_BORDURE = {
  "--bordure-inset": "inherit",
  inset: `calc(-1 * ${INSET}) calc(-1 * ${INSET}) 0`,
  padding: `${INSET} ${INSET} 0`,
  "background-origin": "content-box",
};
// A vertex on the shield's top or side edges, moved out to the bordure's outer edge.
const outer = ([x, y]) => {
  const ox = x === 0 ? `calc(-1 * ${INSET})` : x === 100 ? `calc(100% + ${INSET})` : pct(x);
  return `${ox} ${y === 0 ? `calc(-1 * ${INSET})` : pct(y)}`;
};

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

// How far each vertex moves, in %, when the sides move out by `distance` (in by a negative one).
// Sides on the shield's edge don't move, so their vertices slide along it.
const widen = (vertices, distance = FIMBRIATION) => {
  const outward = Math.sign(signedArea(vertices));
  const count = vertices.length;
  const line = (i) => {
    const a = vertices[i];
    const b = vertices[(i + 1) % count];
    return offsetLine(a, b, outward, onShieldEdge(a, b) ? 0 : distance);
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

const rotate = (list, start) => [...list.slice(start), ...list.slice(0, start)];

// The ordinary with a hole the shape of it shrunk by `distance`, cut with evenodd.
const voidedPolygon = (vertices, distance) => {
  const offsets = widen(vertices, -distance);
  const inner = vertices.map(([x, y], i) => [x + offsets[i][0], y + offsets[i][1]]);
  // Start and end at the shield's edge so we don't draw through it.
  const edge = vertices.findIndex((v, i) => onShieldEdge(v, vertices[(i + 1) % vertices.length]));
  if (edge === -1) {
    throw new Error("a voided ordinary needs a side on the shield's edge");
  }
  const outerStr = [...rotate(vertices, edge), vertices[edge]].map(point).join(", ");
  const innerStr = [...rotate(inner, edge), inner[edge]].map(point).join(", ");

  return `polygon(evenodd, ${outerStr}, ${innerStr})`;
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
// Half a tile, split on its diagonal, as gradient stops: 0–50% or 50–100%. The one diagonal band
// a tile that isn't square can take, as its diagonal isn't a line of constant x ± y.
const half = (kind, end, tile) => ({ kind, tile, stops: end === "start" ? [0, 50] : [50, 100] });
// A 2px strip down the centre, from the top to `bottom`, where two tiles meet mid-pixel and
// would let the fimbriation show between them. Unsoftened, as it lies on its own tincture.
const seam = (bottom) => ({ kind: "x", tile: [0, 0, 100, bottom], seam: true });
// prettier-ignore
const BANDS = {
  pale: [band("x", 35, 65)],
  fess: [band("y", 30, 60)],
  bar: [band("y", 38, 52)],
  "two-bars": [band("y", 27, 39), band("y", 51, 63)],
  "three-bars": [band("y", 20, 30), band("y", 40, 50), band("y", 60, 70)],
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
  // Each slanted side is its tile's diagonal.
  pile: [half("u-v", "end", [20, 0, 50, 85]), half("u+v", "start", [50, 0, 80, 85]), seam(83)],
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
  if (kind.length > 1 && w !== h) {
    throw new Error("diagonal bands need a square tile");
  }
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

// Soften each edge by a pixel, as hard gradient stops aren't antialiased. A stop at 0 or 100% is
// the tile's own edge, so it isn't softened.
const gradient = (layer, colour) => {
  if (layer.seam) {
    return `linear-gradient(to right, transparent calc(50% - 1px), ${colour} 0 calc(50% + 1px), transparent 0)`;
  }
  const [a, b] = (layer.stops ?? [stop(layer, layer.from), stop(layer, layer.to)]).map(num);
  const from =
    a === 0 ? `${colour} 0` : `transparent calc(${a}% - 0.5px), ${colour} calc(${a}% + 0.5px)`;
  const to = b === 100 ? "100%" : `calc(${b}% - 0.5px), transparent calc(${b}% + 0.5px)`;
  return `linear-gradient(${DIRECTION[layer.kind]}, ${from} ${to})`;
};

const tilePosition = (start, size) => (size === 100 ? "0" : pct((start * 100) / (100 - size)));

const bands = (layers, colour) => ({
  "background-image": layers
    .map((l) => gradient(l, l.stripe ? "var(--fimbriation, transparent)" : colour))
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

// A quarter of the ordinary's width, in real units. The pile tapers, so its is set by eye.
// prettier-ignore
const VOIDS = {
  pale: 7.5, fess: 9, bar: 4.2, bend: 7.7, "bend-sinister": 7.7,
  chevron: 3.8, cross: 5, saltire: 5.8, pall: 5, pile: 8,
};
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

// `extend` moves the sides on the shield's edge out, as `outer` does; the lined sides stay put.
const shape = (vertices, line, scallop, extend) => {
  const inward = signedArea(vertices) > 0 ? "ccw" : "cw";
  const pts = vertices.map(real);
  const straight = vertices.map((v, i) => onShieldEdge(v, vertices[(i + 1) % vertices.length]));
  const edges = pts.map((a, i) => {
    const j = (i + 1) % pts.length;
    return straight[i] ? [{ to: pts[j] }] : line(a, pts[j], scallop, inward);
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

  const commands = edges.flatMap((edge, i) => {
    const segments = edge.map(({ to, r, sweep }) =>
      r
        ? `arc to ${at(to)} of ${pct((r / W) * 100)} ${pct((r / H) * 100)} ${sweep}`
        : `line to ${at(to)}`,
    );
    if (!extend) {
      return segments;
    }
    const outside = straight.at(i - 1);
    if (straight[i]) {
      const out = `line to ${extend(vertices[(i + 1) % vertices.length])}`;
      return outside ? [out] : [`line to ${extend(vertices[i])}`, out];
    }
    return outside ? [`line to ${at(pts[i])}`, ...segments] : segments;
  });
  const from = extend ? extend(vertices[0]) : at(start);
  return `shape(from ${from}, ${commands.join(", ")}, close)`;
};

const betweenVars = ({ size, points, counts = {} }) => {
  const vars = { "--between-size": `${size}%` };
  points.forEach(([left, top], i) => {
    vars[`--between-${i + 1}-x`] = `${left}%`;
    vars[`--between-${i + 1}-y`] = `${top}%`;
  });
  for (const [count, override] of Object.entries(counts)) {
    if (override.size !== undefined) {
      vars[`--between-${count}-size`] = `${override.size}%`;
    }
    override.points.forEach(([left, top], i) => {
      vars[`--between-${count}-${i + 1}-x`] = `${left}%`;
      vars[`--between-${count}-${i + 1}-y`] = `${top}%`;
    });
  }
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

// Every layout var an ordinary sets on its shield, for an inescutcheon or canton to reset.
const layoutVars = () => {
  const allVars = [];

  for (const division of Object.values(BETWEEN)) {
    const vars = betweenVars(division);
    allVars.push(...Object.keys(vars));
  }

  for (const division of Object.values(ON)) {
    const vars = onVars(division);
    allVars.push(...Object.keys(vars));
  }

  const chiefVars = ["--field-top", "--chief-points-y", "--chief-points-size"];
  allVars.push(...chiefVars);

  return [...new Set(allVars)];
};

// Each tincture's class suffix and colour, and "of the first" (see --the-first in grailwind.css).
const PAINTS = [
  ...TINCTURES.map((tincture) => [tincture, `var(--color-${tincture})`]),
  [OF_THE_FIRST, "var(--the-first, transparent)"],
];

export default plugin(({ addBase, addUtilities, theme }) => {
  // Unset on an inescutcheon, a canton or a part of a divided shield, so it can't inherit its
  // shield's layout. In the base layer, so an ordinary on it still sets its own.
  addBase({
    ".inescutcheon, .canton, :is(.escutcheon, .escutcheon *):is(.quarterly, .per-pale, .per-fess) > *":
      Object.fromEntries(layoutVars().map((name) => [name, "initial"])),
  });

  const utilities = {};

  for (const [tincture, colour] of PAINTS) {
    utilities[`.fimbriated-${tincture}`] = {
      "--fimbriated": "1",
      "--fimbriation": colour,
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
    const chief = ordinary === "chief";
    const placed = chief ? OVER_BORDURE : { inset: "var(--field-top, 0%) 0 0" };
    const plain = chief
      ? `polygon(${vertices.map(outer).join(", ")}) content-box`
      : polygon(vertices);
    // Browsers without shape() keep the straight polygon.
    const lined = (line) => [
      plain,
      chief
        ? `${shape(vertices, line, SCALLOP, outer)} content-box`
        : shape(vertices, line, SCALLOPS[ordinary] ?? SCALLOP),
    ];

    // Covers the whole shield, so the swapped field lines up with the real one,
    // and the clip moves the ordinary below any chief instead.
    utilities[`.${ordinary}-counterchanged`] = ordinaryRules(ordinary, {
      ...(chief ? OVER_BORDURE : { inset: "0" }),
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
      // The swapped field's tiles would wrap into the bordure's strips, so the bordure shows there.
      ...(chief && { "background-clip": "content-box" }),
      "clip-path": chief
        ? plain
        : `polygon(${vertices.map(([x, y]) => `${pct(x)} ${belowChief(y)}`).join(", ")})`,
    });

    for (const [tincture, colour] of PAINTS) {
      utilities[`.${ordinary}-${tincture}`] = ordinaryRules(ordinary, {
        ...placed,
        ...(BANDS[ordinary]
          ? {
              "--fimbriated": "inherit",
              "--fimbriation": "inherit",
              "background-color": `var(--fimbriation, ${colour})`,
              ...bands(BANDS[ordinary], colour),
              "clip-path": widenedPolygon(vertices),
            }
          : {
              "background-color": colour,
              "clip-path": plain,
            }),
      });
      // Not fimbriated.
      for (const [name, line] of Object.entries(LINES)) {
        utilities[`.${ordinary}-${name}-${tincture}`] = ordinaryRules(ordinary, {
          ...placed,
          "background-color": colour,
          "clip-path": lined(line),
        });
      }
    }

    // A plain polygon, without the fimbriation vars, so fimbriated-* can't reach a fur ordinary.
    for (const fur of Object.keys(FURS)) {
      const pseudo = { ...placed, ...furBackground(fur, theme) };
      utilities[`.${ordinary}-${fur}`] = ordinaryRules(ordinary, {
        ...pseudo,
        "clip-path": plain,
      });
      for (const [name, line] of Object.entries(LINES)) {
        utilities[`.${ordinary}-${name}-${fur}`] = ordinaryRules(ordinary, {
          ...pseudo,
          "clip-path": lined(line),
        });
      }
    }

    // Not fimbriated.
    if (VOIDABLE.includes(ordinary)) {
      const clip = voidedPolygon(vertices, VOIDS[ordinary]);
      for (const [tincture, colour] of PAINTS) {
        utilities[`.${ordinary}-voided-${tincture}`] = ordinaryRules(ordinary, {
          ...placed,
          "background-color": colour,
          "clip-path": clip,
        });
      }
      for (const fur of Object.keys(FURS)) {
        utilities[`.${ordinary}-voided-${fur}`] = ordinaryRules(ordinary, {
          ...placed,
          ...furBackground(fur, theme),
          "clip-path": clip,
        });
      }
    }
  }

  addUtilities(utilities);
});
