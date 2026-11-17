/*
 * Grailwind CSS: ordinaries, e.g. `fess-or`.
 */
import plugin from "tailwindcss/plugin";
import {
  BETWEEN,
  BETWEEN_COTISED,
  BETWEEN_LINED,
  BORDURE_LINES,
  BORDURE_PATTERNS,
  CHARGES,
  CHEQUY,
  COTISABLE,
  FRAMES,
  FURS,
  LABELS,
  LINES as LINE_NAMES,
  lineOrdinaries,
  OF_THE_FIRST,
  ON,
  ON_COTISED,
  ON_SCALE,
  REVERSIBLE,
  TINCTURES,
  VOIDABLE,
} from "./data.js";
import { FESS_POINT } from "./divisions.js";
import { furBackground, furLayers, joinLayers, ringBackground, vairBelow } from "./furs.js";
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
  // Diminutives are half their ordinary's width, a width apart, joined along the shield's edge:
  // bendlets round the dexter chief corner, pallets along the top, chevronels down the dexter side
  // (the lowest of three along the base too).
  bendlet: [[0, 0], [10, 0], [100, 90], [100, 100], [90, 100], [0, 10]],
  "two-bendlets": [
    [30, 0], [100, 70], [100, 90], [10, 0], [0, 0],
    [0, 10], [90, 100], [70, 100], [0, 30], [0, 0],
  ],
  "three-bendlets": [
    [50, 0], [100, 50], [100, 70], [30, 0], [10, 0], [100, 90], [100, 100],
    [90, 100], [0, 10], [0, 30], [70, 100], [50, 100], [0, 50], [0, 0],
  ],
  pallet: [[42.5, 0], [57.5, 0], [57.5, 100], [42.5, 100]],
  "two-pallets": [
    [72.5, 0], [72.5, 100], [57.5, 100], [57.5, 0],
    [42.5, 0], [42.5, 100], [27.5, 100], [27.5, 0],
  ],
  "three-pallets": [
    [87.5, 0], [87.5, 100], [72.5, 100], [72.5, 0], [57.5, 0], [57.5, 100],
    [42.5, 100], [42.5, 0], [27.5, 0], [27.5, 100], [12.5, 100], [12.5, 0],
  ],
  // The lowest chevronel's feet run off the base.
  chevronel: [[50, 28.5], [100, 78.5], [100, 91.5], [50, 41.5], [0, 91.5], [0, 78.5]],
  "two-chevronels": [
    [0, 65.5], [50, 15.5], [100, 65.5], [100, 78.5], [50, 28.5], [0, 78.5],
    [0, 91.5], [50, 41.5], [100, 91.5], [100, 100], [95.5, 100], [50, 54.5], [4.5, 100], [0, 100],
  ],
  "three-chevronels": [
    [0, 57.5], [50, 7.5], [100, 57.5], [100, 70.5], [50, 20.5], [0, 70.5],
    [0, 83.5], [50, 33.5], [100, 83.5], [100, 96.5], [50, 46.5], [0, 96.5], [0, 100],
    [9.5, 100], [50, 59.5], [90.5, 100], [77.5, 100], [50, 72.5], [22.5, 100], [0, 100],
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

// A split field's parts: its children that aren't over all of it. A label is recognised by its
// `label-` class. Written out in grailwind.css.
const PART = ':not(.charges, .inescutcheon, .canton, [class^="label-"], [class*=" label-"])';

// The chief surmounts a bordure.
const INSET = "var(--bordure-inset)";
// Each side's step-out. A bordure on a per-pale part sets its palar side's to 0.
const DEXTER = `var(--bordure-inset-dexter, ${INSET})`;
const SINISTER = `var(--bordure-inset-sinister, ${INSET})`;
const OVER_BORDURE = {
  "--bordure-inset": "inherit",
  "--bordure-inset-dexter": "inherit",
  "--bordure-inset-sinister": "inherit",
  inset: `calc(-1 * ${INSET}) calc(-1 * ${SINISTER}) 0 calc(-1 * ${DEXTER})`,
  padding: `${INSET} ${SINISTER} 0 ${DEXTER}`,
  "background-origin": "content-box",
};
// A vertex on the shield's top or side edges, moved out to the bordure's outer edge.
const outer = ([x, y]) => {
  const ox = x === 0 ? `calc(-1 * ${DEXTER})` : x === 100 ? `calc(100% + ${SINISTER})` : pct(x);
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

/**
 * A cotised ordinary, as nested loops cut with evenodd: the ordinary narrowed by `inset`, then each
 * cotise's inner and outer edge. Like voidedPolygon(), every loop starts at the same side on the
 * shield's edge, so the jumps between loops run along that edge and add no area.
 * @param {number[][]} vertices The plain ordinary's polygon, in %.
 * @param {{inset: number, width: number, gap: number}} cotise How far each side of the ordinary
 *   moves in, a cotise's width and its gap from the ordinary, in real units.
 * @param {number} pairs The cotises on each side: 1 for cotised, 2 for double cotised.
 * @returns {string} A CSS `polygon()`.
 */
const cotisedPolygon = (vertices, { inset, width, gap }, pairs) => {
  const distances = [-inset];
  for (let i = 0; i < pairs; i++) {
    const inside = distances.at(-1) + gap;
    distances.push(inside, inside + width);
  }
  const edge = vertices.findIndex((v, i) => onShieldEdge(v, vertices[(i + 1) % vertices.length]));
  const loops = distances.map((distance) => {
    const offsets = widen(vertices, distance);
    const loop = vertices.map(([x, y], i) => [x + offsets[i][0], y + offsets[i][1]]);
    return [...rotate(loop, edge), loop[edge]].map(point).join(", ");
  });
  return `polygon(evenodd, ${loops.join(", ")})`;
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
    halfWidth,
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
  bendlet: [band("u-v", -10, 10)],
  "two-bendlets": [band("u-v", -30, -10), band("u-v", 10, 30)],
  "three-bendlets": [band("u-v", -50, -30), band("u-v", -10, 10), band("u-v", 30, 50)],
  pallet: [band("x", 42.5, 57.5)],
  "two-pallets": [band("x", 27.5, 42.5), band("x", 57.5, 72.5)],
  "three-pallets": [band("x", 12.5, 27.5), band("x", 42.5, 57.5), band("x", 72.5, 87.5)],
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

// A cotised ordinary's whole group, the ordinary narrowed with its gaps and cotises, as a multiple
// of the plain ordinary's width: single and double. Chosen by eye (059-cotised-widths.png).
// prettier-ignore
const COTISES = {
  pale: { single: 1.25, double: 1.25 }, fess: { single: 1.25, double: 1.25 },
  bar: { single: 1.25, double: 1.25 }, bend: { single: 1.25, double: 1.25 },
  "bend-sinister": { single: 1.25, double: 1.25 }, chevron: { single: 1.25, double: 1.25 },
  cross: { single: 1.25, double: 1.25 }, saltire: { single: 1.25, double: 1.25 },
  pall: { single: 1.25, double: 1.25 }, pile: { single: 1.25, double: 1.25 },
};
for (const ordinary of REVERSIBLE) {
  COTISES[`${ordinary}-reversed`] = COTISES[ordinary];
}

// % of a band's kind per real unit across it.
const PER_UNIT = { x: 100 / W, y: 100 / H, "u-v": Math.hypot(100 / W, 100 / H) };
PER_UNIT["u+v"] = PER_UNIT["u-v"];

/**
 * The plain ordinary's width across, from its first band. The pile tapers, so its is its width at
 * half its length: half its width at the top.
 * @param {string} ordinary One of COTISABLE.
 * @returns {number} The width, in real units.
 */
const plainWidth = (ordinary) => {
  const layer = BANDS[ordinary].find((l) => !l.stripe);
  if (layer.halfWidth) {
    return 2 * layer.halfWidth;
  }
  if (layer.stops) {
    const xs = ORDINARIES[ordinary].map(([x]) => x);
    return ((Math.max(...xs) - Math.min(...xs)) * W) / 100 / 2;
  }
  return (layer.to - layer.from) / PER_UNIT[layer.kind];
};

// COTISES' keys, by the cotises on each side.
const COTISED_NAMES = { 1: "single", 2: "double" };

/**
 * A cotised ordinary's geometry. FD's proportions hold within the group: the cotise is a quarter of
 * the narrowed ordinary and the gap one cotise, so the group is 8 cotises across, or 12 double.
 * @param {string} ordinary One of COTISABLE.
 * @param {number} pairs The cotises on each side: 1 for cotised, 2 for double cotised.
 * @param {number} [multiple] The group's width as a multiple of the plain ordinary's.
 * @returns {{inset: number, width: number, gap: number}} How far each side of the ordinary moves
 *   in, a cotise's width and its gap, in real units.
 */
const cotiseGeometry = (ordinary, pairs, multiple = COTISES[ordinary][COTISED_NAMES[pairs]]) => {
  const plain = plainWidth(ordinary);
  const width = (plain * multiple) / (pairs === 2 ? 12 : 8);
  return { inset: (plain - 4 * width) / 2, width, gap: width };
};
/**
 * The ordinary's bands narrowed by `inset` each side. A stripe moves to the narrowed edge it lay
 * against and reaches `reach` beyond it, past the outer cotise. A half's tile is its side's, so it
 * follows the side's ends; a seam ends with the point it runs down to.
 * @param {object[]} layers The plain ordinary's BANDS.
 * @param {number} inset How far each side moves in, in real units.
 * @param {number} reach How far out the outer cotise ends from the narrowed edge, in real units.
 * @param {(vertex: number[]) => number[]} moved A vertex of the plain ordinary, narrowed.
 * @returns {object[]} The narrowed layers.
 */
const narrowedBands = (layers, inset, reach, moved) => {
  const narrowed = layers.map((layer) => {
    if (layer.halfWidth) {
      return diagonal(layer.kind, layer.halfWidth - inset, layer.tile);
    }
    if (layer.stops) {
      // The side runs corner to corner: top left to bottom right for u-v, else top right to bottom left.
      const [x0, y0, x1, y1] = layer.tile;
      const leaning = layer.kind === "u-v";
      const [a, b] = (
        leaning
          ? [
              [x0, y0],
              [x1, y1],
            ]
          : [
              [x1, y0],
              [x0, y1],
            ]
      ).map(moved);
      return { ...layer, tile: leaning ? [a[0], a[1], b[0], b[1]] : [b[0], a[1], a[0], b[1]] };
    }
    if (layer.seam) {
      // It stops 2 short of the pile's point, at the end that isn't on the shield's edge.
      const [x0, y0, x1, y1] = layer.tile;
      const end = y1 === 100 ? y0 : y1;
      const point = [50, end + (y1 === 100 ? -2 : 2)];
      const shift = moved(point)[1] - point[1];
      return { ...layer, tile: y1 === 100 ? [x0, y0 + shift, x1, y1] : [x0, y0, x1, y1 + shift] };
    }
    const shift = inset * PER_UNIT[layer.kind];
    return layer.stripe ? layer : { ...layer, from: layer.from + shift, to: layer.to - shift };
  });
  return narrowed.map((layer, i) => {
    if (!layer.stripe) {
      return layer;
    }
    const plain = layers.find((l) => l.kind === layer.kind && !l.stripe);
    const band = narrowed[layers.indexOf(plain)];
    const length = Math.ceil(reach * PER_UNIT[layer.kind]) + 2;
    return layers[i].to <= plain.from
      ? { ...layer, from: band.from - length, to: band.from }
      : { ...layer, from: band.to, to: band.to + length };
  });
};

/**
 * A cotisable ordinary's vars on its own element, for `cotised` and `double-cotised`: the clip, and
 * the narrowed bands that repaint it over a cotise in its own tincture.
 * @param {string} ordinary One of COTISABLE.
 * @param {string} colour The ordinary's paint, e.g. "var(--color-argent)".
 * @param {{single: number, double: number}} [multiples] The groups' widths, as COTISES.
 * @returns {Object<string, string>} --clip-cotised, --bands-cotised and their double.
 */
const cotisedVars = (ordinary, colour, multiples = COTISES[ordinary]) => {
  const vars = {};
  const vertices = ORDINARIES[ordinary];
  const plain = bands(BANDS[ordinary], colour);
  for (const [kind, pairs] of Object.entries(COTISED)) {
    const geometry = cotiseGeometry(ordinary, pairs, multiples[COTISED_NAMES[pairs]]);
    const reach = pairs * (geometry.gap + geometry.width);
    const offsets = widen(vertices, -geometry.inset);
    const moved = (vertex) => {
      const i = vertices.findIndex(([x, y]) => x === vertex[0] && y === vertex[1]);
      return [vertex[0] + offsets[i][0], vertex[1] + offsets[i][1]];
    };
    const layers = narrowedBands(BANDS[ordinary], geometry.inset, reach, moved);
    const narrowed = bands(layers, colour);
    vars[`--clip-${kind}`] = cotisedPolygon(vertices, geometry, pairs);
    vars[`--bands-${kind}`] = layers
      .map((l) => gradient(l, l.stripe ? "var(--cotise, transparent)" : colour))
      .join(", ");
    // Only a narrowed tile, as the pile's, moves its layers.
    if (narrowed["background-size"] !== plain["background-size"]) {
      vars[`--band-sizes-${kind}`] = narrowed["background-size"];
    }
    if (narrowed["background-position"] !== plain["background-position"]) {
      vars[`--band-positions-${kind}`] = narrowed["background-position"];
    }
  }
  return vars;
};

// Whole checks along each band, none cut at the shield's edge. The fess's odd count mirrors about
// the pale, as in FD 668, its checks 7% narrower than square. The pale's are square.
const CHEQUY_ALONG = { fess: 9, pale: 12 };

/**
 * Where a chequy ordinary's grid lies: one 2 × 2-check tile, repeated, three checks across the
 * ordinary's band, with the tile's top-left check at the band's start.
 * @param {string} ordinary One of CHEQUY, e.g. "fess".
 * @returns {{size: string, position: string}} The tile's background-size and
 *   background-position, as % of the ordinary's box (the field below any chief).
 */
const chequyTile = (ordinary) => {
  const band = ORDINARIES[ordinary];
  const max = Math.max(...band.map(([x, y]) => (ordinary === "fess" ? y : x)));
  const min = Math.min(...band.map(([x, y]) => (ordinary === "fess" ? y : x)));
  const width = max - min;
  const tileSize = (width / 3) * 2;
  const tileLength = (100 / CHEQUY_ALONG[ordinary]) * 2;
  const tileWidth = ordinary === "fess" ? tileLength : tileSize;
  const tileHeight = ordinary === "fess" ? tileSize : tileLength;
  const posX = tilePosition(band[0][0], tileWidth);
  const posY = tilePosition(band[0][1], tileHeight);

  return {
    size: `${pct(tileWidth)} ${pct(tileHeight)}`,
    position: `${posX} ${posY}`,
  };
};

/**
 * A chequy ordinary's clip, its far edge 1px in. The band's far edge is mid-tile, and Chromium
 * snaps a repeated tile to whole pixels, which can show a sliver of the next row there.
 * @param {string} ordinary One of CHEQUY.
 * @returns {string} The clip-path polygon.
 */
const chequyClip = (ordinary) => {
  const band = ORDINARIES[ordinary];
  const axis = ordinary === "fess" ? 1 : 0;
  const far = Math.max(...band.map((vertex) => vertex[axis]));
  const coordinate = (value, i) =>
    i === axis && value === far ? `calc(${pct(value)} - 1px)` : pct(value);
  return `polygon(${band.map((vertex) => vertex.map(coordinate).join(" ")).join(", ")})`;
};

// Every pattern's pair of tinctures, first and second: two furs aren't generated.
const PATTERN_PAIRS = [...TINCTURES, ...Object.keys(FURS)].flatMap((first, _, paints) =>
  paints
    .filter((second) => first !== second && !(FURS[first] && FURS[second]))
    .map((second) => [first, second]),
);

/**
 * A pattern's two paints. A fur's is transparent, to show the fur's layers under it.
 * @param {string} first The first tincture or fur.
 * @param {string} second The second; at most one of the two is a fur.
 * @returns {{a: string, b: string, fur: string|undefined}} The first's and second's paints, and
 *   the fur if there is one.
 */
const patternPaints = (first, second) => {
  const fur = [first, second].find((t) => FURS[t]);
  const paint = (t) => (t === fur ? "transparent" : `var(--color-${t})`);
  return { a: paint(first), b: paint(second), fur };
};

/**
 * One 2 × 2-check tile of a chequer, its top-left check `a`.
 * @param {string} a The top-left and bottom-right checks' paint.
 * @param {string} b The other two's.
 * @returns {string} A conic-gradient.
 */
const chequer = (a, b) => `conic-gradient(${b} 0 25%, ${a} 0 50%, ${b} 0 75%, ${a} 0)`;

/**
 * A chequy ordinary's background layers. With a fur, its checks are transparent over the fur.
 * @param {string} ordinary One of CHEQUY.
 * @param {string} first The tincture or fur in the dexter chief check.
 * @param {string} second The other tincture or fur; at most one of the two is a fur.
 * @param {Function} theme Tailwind's theme() lookup, for a fur's spots.
 * @returns {{image: string, size: string, position: string, repeat: string}[]} The layers, top first.
 */
const chequyLayers = (ordinary, first, second, theme) => {
  const { a, b, fur } = patternPaints(first, second);
  const grid = { image: chequer(a, b), ...chequyTile(ordinary), repeat: "repeat" };
  return fur ? [grid, ...furLayers(fur, theme)] : [grid];
};

// Lines of partition. Scallops are round on the 5:6 shield; below a chief the
// box is shorter, so they are slightly squashed.
const SCALLOP = 14;
const SCALLOPS = { chevron: 10, chevronel: 10, "two-chevronels": 10, "three-chevronels": 10 };
// Wavy half-waves, longer where the default reads as beads: the bend, cross and cornered ordinaries.
// prettier-ignore
const WAVES = {
  bend: 21, "bend-sinister": 21, cross: 20,
  chevron: 28, saltire: 28, pall: 28,
  bendlet: 21, "two-bendlets": 21, "three-bendlets": 21,
  chevronel: 28, "two-chevronels": 28, "three-chevronels": 28,
};
const LENGTHS = { wavy: WAVES };

// A quarter of the ordinary's width, in real units. The pile tapers, so its is set by eye.
// prettier-ignore
const VOIDS = {
  pale: 7.5, fess: 9, bar: 4.2, bend: 7.7, "bend-sinister": 7.7,
  chevron: 5, cross: 6, saltire: 6, pall: 6, pile: 8.8,
};
// A diminutive is half its ordinary, so its void is half too.
for (const [diminutive, ordinary] of [
  ["bendlet", "bend"],
  ["pallet", "pale"],
  ["chevronel", "chevron"],
]) {
  for (const name of [diminutive, `two-${diminutive}s`, `three-${diminutive}s`]) {
    VOIDS[name] = VOIDS[ordinary] / 2;
  }
}
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
  "bendlet", "two-bendlets", "three-bendlets", "chevronel", "two-chevronels", "three-chevronels",
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
// ["A", rx, ry, rotation, large, sweep, x, y] and ["Z"]. A later "M" starts another subpath.
const pathShape = (segments) => {
  const [, startX, startY] = segments[0];
  const commands = segments.slice(1).map(([command, ...n]) => {
    switch (command) {
      case "M":
        return `move to ${at([n[0], n[1]])}`;
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

// Polygon points per curve or arc, where shape() isn't supported.
const SAMPLES = 16;

/**
 * A fraction of the frame across or down, in a box inset by `inset` on every side.
 * @param {number} fraction 0 at the frame's top or left edge, 1 at its bottom or right.
 * @param {string|null} inset A CSS length, or null for the frame's own edge.
 * @returns {string} A CSS length-percentage.
 */
const insetCoordinate = (fraction, inset) => {
  if (!inset) {
    return pct(fraction * 100);
  }
  if (num(fraction) === 0) {
    return inset;
  }
  if (num(fraction) === 1) {
    return `calc(100% - ${inset})`;
  }
  return `calc(${inset} + ${num(fraction)} * (100% - 2 * ${inset}))`;
};

/**
 * A drawing's point, in real units, in the frame inset by `inset`.
 * @param {number[]} point [x, y] in real units (W × H).
 * @param {string|null} inset A CSS length, or null for the frame's own edge.
 * @returns {string} A CSS position.
 */
const insetPoint = ([x, y], inset) =>
  `${insetCoordinate(x / W, inset)} ${insetCoordinate(y / H, inset)}`;

/**
 * An arc's radius, scaled with the inset box as its points are.
 * @param {number} radius In real units.
 * @param {number} across W for a horizontal radius, H for a vertical one.
 * @param {string|null} inset A CSS length, or null for the frame's own edge.
 * @returns {string} A CSS length-percentage.
 */
const insetRadius = (radius, across, inset) =>
  inset ? `calc(${num(radius / across)} * (100% - 2 * ${inset}))` : pct((radius * 100) / across);

/**
 * A drawn outline's shape() commands after its start, in the frame inset by `inset`.
 * @param {Array[]} segments The drawing's segments, as in paths.js, ending in ["Z"].
 * @param {string|null} inset A CSS length, or null for the frame's own edge.
 * @returns {string[]} The commands, ending in "close".
 */
const insetCommands = (segments, inset) =>
  segments.slice(1).map(([command, ...n]) => {
    switch (command) {
      case "L":
        return `line to ${insetPoint([n[0], n[1]], inset)}`;
      case "C":
        return `curve to ${insetPoint([n[4], n[5]], inset)} with ${insetPoint([n[0], n[1]], inset)} / ${insetPoint([n[2], n[3]], inset)}`;
      case "A": {
        const [rx, ry, rotation, large, sweep, x, y] = n;
        return [
          `arc to ${insetPoint([x, y], inset)} of ${insetRadius(rx, W, inset)} ${insetRadius(ry, H, inset)}`,
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
        throw new Error(`a frame's outline can't use ${command}`);
    }
  });

/**
 * Points along an SVG arc, after its start, from its endpoint form (SVG 1.1, F.6.5).
 * @param {number[]} from The arc's start, in real units.
 * @param {number[]} arc [rx, ry, rotation, large, sweep, x, y], as in paths.js.
 * @returns {number[][]} SAMPLES points, the last at the arc's end.
 */
const arcPoints = (from, [rx, ry, rotation, large, sweep, x, y]) => {
  const angle = (rotation * Math.PI) / 180;
  const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
  const [dx, dy] = [(from[0] - x) / 2, (from[1] - y) / 2];
  const [x1, y1] = [cos * dx + sin * dy, -sin * dx + cos * dy];
  // Radii too small to reach are scaled up, as SVG does.
  const scale = Math.max(1, Math.sqrt((x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry)));
  const [radiusX, radiusY] = [rx * scale, ry * scale];
  const numerator = Math.max(
    0,
    radiusX ** 2 * radiusY ** 2 - radiusX ** 2 * y1 ** 2 - radiusY ** 2 * x1 ** 2,
  );
  const sign = large === sweep ? -1 : 1;
  const factor =
    sign * Math.sqrt(numerator / (radiusX ** 2 * y1 ** 2 + radiusY ** 2 * x1 ** 2) || 0);
  const [cx1, cy1] = [(factor * radiusX * y1) / radiusY, (-factor * radiusY * x1) / radiusX];
  const centre = [
    cos * cx1 - sin * cy1 + (from[0] + x) / 2,
    sin * cx1 + cos * cy1 + (from[1] + y) / 2,
  ];
  const start = Math.atan2((y1 - cy1) / radiusY, (x1 - cx1) / radiusX);
  let sweepAngle = Math.atan2((-y1 - cy1) / radiusY, (-x1 - cx1) / radiusX) - start;
  if (sweep && sweepAngle < 0) {
    sweepAngle += 2 * Math.PI;
  } else if (!sweep && sweepAngle > 0) {
    sweepAngle -= 2 * Math.PI;
  }
  return Array.from({ length: SAMPLES }, (_, i) => {
    const theta = start + (sweepAngle * (i + 1)) / SAMPLES;
    const [ex, ey] = [radiusX * Math.cos(theta), radiusY * Math.sin(theta)];
    return [centre[0] + cos * ex - sin * ey, centre[1] + sin * ex + cos * ey];
  });
};

/**
 * A drawn outline as polygon points, its curves and arcs sampled.
 * @param {Array[]} segments The drawing's segments, as in paths.js.
 * @param {number} [samples] Points per curve.
 * @returns {number[][]} Points in real units, starting at the move.
 */
const outlinePoints = (segments, samples = SAMPLES) => {
  const points = [[segments[0][1], segments[0][2]]];
  for (const [command, ...n] of segments.slice(1)) {
    const from = points.at(-1);
    if (command === "L") {
      points.push([n[0], n[1]]);
    } else if (command === "C") {
      for (let i = 1; i <= samples; i++) {
        const t = i / samples;
        const [a, b, c, d] = [(1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2, t ** 3];
        points.push([
          a * from[0] + b * n[0] + c * n[2] + d * n[4],
          a * from[1] + b * n[1] + c * n[3] + d * n[5],
        ]);
      }
    } else if (command === "A") {
      points.push(...arcPoints(from, n));
    }
  }
  return points;
};

// A bordure's width, as a fraction of its frame's. grailwind.css has it as `calc(100cqw / 8)` on a
// frame and a third of that on a canton, which test/modes.mjs checks. A lined bordure is drawn for
// this width.
const BORDURE_WIDTH = 1 / 8;
// How deep a lined bordure's scallops are, as a fraction of its frame's width.
const SCALLOP_DEPTH = 0.037;
// The same as a fraction of the bordure's width: an engrailed field's border narrows by it.
const BORDURE_DEPTH = SCALLOP_DEPTH / BORDURE_WIDTH;
// A lined bordure's scallop length in real units, as SCALLOP is an ordinary's: a run between
// corners gets one scallop per this much of its length inside the bordure.
const BORDURE_SCALLOP = 12;
// An engrailed bordure's top corners are round lobes, their radius this many times the scallops'
// depth (at least 1), centred inside the corner so they reach the depth past each edge, as the
// bites do. Every other corner is a cusp.
const CORNER_LOBE = 1.8;
// Points per curve when a run is cut into scallops by arc length.
const RUN_SAMPLES = 256;

/**
 * @param {number[]} vector A vector.
 * @returns {number[]} The unit vector the same way.
 */
const unit = ([x, y]) => [x / Math.hypot(x, y), y / Math.hypot(x, y)];

/**
 * @param {number[][]} polyline Points, in real units.
 * @returns {number[]} How far along it each point is.
 */
const lengthsAlong = (polyline) => {
  const lengths = [0];
  for (let i = 1; i < polyline.length; i++) {
    const [from, to] = [polyline[i - 1], polyline[i]];
    lengths.push(lengths[i - 1] + Math.hypot(to[0] - from[0], to[1] - from[1]));
  }
  return lengths;
};

/**
 * @param {number[][]} polyline Points, in real units.
 * @param {number[]} lengths lengthsAlong(polyline).
 * @param {number} distance How far along it.
 * @returns {number[]} The point that far along.
 */
const pointAt = (polyline, lengths, distance) => {
  const i = Math.max(
    1,
    lengths.findIndex((length) => length >= distance),
  );
  const fraction = (distance - lengths[i - 1]) / (lengths[i] - lengths[i - 1]);
  return polyline[i - 1].map((v, axis) => v + (polyline[i][axis] - v) * fraction);
};

/**
 * Points evenly spaced along a polyline, one scallop apart.
 * @param {number[][]} polyline Points of a drawing, in real units.
 * @param {number} start How far along it to start.
 * @param {number} [end] How far along it to end, by default its end.
 * @returns {number[][]} The chords' ends, from `start` to `end`.
 */
const chordEnds = (polyline, start, end) => {
  const lengths = lengthsAlong(polyline);
  const last = end ?? lengths.at(-1);
  const count = Math.max(
    1,
    Math.round(((last - start) * (1 - 2 * BORDURE_WIDTH)) / BORDURE_SCALLOP),
  );
  return Array.from({ length: count + 1 }, (_, part) =>
    pointAt(polyline, lengths, start + ((last - start) * part) / count),
  );
};

/**
 * A lined bordure's inner edge, clockwise, in real units. Its frame's outline, inside the bordure,
 * is cut at the top corners and the base point into runs, and each run into equal chords by its
 * length in the drawing. Each chord is a scallop, a cubic whose controls are its ends moved 4/3 of
 * the depth along the chord's normal, so it peaks at the depth and leaves its cusps square to the
 * chord. The left side is the right's mirror.
 * @param {Array[]} segments A heater's drawing, as in paths.js: two lines, then two curves.
 * @param {number} sweep 1 for engrailed, bulging toward the frame's edge; -1 for invected.
 * @returns {{ from: number[], c1: number[], c2: number[], to: number[], kind: string }[]} Its
 *   cubics from the top edge's first cusp, each from where the last ends, and the last back to the
 *   first. `kind` is "scallop" or "lobe".
 */
const bordurePath = (segments, sweep) => {
  const inset = BORDURE_WIDTH * W;
  const depth = SCALLOP_DEPTH * W;
  const scale = [(W - 2 * inset) / W, (H - 2 * inset) / H];
  const inside = (point) => point.map((v, axis) => inset + v * scale[axis]);
  const scallops = (ends) =>
    ends.slice(1).map((end, i) => {
      const start = ends[i];
      const normal = unit([end[1] - start[1], start[0] - end[0]]);
      const push = (point) => point.map((v, axis) => v + (normal[axis] * sweep * 4 * depth) / 3);
      const [from, to] = [inside(start), inside(end)];
      return { from, c1: push(from), c2: push(to), to, kind: "scallop" };
    });
  // The top-right lobe: its circle's centre is `centre` inside the corner each way, and its cusps
  // are `reach` from the corner along each edge. It runs clockwise from the top cusp through the
  // apex to the side cusp. Without a lobe, the corner is the cusp.
  const radius = CORNER_LOBE * depth;
  const centre = radius - depth;
  const reach = sweep > 0 ? centre + Math.sqrt(radius ** 2 - centre ** 2) : 0;
  const corner = inside([W, 0]);
  const middle = [corner[0] - centre, corner[1] + centre];
  const onCircle = (angle) => [
    middle[0] + radius * Math.cos(angle),
    middle[1] + radius * Math.sin(angle),
  ];
  const [first, last] = [Math.atan2(-centre, centre - reach), Math.atan2(reach - centre, centre)];
  const apex = (first + last) / 2;
  const handle = (4 / 3) * Math.tan((last - first) / 8) * radius;
  const toward = (angle, along) =>
    onCircle(angle).map(
      (v, axis) => v + [-Math.sin(angle), Math.cos(angle)][axis] * handle * along,
    );
  const lobe = [
    { from: onCircle(first), c1: toward(first, 1), c2: toward(apex, -1), to: onCircle(apex) },
    { from: onCircle(apex), c1: toward(apex, 1), c2: toward(last, -1), to: onCircle(last) },
  ].map((piece) => ({ ...piece, kind: "lobe" }));
  const outline = outlinePoints(segments, RUN_SAMPLES);
  const top = chordEnds(outline.slice(0, 2), reach / scale[0], W - reach / scale[0]);
  const side = outline.slice(1, 3 + RUN_SAMPLES);
  const right = [...(sweep > 0 ? lobe : []), ...scallops(chordEnds(side, reach / scale[1]))];
  const flip = ([x, y]) => [W - x, y];
  const left = right
    .map(({ from, c1, c2, to, kind }) => ({
      from: flip(to),
      c1: flip(c2),
      c2: flip(c1),
      to: flip(from),
      kind,
    }))
    .reverse();
  return [...scallops(top), ...right, ...left];
};

/**
 * A frame's clip-paths from its drawing: the outline, and rings just inside it. Each is a polygon
 * fallback, then the shape().
 * @param {Array[]} segments The drawing's segments, as in paths.js.
 * @returns {{ outer: string[], ring: (inset: string) => string[], lined: (inset: string, sweep: number) => string[] }}
 *   The outline, and a ring `inset` wide: the outline minus the outline mapped into a box inset by
 *   `inset`. A lined ring has its inner edge scalloped as bordurePath() draws it, bulging outward
 *   for a `sweep` of 1 and inward for -1. Its shape() is drawn for an `inset` of BORDURE_WIDTH,
 *   and its polygon is the plain ring. The outline must be a heater's.
 */
const frameOutline = (segments) => {
  const points = outlinePoints(segments);
  const start = [segments[0][1], segments[0][2]];
  const loop = (inset) => [...points, points[0]].map((p) => insetPoint(p, inset)).join(", ");
  const ring = (inset) => [
    `polygon(evenodd, ${loop(null)}, ${loop(inset)})`,
    `shape(evenodd from ${insetPoint(start, null)}, ${insetCommands(segments, null).join(", ")}, move to ${insetPoint(start, inset)}, ${insetCommands(segments, inset).join(", ")})`,
  ];
  return {
    outer: [
      `polygon(${points.map((p) => insetPoint(p, null)).join(", ")})`,
      `shape(from ${insetPoint(start, null)}, ${insetCommands(segments, null).join(", ")})`,
    ],
    ring,
    lined: (inset, sweep) => {
      // The inner subpath runs counter-clockwise, against the outer, so a nonzero fill leaves the
      // field unpainted and still paints where invected scallops overlap.
      const pieces = bordurePath(segments, sweep);
      const inner = pieces
        .toReversed()
        .map(({ from, c1, c2 }) => `curve to ${at(from)} with ${at(c2)} / ${at(c1)}`);
      return [
        ring(inset)[0],
        `shape(nonzero from ${insetPoint(start, null)}, ${insetCommands(segments, null).join(", ")}, move to ${at(pieces[0].from)}, ${inner.join(", ")}, close)`,
      ];
    },
  };
};

// A bordure compony's panes along the ring's midline: across the top, down each side, and round
// the base. The top's and base's are odd, so a pane is on the pale and the panes mirror about it.
// By eye.
const COMPONY_PANES = { top: 5, side: 4, base: 9 };

/**
 * The points between `from` and `to` that cut it into equal parts.
 * @param {number} from The start.
 * @param {number} to The end.
 * @param {number} count How many parts.
 * @returns {number[]} The `count - 1` cuts, from `from`.
 */
const evenly = (from, to, count) =>
  Array.from({ length: count - 1 }, (_, i) => from + ((i + 1) * (to - from)) / count);

/**
 * A bordure compony on a frame's ring, as FD 223: straight panes along the top and sides, radial
 * panes round the base from a centre on the pale, and a long pane each side of a top corner,
 * mitred from the outer corner to the inner. Pane edges are at equal lengths along the ring's
 * midline, the outline mapped into a box inset by half the bordure, as the ring's inner edge is by
 * all of it. Panes alternate clockwise from the top's first, which is the first tincture.
 * @param {Array[]} segments A heater's drawing, as in paths.js: down a straight side, then a curve
 *   to the point and its mirror back.
 * @returns {(a: string, b: string) => {image: string, size: string, position: string, repeat: string}[]}
 *   The background layers for two paints, top first: the corners, the top, the sides, the base.
 *   A `transparent` paint (a fur's) also clears the top and sides under the corners.
 * @throws {Error} If COMPONY_PANES.top or .base is even.
 */
const componyRing = (segments) => {
  if (COMPONY_PANES.top % 2 === 0 || COMPONY_PANES.base % 2 === 0) {
    throw new Error(
      `COMPONY_PANES.top and .base must be odd, not ${JSON.stringify(COMPONY_PANES)}`,
    );
  }
  const width = BORDURE_WIDTH * W;
  const inset = width / 2;
  const midline = ([x, y]) => [
    inset + (x * (W - 2 * inset)) / W,
    inset + (y * (H - 2 * inset)) / H,
  ];
  const curve = segments.findIndex(([command]) => command === "C");
  const [, sideX, sideEnd] = segments[curve - 1];
  const topEdges = evenly(inset, W - inset, COMPONY_PANES.top).map((x) => pct((x * 100) / W));
  const sideEdges = evenly(inset, sideEnd, COMPONY_PANES.side).map((y) => pct((y * 100) / sideEnd));
  // The base's pane edges meet on the pale, level with the sides' end. Its angles are clockwise
  // from up, from the sinister side's end round to the dexter's.
  const centre = [W / 2, sideEnd];
  const angle = ([x, y]) => 180 - (Math.atan2(x - centre[0], y - centre[1]) * 180) / Math.PI;
  const base = outlinePoints([["M", sideX, sideEnd], ...segments.slice(curve, curve + 2)]).map(
    midline,
  );
  const lengths = lengthsAlong(base);
  const baseEdges = evenly(0, lengths.at(-1), COMPONY_PANES.base).map(
    (distance) => `${num(angle(pointAt(base, lengths, distance)))}deg`,
  );
  const strip = (width * 100) / H;
  const below = ((H - sideEnd) * 100) / H;

  return (a, b) => {
    const panes = (from, count) =>
      Array.from({ length: count }, (_, i) => ((from + i) % 2 ? b : a));
    const top = panes(0, COMPONY_PANES.top);
    const side = panes(COMPONY_PANES.top, COMPONY_PANES.side);
    const stripes = (paints, edges) =>
      paints.map((paint, i) => `${paint} 0${i < edges.length ? ` ${edges[i]}` : ""}`);
    const layer = (image, size, position) => ({ image, size, position, repeat: "no-repeat" });
    const corner = `${pct(width)} ${pct(strip)}`;
    // With a fur, the top and sides are clear under the corner squares, so the corner's fur half
    // shows the fur. They're clear to a pixel short of the square's inner edge, where a snapped or
    // anti-aliased corner edge would otherwise show the fur through the pane beside it. Without a
    // fur they run on under it, as layers cut there would move the panes' edges by a snapped pixel.
    const clear = [a, b].includes("transparent");
    const short = (edge) => `calc(${pct(edge)} - 1px)`;
    const topStripes = clear
      ? stripes(
          ["transparent", ...top, "transparent"],
          [short((width * 100) / W), ...topEdges, `calc(${pct(((W - width) * 100) / W)} + 1px)`],
        )
      : stripes(top, topEdges);
    const sides = (
      clear
        ? stripes(["transparent", ...side], [short((width * 100) / sideEnd), ...sideEdges])
        : stripes(side, sideEdges)
    ).join(", ");
    const sideSize = `${pct(width)} ${pct((sideEnd * 100) / H)}`;
    const baseStripes = stripes(
      panes(COMPONY_PANES.top + COMPONY_PANES.side, COMPONY_PANES.base),
      baseEdges,
    );
    return [
      layer(`linear-gradient(to top right, ${side[0]} 50%, ${top[0]} 50%)`, corner, "0 0"),
      layer(`linear-gradient(to top left, ${side[0]} 50%, ${top.at(-1)} 50%)`, corner, "100% 0"),
      layer(`linear-gradient(to right, ${topStripes.join(", ")})`, `100% ${pct(strip)}`, "0 0"),
      layer(`linear-gradient(to bottom, ${sides})`, sideSize, "0 0"),
      layer(`linear-gradient(to bottom, ${sides})`, sideSize, "100% 0"),
      layer(`conic-gradient(at 50% 0, ${baseStripes.join(", ")})`, `100% ${pct(below)}`, "0 100%"),
    ];
  };
};

/**
 * A bordure chequy on a frame's ring: a palar grid from the frame's top-left corner, three checks
 * across the bordure, whatever its outline.
 * @param {string} a The first tincture's paint, in the top-left check.
 * @param {string} b The second's.
 * @returns {{image: string, size: string, position: string, repeat: string}[]} One layer.
 */
const chequyRing = (a, b) => {
  const check = (BORDURE_WIDTH * W) / 3;
  return [
    {
      image: chequer(a, b),
      size: `${pct((2 * check * 100) / W)} ${pct((2 * check * 100) / H)}`,
      position: "0 0",
      repeat: "repeat",
    },
  ];
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
// Shield outlines, such as the heater, have no line and aren't ordinaries.
const DRAWN = {};
for (const key of Object.keys(PATHS)) {
  const name = LINE_NAMES.find((line) => key.endsWith(`-${line}`));
  if (!name) {
    continue;
  }
  DRAWN[key] = PATHS[key];
  const ordinary = key.slice(0, -name.length - 1);
  const reversedKey = `${ordinary}-reversed-${name}`;
  const upperOnly = name === "embattled" && UPPER_ONLY.includes(ordinary);
  if (REVERSIBLE.includes(ordinary) && !upperOnly && !(reversedKey in PATHS)) {
    DRAWN[reversedKey] = flipPath(PATHS[key]);
  }
}

/**
 * A segment moved down, its control points too.
 * @param {Array} segment One drawn segment, as in paths.js.
 * @param {number} down How far to move it, in real units; negative moves it up.
 * @returns {Array} The moved segment.
 */
const moveSegment = ([command, ...n], down) => {
  switch (command) {
    case "M":
    case "L":
      return [command, n[0], num(n[1] + down)];
    case "C":
      return [command, n[0], num(n[1] + down), n[2], num(n[3] + down), n[4], num(n[5] + down)];
    case "A":
      return [command, ...n.slice(0, 6), num(n[6] + down)];
    default:
      return [command];
  }
};

// The plain chevron's peak runs 26.4–57.6 and the chevronel's 34.2–49.8.
const CHEVRONEL_INSET = 7.8;

/**
 * A chevronel from a chevron drawing: its upper edge moved down and its lower edge up, each by
 * CHEVRONEL_INSET. The edges change at the flank joins, lines along x = 0 or x = 100.
 * @param {Array[]} segments The chevron's drawing, as in paths.js, only "L" and "C" after "M".
 * @returns {Array[]} The chevronel's drawing.
 */
const narrowed = (segments) => {
  const end = (segment) => [segment.at(-2), segment.at(-1)];
  const onFlank = (from, to) => [0, W].some((x) => from[0] === x && to[0] === x);
  const edgeOf = [];
  let edge = 0;
  let previous = end(segments[0]);
  for (const segment of segments) {
    if (segment[0] === "L" && onFlank(previous, end(segment))) {
      edge = 1 - edge;
    }
    edgeOf.push(edge);
    if (segment[0] !== "Z") {
      previous = end(segment);
    }
  }
  const meanY = [0, 1].map((side) => {
    const ys = segments
      .filter((segment, i) => edgeOf[i] === side && segment[0] !== "Z")
      .map((segment) => segment.at(-1));
    return ys.reduce((sum, y) => sum + y, 0) / ys.length;
  });
  const upper = meanY[0] < meanY[1] ? 0 : 1;
  return segments.map((segment, i) =>
    moveSegment(segment, edgeOf[i] === upper ? CHEVRONEL_INSET : -CHEVRONEL_INSET),
  );
};

/**
 * Copies of a drawing moved down by each offset, as one drawing of several subpaths.
 * @param {Array[]} segments A closed drawing, as in paths.js.
 * @param {number[]} offsets How far down to move each copy, in real units.
 * @returns {Array[]} The copies, each starting with its own "M".
 */
const stacked = (segments, offsets) =>
  offsets.flatMap((offset) => segments.map((segment) => moveSegment(segment, offset)));

// A chevronel's width, which is also the gap between two.
const CHEVRONEL_STEP = 15.6;
// Lines whose chevronel is the chevron's drawing narrowed, unless drawn.
const NARROWED = ["indented", "embattled"];
// How far three chevronels sit below the stack the polygon first had, in real units, by eye.
const THREE_CHEVRONELS_SHIFT = {
  indented: 6,
  embattled: 14.4,
  wavy: 6,
};
// A drawn `chevronel-<line>` takes precedence over a narrowed one. Without either, the line is
// generated from the polygon.
for (const [line, shift] of Object.entries(THREE_CHEVRONELS_SHIFT)) {
  const single =
    PATHS[`chevronel-${line}`] ??
    (NARROWED.includes(line) ? narrowed(PATHS[`chevron-${line}`]) : undefined);
  if (!single) {
    continue;
  }
  DRAWN[`chevronel-${line}`] = single;
  DRAWN[`two-chevronels-${line}`] = stacked(single, [-CHEVRONEL_STEP, CHEVRONEL_STEP]);
  DRAWN[`three-chevronels-${line}`] = stacked(
    single,
    [-2 * CHEVRONEL_STEP, 0, 2 * CHEVRONEL_STEP].map((offset) => offset + shift),
  );
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

/**
 * A `between` layout with overrides on top, a count's points replaced whole.
 * @param {object} plain The plain ordinary's layout, from BETWEEN.
 * @param {object|undefined} override Its size, points or counts to replace, or nothing.
 * @returns {object} The merged layout.
 */
const mergeLayout = (plain, override) =>
  override ? { ...plain, ...override, counts: { ...plain.counts, ...override.counts } } : plain;

// The plain ordinary's `between` layout, with a line's overrides on top.
const mergeLined = (ordinary, line) =>
  mergeLayout(BETWEEN[ordinary], BETWEEN_LINED[ordinary]?.[line]);

// Cotises on each side, by modifier.
const COTISED = { cotised: 1, "double-cotised": 2 };

/**
 * The plain ordinary's `between` layout, with its cotises' overrides on top.
 * @param {string} ordinary A cotisable ordinary, e.g. "bend".
 * @param {string} kind A key of COTISED.
 * @returns {object} The merged layout.
 */
const mergeCotised = (ordinary, kind) =>
  mergeLayout(BETWEEN[ordinary], BETWEEN_COTISED[ordinary]?.[kind]);

/**
 * The plain ordinary's `on` layout, with its cotises' overrides on top, before scaling.
 * @param {string} ordinary A cotisable ordinary with an `on` layout, e.g. "pile".
 * @param {string} kind A key of COTISED.
 * @returns {object} The merged layout.
 */
const mergeOnCotised = (ordinary, kind) => mergeLayout(ON[ordinary], ON_COTISED[ordinary]?.[kind]);

const onVars = ({ size, counts }, scale = 1) => {
  const vars = { "--on-size": `${+(size * scale).toFixed(2)}%` };
  for (const [count, override] of Object.entries(counts)) {
    if (override.size !== undefined) {
      vars[`--on-${count}-size`] = `${+(override.size * scale).toFixed(2)}%`;
    }
    override.points.forEach(([left, top], i) => {
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

  for (const [ordinary, kinds] of Object.entries(BETWEEN_COTISED)) {
    for (const kind of Object.keys(kinds)) {
      allVars.push(...Object.keys(betweenVars(mergeCotised(ordinary, kind))));
    }
  }

  for (const [ordinary, kinds] of Object.entries(ON_COTISED)) {
    for (const kind of Object.keys(kinds)) {
      allVars.push(...Object.keys(onVars(mergeOnCotised(ordinary, kind))));
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

// The label, in % of the field: the bar's top and bottom, and the points' width and bottom.
const LABEL = { top: 9, bar: 14, width: 10, bottom: 28 };

/**
 * A label's outline: a bar across the field with a straight-sided point hanging from it, centred
 * at x = 100 * (i + 1) / (n + 1), throughout (to the field's edges).
 * @param {number} points How many points hang from the bar.
 * @returns {string} A CSS `polygon()`, in % of the field.
 */
const labelPolygon = (points) => {
  const half = LABEL.width / 2;
  const vertices = [
    [0, LABEL.top],
    [100, LABEL.top],
    [100, LABEL.bar],
  ];
  for (let i = points; i >= 1; i--) {
    const centre = (100 * i) / (points + 1);
    vertices.push(
      [centre + half, LABEL.bar],
      [centre + half, LABEL.bottom],
      [centre - half, LABEL.bottom],
      [centre - half, LABEL.bar],
    );
  }
  vertices.push([0, LABEL.bar]);
  return polygon(vertices);
};

// Each tincture's class suffix and colour, and "of the first" (see --the-first in grailwind.css).
const PAINTS = [
  ...TINCTURES.map((tincture) => [tincture, `var(--color-${tincture})`]),
  [OF_THE_FIRST, "var(--the-first, transparent)"],
];

// Any frame, e.g. the heater, and a frame's field as `${FRAME} > *`.
const FRAME = `:is(${FRAMES.map((frame) => `.${frame}`).join(", ")})`;

// The outline's width, just inside the frame's edge.
const OUTLINE_WIDTH = "2px";

export {
  BORDURE_DEPTH,
  BORDURE_WIDTH,
  bordurePath,
  CORNER_LOBE,
  cotiseGeometry,
  cotisedVars,
  outlinePoints,
  SCALLOP_DEPTH,
  draftOutline,
  DRAWN,
  flipPath,
  frameOutline,
  generatedShape,
  ORDINARIES,
  pathShape,
  svgPath,
};

export default plugin(({ addBase, addUtilities, theme }) => {
  // Unset on an inescutcheon, a canton or a part of a divided shield, so it can't inherit its
  // shield's layout. In the base layer, so an ordinary on it still sets its own.
  addBase({
    [`.inescutcheon, .inescutcheon > *, .canton, :is(.heater, .heater *):is(.quarterly, .per-pale, .per-fess) > ${PART}`]:
      Object.fromEntries(layoutVars().map((name) => [name, "initial"])),
  });

  // Vair's points reach the top edge, so on a part under the frame's outline the panes start
  // below it, and in the parts above a fess-point line the rows still end on it.
  const FRAME = ":is(.heater, .inescutcheon)";
  const ON_SHIELD = ":is(.heater, .heater *)";
  const TWO_PARTS = `:has(> :nth-child(2 of ${PART}):nth-last-child(1 of ${PART}))`;
  addBase({
    [`${FRAME} > ${PART}`]: vairBelow(OUTLINE_WIDTH, `${FESS_POINT}%`, 0.5),
    [`${FRAME} > .per-pale > ${PART}, ${FRAME} > .per-fess > :nth-child(1 of ${PART})`]:
      vairBelow(OUTLINE_WIDTH),
    [`${FRAME} > .per-fess${ON_SHIELD}${TWO_PARTS} > :nth-child(1 of ${PART})`]: vairBelow(
      OUTLINE_WIDTH,
      "100%",
      0.5,
    ),
    [`${FRAME} > .quarterly${ON_SHIELD} > :nth-child(-n + 2 of ${PART})`]: vairBelow(
      OUTLINE_WIDTH,
      "100%",
      1,
    ),
  });

  const utilities = {};

  // The frame's shape. Inside it, from the bottom: the field's ordinaries (1), its charges, the
  // bordure's ring (2, set by bordure-*), the chief (3) and its charges and a label (4), a canton or
  // inescutcheon (5), and the outline (6). Every frame is drawn as a heater.
  const heater = frameOutline(PATHS.heater);
  for (const frame of FRAMES) {
    utilities[`.${frame}`] = {
      "clip-path": heater.outer,
      "&::before": {
        content: '""',
        position: "absolute",
        inset: "0",
        "z-index": "6",
        "background-color": "var(--color-sable)",
        "clip-path": heater.ring(OUTLINE_WIDTH),
      },
      "&::after": {
        position: "absolute",
        inset: "0",
        "z-index": "2",
        "clip-path": heater.ring("var(--bordure-width)"),
        // A bordure on a per-pale part sets --ring-dexter or --ring-sinister: the ring on that half.
        "background-image":
          "linear-gradient(to right, var(--ring-dexter, transparent) 50%, var(--ring-sinister, transparent) 50%)",
      },
    };
  }

  // On a frame's field the border is transparent and the ring paints the bordure. An engrailed
  // ring bites into the field, so the field's border is narrower by the scallops' depth and the
  // field grows into the bites. Anywhere else the border is the bordure, plain.
  //
  // A bordure on a per-pale part is the ring on that half (see the frame's ::after), and the part
  // has no border on the palar side, so the bordure stops at the line as the rule says. Limits:
  // a part's bordure is always plain, a fur's ground only, and of-the-first takes the shield's
  // first. A bordure on both the field and a part isn't handled. A chief on a bordured part goes
  // under the ring, as the part is a stacking context; it steps out only by the sides that have
  // a bordure (--bordure-inset-dexter and -sinister).
  const BORDER = "var(--bordure-width, 0.75rem)";
  const narrowed = `calc(var(--bordure-width) * ${num(1 - BORDURE_DEPTH)})`;
  // Each part, and the side it has no bordure on: its half of the ring, its palar border and the
  // step-out that's 0 there.
  const PARTS = {
    [`nth-child(1 of ${PART})`]: ["dexter", "border-right-width", "--bordure-inset-sinister"],
    [`nth-last-child(1 of ${PART})`]: ["sinister", "border-left-width", "--bordure-inset-dexter"],
  };
  const furPaints = Object.keys(FURS).map((fur) => ({
    name: fur,
    colour: `var(--color-${FURS[fur][0]})`,
    ring: ringBackground(fur, theme),
  }));
  const tinctures = PAINTS.map(([tincture, colour]) => ({
    name: tincture,
    colour,
    ring: {
      "background-color": tincture === OF_THE_FIRST ? "var(--frame-first, transparent)" : colour,
    },
  }));
  /**
   * A bordure's rules: a border round what's inside it, painted in `colour` off a frame. On a
   * frame's field the border is transparent and the frame's ring is painted by `ring`.
   * @param {string} colour The border's colour off a frame.
   * @param {string} half The ring's half for a bordure on a per-pale part.
   * @param {Object<string, string>} ring Background declarations for the frame's ring.
   * @param {string[]|false|""} clip A lined ring's clip-paths, or nothing for the plain ring.
   * @param {boolean} engrailed Whether the field's border narrows into the ring's bites.
   * @returns {object} The utility's rules.
   */
  const bordureRules = (colour, half, ring, clip, engrailed) => {
    const part = {};
    for (const [child, [side, open, inset]] of Object.entries(PARTS)) {
      part[`${FRAME} > .per-pale > &:${child}`] = {
        "border-color": "transparent",
        [open]: "0",
        [inset]: "0px",
      };
      part[`${FRAME}:has(> .per-pale > &:${child})::after`] = {
        content: '""',
        [`--ring-${side}`]: half,
      };
    }
    return {
      "border-style": "solid",
      "border-width": BORDER,
      "border-color": colour,
      "--bordure-inset": BORDER,
      ":is(.heater, .inescutcheon) > &": {
        "border-color": "transparent",
        ...(engrailed && { "border-width": narrowed, "--bordure-inset": narrowed }),
      },
      ":is(.heater, .inescutcheon):has(> &)::after": {
        content: '""',
        ...ring,
        ...(clip && { "clip-path": clip }),
      },
      ...part,
    };
  };
  for (const line of ["", ...BORDURE_LINES]) {
    const sweep = line === "engrailed" ? 1 : -1;
    const clip = line && heater.lined("var(--bordure-width)", sweep);
    // Plain tinctures are in grailwind.css.
    for (const { name, colour, ring } of line ? [...tinctures, ...furPaints] : furPaints) {
      utilities[line ? `.bordure-${line}-${name}` : `.bordure-${name}`] = bordureRules(
        colour,
        ring["background-color"],
        ring,
        clip,
        sweep === 1,
      );
    }
  }

  // Patterned only on a frame's ring. Elsewhere, as on a canton or a part, it's plain in its first
  // tincture, a fur's ground.
  const ringPatterns = { compony: componyRing(PATHS.heater), chequy: chequyRing };
  for (const pattern of BORDURE_PATTERNS) {
    for (const [first, second] of PATTERN_PAIRS) {
      const { a, b, fur } = patternPaints(first, second);
      const layers = ringPatterns[pattern](a, b);
      const furRing = fur && ringBackground(fur, theme);
      if (furRing) {
        layers.push({
          image: furRing["background-image"],
          size: furRing["background-size"],
          position: furRing["background-position"],
          repeat: furRing["background-repeat"],
        });
      }
      const colour = `var(--color-${FURS[first]?.[0] ?? first})`;
      const ring = {
        ...(furRing && { "background-color": furRing["background-color"] }),
        ...joinLayers(layers, "background"),
      };
      utilities[`.bordure-${pattern}-${first}-${second}`] = bordureRules(
        colour,
        colour,
        ring,
        false,
        false,
      );
    }
  }

  for (const [tincture, colour] of PAINTS) {
    utilities[`.fimbriated-${tincture}`] = {
      "--fimbriated": "1",
      "--fimbriation": colour,
    };
  }

  // A cotisable ordinary sets its own clips and narrowed bands (cotisedVars), so these needn't know
  // the ordinary. Bare `cotised` is all the ordinary's tincture, so it keeps the plain bands.
  for (const kind of Object.keys(COTISED)) {
    utilities[`.${kind}`] = { "--cotise-clip": `var(--clip-${kind})` };
    for (const [tincture, colour] of PAINTS) {
      utilities[`.${kind}-${tincture}`] = {
        "--cotise-clip": `var(--clip-${kind})`,
        "--cotise-bands": `var(--bands-${kind})`,
        "--cotise-band-sizes": `var(--band-sizes-${kind})`,
        "--cotise-band-positions": `var(--band-positions-${kind})`,
        "--cotise": colour,
      };
    }
  }

  /**
   * The plain bands' background, its image swapped for the narrowed bands when cotised.
   * @param {object} background From bands().
   * @param {object|false} cotised Whether the ordinary is cotisable.
   * @returns {object} The background declarations.
   */
  const cotisedBackground = (background, cotised) =>
    cotised
      ? {
          ...background,
          "background-image": `var(--cotise-bands, ${background["background-image"]})`,
          "background-size": `var(--cotise-band-sizes, ${background["background-size"]})`,
          "background-position": `var(--cotise-band-positions, ${background["background-position"]})`,
        }
      : background;

  /**
   * A cotisable ordinary's layouts when cotised: `on` charges scaled with the narrowed ordinary,
   * and `between` charges moved off the cotises.
   * @param {string} ordinary One of COTISABLE.
   * @returns {object} The rules, for its own element.
   */
  const cotisedRules = (ordinary) => {
    const rules = {};
    for (const [kind, pairs] of Object.entries(COTISED)) {
      const classes = [kind, ...PAINTS.map(([tincture]) => `${kind}-${tincture}`)];
      const { width } = cotiseGeometry(ordinary, pairs);
      rules[`&:is(${classes.map((cls) => `.${cls}`).join(", ")})`] = {
        ...(BETWEEN_COTISED[ordinary]?.[kind] && betweenVars(mergeCotised(ordinary, kind))),
        ...(ON[ordinary] &&
          onVars(mergeOnCotised(ordinary, kind), (4 * width) / plainWidth(ordinary))),
      };
    }
    return rules;
  };

  // Isolated, so an ordinary in a quarter paints under the shield's own ordinary. A frame's field
  // isn't, so the frame's bordure ring can go between its ordinaries and its chief.
  const ordinaryRules = (ordinary, pseudo, line) => ({
    position: "relative",
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
      // The chief goes over a frame's bordure ring, and its charges over it.
      "z-index": PSEUDO[ordinary] ? "3" : "1",
      ...pseudo,
    },
    [`&:not(${FRAME} > *)`]: { isolation: "isolate" },
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

    // Only a cotisable ordinary's ::before takes the cotises, so no other's is painted in them.
    const cotised = COTISABLE.includes(ordinary) && cotisedRules(ordinary);
    for (const [tincture, colour] of PAINTS) {
      utilities[`.${ordinary}-${tincture}`] = {
        ...ordinaryRules(ordinary, {
          ...placed,
          ...(BANDS[ordinary]
            ? {
                "--fimbriated": "inherit",
                "--fimbriation": "inherit",
                ...(cotised && {
                  "--cotise-clip": "inherit",
                  "--cotise-bands": "inherit",
                  "--cotise-band-sizes": "inherit",
                  "--cotise-band-positions": "inherit",
                  "--cotise": "inherit",
                }),
                "background-color": `var(--fimbriation, var(--cotise, ${colour}))`,
                ...cotisedBackground(bands(BANDS[ordinary], colour), cotised),
                "clip-path": cotised
                  ? `var(--cotise-clip, ${widenedPolygon(vertices)})`
                  : widenedPolygon(vertices),
              }
            : {
                "background-color": colour,
                "clip-path": plain,
              }),
        }),
        ...(cotised && { ...cotisedVars(ordinary, colour), ...cotised }),
      };
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

    // Without the fimbriation vars, as for a fur. Two furs aren't generated.
    if (CHEQUY.includes(ordinary)) {
      for (const [first, second] of PATTERN_PAIRS) {
        utilities[`.${ordinary}-chequy-${first}-${second}`] = ordinaryRules(ordinary, {
          ...placed,
          ...joinLayers(chequyLayers(ordinary, first, second, theme), "background"),
          "clip-path": chequyClip(ordinary),
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
      utilities[`.${ordinary}-voided-counterchanged`] = ordinaryRules(ordinary, {
        ...counterchanged,
        "clip-path": voidedPolygon(vertices, VOIDS[ordinary], pointBelowChief),
      });
    }
  }

  // A label is a child of the field, over everything but a canton or inescutcheon, and on the
  // chief if there is one. Its shape is in its ::before, so charges on its points aren't clipped.
  for (const [name, points] of Object.entries(LABELS)) {
    const clip = labelPolygon(points);
    const label = (ground) => ({
      position: "absolute",
      inset: "0",
      "z-index": "4",
      // It lies on a chief, so it and its charges ignore the field's.
      "--field-top": "0%",
      ...onVars(ON[name]),
      "&::before": {
        content: '""',
        position: "absolute",
        inset: "0",
        "clip-path": clip,
        ...ground,
      },
    });
    for (const [tincture, colour] of PAINTS) {
      utilities[`.${name}-${tincture}`] = label({ "background-color": colour });
    }
    for (const fur of Object.keys(FURS)) {
      utilities[`.${name}-${fur}`] = label(furBackground(fur, theme));
    }
  }

  addUtilities(utilities);
});
