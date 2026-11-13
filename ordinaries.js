/*
 * Grailwind CSS: ordinaries, e.g. `fess-or`.
 */
import plugin from "tailwindcss/plugin";
import {
  BETWEEN,
  BETWEEN_LINED,
  CHARGES,
  FURS,
  LINES as LINE_NAMES,
  lineOrdinaries,
  OF_THE_FIRST,
  ON,
  ON_SCALE,
  REVERSIBLE,
  TINCTURES,
  VOIDABLE,
} from "./data.js";
import { furBackground } from "./furs.js";
import { PATHS } from "./paths.js";

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
  chevron: [[50, 22], [100, 72], [100, 98], [50, 48], [0, 98], [0, 72]],
  cross: [
    [38, 0], [62, 0], [62, 35], [100, 35], [100, 55], [62, 55],
    [62, 100], [38, 100], [38, 55], [0, 55], [0, 35], [38, 35],
  ],
  // Its centre lines run from the top corners through the fess point, reaching the flanks at 90%.
  saltire: [
    [0, 0], [16.35, 0], [50, 30.28], [83.65, 0], [100, 0], [100, 14.72], [66.35, 45], [100, 75.28],
    [100, 100], [94.76, 100], [50, 59.72], [5.24, 100], [0, 100], [0, 75.28], [33.65, 45], [0, 14.72],
  ],
  // Its arms and foot are 24 across, the arms' centre lines running from the top corners to (50, 40).
  pall: [
    [0, 0], [17.33, 0], [50, 26.14], [82.67, 0], [100, 0], [100, 13.86],
    [62, 44.26], [62, 100], [38, 100], [38, 44.26], [0, 13.86],
  ],
  chief: [[0, 0], [100, 0], [100, 30], [0, 30]],
  pile: [[17, 0], [83, 0], [50, 85]],
};
// signedArea() follows the flip's winding, so the order stays.
for (const ordinary of REVERSIBLE) {
  ORDINARIES[`${ordinary}-reversed`] = ORDINARIES[ordinary].map(([x, y]) => [x, 100 - y]);
}

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
const pointBelowChief = ([x, y]) => `${pct(x)} ${belowChief(y)}`;

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
const voidedPolygon = (vertices, distance, format = point) => {
  const offsets = widen(vertices, -distance);
  const inner = vertices.map(([x, y], i) => [x + offsets[i][0], y + offsets[i][1]]);
  // Start and end at the shield's edge so we don't draw through it.
  const edge = vertices.findIndex((v, i) => onShieldEdge(v, vertices[(i + 1) % vertices.length]));
  if (edge === -1) {
    throw new Error("a voided ordinary needs a side on the shield's edge");
  }
  const outerStr = [...rotate(vertices, edge), vertices[edge]].map(format).join(", ");
  const innerStr = [...rotate(inner, edge), inner[edge]].map(format).join(", ");

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
// diagonal, unless `half` or `diagonal` gives its stops). Stripes repaint the
// fimbriation where one arm's band runs on into another's.
const S = 12;
const band = (kind, from, to, tile) => ({ kind, from, to, tile });
const stripe = (kind, from, to, tile) => ({ kind, from, to, tile, stripe: true });
// Half a tile, split on its diagonal, as gradient stops: 0–50% or 50–100%. For a tile that isn't
// square, whose diagonal isn't a line of constant x ± y.
const half = (kind, end, tile) => ({ kind, tile, stops: end === "start" ? [0, 50] : [50, 100] });
// A band `halfWidth` real units either side of a tile's diagonal, for an arm that isn't a line of
// constant x ± y: `u-v` runs from the tile's top left, `u+v` from its top right.
const diagonal = (kind, halfWidth, tile) => {
  const [w, h] = real([tile[2] - tile[0], tile[3] - tile[1]]);
  const length = (2 * w * h) / Math.hypot(w, h);
  const offset = (halfWidth / length) * 100;

  return {
    kind,
    tile,
    stops: [50 - offset, 50 + offset],
  };
};
// The saltire's arms are the diagonals of a tile as tall as the shield, sloping through (50, 45).
const SALTIRE_TILE = (100 * 50) / 45;
// The pall's arms are the diagonals of a tile reaching down to the foot's corners, through (50, 40).
const PALL_TILE_H = 44.26;
const PALL_TILE_W = (PALL_TILE_H * 50) / 40;
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
    stripe("u+v", 72 - S, 72),
    stripe("u-v", 28, 28 + S),
    band("u+v", 72, 98),
    band("u-v", 2, 28),
  ],
  cross: [band("x", 38, 62), band("y", 35, 55)],
  saltire: [
    diagonal("u-v", 12, [0, 0, SALTIRE_TILE, 100]),
    diagonal("u+v", 12, [100 - SALTIRE_TILE, 0, 100, 100]),
  ],
  pall: [
    diagonal("u-v", 12, [0, 0, PALL_TILE_W, PALL_TILE_H]),
    diagonal("u+v", 12, [100 - PALL_TILE_W, 0, 100, PALL_TILE_H]),
    band("x", 38, 62, [0, 40, 100, 100]),
  ],
  // Each slanted side is its tile's diagonal.
  pile: [half("u-v", "end", [17, 0, 50, 85]), half("u+v", "start", [50, 0, 83, 85]), seam(83)],
};

// The bands upside down. A diagonal swaps kind, as x − y becomes x + (100 − y) − 100. A half's
// stops stay: its 50% line is the flipped tile's other diagonal, which is the flipped side.
const reverseBand = ({ kind, from, to, tile, ...rest }) => {
  const layer = { ...rest, tile: tile && [tile[0], 100 - tile[3], tile[2], 100 - tile[1]] };
  if (from === undefined) {
    return { ...layer, kind: { "u-v": "u+v", "u+v": "u-v" }[kind] ?? kind };
  }
  switch (kind) {
    case "x":
      return { ...layer, kind, from, to };
    case "y":
      return { ...layer, kind, from: 100 - to, to: 100 - from };
    case "u-v":
      return { ...layer, kind: "u+v", from: from + 100, to: to + 100 };
    case "u+v":
      return { ...layer, kind: "u-v", from: from - 100, to: to - 100 };
  }
};
for (const ordinary of REVERSIBLE) {
  BANDS[`${ordinary}-reversed`] = BANDS[ordinary].map(reverseBand);
}

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
// Wavy half-waves, longer where the default reads as beads: the bend, cross and cornered ordinaries.
// prettier-ignore
const WAVES = {
  bend: 21, "bend-sinister": 21, cross: 20,
  chevron: 28, saltire: 28, pall: 28,
};
const LENGTHS = { wavy: WAVES };

// A quarter of the ordinary's width, in real units. The pile tapers, so its is set by eye.
// prettier-ignore
const VOIDS = {
  pale: 7.5, fess: 9, bar: 4.2, bend: 7.7, "bend-sinister": 7.7,
  chevron: 5, cross: 6, saltire: 6, pall: 6, pile: 8.8,
};
for (const ordinary of REVERSIBLE) {
  if (SCALLOPS[ordinary]) {
    SCALLOPS[`${ordinary}-reversed`] = SCALLOPS[ordinary];
  }
  if (WAVES[ordinary]) {
    WAVES[`${ordinary}-reversed`] = WAVES[ordinary];
  }
  VOIDS[`${ordinary}-reversed`] = VOIDS[ordinary];
}
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

const WAVE_DEPTH = 0.2;

// Which way half-wave `index` bulges, for an edge walked along the shared axis (`forward`) or
// against it. Along the axis, `cw` bulges to its left: up for a horizontal edge.
const waveSweep = (index, forward) => {
  return forward === (index % 2 === 0) ? "cw" : "ccw";
};

// The edge a→b cut at every multiple of `period` along a shared axis, so the parallel edges of a
// band are cut at the same places whichever way the polygon walks them. Each piece runs from
// `start` to `end` (fractions of the edge) and lies in period `index`.
const stations = (a, b, period) => {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const length = Math.hypot(dx, dy);
  // Right, or down for a vertical edge, whichever way the polygon walks it.
  const forward = Math.abs(dx) > 1e-9 ? dx > 0 : dy > 0;
  const axis = (forward ? [dx, dy] : [-dx, -dy]).map((d) => d / length);
  const station = (p) => p[0] * axis[0] + p[1] * axis[1];
  const [from, to] = [station(a), station(b)];

  const ts = [0, 1];
  const [low, high] = [Math.min(from, to), Math.max(from, to)];
  for (let cut = Math.ceil(low / period); cut * period < high; cut++) {
    const t = (cut * period - from) / (to - from);
    if (t > 1e-6 && t < 1 - 1e-6) {
      ts.push(t);
    }
  }
  ts.sort((x, y) => x - y);

  const pieces = ts.slice(1).map((end, i) => {
    const middle = (ts[i] + end) / 2;
    return { start: ts[i], end, index: Math.floor((from + (to - from) * middle) / period) };
  });
  return { forward, axis, length, pieces };
};

// One arc per half-wave, phased by position along a shared axis rather than from the edge's
// start, so the two edges of a band crest together.
const wavy = (a, b, halfWave) => {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const { forward, length, pieces } = stations(a, b, halfWave);
  return pieces.map(({ start, end, index }) => {
    const chord = length * (end - start);
    // As high as a default wave whatever the length, so a longer wave is gentler, not deeper.
    const depth = chord * WAVE_DEPTH * (SCALLOP / halfWave);
    return {
      to: [a[0] + dx * end, a[1] + dy * end],
      r: (chord * chord) / (8 * depth) + depth / 2,
      sweep: waveSweep(index, forward),
    };
  });
};

// The unit normal of a→b pointing into the ordinary. An arc swept `inward` bulges that way.
const intoOrdinary = (a, b, inward) => {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const length = Math.hypot(dx, dy);
  return inward === "cw" ? [dy / length, -dx / length] : [-dy / length, dx / length];
};

const INDENT_DEPTH = 0.5;
// Seven whole teeth across the shield, so both ends land on the same kind of turn.
const TOOTH = W / 7;

// A zigzag centred on the edge, its turns at the shared stations, so a band's two edges run in
// phase, point opposite notch (FD Figs. 91, 106). At 0.5 deep the teeth are right-angled.
const indented = (a, b, scallop) => {
  const half = scallop / 2;
  const { axis, pieces } = stations(a, b, half);
  const normal = [-axis[1], axis[0]];
  const height = (scallop * INDENT_DEPTH) / 2;
  // Even turns sit on one side and odd ones on the other; between them the zigzag is straight.
  const turnSide = (turn) => (turn % 2 === 0 ? height : -height);
  const onZigzag = (t) => {
    const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const position = (p[0] * axis[0] + p[1] * axis[1]) / half;
    const before = Math.floor(position);
    const blend = position - before;
    const side = turnSide(before) * (1 - blend) + turnSide(before + 1) * blend;
    return { to: [p[0] + normal[0] * side, p[1] + normal[1] * side] };
  };
  // Start and end on the zigzag itself, not on the plain line, so it meets the shield's edge at
  // its true angle.
  return [onZigzag(0), ...pieces.map(({ end }) => onZigzag(end)), { to: b }];
};

// A merlon or crenel's width, and the battlements' height, in real units. An odd number across
// the shield's width, so a fess or chief has a merlon at both ends.
const BATTLEMENT = W / 15;
const BATTLEMENT_HEIGHT = 6;
// Embattled on the upper edge only (FD p. 93); the rest on every edge.
// prettier-ignore
const UPPER_ONLY = [
  "fess", "bar", "two-bars", "three-bars", "bend", "bend-sinister", "chevron", "chevron-reversed",
];

// Battlements centred on the edge, in phase across a band like `wavy`, but merlon opposite
// merlon: a piece's side is taken from the ordinary, not from the shield.
const embattled = (a, b, merlon, inward, ordinary) => {
  const into = intoOrdinary(a, b, inward);
  // Upper-only ordinaries keep the edges whose outside doesn't face up plain.
  if (UPPER_ONLY.includes(ordinary) && into[1] < 1e-8) {
    return [{ to: b }];
  }
  const { pieces } = stations(a, b, merlon);
  const along = (t, [ox, oy]) => [a[0] + (b[0] - a[0]) * t + ox, a[1] + (b[1] - a[1]) * t + oy];
  // Even pieces are merlons, out of the ordinary; odd ones crenels, into it.
  const offset = (index) => {
    const shift = (index % 2 === 0 ? -1 : 1) * (BATTLEMENT_HEIGHT / 2);
    return [into[0] * shift, into[1] * shift];
  };
  return [
    ...pieces.flatMap(({ start, end, index }) => {
      const off = offset(index);
      return [{ to: along(start, off) }, { to: along(end, off) }];
    }),
    { to: b },
  ];
};

// Each line maps an edge to segments, arcs or straight; `inward` is the sweep that bulges into
// the ordinary.
const LINES = {
  engrailed: (a, b, scallop, inward) => arcs(a, b, scallop, inward),
  invected: (a, b, scallop, inward) => arcs(a, b, scallop, inward === "cw" ? "ccw" : "cw"),
  wavy: (a, b, scallop) => wavy(a, b, scallop),
  indented: (a, b) => indented(a, b, TOOTH),
  embattled: (a, b, scallop, inward, ordinary) => embattled(a, b, BATTLEMENT, inward, ordinary),
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

// The lined edges of `vertices` as arcs and lines in real units, and where the shape starts.
const outline = (vertices, line, scallop) => {
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
  return { pts, straight, edges, start };
};

// `extend` moves the sides on the shield's edge out, as `outer` does; the lined sides stay put.
const shape = (vertices, line, scallop, extend) => {
  const { pts, straight, edges, start } = outline(vertices, line, scallop);
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

// An outline as an SVG path, in real units. y points down in both, so cw is sweep-flag 1.
const svgPath = ({ edges, start }) => {
  const parts = [`M ${num(start[0])} ${num(start[1])}`];
  for (const { to, r, sweep } of edges.flat()) {
    const [x, y] = [num(to[0]), num(to[1])];
    parts.push(r ? `A ${num(r)} ${num(r)} 0 0 ${sweep === "cw" ? 1 : 0} ${x} ${y}` : `L ${x} ${y}`);
  }
  return `${parts.join(" ")} Z`;
};

// The generator's lined ordinary, e.g. `generated("pile", "engrailed")`: the arguments for
// `outline()` and `shape()`.
const generated = (ordinary, name) => [
  ORDINARIES[ordinary],
  (a, b, scallop, inward) => LINES[name](a, b, scallop, inward, ordinary),
  (LENGTHS[name] ?? SCALLOPS)[ordinary] ?? SCALLOP,
];
const draftOutline = (ordinary, name) => outline(...generated(ordinary, name));
const generatedShape = (ordinary, name) => shape(...generated(ordinary, name));

// Drawn shapes are segments in real units: ["M", x, y], ["L", x, y], ["C", x1, y1, x2, y2, x, y],
// ["A", rx, ry, rotation, large, sweep, x, y] and ["Z"].
const pathShape = (segments) => {
  const [, startX, startY] = segments[0];
  const commands = segments.slice(1).map(([command, ...n]) => {
    switch (command) {
      case "L":
        return `line to ${at([n[0], n[1]])}`;
      case "C":
        return `curve to ${at([n[4], n[5]])} with ${at([n[0], n[1]])} / ${at([n[2], n[3]])}`;
      case "A": {
        const [rx, ry, rotation, large, sweep, x, y] = n;
        return [
          `arc to ${at([x, y])} of ${pct((rx * 100) / W)} ${pct((ry * 100) / H)}`,
          sweep ? "cw" : "ccw",
          large ? "large" : "",
          rotation ? `rotate ${rotation}deg` : "",
        ]
          .filter(Boolean)
          .join(" ");
      }
      case "Z":
        return "close";
      default:
        throw new Error(`unknown path command ${command}`);
    }
  });
  const last = commands.pop();
  if (last !== "close") {
    throw new Error("a drawn path must end with Z");
  }
  return `shape(from ${at([startX, startY])}, ${commands.join(", ")}, close)`;
};

// The same shape upside down, for an ordinary's reversed form.
const flipPath = (segments) =>
  segments.map(([command, ...n]) => {
    switch (command) {
      case "M":
      case "L":
        return [command, n[0], H - n[1]];
      case "C":
        return [command, n[0], H - n[1], n[2], H - n[3], n[4], H - n[5]];
      case "A":
        return [command, n[0], n[1], n[2] ? -n[2] : 0, n[3], n[4] ? 0 : 1, n[5], H - n[6]];
      default:
        return [command];
    }
  });

// Drawn shapes by `ordinary-line`, each reversible one also upside down as `ordinary-reversed-line`
// unless it was drawn too. Upper-only battlements would flip onto the lower edges, so those aren't.
const DRAWN = { ...PATHS };
for (const key of Object.keys(PATHS)) {
  const name = LINE_NAMES.find((line) => key.endsWith(`-${line}`));
  const ordinary = key.slice(0, -name.length - 1);
  const reversedKey = `${ordinary}-reversed-${name}`;
  const upperOnly = name === "embattled" && UPPER_ONLY.includes(ordinary);
  if (REVERSIBLE.includes(ordinary) && !upperOnly && !(reversedKey in PATHS)) {
    DRAWN[reversedKey] = flipPath(PATHS[key]);
  }
}

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

// The plain ordinary's `between` layout, with a line's overrides on top.
const mergeLined = (ordinary, line) => {
  const plain = BETWEEN[ordinary];
  const lined = BETWEEN_LINED[ordinary]?.[line];
  return lined ? { ...plain, ...lined, counts: { ...plain.counts, ...lined.counts } } : plain;
};

const onVars = ({ size, counts }, scale = 1) => {
  const vars = { "--on-size": `${+(size * scale).toFixed(2)}%` };
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

  for (const [ordinary, lines] of Object.entries(BETWEEN_LINED)) {
    for (const line of Object.keys(lines)) {
      allVars.push(...Object.keys(betweenVars(mergeLined(ordinary, line))));
    }
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

export { draftOutline, DRAWN, flipPath, generatedShape, ORDINARIES, pathShape, svgPath };

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
  const ordinaryRules = (ordinary, pseudo, line) => ({
    position: "relative",
    isolation: "isolate",
    ...(BETWEEN[ordinary] && betweenVars(mergeLined(ordinary, line))),
    ...(ON[ordinary] && onVars(ON[ordinary], ON_SCALE[line] ?? 1)),
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
    const lined = (name, line) => {
      const edge = (a, b, scallop, inward) => line(a, b, scallop, inward, ordinary);
      const drawn = DRAWN[`${ordinary}-${name}`];
      return [
        plain,
        chief
          ? `${shape(vertices, edge, SCALLOP, outer)} content-box`
          : drawn
            ? pathShape(drawn)
            : shape(vertices, edge, (LENGTHS[name] ?? SCALLOPS)[ordinary] ?? SCALLOP),
      ];
    };

    // Covers the whole shield, so the swapped field lines up with the real one,
    // and the clip moves the ordinary below any chief instead.
    const counterchanged = {
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
    };
    // Charges on it are counterchanged against it, so they get the field's own tinctures.
    utilities[`.${ordinary}-counterchanged`] = {
      ...ordinaryRules(ordinary, {
        ...counterchanged,
        "clip-path": chief ? plain : `polygon(${vertices.map(pointBelowChief).join(", ")})`,
      }),
      "--on-counterchange-color": "transparent",
      ...Object.fromEntries(
        ["image", "size", "position", "repeat"].map((n) => [
          `--on-counterchange-${n}`,
          `var(--field-${n})`,
        ]),
      ),
    };

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
        if (!lineOrdinaries(name).includes(ordinary)) {
          continue;
        }
        utilities[`.${ordinary}-${name}-${tincture}`] = ordinaryRules(
          ordinary,
          {
            ...placed,
            "background-color": colour,
            "clip-path": lined(name, line),
          },
          name,
        );
      }
    }

    // A plain polygon, without the fimbriation vars, so fimbriated-* can't reach a fur ordinary.
    for (const fur of Object.keys(FURS)) {
      const pseudo = { ...placed, ...furBackground(fur, theme) };
      // `cross-potent` is the charge, not a cross of the fur potent.
      if (!CHARGES.includes(`${ordinary}-${fur}`)) {
        utilities[`.${ordinary}-${fur}`] = ordinaryRules(ordinary, {
          ...pseudo,
          "clip-path": plain,
        });
      }
      for (const [name, line] of Object.entries(LINES)) {
        if (!lineOrdinaries(name).includes(ordinary)) {
          continue;
        }
        utilities[`.${ordinary}-${name}-${fur}`] = ordinaryRules(
          ordinary,
          {
            ...pseudo,
            "clip-path": lined(name, line),
          },
          name,
        );
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
      utilities[`.${ordinary}-voided-counterchanged`] = ordinaryRules(ordinary, {
        ...counterchanged,
        "clip-path": voidedPolygon(vertices, VOIDS[ordinary], pointBelowChief),
      });
    }
  }

  addUtilities(utilities);
});
