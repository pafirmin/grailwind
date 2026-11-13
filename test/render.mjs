// Renders shields in Chromium and Firefox and checks the tincture at chosen points.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, firefox } from "playwright";
import { BETWEEN, DIVISIONS, lineOrdinaries, ON } from "../data.js";
import { build, root } from "./build.mjs";

const out = join(root, "test", ".render");

const TINCTURES = ["or", "argent", "gules", "azure", "vert", "purpure", "sable"];
const ORDINARIES = [
  "pale",
  "fess",
  "bar",
  "two-bars",
  "three-bars",
  "bend",
  "bend-sinister",
  "chevron",
  "cross",
  "saltire",
  "pall",
  "chief",
  "pile",
  "chevron-reversed",
  "pall-reversed",
  "pile-reversed",
];
const WIDTH = 300;
// A point in px on the 300 × 360 shield, as %.
const px = (x, y) => [(x * 100) / WIDTH, (y * 100) / (WIDTH * 1.2)];

const bezants = (n) => Array.from({ length: n }, () => "bezant");

const CROSSES = [
  "cross-couped",
  "cross-potent",
  "cross-pattee",
  "maltese-cross",
  "cross-crosslet",
  "cross-moline",
  "cross-fleury",
  "shakefork",
];
// Box points inside the shape where the centre isn't: the Maltese arms meet at a point.
const SOLID = { "maltese-cross": [50, 35], shakefork: [50, 80] };
// A point in a lone charge's 100 × 100 box, on the shield: the charge is 50% wide at [50, 45].
const lone = ([bx, by]) => [50 + (bx - 50) * 0.5, 45 + ((by - 50) * 0.5 * 5) / 6];

// A charge's centre, plus four points at 0.8 of its radius, so that a charge moved by more than
// a fifth of its radius leaves one of them uncovered. A roundel's radius is 0.46 of its width.
const ring = ([x, y], size) => {
  const r = 0.8 * 0.46 * size;
  const ry = (r * 5) / 6;
  return [
    [x, y],
    [x - r, y],
    [x + r, y],
    [x, y - ry],
    [x, y + ry],
  ];
};

// One probe per charge; `charges` is the container's classes besides `charges`, and `size` the
// charge width as % of the shield's.
const charged = (shield, charges, size, points, why) =>
  points.map((point, i) => ({
    shield,
    charges,
    items: bezants(points.length),
    at: ring(point, size),
    expect: "or",
    why: points.length > 1 ? `${why}, charge ${i + 1}` : why,
  }));
// A fur's tile, as % of the shield: 6 across, and 5:6 like the shield, so the same % down.
const FUR_TILE = 100 / 6;
const furSpot = (k, j) => [FUR_TILE * (k + 0.25), FUR_TILE * (j + 0.25) + FUR_TILE / 10];
const furGround = (k, j) => [FUR_TILE * (k + 0.75), FUR_TILE * (j + 0.25)];
// A point is kept off the shield's rounded base, which is tighter near the flanks.
const onShield = (x, y) => y >= 4 && y <= (x < 20 || x > 80 ? 75 : 96);
// Bendy's n equal pieces cover the visible part of the shield, the last running to the edge.
const BENDY_VISIBLE = (30 - 15 + 16.5 + Math.sqrt(15 ** 2 + 13.5 ** 2)) / 60;
// How far across the corner-to-corner extent a point `lean` of the way through a piece is.
const bendyFraction = (pieces, piece, lean) => {
  const last = piece === pieces - 1;
  const start = (piece * BENDY_VISIBLE) / pieces;
  const end = last ? 1 : ((piece + 1) * BENDY_VISIBLE) / pieces;
  return last ? start + lean * (BENDY_VISIBLE - start) : start + lean * (end - start);
};
// A point in a piece at x, as a distance from the start corner. The fraction is the mean of the
// distances across and down. Kept off the rounded base, which is tighter near the flanks.
const bendyPoint = (pieces, piece, lean, x, sinister) => {
  const y = 100 * (2 * bendyFraction(pieces, piece, lean) - (100 - x) / 100);
  if (!onShield(x, y)) {
    return null;
  }
  return [sinister ? 100 - x : x, y];
};
const bendyPiece = (pieces, piece, sinister) => {
  for (const x of [92, 8, 75, 25, 97]) {
    const point = bendyPoint(pieces, piece, 0.5, x, sinister);
    if (point) {
      return point;
    }
  }
  throw new Error(`no point for bendy piece ${piece}`);
};
// Chevronny's dexter lines run at the angle of the field's diagonal, measured from the top left
// corner (5.76 box units to the centre line's foot); the sinister side mirrors it. Points near
// the flanks where they fit, so the angle matters.
const chevronnyPiece = (pieces, piece, side) => {
  const sine = 6 / Math.sqrt(61);
  const cosine = 5 / Math.sqrt(61);
  const along = ((piece + 0.5) / pieces) * 5.76;
  for (const x of [8, 15, 3, 45, 35, 25]) {
    const y = ((along - (x / 100) * 5 * sine) / cosine / 6) * 100;
    if (onShield(x, y)) {
      return [side === "sinister" ? 100 - x : x, y];
    }
  }
  throw new Error(`no point for chevronny piece ${piece}`);
};
// A point in a piece at the flank, `lean` of the way through it. Leaning towards a piece's edge
// puts a line at the wrong angle (45 degrees, say) in the neighbouring piece.
const bendyFlank = (pieces, piece, lean, x, sinister) => {
  const point = bendyPoint(pieces, piece, lean, x, sinister);
  if (!point) {
    throw new Error(`bendy flank point ${piece} at ${x} is off the shield`);
  }
  return point;
};
const chevronnyFlank = (pieces, piece, lean, side) => {
  const x = 10;
  const sine = 6 / Math.sqrt(61);
  const cosine = 5 / Math.sqrt(61);
  const along = ((piece + lean) / pieces) * 5.76;
  const y = ((along - (x / 100) * 5 * sine) / cosine / 6) * 100;
  if (!onShield(x, y)) {
    throw new Error(`chevronny flank point ${x}, ${y} is off the shield`);
  }
  return [side === "sinister" ? 100 - x : x, y];
};
const bothSides = (pieces, chosen) =>
  chosen.flatMap((piece) =>
    ["dexter", "sinister"].map((side) => chevronnyPiece(pieces, piece, side)),
  );
// Whole-shield points squeezed into a part: the dexter or sinister half, or the per-fess chief.
const inDexter = (points) => points.map(([x, y]) => [x / 2, y]);
const inSinister = (points) => points.map(([x, y]) => [50 + x / 2, y]);
const inChief = (points) => points.map(([x, y]) => [x, 0.45 * y]);
const bothHalves = (points) => [...inDexter(points), ...inSinister(points)];
// Chequy is 5 across and 6 down; the dexter chief square is the first tincture.
const chequySquare = (col, row) => [20 * col + 10, (100 / 6) * row + 100 / 12];
const gap = (shield, charges, n) => ({ shield, charges, items: bezants(n), expect: "azure" });
// An inescutcheon is a third of the shield with its top left at (33.5%, 28.5%), from grailwind.css.
const INNER = 0.33;
const onInner = ([x, y]) => [33.5 + INNER * x, 28.5 + INNER * y];
// A canton is a third of the shield each way, at its top left.
const CANTON = 1 / 3;
const onCanton = ([x, y]) => [CANTON * x, CANTON * y];
const SUB = { inescutcheon: [INNER, onInner], canton: [CANTON, onCanton] };
// Like `charged`, for bezants on an inescutcheon or canton `inner`; points and size are its own.
const nested = (shield, inner, size, points, why) => {
  const [scale, onSub] = SUB[inner.kind ?? "inescutcheon"];
  return points.map((point, i) => ({
    shield,
    inner: { ...inner, items: inner.items ?? bezants(points.length) },
    at: ring(onSub(point), size * scale),
    expect: "or",
    why: points.length > 1 ? `${why}, charge ${i + 1}` : why,
  }));
};
const atPoint = (name, at) => [
  {
    shield: "azure",
    charges: "",
    items: [`bezant in-${name}`],
    at: ring(at, 22),
    expect: "or",
    why: `in ${name}`,
  },
];

// Each voided ordinary: a point in its hole, in its outline and outside it, from VOIDS in
// ordinaries.js.
// prettier-ignore
const VOIDED = [
  ["pale", [50, 50], [38.75, 50], [20, 50]],
  ["fess", [50, 45], [50, 33.75], [50, 15]],
  ["bar", [50, 45], [50, 39.75], [50, 30]],
  ["bend", [50, 50], [50, 35], [50, 15]],
  ["bend-sinister", [50, 50], [50, 35], [50, 15]],
  ["chevron", [25, 60], [[25, 50], [75, 50]], [25, 40]],
  ["cross", [50, 45], [[41, 20], [59, 20], [41, 80], [59, 80], [20, 37.5], [80, 37.5], [20, 52.5], [80, 52.5]], [20, 20]],
  ["saltire", [25, 22.5], [[25, 11.5], [75, 11.5], [25, 78.5], [75, 78.5], [20, 29], [80, 29], [20, 61], [80, 61]], [50, 15]],
  ["pall", [50, 80], [[41, 80], [59, 80], [25, 9.6], [25, 30.4], [75, 9.6], [75, 30.4]], [20, 80]],
  ["pile", [50, 40], [[37.15, 40], [62.85, 40]], [20, 40]],
  // Mirrored, with a point on each arm so a wrong closing vertex in the bridge shows.
  ["chevron-reversed", [25, 40], [[25, 50], [75, 50]], [25, 60]],
  ["pall-reversed", [50, 20], [[41, 20], [59, 20], [25, 90.4], [25, 69.6], [75, 90.4], [75, 69.6]], [20, 20]],
  ["pile-reversed", [50, 60], [[37.15, 60], [62.85, 60]], [20, 60]],
];

// `at` is [x%, y%] of the shield. Bite and bulge points are at the middle scallop of an inner
// edge, half the scallop's depth from the straight edge. Charges are bezants, whose centres
// sit at the points in charges.js and the ordinaries' `between`/`on` tables.
// prettier-ignore
const PROBES = [
  { shield: "azure pale-or", at: [50, 30], expect: "or", why: "the pale is drawn" },
  { shield: "azure pale-or", at: [20, 30], expect: "azure", why: "the field beside the pale" },
  { shield: "azure fess-or", at: [50, 45], expect: "or", why: "the fess is drawn" },
  { shield: "azure fess-or", at: [50, 15], expect: "azure", why: "the field above the fess" },
  { shield: "azure bend-or", at: [50, 50], expect: "or", why: "the bend is drawn" },
  { shield: "azure bend-or", at: [75, 25], expect: "azure", why: "the field above the bend" },
  { shield: "azure bend-sinister-or", at: [50, 50], expect: "or", why: "the bend sinister is drawn" },
  { shield: "azure bend-sinister-or", at: [25, 25], expect: "azure", why: "the field above the bend sinister" },
  // At x = 25 and 75 the chevron's edges are at 47% and 73%.
  { shield: "azure chevron-or", at: [[25, 60], [25, 48], [25, 72], [75, 48], [75, 72]], expect: "or", why: "the chevron is drawn, just inside each edge" },
  { shield: "azure chevron-or", at: [[50, 60], [25, 46], [25, 74], [75, 46], [75, 74]], expect: "azure", why: "the field under the chevron, and just outside each edge" },
  { shield: "azure cross-or", at: [[50, 45], [39, 20], [61, 20], [39, 80], [61, 80], [80, 36], [80, 54]], expect: "or", why: "the cross is drawn, just inside each edge" },
  { shield: "azure cross-or", at: [[20, 20], [37, 20], [63, 20], [80, 34], [80, 56]], expect: "azure", why: "the field in the first quarter, and just outside each edge" },
  // The saltire crosses at (50, 45), its inner corners at 30.28% and 59.72%; at x = 25 its upper arm
  // runs from 7.78% to 37.22%.
  { shield: "azure saltire-or", at: [[50, 45], [50, 31.5], [50, 58.5], [25, 8.78], [25, 36.22], [75, 8.78], [75, 36.22]], expect: "or", why: "the saltire is drawn, just inside each edge" },
  { shield: "azure saltire-or", at: [[50, 20], [50, 28.5], [50, 61.5], [25, 6.78], [25, 38.22], [75, 6.78], [75, 38.22]], expect: "azure", why: "the field above the saltire, and just outside each edge" },
  { shield: "azure pall-or", at: [50, 70], expect: "or", why: "the pall's foot is drawn" },
  { shield: "azure pall-or", at: [50, 20], expect: "azure", why: "the field above the pall" },
  // The pall's arms run from 6.14% to 33.86% down at x = 25, and its foot from x 38 to 62.
  { shield: "azure pall-or", at: [[25, 8.14], [25, 31.86], [75, 8.14], [75, 31.86], [39, 80], [61, 80]], expect: "or", why: "the pall's arms and foot, just inside each edge" },
  { shield: "azure pall-or", at: [[25, 4.14], [25, 35.86], [75, 4.14], [75, 35.86], [37, 80], [63, 80]], expect: "azure", why: "the field beside the pall, just outside each edge" },
  { shield: "azure chief-or", at: [50, 15], expect: "or", why: "the chief is drawn" },
  { shield: "azure chief-or", at: [50, 50], expect: "azure", why: "the field below the chief" },

  { shield: "azure pale-engrailed-or", at: [62.7, 50], expect: "azure", why: "a bite in the pale" },
  { shield: "azure fess-engrailed-or", at: [50, 32.1], expect: "azure", why: "a bite in the fess" },
  { shield: "azure bend-engrailed-or", at: [58.1, 41.3], expect: "azure", why: "a bite in the bend" },
  { shield: "azure bend-sinister-engrailed-or", at: [41.9, 41.3], expect: "azure", why: "a bite in the bend sinister" },
  { shield: "azure chevron-engrailed-or", at: [20.56, 75.21], expect: "azure", why: "a bite in the chevron" },
  { shield: "azure cross-engrailed-or", at: [81, 36.9], expect: "azure", why: "a bite in the cross" },
  // Drawn (drawings/cross-engrailed.svg), after FD Fig. 156: each inner corner is one round
  // scallop of radius 5 on the plain corner, a knob of field wrapping it.
  { shield: "azure cross-engrailed-or", at: [[40, 36.67], [60, 36.67], [40, 53.33], [60, 53.33]], expect: "azure", why: "a round knob of field at each of the cross engrailed's inner corners" },
  { shield: "azure cross-engrailed-or", at: [[44, 40], [56, 40], [44, 50], [56, 50]], expect: "or", why: "the cross engrailed solid beyond each corner's knob" },
  { shield: "azure saltire-engrailed-or", at: [85.79, 65.15], expect: "azure", why: "a bite in the saltire" },
  { shield: "azure pall-engrailed-or", at: [12.5, 22.1], expect: "azure", why: "a bite in the pall" },
  { shield: "azure pall-engrailed-or", at: [52.5, 34], expect: "or", why: "the pall engrailed is solid at its junction" },
  { shield: "azure chief-engrailed-or", at: [50, 27.9], expect: "azure", why: "a bite in the chief" },
  { shield: "gules chevron-engrailed-or", at: [50, 24], expect: "gules", why: "no sliver above the chevron's peak" },

  { shield: "azure fess-invected-or", at: [50, 27.9], expect: "or", why: "a bulge on the fess" },
  { shield: "azure bend-sinister-invected-or", at: [38.1, 38.7], expect: "or", why: "a bulge on the bend sinister" },
  { shield: "azure chief-invected-or", at: [50, 32.1], expect: "or", why: "a bulge on the chief" },

  // Half-waves are 14 wide from the dexter edge, so x 49 and 63 are a trough and a crest.
  { shield: "azure fess-wavy-or", at: [49, 31.2], expect: "azure", why: "the fess's top edge dips" },
  { shield: "azure fess-wavy-or", at: [49, 61.2], expect: "or", why: "the fess's bottom edge dips with it" },
  { shield: "azure fess-wavy-or", at: [63, 28.8], expect: "or", why: "the fess's top edge rises" },
  { shield: "azure fess-wavy-or", at: [63, 58.8], expect: "azure", why: "the fess's bottom edge rises with it" },

  // Merlons and crenels are 100/15 wide from the dexter edge, ±3 about the edge: x 45.5 is a merlon, 52.5 a crenel.
  { shield: "azure fess-embattled-or", at: [45.5, 29], expect: "or", why: "a merlon on the fess" },
  { shield: "azure fess-embattled-or", at: [52.5, 31], expect: "azure", why: "a crenel in the fess" },
  { shield: "azure fess-embattled-or", at: [[45.5, 61], [52.5, 61]], expect: "azure", why: "a fess embattled is plain below" },
  { shield: "azure fess-embattled-or", at: [[45.5, 59], [52.5, 59]], expect: "or", why: "a fess embattled is plain below, inside" },
  // Down the pale, y 47% (56.4 units) is a merlon and 41.5% (49.8) a crenel, on both edges.
  { shield: "azure pale-embattled-or", at: [[33.5, 47], [66.5, 47]], expect: "or", why: "merlon opposite merlon" },
  { shield: "azure pale-embattled-or", at: [[36.5, 41.5], [63.5, 41.5]], expect: "azure", why: "crenel opposite crenel" },
  // Down the pale indented, turns are 100/14 apart and both edges shift together: left at y 47.6%
  // (turn 8), right at 41.7% (turn 7). So each point stands opposite a notch.
  { shield: "azure pale-indented-or", at: [[33, 47.6], [67, 41.7]], expect: "or", why: "a point on each edge" },
  { shield: "azure pale-indented-or", at: [[63, 47.6], [37, 41.7]], expect: "azure", why: "a notch opposite each point" },

  { shield: "or chevron-gules chief-azure", at: [50, 38], expect: "or", why: "the chevron moves below a chief" },

  ...VOIDED.flatMap(([o, hole, outline, outside]) => [
    { shield: `gules ${o}-voided-argent`, at: hole, expect: "gules", why: `the hole in a ${o} voided` },
    { shield: `gules ${o}-voided-argent`, at: outline, expect: "argent", why: `the outline of a ${o} voided` },
    { shield: `gules ${o}-voided-argent`, at: outside, expect: "gules", why: `the field beside a ${o} voided` },
  ]),
  { shield: "gules cross-voided-argent", at: [[50, 2], [50, 98], [2, 45], [98, 45]], expect: "gules", why: "a cross voided is open at its ends" },
  { shield: "gules chief-or cross-voided-argent", at: [50, 32], expect: "gules", why: "the hole in a cross voided, just below a chief" },
  { shield: "gules chief-or cross-voided-argent", at: [41, 33], expect: "argent", why: "the outline of a cross voided, just below a chief" },
  { shield: "gules saltire-voided-ermine", at: [8.33, 20.83], expect: "argent", why: "the outline of a saltire voided ermine shows its ground" },
  { shield: "gules saltire-voided-ermine", at: [25, 25], expect: "gules", why: "the hole in a saltire voided ermine" },
  { shield: "per-pale-or-azure cross-voided-argent", at: [47.5, 20], expect: "or", why: "the field shows through a cross voided, dexter" },
  { shield: "per-pale-or-azure cross-voided-argent", at: [52.5, 20], expect: "azure", why: "the field shows through a cross voided, sinister" },
  { shield: "azure cross-voided-argent", charges: "semy", items: ["mullet or"], at: [18.75, 44.5], expect: "or", why: "a semé shows through a cross voided" },
  { shield: "per-pale-or-gules cross-voided-counterchanged", at: [[41, 20], [52.5, 20]], expect: "gules", why: "a cross voided counterchanged: dexter outline swapped, sinister hole shows the field" },
  { shield: "per-pale-or-gules cross-voided-counterchanged", at: [[59, 20], [47.5, 20]], expect: "or", why: "a cross voided counterchanged: sinister outline swapped, dexter hole shows the field" },
  { shield: "per-pale-or-gules chief-azure cross-voided-counterchanged", at: [41, 33], expect: "gules", why: "the outline of a cross voided counterchanged, just below a chief" },
  { shield: "per-pale-or-gules chief-azure cross-voided-counterchanged", at: [47.5, 32], expect: "or", why: "the hole in a cross voided counterchanged, just below a chief" },
  { shield: "gules cross-azure fimbriated-argent", at: [[36.5, 15], [63.5, 15]], expect: "argent", why: "the cross's fimbriation" },
  { shield: "gules cross-azure fimbriated-argent", at: [50, 45], expect: "azure", why: "the fimbriated cross itself" },
  // At x = 25 and 75 the arms' centre lines are at 22.5% and 67.5%, 14.72% from each edge; the
  // fimbriation is 3.68% deep. Each probe is 1% from an edge.
  { shield: "gules saltire-azure fimbriated-argent", at: [[25, 8.78], [25, 36.22], [75, 8.78], [75, 36.22], [25, 53.78], [25, 81.22], [75, 53.78], [75, 81.22], [50, 45]], expect: "azure", why: "the fimbriated saltire, just inside each edge" },
  { shield: "gules saltire-azure fimbriated-argent", at: [[25, 6.78], [25, 38.22], [75, 6.78], [75, 38.22], [25, 51.78], [25, 83.22], [75, 51.78], [75, 83.22]], expect: "argent", why: "the saltire's fimbriation, on each side of each arm" },
  { shield: "gules saltire-azure fimbriated-argent", at: [[25, 3.1], [25, 41.9], [75, 3.1], [75, 41.9], [25, 48.1], [25, 86.9], [75, 48.1], [75, 86.9], [50, 20]], expect: "gules", why: "the field beyond the saltire's fimbriation" },
  { shield: "per-pale-or-gules chevron-counterchanged", at: [25, 60], expect: "gules", why: "the counterchanged chevron's dexter half" },
  { shield: "per-pale-or-gules chevron-counterchanged", at: [75, 60], expect: "or", why: "the counterchanged chevron's sinister half" },

  // Bars are one polygon joined along x = 0, so the gaps at the dexter edge must stay open.
  { shield: "azure bar-or", at: [[50, 45], [2, 45]], expect: "or", why: "the bar is drawn" },
  { shield: "azure bar-or", at: [[50, 35], [50, 55]], expect: "azure", why: "the field above and below the bar" },
  { shield: "azure two-bars-or", at: [[50, 33], [50, 57], [2, 33], [2, 57]], expect: "or", why: "both bars are drawn" },
  { shield: "azure two-bars-or", at: [[50, 45], [2, 45], [50, 22], [50, 68]], expect: "azure", why: "the field between, by the seam and around the bars" },
  { shield: "azure three-bars-or", at: [[50, 25], [50, 45], [50, 65], [2, 25], [2, 45], [2, 65]], expect: "or", why: "all three bars are drawn" },
  { shield: "azure three-bars-or", at: [[50, 35], [50, 55], [2, 35], [2, 55], [50, 15], [50, 75]], expect: "azure", why: "the field between, by the seam and around the bars" },
  // Seven scallops across, so x = 50 is the middle of one and x = 300/7 a cusp, where no bite reaches.
  { shield: "azure three-bars-engrailed-or", at: [[50, 22.1], [50, 27.9], [50, 42.1], [50, 47.9], [50, 62.1], [50, 67.9]], expect: "azure", why: "bites in each bar's edges" },
  { shield: "azure three-bars-engrailed-or", at: [[42.86, 25], [42.86, 45], [42.86, 65], [2, 25]], expect: "or", why: "each engrailed bar is drawn" },
  { shield: "azure three-bars-engrailed-or", at: [[2, 35], [2, 55]], expect: "azure", why: "the engrailed bars' seam stays open" },
  { shield: "azure two-bars-invected-or", at: [[50, 24.9], [50, 41.1], [50, 48.9], [50, 65.1]], expect: "or", why: "bulges on each bar's edges" },
  { shield: "azure two-bars-invected-or", at: [[42.86, 45], [2, 45]], expect: "azure", why: "the field between invected bars" },
  { shield: "gules three-bars-azure fimbriated-argent", at: [[50, 18.75], [50, 31.25], [50, 51.25], [50, 58.75], [50, 71.25]], expect: "argent", why: "each bar's fimbriation" },
  { shield: "gules three-bars-azure fimbriated-argent", at: [[50, 25], [50, 45], [50, 65], [2, 45]], expect: "azure", why: "the fimbriated bars themselves" },
  { shield: "gules three-bars-azure fimbriated-argent", at: [[50, 35], [50, 55], [2, 35], [2, 55]], expect: "gules", why: "the field between fimbriated bars" },
  // Below a chief, a bar's y is 30 + 0.7y.
  { shield: "or three-bars-gules chief-azure", at: [[50, 47.5], [50, 61.5], [50, 75.5]], expect: "gules", why: "bars move below a chief" },
  { shield: "or three-bars-gules chief-azure", at: [[50, 54.5], [50, 68.5], [2, 54.5]], expect: "or", why: "the field between bars below a chief" },
  { shield: "per-pale-or-gules two-bars-counterchanged", at: [[25, 33], [25, 57]], expect: "gules", why: "counterchanged bars' dexter half" },
  { shield: "per-pale-or-gules two-bars-counterchanged", at: [[75, 33], [75, 57], [25, 45]], expect: "or", why: "counterchanged bars' sinister half, and the field between" },
  { shield: "per-pale-or-gules bar-counterchanged chief-azure", at: [25, 61.5], expect: "gules", why: "a counterchanged bar below a chief" },
  { shield: "per-pale-or-gules bar-counterchanged chief-azure", at: [25, 45], expect: "or", why: "nothing left of a counterchanged bar where it was" },
  { shield: "gules bar-ermine", at: furSpot(1, 2), expect: "sable", why: "a spot on a fur bar" },
  { shield: "gules bar-ermine", at: [50, 30], expect: "gules", why: "the field above a fur bar" },
  // The pile's sides run from (17, 0) and (83, 0) to (50, 85), so at 40% down they're at 32.53 and 67.47.
  { shield: "azure pile-or", at: [[50, 20], [50, 50], [50, 78], [34.03, 40], [65.97, 40]], expect: "or", why: "the pile is drawn, down to near its tip" },
  { shield: "azure pile-or", at: [[20, 20], [80, 20], [31.03, 40], [68.97, 40], [50, 88]], expect: "azure", why: "the field either side and below the tip" },
  // Eight scallops a side, each 4.6 units deep; the bite is half that in from the middle of the fifth from the tip.
  { shield: "azure pile-engrailed-or", at: [[33.67, 36.59], [66.33, 36.59]], expect: "azure", why: "a bite in each side of the pile" },
  { shield: "azure pile-engrailed-or", at: [[50, 20], [36.35, 41.73], [63.65, 41.73]], expect: "or", why: "the engrailed pile, by a cusp on each side" },
  // Drawn (drawings/pile-engrailed.svg): its point reaches the plain pile's tip at 85%, 4 px wide at 81%.
  { shield: "azure pile-engrailed-or", at: [50, 81], expect: "or", why: "the engrailed pile's point runs on to its tip" },
  { shield: "azure pile-engrailed-or", at: [50, 86], expect: "azure", why: "no sliver below the engrailed pile's tip" },
  // Fimbriated, each side moves out 3.15% across, and the tip down to 93.1%.
  { shield: "gules pile-azure fimbriated-argent", at: [[31.03, 40], [68.97, 40], [50, 88]], expect: "argent", why: "the pile's fimbriation, on each side and below the tip" },
  { shield: "gules pile-azure fimbriated-argent", at: [[34.03, 40], [65.97, 40], [50, 1], [50, 30], [50, 60], [50, 80]], expect: "azure", why: "the pile itself, just inside each side and down its centre line" },
  { shield: "gules pile-azure fimbriated-argent", at: [[27.88, 40], [72.12, 40], [20, 80]], expect: "gules", why: "the field beyond the pile's fimbriation" },
  // At an odd width the two tiles meet mid-pixel, at 152.5px: 49.8% and 50.2% read pixels 152 and 153.
  // A multiple of 5, so the 5:6 shield's height stays whole and later rows stay on the pixel grid.
  { shield: "gules pile-azure fimbriated-argent w-[305px]!", at: [[49.8, 20], [50.2, 20], [49.8, 50], [50.2, 50], [49.8, 75], [50.2, 75]], expect: "azure", why: "no seam down a fimbriated pile where its tiles meet" },
  // Below a chief, the pile's y is 30 + 0.7y; across, it's unchanged.
  { shield: "gules pile-azure fimbriated-argent chief-or", at: [[31.03, 58], [68.97, 58]], expect: "argent", why: "the fimbriation of a pile below a chief" },
  { shield: "gules pile-azure fimbriated-argent chief-or", at: [[34.03, 58], [65.97, 58], [50, 40]], expect: "azure", why: "a fimbriated pile below a chief" },
  { shield: "gules pile-azure fimbriated-argent chief-or", at: [[27.88, 58], [72.12, 58]], expect: "gules", why: "the field beside a fimbriated pile below a chief" },
  { shield: "per-pale-or-gules pile-counterchanged", at: [45, 30], expect: "gules", why: "the counterchanged pile's dexter half" },
  { shield: "per-pale-or-gules pile-counterchanged", at: [[55, 30], [20, 30]], expect: "or", why: "the counterchanged pile's sinister half, and the field beside it" },
  { shield: "azure pile-ermine", at: [furSpot(2, 0), furSpot(3, 1)], expect: "sable", why: "spots on a fur pile" },
  { shield: "azure pile-ermine", at: [[15, 20], [85, 20]], expect: "azure", why: "the field beside a fur pile" },

  // Reversed: the probes above, mirrored as y → 100 − y; below a chief, 30 + 0.7 × (100 − y).
  { shield: "azure pile-reversed-or", at: [[50, 80], [50, 50], [50, 22], [34.03, 60], [65.97, 60]], expect: "or", why: "the pile reversed is drawn, up to near its tip" },
  { shield: "azure pile-reversed-or", at: [[20, 80], [80, 80], [31.03, 60], [68.97, 60], [50, 12]], expect: "azure", why: "the field either side and above the reversed tip" },
  { shield: "azure chevron-reversed-or", at: [[25, 40], [75, 40]], expect: "or", why: "the chevron reversed is drawn" },
  { shield: "azure chevron-reversed-or", at: [50, 40], expect: "azure", why: "the field above the chevron reversed" },
  { shield: "azure pall-reversed-or", at: [[50, 30], [20, 80], [80, 80]], expect: "or", why: "the pall reversed's stem and arms are drawn" },
  { shield: "azure pall-reversed-or", at: [50, 80], expect: "azure", why: "the field between the pall reversed's arms" },
  { shield: "azure pall-reversed-or", at: [[25, 91.86], [25, 68.14], [75, 91.86], [75, 68.14], [39, 20], [61, 20]], expect: "or", why: "the pall reversed's arms and stem, just inside each edge" },
  { shield: "azure pall-reversed-or", at: [[25, 64.14], [75, 64.14], [40, 83.86], [60, 83.86], [37, 20], [63, 20]], expect: "azure", why: "the field beside the pall reversed, just outside each edge" },
  { shield: "azure chevron-reversed-engrailed-or", at: [20.56, 24.79], expect: "azure", why: "a bite in the chevron reversed" },
  { shield: "gules chevron-reversed-engrailed-or", at: [50, 76], expect: "gules", why: "no sliver below the chevron reversed's point" },
  { shield: "azure pall-reversed-engrailed-or", at: [12.5, 77.9], expect: "azure", why: "a bite in the pall reversed" },
  { shield: "azure pile-reversed-engrailed-or", at: [[33.67, 63.41], [66.33, 63.41]], expect: "azure", why: "a bite in each side of the pile reversed" },
  { shield: "azure pile-reversed-engrailed-or", at: [[50, 80], [36.35, 58.27], [63.65, 58.27]], expect: "or", why: "the engrailed pile reversed, by a cusp on each side" },
  { shield: "azure pile-reversed-engrailed-or", at: [50, 19], expect: "or", why: "the engrailed pile reversed's point runs on to its tip" },
  { shield: "azure pile-reversed-engrailed-or", at: [50, 14], expect: "azure", why: "no sliver above the engrailed pile reversed's tip" },
  // Drawn (drawings/pile-embattled.svg): merlons stand 3 out from the plain sides, crenels on them.
  // Probes sit 1.5 out, at a merlon and at a crenel; the plain point is 8 px wide at 81.5%.
  { shield: "azure pile-embattled-or", at: [[28.6, 33.93], [71.4, 33.93]], expect: "or", why: "a merlon on each side of the pile, opposite" },
  { shield: "azure pile-embattled-or", at: [[26.55, 28.64], [73.45, 28.64]], expect: "azure", why: "a crenel on each side of the pile, opposite" },
  { shield: "azure pile-embattled-or", at: [50, 81.5], expect: "or", why: "the embattled pile ends in a plain point" },
  { shield: "azure pile-embattled-or", at: [50, 86], expect: "azure", why: "no sliver below the embattled pile's tip" },
  { shield: "azure pile-reversed-embattled-or", at: [[28.6, 66.07], [71.4, 66.07]], expect: "or", why: "a merlon on each side of the pile reversed, opposite" },
  { shield: "azure pile-reversed-embattled-or", at: [[26.55, 71.36], [73.45, 71.36]], expect: "azure", why: "a crenel on each side of the pile reversed, opposite" },
  { shield: "azure pile-reversed-embattled-or", at: [50, 18.5], expect: "or", why: "the embattled pile reversed ends in a plain point" },
  { shield: "azure pile-reversed-embattled-or", at: [50, 14], expect: "azure", why: "no sliver above the embattled pile reversed's tip" },
  // Drawn (drawings/pile-indented.svg), after FD Fig. 147: right-angled teeth 13.24 along, point
  // opposite point, ending in a kite and a tip at (50, 104.91).
  { shield: "azure pile-indented-or", at: [[30.44, 37.84], [69.56, 37.84]], expect: "or", why: "a point on each side of the pile indented, opposite" },
  { shield: "azure pile-indented-or", at: [[33.96, 42.7], [66.04, 42.7]], expect: "azure", why: "a notch on each side of the pile indented, opposite" },
  { shield: "azure pile-indented-or", at: [[45.5, 74.58], [54.5, 74.58]], expect: "azure", why: "the notches at the neck of the pile indented's kite" },
  { shield: "azure pile-indented-or", at: [50, 81.67], expect: "or", why: "the pile indented's kite" },
  { shield: "azure pile-indented-or", at: [50, 90], expect: "azure", why: "nothing below the pile indented's tip" },
  { shield: "azure pile-reversed-indented-or", at: [50, 18.33], expect: "or", why: "the pile reversed indented's kite" },
  { shield: "azure pile-reversed-indented-or", at: [50, 10], expect: "azure", why: "nothing above the pile reversed indented's tip" },
  // Drawn (drawings/chevron-embattled.svg), after FD Fig. 130: merlons 12 along and 7 out from the
  // upper edges, crenels on them, and a tower on the peak where the merlon tops meet.
  { shield: "azure chevron-embattled-or", at: [[28.11, 39.33], [71.89, 39.33]], expect: "or", why: "a merlon on each upper edge of the chevron, opposite" },
  { shield: "azure chevron-embattled-or", at: [[20.43, 47.02], [79.57, 47.02]], expect: "azure", why: "a crenel on each upper edge of the chevron, opposite" },
  { shield: "azure chevron-embattled-or", at: [50, 16.67], expect: "or", why: "the tower on the chevron embattled's peak" },
  { shield: "azure chevron-embattled-or", at: [50, 10], expect: "azure", why: "nothing above the chevron embattled's tower" },
  { shield: "azure chevron-embattled-or", at: [[25, 71.25], [75, 71.25]], expect: "or", why: "a chevron embattled is plain below, inside" },
  { shield: "azure chevron-embattled-or", at: [[25, 74.75], [75, 74.75]], expect: "azure", why: "a chevron embattled is plain below" },
  // Drawn (drawings/chevron-reversed-embattled.svg), with no FD figure: the chevron's merlons on the
  // inner V, which faces up, and crenel floors meeting in the valley at (50, 62.4).
  { shield: "azure chevron-reversed-embattled-or", at: [[41.17, 38.62], [58.83, 38.62]], expect: "or", why: "a merlon on each inner edge of the chevron reversed, opposite" },
  { shield: "azure chevron-reversed-embattled-or", at: [[33.49, 30.93], [66.51, 30.93]], expect: "azure", why: "a crenel on each inner edge of the chevron reversed, opposite" },
  { shield: "azure chevron-reversed-embattled-or", at: [50, 45.83], expect: "azure", why: "the crenel in the chevron reversed embattled's valley" },
  { shield: "azure chevron-reversed-embattled-or", at: [50, 55], expect: "or", why: "the chevron reversed embattled under its valley" },
  { shield: "azure chevron-reversed-embattled-or", at: [[25, 50], [75, 50]], expect: "or", why: "a chevron reversed embattled is plain below, inside" },
  { shield: "azure chevron-reversed-embattled-or", at: [[25, 56.25], [75, 56.25]], expect: "azure", why: "a chevron reversed embattled is plain below" },
  // Drawn (drawings/chevron-wavy.svg), after FD Fig. 133: an ogee, its peaks at y 28.14 and 60.81 on
  // the centre line; at x 25 the band runs from y 54.3 to 91.9.
  { shield: "azure chevron-wavy-or", at: [50, 33.33], expect: "or", why: "the wavy chevron's peak" },
  { shield: "azure chevron-wavy-or", at: [50, 20.83], expect: "azure", why: "nothing above the wavy chevron's peak" },
  { shield: "azure chevron-wavy-or", at: [50, 53.33], expect: "azure", why: "the field under the wavy chevron's inner peak" },
  { shield: "azure chevron-wavy-or", at: [[25, 62.33], [75, 62.33]], expect: "or", why: "the wavy chevron's arms, opposite" },
  { shield: "azure chevron-wavy-or", at: [[25, 41.67], [75, 41.67], [25, 79.6], [75, 79.6]], expect: "azure", why: "the field either side of the wavy chevron's arms" },
  { shield: "azure chevron-wavy-or", at: [[34, 65.56], [66, 65.56]], expect: "or", why: "the wavy chevron's arms sweep low inside, after FD" },
  { shield: "azure chevron-reversed-wavy-or", at: [[34, 34.44], [66, 34.44]], expect: "or", why: "the wavy chevron reversed's arms sweep high inside, after FD" },
  { shield: "azure chevron-reversed-wavy-or", at: [50, 66.67], expect: "or", why: "the wavy chevron reversed's point" },
  { shield: "azure chevron-reversed-wavy-or", at: [50, 79.17], expect: "azure", why: "nothing below the wavy chevron reversed's point" },
  { shield: "azure chevron-reversed-wavy-or", at: [[25, 37.67], [75, 37.67]], expect: "or", why: "the wavy chevron reversed's arms, opposite" },
  // Drawn (drawings/chevron-indented.svg), after FD Fig. 132: level stairs 9.15 along and 11 down, a
  // pinnacle on each peak, and the inner edge the outer one moved down 31.2, pinnacle under pinnacle.
  { shield: "azure chevron-indented-or", at: [50, 28.33], expect: "or", why: "the chevron indented's pinnacle" },
  { shield: "azure chevron-indented-or", at: [50, 18.33], expect: "azure", why: "nothing above the chevron indented's pinnacle" },
  { shield: "azure chevron-indented-or", at: [50, 53.33], expect: "azure", why: "the field's pinnacle under the chevron indented" },
  { shield: "azure chevron-indented-or", at: [[38, 35], [62, 35]], expect: "or", why: "a step on each upper edge of the chevron indented, opposite" },
  { shield: "azure chevron-indented-or", at: [[32.5, 36.67], [67.5, 36.67]], expect: "azure", why: "the field beside each upper step, opposite" },
  { shield: "azure chevron-indented-or", at: [[32.5, 63.33], [67.5, 63.33]], expect: "or", why: "a step on each lower edge of the chevron indented, opposite" },
  { shield: "azure chevron-indented-or", at: [[41, 60.83], [59, 60.83]], expect: "azure", why: "the field under each lower step, opposite" },
  { shield: "azure chevron-reversed-indented-or", at: [50, 71.67], expect: "or", why: "the chevron reversed indented's pinnacle" },
  { shield: "azure chevron-reversed-indented-or", at: [50, 81.67], expect: "azure", why: "nothing below the chevron reversed indented's pinnacle" },
  { shield: "azure chevron-reversed-indented-or", at: [[38, 65], [62, 65]], expect: "or", why: "a step on each lower edge of the chevron reversed indented, opposite" },
  // Drawn (drawings/cross-indented.svg), after FD Fig. 159: point opposite point across the limb and
  // across each arm. Turns every 5.9, 3.4 either side of the plain edge.
  { shield: "azure cross-indented-or", at: [[36.5, 19.67], [63.5, 19.67]], expect: "or", why: "a point on each side of the cross's limb, opposite" },
  { shield: "azure cross-indented-or", at: [[39.5, 24.58], [60.5, 24.58]], expect: "azure", why: "a notch on each side of the cross's limb, opposite" },
  { shield: "azure cross-indented-or", at: [[17.7, 33.75], [17.7, 56.25], [82.3, 33.75], [82.3, 56.25]], expect: "or", why: "a point on each edge of the cross's arms, opposite" },
  { shield: "azure cross-indented-or", at: [[11.8, 36.25], [11.8, 53.75], [88.2, 36.25], [88.2, 53.75]], expect: "azure", why: "a notch on each edge of the cross's arms, opposite" },
  { shield: "azure cross-indented-or", at: [[42, 38.33], [58, 38.33], [42, 51.67], [58, 51.67]], expect: "or", why: "the cross indented is solid inside its corners" },
  // Drawn (drawings/cross-embattled.svg), after FD Fig. 158: merlon opposite merlon, 10.4 along and 7
  // out, centred on the plain edges. Counted out from a crenel in each inner corner.
  { shield: "azure cross-embattled-or", at: [[36.5, 25], [63.5, 25]], expect: "or", why: "a merlon on each side of the cross's limb, opposite" },
  { shield: "azure cross-embattled-or", at: [[36.5, 16.25], [63.5, 16.25]], expect: "azure", why: "a crenel on each side of the cross's limb, opposite" },
  { shield: "azure cross-embattled-or", at: [[26, 33.75], [26, 56.25], [74, 33.75], [74, 56.25]], expect: "or", why: "a merlon on each edge of the cross's arms, opposite" },
  { shield: "azure cross-embattled-or", at: [[38, 35], [62, 35], [38, 55], [62, 55]], expect: "azure", why: "a crenel in each of the cross embattled's inner corners" },
  { shield: "azure cross-embattled-or", at: [[5, 33.75], [95, 33.75]], expect: "or", why: "the cross embattled's arms end on a merlon" },
  { shield: "azure cross-embattled-or", at: [[39, 96.83], [61, 96.83]], expect: "or", why: "a third merlon just showing in base" },
  // Drawn (drawings/pall-embattled.svg), after the saltire embattled: merlons 10.4 along and 7 out,
  // centred, counted out from a crenel in each inner corner, the foot's corners included.
  { shield: "azure pall-embattled-or", at: [[41.17, 19.08], [58.83, 19.08]], expect: "or", why: "a merlon on the inner edge of each arm of the pall, opposite" },
  { shield: "azure pall-embattled-or", at: [[33.67, 13.07], [66.33, 13.07]], expect: "azure", why: "a crenel on the inner edge of each arm of the pall, opposite" },
  { shield: "azure pall-embattled-or", at: [[27.82, 36.13], [72.18, 36.13]], expect: "or", why: "a merlon on the flank edge of each arm of the pall, opposite" },
  { shield: "azure pall-embattled-or", at: [[20.32, 30.13], [79.68, 30.13]], expect: "azure", why: "a crenel on the flank edge of each arm of the pall, opposite" },
  { shield: "azure pall-embattled-or", at: [[36.5, 56], [63.5, 56]], expect: "or", why: "a merlon on each side of the pall's foot, opposite" },
  { shield: "azure pall-embattled-or", at: [[36.5, 64.67], [63.5, 64.67]], expect: "azure", why: "a crenel on each side of the pall's foot, opposite" },
  { shield: "azure pall-embattled-or", at: [[50, 27.5], [39.5, 44.58], [60.5, 44.58]], expect: "azure", why: "a crenel in each of the pall embattled's inner corners" },
  { shield: "azure pall-reversed-embattled-or", at: [[36.5, 44], [63.5, 44]], expect: "or", why: "a merlon on each side of the pall reversed's foot, opposite" },
  { shield: "azure pall-reversed-embattled-or", at: [50, 72.5], expect: "azure", why: "a crenel in the pall reversed embattled's inner corner" },
  // Drawn (drawings/pall-wavy.svg): one wavy band from dexter chief bending into base, the sinister
  // arm its mirror laid over it, the corners where their edges cross. Spots from a pixel diff
  // against the generated pall, solid for 3 px around.
  { shield: "azure pall-wavy-or", at: [[62, 86.67], [37, 65.42], [71, 37.08], [73, 7.5]], expect: "or", why: "the pall wavy's bands, where the generated pall's lie elsewhere" },
  { shield: "azure pall-wavy-or", at: [[37.5, 86.67], [61.5, 64.17], [89.5, 22.08]], expect: "azure", why: "the field beside the pall wavy's bands, where the generated pall's lie" },
  { shield: "azure pall-wavy-or", at: [50, 23.33], expect: "azure", why: "the field above the pall wavy's top corner" },
  { shield: "azure pall-wavy-or", at: [50, 33.33], expect: "or", why: "the pall wavy below its top corner" },
  { shield: "azure pall-reversed-wavy-or", at: [[62, 13.33], [37, 34.58]], expect: "or", why: "the pall reversed wavy's bands, flipped" },
  { shield: "azure pall-reversed-wavy-or", at: [[37.5, 13.33], [61.5, 35.83]], expect: "azure", why: "the field beside the pall reversed wavy's bands" },
  // Drawn (drawings/pall-indented.svg): the saltire indented's stairs on the arms and its dart in
  // the top corner, the cross indented's teeth on the foot, and a shared notch at each lower corner.
  { shield: "azure pall-indented-or", at: [[36, 15], [64, 15]], expect: "or", why: "a step on the inner edge of each arm of the pall indented" },
  { shield: "azure pall-indented-or", at: [[40.5, 17.5], [59.5, 17.5]], expect: "azure", why: "the field beside each inner step of the pall indented" },
  { shield: "azure pall-indented-or", at: [[34.5, 41.17], [65.5, 41.17]], expect: "or", why: "a step on the flank edge of each arm of the pall indented" },
  { shield: "azure pall-indented-or", at: [[30, 38.75], [70, 38.75]], expect: "azure", why: "the field beside each flank step of the pall indented" },
  { shield: "azure pall-indented-or", at: [[36.6, 57.8], [63.4, 57.8]], expect: "or", why: "a point on each side of the pall's foot, opposite" },
  { shield: "azure pall-indented-or", at: [[39.4, 62.72], [60.6, 62.72]], expect: "azure", why: "a notch on each side of the pall's foot, opposite" },
  { shield: "azure pall-indented-or", at: [50, 23.33], expect: "azure", why: "the dart of field in the pall indented's top corner" },
  { shield: "azure pall-reversed-indented-or", at: [[36.6, 42.2], [63.4, 42.2]], expect: "or", why: "a point on each side of the pall reversed's foot, opposite" },
  { shield: "azure pall-reversed-indented-or", at: [50, 76.67], expect: "azure", why: "the dart of field in the pall reversed indented's corner" },
  // Drawn (drawings/saltire-indented.svg), after FD Fig. 188: level treads 9.15 along and risers 9.88
  // up each arm, and a dart of field 5.5 wide in each inner corner, its tip 4 past the plain corner.
  { shield: "azure saltire-indented-or", at: [[36, 17.5], [64, 17.5], [36, 72.5], [64, 72.5]], expect: "or", why: "a step on the inner edge of each arm of the saltire indented" },
  { shield: "azure saltire-indented-or", at: [[40.5, 20], [59.5, 20], [40.5, 70], [59.5, 70]], expect: "azure", why: "the field beside each inner step of the saltire indented" },
  { shield: "azure saltire-indented-or", at: [[19.5, 32.33], [80.5, 32.33], [19.5, 57.67], [80.5, 57.67]], expect: "or", why: "a step on the flank edge of each arm of the saltire indented" },
  { shield: "azure saltire-indented-or", at: [[14.8, 30], [85.2, 30], [14.8, 60], [85.2, 60]], expect: "azure", why: "the field beside each flank step of the saltire indented" },
  { shield: "azure saltire-indented-or", at: [[50, 26.67], [31, 45], [69, 45], [50, 63.33]], expect: "azure", why: "a dart of field in each of the saltire indented's inner corners" },
  // Drawn (drawings/saltire-embattled.svg), after FD Fig. 187: the cross's rule along each arm,
  // merlons 10.4 along and 7 out, centred, counted out from a crenel in each inner corner.
  { shield: "azure saltire-embattled-or", at: [[41.97, 23.05], [58.03, 23.05], [41.97, 66.95], [58.03, 66.95]], expect: "or", why: "a merlon on the inner edge of each arm of the saltire, opposite" },
  { shield: "azure saltire-embattled-or", at: [[34.9, 16.69], [65.1, 16.69], [34.9, 73.31], [65.1, 73.31]], expect: "azure", why: "a crenel on the inner edge of each arm of the saltire, opposite" },
  { shield: "azure saltire-embattled-or", at: [[25.25, 37.44], [74.75, 37.44], [25.25, 52.56], [74.75, 52.56]], expect: "or", why: "a merlon on the flank edge of each arm of the saltire, opposite" },
  { shield: "azure saltire-embattled-or", at: [[18.18, 31.08], [81.82, 31.08], [18.18, 58.92], [81.82, 58.92]], expect: "azure", why: "a crenel on the flank edge of each arm of the saltire, opposite" },
  { shield: "azure saltire-embattled-or", at: [[50, 32.5], [36, 45], [64, 45], [50, 57.5]], expect: "azure", why: "a crenel in each of the saltire embattled's inner corners" },
  { shield: "gules pile-reversed-azure fimbriated-argent", at: [[31.03, 60], [68.97, 60], [50, 12]], expect: "argent", why: "the pile reversed's fimbriation, on each side and above the tip" },
  { shield: "gules pile-reversed-azure fimbriated-argent", at: [[34.03, 60], [65.97, 60], [50, 99], [50, 70], [50, 40], [50, 20]], expect: "azure", why: "the pile reversed itself, just inside each side and up its centre line" },
  { shield: "gules pile-reversed-azure fimbriated-argent", at: [[27.88, 60], [72.12, 60], [20, 20]], expect: "gules", why: "the field beyond the pile reversed's fimbriation" },
  { shield: "gules pile-reversed-azure fimbriated-argent w-[305px]!", at: [[49.8, 80], [50.2, 80], [49.8, 50], [50.2, 50], [49.8, 25], [50.2, 25]], expect: "azure", why: "no seam up a fimbriated pile reversed where its tiles meet" },
  { shield: "gules pile-reversed-azure fimbriated-argent chief-or", at: [[31.03, 72], [68.97, 72]], expect: "argent", why: "the fimbriation of a pile reversed below a chief" },
  { shield: "gules pile-reversed-azure fimbriated-argent chief-or", at: [[34.03, 72], [65.97, 72], [50, 90]], expect: "azure", why: "a fimbriated pile reversed below a chief" },
  { shield: "gules pile-reversed-azure fimbriated-argent chief-or", at: [[27.88, 72], [72.12, 72]], expect: "gules", why: "the field beside a fimbriated pile reversed below a chief" },
  // Fimbriated, a diagonal arm's edge moves 3.9% down or up at a fixed x.
  { shield: "gules chevron-reversed-azure fimbriated-argent", at: [[25, 40], [75, 40], [25, 28], [75, 28], [25, 52], [75, 52]], expect: "azure", why: "the fimbriated chevron reversed itself, just inside each edge" },
  { shield: "gules chevron-reversed-azure fimbriated-argent", at: [[25, 55], [75, 55], [25, 25], [75, 25]], expect: "argent", why: "the chevron reversed's fimbriation, below and above each arm" },
  { shield: "gules chevron-reversed-azure fimbriated-argent", at: [[25, 59], [75, 59], [25, 21], [75, 21]], expect: "gules", why: "the field beyond the chevron reversed's fimbriation" },
  // The chevron's edges at x = 25 are at 47% and 73%, its apex at 22% and 48%, and the fimbriation
  // 3.9% deep. At (40, 30) and (60, 30) one arm's band runs on past the other arm, where a stripe
  // repaints the fimbriation.
  { shield: "gules chevron-azure fimbriated-argent", at: [[25, 48], [75, 48], [25, 72], [75, 72], [50, 24]], expect: "azure", why: "the fimbriated chevron, just inside each edge" },
  { shield: "gules chevron-azure fimbriated-argent", at: [[25, 45], [75, 45], [25, 75], [75, 75], [50, 20], [50, 50], [40, 30], [60, 30]], expect: "argent", why: "the chevron's fimbriation, on each side of each arm and at the apex" },
  { shield: "gules chevron-azure fimbriated-argent", at: [[25, 41], [75, 41], [25, 79], [75, 79], [50, 16], [50, 54]], expect: "gules", why: "the field beyond the chevron's fimbriation" },
  // The pall's arms are 3.47% (3 units) thick beyond each edge, vertically; at x = 20 the upper arm's flank-side edge is at 29.86%.
  { shield: "gules pall-azure fimbriated-argent", at: [[50, 80], [20, 25], [80, 25], [50, 36], [50, 42]], expect: "azure", why: "the fimbriated pall itself, and its junction" },
  { shield: "gules pall-azure fimbriated-argent", at: [[36.5, 80], [63.5, 80], [20, 31.5], [80, 31.5]], expect: "argent", why: "the pall's fimbriation, on the foot and each arm" },
  { shield: "gules pall-azure fimbriated-argent", at: [[33, 80], [67, 80], [20, 36], [80, 36]], expect: "gules", why: "the field beyond the pall's fimbriation" },
  { shield: "gules pall-reversed-azure fimbriated-argent", at: [[50, 20], [20, 75], [80, 75], [50, 64], [50, 58]], expect: "azure", why: "the fimbriated pall reversed itself, and its junction" },
  { shield: "gules pall-reversed-azure fimbriated-argent", at: [[36.5, 20], [63.5, 20], [20, 68.5], [80, 68.5]], expect: "argent", why: "the pall reversed's fimbriation, on the stem and each arm" },
  { shield: "gules pall-reversed-azure fimbriated-argent", at: [[33, 20], [67, 20], [20, 64], [80, 64]], expect: "gules", why: "the field beyond the pall reversed's fimbriation" },
  { shield: "per-pale-or-gules pile-reversed-counterchanged", at: [45, 70], expect: "gules", why: "the counterchanged pile reversed's dexter half" },
  { shield: "per-pale-or-gules pile-reversed-counterchanged", at: [[55, 70], [20, 70]], expect: "or", why: "the counterchanged pile reversed's sinister half, and the field beside it" },
  { shield: "azure pile-reversed-ermine", at: [furSpot(2, 4), furSpot(3, 3)], expect: "sable", why: "spots on a fur pile reversed" },
  { shield: "azure pile-reversed-ermine", at: [[15, 80], [85, 80]], expect: "azure", why: "the field beside a fur pile reversed" },

  ...charged("azure", "", 50, [[50, 45]], "one charge"),
  ...charged("azure", "", 30, [[50, 24], [50, 66]], "two charges"),
  ...charged("azure", "", 28, [[28, 25], [72, 25], [50, 64]], "three charges, 2 and 1"),
  ...charged("azure", "", 24, [[30, 24], [70, 24], [32, 60], [68, 60]], "four charges"),
  ...charged("azure", "", 22, [[27, 20], [73, 20], [50, 42], [32, 64], [68, 64]], "five charges, in saltire"),
  ...charged("azure", "", 20, [[20, 18], [50, 18], [80, 18], [35, 42], [65, 42], [50, 66]], "six charges"),
  { ...gap("azure", "", 3), at: [50, 25], why: "three charges: a gap between the top two" },

  ...charged("azure", "in-pale", 30, [[50, 24], [50, 66]], "two in pale"),
  ...charged("azure", "in-pale", 22, [[50, 16], [50, 43], [50, 70]], "three in pale"),
  ...charged("azure", "in-fess", 30, [[30, 45], [70, 45]], "two in fess"),
  ...charged("azure", "in-fess", 24, [[22, 45], [50, 45], [78, 45]], "three in fess"),
  { ...gap("azure", "in-fess", 3), at: [36, 45], why: "three in fess: a gap between the first two" },
  ...charged("azure", "in-bend", 28, [[30, 26], [70, 64]], "two in bend"),
  ...charged("azure", "in-bend", 22, [[22, 16], [50, 45], [78, 74]], "three in bend"),
  ...charged("azure", "in-bend-sinister", 28, [[70, 26], [30, 64]], "two in bend sinister"),
  ...charged("azure", "in-bend-sinister", 22, [[78, 16], [50, 45], [22, 74]], "three in bend sinister"),

  ...atPoint("dexter-chief", [25, 17]),
  ...atPoint("chief-point", [50, 15]),
  ...atPoint("sinister-chief", [75, 17]),
  ...atPoint("honour-point", [50, 30]),
  ...atPoint("fess-point", [50, 45]),
  ...atPoint("nombril-point", [50, 60]),
  ...atPoint("dexter-base", [30, 72]),
  ...atPoint("base-point", [50, 84]),
  ...atPoint("sinister-base", [70, 72]),

  { shield: "azure chief-gules", charges: "", items: ["bezant in-chief-point"], at: ring([50, 15], 18), expect: "or", why: "a charge at the chief point sits on the chief" },
  { shield: "azure chief-gules", charges: "", items: ["bezant in-fess-point"], at: ring([50, 61.5], 22), expect: "or", why: "the fess point moves below a chief" },
  { shield: "azure chief-gules", charges: "", items: ["bezant in-fess-point"], at: [50, 45], expect: "azure", why: "nothing left at the old fess point" },
  ...charged("azure chief-gules", "", 28, [[28, 47.5], [72, 47.5], [50, 74.8]], "three charges below a chief"),

  ...charged("azure", "in-chief", 22, [[50, 15]], "one in chief"),
  ...charged("azure", "in-chief", 22, [[25, 17], [75, 17]], "two in chief"),
  ...charged("azure", "in-chief", 22, [[25, 17], [50, 15], [75, 17]], "three in chief"),
  ...charged("azure chief-gules", "in-chief", 18, [[50, 15]], "one in chief, on a chief"),
  ...charged("azure chief-gules", "in-chief", 18, [[25, 15], [75, 15]], "two in chief, on a chief"),
  ...charged("azure chief-gules", "in-chief", 18, [[25, 15], [50, 15], [75, 15]], "three in chief, on a chief"),
  ...charged("azure", "in-base", 22, [[50, 84]], "one in base"),
  ...charged("azure", "in-base", 22, [[30, 72], [70, 72]], "two in base"),
  ...charged("azure", "in-base", 22, [[30, 72], [50, 84], [70, 72]], "three in base"),
  // Three in chief paint the same points as three charges at the chief points.
  ...[["in-chief", bezants(3)], ["", ["bezant in-dexter-chief", "bezant in-chief-point", "bezant in-sinister-chief"]]].map(([charges, items]) => (
    { shield: "azure chief-gules", charges, items, at: [[25, 15], [50, 15], [75, 15]].flatMap((p) => ring(p, 18)), expect: "or", why: `three ${charges || "at the chief points"}, on a chief` }
  )),

  ...CROSSES.flatMap((name) => [
    { shield: "azure", charges: "", items: [`${name} or`], at: lone(SOLID[name] ?? [50, 50]), expect: "or", why: `${name}: drawn` },
    { shield: "azure", charges: "", items: [`${name} or`], at: lone([12, 88]), expect: "azure", why: `${name}: a corner of its box is empty` },
  ]),
  { shield: "azure fess-gules", charges: "between", items: Array(3).fill("cross-crosslet or"), at: [[30, 15], [70, 15], [50, 78]].flatMap((p) => ring(p, 20)), expect: "or", why: "three crosses crosslet between a fess" },

  // Semé: 25% tiles from −6.25%, so charges centre at 6.25 + 25i and, staggered, 18.75 + 25i. A
  // mullet's centre sits a little low.
  { shield: "azure", charges: "semy", items: ["mullet or"], at: [31.25, 32], expect: "or", why: "semé: a whole charge" },
  { shield: "azure", charges: "semy", items: ["mullet or"], at: [18.75, 31.25], expect: "azure", why: "semé: the field between charges" },
  { shield: "azure", charges: "semy", items: ["mullet or"], at: [6.25, 6.6], expect: "or", why: "semé: whole charges along the top and side" },
  { shield: "azure chief-gules", charges: "semy", items: ["mullet or"], at: [31.25, 7], expect: "gules", why: "semé: the chief covers it" },
  { shield: "azure chief-gules", charges: "semy", items: ["mullet or"], at: [31.25, 57], expect: "or", why: "semé: below a chief, it stays on the shield's tiling" },
  { shield: "azure pale-argent", charges: "semy", items: ["mullet or"], at: [43.75, 44.5], expect: "argent", why: "semé: an ordinary covers it" },
  { shield: "azure", charges: "semy", items: ["mullet or"], more: { charges: "", items: ["roundel argent"] }, at: [50, 45], expect: "argent", why: "semé: a second charges container paints over it" },
  { shield: "azure", charges: "semy", items: ["charge-[url(data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%201%201'%3E%3Crect%20width='1'%20height='1'/%3E%3C/svg%3E)] or"], at: [31.25, 32], expect: "azure", why: "semé: a custom charge draws nothing" },
  { shield: "per-pale-or-azure", charges: "semy", items: ["mullet counterchanged"], at: [31.25, 32], expect: "azure", why: "semé: counterchanged on the or half" },
  { shield: "per-pale-or-azure", charges: "semy", items: ["mullet counterchanged"], at: [81.25, 32], expect: "or", why: "semé: counterchanged on the azure half" },
  // A bezant is 12.5% wide: a ring at 0.8 of its radius is covered, and the gap between two is not.
  { shield: "gules", charges: "semy", items: ["bezant"], at: [...ring([56.25, 56.25], 12.5), ...ring([43.75, 68.75], 12.5)], expect: "or", why: "semé: bezanty" },
  { shield: "gules", charges: "semy", items: ["bezant"], at: [[43.75, 56.25], [50, 50], [50, 62.5]], expect: "gules", why: "semé: bezanty, the field between bezants" },
  { shield: "gules", charges: "semy", items: ["crescent or"], at: [56.25, 54.2], expect: "gules", why: "semé: a crescent's own mask still cuts it" },

  ...charged("azure pale-gules", "between", 18, [[18, 42], [82, 42]], "between a pale"),
  ...charged("azure fess-gules", "between", 20, [[30, 15], [70, 15], [50, 78]], "between a fess"),
  ...charged("azure bend-gules", "between", 24, [[70, 26], [30, 68]], "between a bend"),
  ...charged("azure bend-sinister-gules", "between", 24, [[30, 26], [70, 68]], "between a bend sinister"),
  ...charged("azure chevron-gules", "between", 22, [[24, 22], [76, 22], [50, 70]], "between a chevron"),
  ...charged("azure chevron-gules", "between", 12, [[18, 14], [50, 11], [82, 14], [40, 72], [60, 72], [50, 84]], "six between a chevron"),
  ...charged("azure cross-gules", "between", 18, [[20, 17], [80, 17], [24, 72], [76, 72]], "between a cross"),
  ...charged("azure saltire-gules", "between", 16, [[50, 13], [14, 45], [86, 45], [50, 84]], "between a saltire"),
  ...charged("azure pall-gules", "between", 18, [[50, 11], [18, 56], [82, 56]], "between a pall"),

  ...charged("azure pile-gules", "between", 20, [[18, 55], [82, 55]], "between a pile"),
  ...charged("azure pile-gules chief-or", "between", 20, [[18, 68.5], [82, 68.5]], "between a pile below a chief"),
  ...charged("azure pale-gules", "on", 20, [[50, 18], [50, 45], [50, 72]], "on a pale"),
  ...charged("azure fess-gules", "on", 22, [[20, 45], [50, 45], [80, 45]], "on a fess"),
  ...charged("azure bend-gules", "on", 18, [[24, 24], [50, 50], [76, 76]], "on a bend"),
  ...charged("azure bend-sinister-gules", "on", 18, [[76, 24], [50, 50], [24, 76]], "on a bend sinister"),
  ...charged("azure chevron-gules", "on", 15, [[20, 65], [50, 36], [80, 65]], "on a chevron"),
  ...charged("azure cross-gules", "on", 15, [[50, 15], [18, 45], [50, 45], [82, 45], [50, 80]], "on a cross"),
  ...charged("azure saltire-gules", "on", 16, [[22, 19.8], [78, 19.8], [50, 45], [22, 70.2], [78, 70.2]], "on a saltire"),
  ...charged("azure pall-gules", "on", 16, [[26, 20.8], [74, 20.8], [50, 75]], "on a pall"),
  ...charged("azure pile-gules", "on", 14, [[50, 25]], "one on a pile"),
  ...charged("azure pile-gules", "on", 14, [[50, 14], [50, 34], [50, 54]], "three on a pile"),
  // The pile is 12.04% each side of its centre line at 54% down, and a roundel 6.4%.
  { shield: "azure pile-gules", charges: "on", items: bezants(3), at: [[42.5, 54], [57.5, 54]], expect: "gules", why: "the lowest of three on a pile fits inside it" },
  ...charged("azure pile-gules chief-or", "on", 14, [[50, 39.8], [50, 53.8], [50, 67.8]], "three on a pile below a chief"),
  { shield: "azure pile-gules chief-or", charges: "on", items: bezants(3), at: [[42.5, 67.8], [57.5, 67.8]], expect: "gules", why: "the lowest of three on a pile fits inside it, below a chief" },

  ...charged("azure chevron-reversed-gules", "between", 22, [[26, 76], [74, 76], [50, 30]], "between a chevron reversed"),
  ...charged("azure chevron-reversed-gules chief-or", "between", 22, [[26, 83.2], [74, 83.2], [50, 51]], "between a chevron reversed below a chief"),
  ...charged("azure chevron-reversed-gules", "between", 12, [[26, 78], [50, 89], [74, 78], [40, 28], [60, 28], [50, 16]], "six between a chevron reversed"),
  ...charged("azure chevron-reversed-gules chief-or", "between", 12, [[26, 84.6], [50, 92.3], [74, 84.6], [40, 49.6], [60, 49.6], [50, 41.2]], "six between a chevron reversed below a chief"),
  ...charged("azure pall-reversed-gules", "between", 18, [[50, 89], [18, 44], [82, 44]], "between a pall reversed"),
  ...charged("azure pall-reversed-gules chief-or", "between", 18, [[50, 92.3], [18, 60.8], [82, 60.8]], "between a pall reversed below a chief"),
  ...charged("azure pile-reversed-gules", "between", 20, [[18, 45], [82, 45]], "between a pile reversed"),
  ...charged("azure pile-reversed-gules chief-or", "between", 20, [[18, 61.5], [82, 61.5]], "between a pile reversed below a chief"),
  ...charged("azure chevron-reversed-gules", "on", 15, [[20, 35], [50, 64], [80, 35]], "on a chevron reversed"),
  ...charged("azure chevron-reversed-gules chief-or", "on", 15, [[20, 54.5], [50, 74.8], [80, 54.5]], "on a chevron reversed below a chief"),
  ...charged("azure pall-reversed-gules", "on", 16, [[26, 79.2], [74, 79.2], [50, 25]], "on a pall reversed"),
  ...charged("azure pall-reversed-gules chief-or", "on", 16, [[26, 85.4], [74, 85.4], [50, 47.5]], "on a pall reversed below a chief"),
  ...charged("azure pile-reversed-gules", "on", 14, [[50, 75]], "one on a pile reversed"),
  ...charged("azure pile-reversed-gules", "on", 14, [[50, 86], [50, 66], [50, 46]], "three on a pile reversed"),
  ...charged("azure pile-reversed-gules chief-or", "on", 14, [[50, 90.2], [50, 76.2], [50, 62.2]], "three on a pile reversed below a chief"),
  { shield: "azure pile-reversed-gules", charges: "on", items: bezants(3), at: [[42.5, 46], [57.5, 46]], expect: "gules", why: "the highest of three on a pile reversed fits inside it" },

  { shield: "azure", charges: "", items: ["bezant"], at: [68, 45], expect: "or", why: "one charge is half the shield wide" },
  { shield: "azure", charges: "charge-size-20", items: ["bezant"], at: [68, 45], expect: "azure", why: "charge-size-20 shrinks it" },
  ...charged("azure", "charge-size-20", 20, [[50, 45]], "a resized charge"),

  { shield: "per-pale-or-gules", charges: "in-fess counterchanged", items: ["roundel", "roundel"], at: [30, 45], expect: "gules", why: "a counterchanged charge on the or half" },
  { shield: "per-pale-or-gules", charges: "in-fess counterchanged", items: ["roundel", "roundel"], at: [70, 45], expect: "or", why: "a counterchanged charge on the gules half" },

  // Fur spots on the field, from furs.js: tiles 6 across, so spots sit at (T/4 + kT, T/4 + jT) and
  // (3T/4 + kT, 3T/4 + jT), where T is a tile. furSpot is a spot's body, a tenth of a tile below its
  // centre; furGround is empty ground between spots.
  { shield: "ermine", at: furSpot(1, 1), expect: "sable", why: "an ermine spot" },
  { shield: "ermine", at: furGround(1, 1), expect: "argent", why: "the ermine ground" },
  { shield: "ermines", at: furSpot(1, 1), expect: "argent", why: "an ermines spot" },
  { shield: "ermines", at: furGround(1, 1), expect: "sable", why: "the ermines ground" },
  { shield: "erminois", at: furSpot(1, 1), expect: "sable", why: "an erminois spot" },
  { shield: "erminois", at: furGround(1, 1), expect: "or", why: "the erminois ground" },
  { shield: "pean", at: furSpot(1, 1), expect: "or", why: "a pean spot" },
  { shield: "pean", at: furGround(1, 1), expect: "sable", why: "the pean ground" },

  // A charge is two tiles across, centred, so a spot sits at its centre.
  { shield: "gules", charges: "", items: ["mullet ermine"], at: [50, 47.5], expect: "sable", why: "a spot at the charge's centre" },
  { shield: "gules", charges: "", items: ["mullet ermine"], at: [50, 39.17], expect: "argent", why: "the fur's ground in the mullet" },
  { shield: "gules", charges: "", items: ["mullet ermine"], at: [27, 27], expect: "gules", why: "the field outside the mullet" },

  { shield: "per-pale-ermine-gules", at: furSpot(1, 1), expect: "sable", why: "a spot on the ermine half" },
  { shield: "per-pale-ermine-gules", at: furSpot(4, 1), expect: "gules", why: "no spot on the gules half" },
  { shield: "quarterly-ermine-azure", at: furSpot(1, 1), expect: "sable", why: "a spot in quarter 1" },
  { shield: "quarterly-ermine-azure", at: furGround(1, 1), expect: "argent", why: "the ground in quarter 1" },
  { shield: "quarterly-ermine-azure", at: furSpot(4, 1), expect: "azure", why: "quarter 2 is azure" },
  { shield: "quarterly-ermine-azure", at: furSpot(1, 4), expect: "azure", why: "quarter 3 is azure" },
  { shield: "quarterly-ermine-azure", at: furSpot(4, 4), expect: "sable", why: "a spot in quarter 4" },
  { shield: "gyronny-gules-ermine", at: [45, 5], expect: "gules", why: "the first gyron" },
  { shield: "gyronny-gules-ermine", at: furSpot(0, 2), expect: "sable", why: "a spot in the second gyron" },
  { shield: "gyronny-gules-ermine", at: furGround(0, 2), expect: "argent", why: "the ground in the second gyron" },
  // Gyronny's lines cross at (50, 45) like per saltire's, so a counterchanged saltire lines up.
  { shield: "gyronny-or-gules", at: [[25, 21], [75, 24], [25, 46], [75, 44], [25, 66], [75, 69], [55, 95]], expect: "or", why: "or gyrons, either side of each line" },
  { shield: "gyronny-or-gules", at: [[25, 24], [75, 21], [25, 44], [75, 46], [25, 69], [75, 66], [45, 95]], expect: "gules", why: "gules gyrons, either side of each line" },
  { shield: "gyronny-or-gules saltire-counterchanged", at: [[25, 21], [75, 24], [25, 66], [75, 69]], expect: "gules", why: "the saltire counterchanges along its centre lines" },
  { shield: "gyronny-or-gules saltire-counterchanged", at: [[25, 24], [75, 21], [25, 69], [75, 66]], expect: "or", why: "the saltire counterchanges along its centre lines" },

  // Per saltire's lines run from the top corners through (50, 45) to the flanks at 90%, so at
  // x = 25 and 75 they're at 22.5% and 67.5%; each probe pair straddles one. Below 90% is base.
  { shield: "per-saltire-or-gules", at: [50, 15], expect: "or", why: "or in chief" },
  { shield: "per-saltire-or-gules", at: [50, 80], expect: "or", why: "or in base" },
  { shield: "per-saltire-or-gules", at: [15, 50], expect: "gules", why: "gules in the dexter flank" },
  { shield: "per-saltire-or-gules", at: [85, 50], expect: "gules", why: "gules in the sinister flank" },
  { shield: "per-saltire-or-gules", at: [[50, 40], [50, 50]], expect: "or", why: "or above and below the crossing" },
  { shield: "per-saltire-or-gules", at: [[45, 45], [55, 45]], expect: "gules", why: "gules either side of the crossing" },
  { shield: "per-saltire-or-gules", at: [[25, 21], [75, 21]], expect: "or", why: "or above the upper diagonals" },
  { shield: "per-saltire-or-gules", at: [[25, 24], [75, 24]], expect: "gules", why: "gules below the upper diagonals" },
  { shield: "per-saltire-or-gules", at: [[25, 66], [75, 66]], expect: "gules", why: "gules above the lower diagonals" },
  { shield: "per-saltire-or-gules", at: [[25, 69], [75, 69], [50, 95], [30, 91], [70, 91]], expect: "or", why: "or below the lower diagonals, down into the base" },
  // Chromium rounds the lower tiles' foot and the base strip's top apart at some widths.
  { shield: "per-saltire-or-gules w-[160px]!", at: [[30, 89.8], [50, 89.8], [70, 89.8], [50, 90.2]], expect: "or", why: "no seam above the base, at 160px" },
  { shield: "per-saltire-or-gules w-[132px]!", at: [[30, 89.8], [50, 89.8], [70, 89.8], [50, 90.2]], expect: "or", why: "no seam above the base, at 132px" },
  { shield: "per-saltire-or-gules saltire-argent", at: [[25, 22.5], [75, 22.5], [25, 67.5], [75, 67.5], [50, 45]], expect: "argent", why: "a saltire covers the seams" },
  { shield: "per-saltire-ermine-azure", at: furSpot(2, 0), expect: "sable", why: "a spot in chief" },
  { shield: "per-saltire-ermine-azure", at: furGround(2, 0), expect: "argent", why: "the ground in chief" },
  { shield: "per-saltire-ermine-azure", at: furSpot(2, 4), expect: "sable", why: "a spot in base" },
  { shield: "per-saltire-ermine-azure", at: [[15, 50], [85, 50]], expect: "azure", why: "the flanks are azure" },
  { shield: "per-saltire-gules-ermine", at: [[50, 10], [50, 80]], expect: "gules", why: "gules in chief and base" },

  // Per chevron's sides run from the apex at (50, 35) to the flanks at 85%, so at 25% across they're at 60%.
  { shield: "per-chevron-or-gules", at: [[50, 10], [50, 30], [5, 70], [95, 70]], expect: "or", why: "or in chief, above the apex and down the flanks" },
  { shield: "per-chevron-or-gules", at: [[50, 40], [50, 80]], expect: "gules", why: "gules below the apex and in base" },
  { shield: "per-chevron-or-gules", at: [[25, 55], [75, 55]], expect: "or", why: "or above each side" },
  { shield: "per-chevron-or-gules", at: [[25, 65], [75, 65]], expect: "gules", why: "gules below each side" },
  { shield: "per-chevron-or-gules w-[305px]!", at: [[49.8, 20], [50.2, 20], [49.8, 30], [50.2, 30]], expect: "or", why: "no seam down the centre above the apex" },
  { shield: "per-chevron-or-gules w-[305px]!", at: [[49.8, 50], [50.2, 50], [49.8, 75], [50.2, 75]], expect: "gules", why: "no seam down the centre below the apex" },
  // Fur row 2 is at 37.5% down, below the apex but above both sides out at the flanks.
  { shield: "per-chevron-ermine-gules", at: [furGround(0, 2), furGround(5, 2)], expect: "argent", why: "the fur's ground in both flanks, below the apex" },
  { shield: "per-chevron-ermine-gules", at: furSpot(0, 2), expect: "sable", why: "a spot in the dexter flank, below the apex" },
  { shield: "per-chevron-ermine-gules", at: [[50, 50], [50, 80], [25, 65], [75, 65]], expect: "gules", why: "gules in base and below each side" },
  { shield: "per-chevron-gules-ermine", at: [[50, 10], [10, 40], [90, 40], [25, 55], [75, 55]], expect: "gules", why: "gules in chief and above each side" },
  { shield: "per-chevron-gules-ermine", at: furSpot(2, 4), expect: "sable", why: "a spot in base" },
  { shield: "per-chevron-ermine-gules pale-counterchanged", at: [50, 20], expect: "gules", why: "a counterchanged pale is gules in chief" },
  { shield: "per-chevron-ermine-gules pale-counterchanged", at: furGround(2, 4), expect: "argent", why: "a counterchanged pale is ermine in base" },
  { shield: "per-chevron-gules-ermine pale-counterchanged", at: furGround(2, 0), expect: "argent", why: "a counterchanged pale is ermine in chief" },
  { shield: "per-chevron-gules-ermine pale-counterchanged", at: [50, 80], expect: "gules", why: "a counterchanged pale is gules in base" },
  { shield: "per-saltire-gules-ermine", at: [furSpot(0, 2), furSpot(5, 2)], expect: "sable", why: "spots in both flanks" },
  { shield: "per-saltire-gules-ermine", at: furGround(0, 2), expect: "argent", why: "the ground in the dexter flank" },

  // Barry and paly: probes at stripe centres. Barry of six's stripes match the fur's tile rows.
  { shield: "barry-or-gules", at: [[50, 8.33], [50, 41.67], [50, 75]], expect: "or", why: "barry: or in stripes 1, 3 and 5" },
  { shield: "barry-or-gules", at: [[50, 25], [50, 58.33], [50, 91.67]], expect: "gules", why: "barry: gules in stripes 2, 4 and 6" },
  { shield: "barry-of-eight-or-gules", at: [[50, 6.25], [50, 81.25]], expect: "or", why: "barry of eight: or in stripes 1 and 7" },
  { shield: "barry-of-eight-or-gules", at: [[50, 18.75], [50, 93.75]], expect: "gules", why: "barry of eight: gules in stripes 2 and 8" },
  { shield: "barry-of-ten-or-gules", at: [[50, 5], [50, 85]], expect: "or", why: "barry of ten: or in stripes 1 and 9" },
  { shield: "barry-of-ten-or-gules", at: [[50, 15], [50, 95]], expect: "gules", why: "barry of ten: gules in stripes 2 and 10" },
  { shield: "paly-or-gules", at: [[8.33, 40], [41.67, 40], [75, 40]], expect: "or", why: "paly: or in pallets 1, 3 and 5" },
  { shield: "paly-or-gules", at: [[25, 40], [58.33, 40], [91.67, 40]], expect: "gules", why: "paly: gules in pallets 2, 4 and 6" },
  { shield: "paly-of-eight-or-gules", at: [[6.25, 40], [81.25, 40]], expect: "or", why: "paly of eight: or in pallets 1 and 7" },
  { shield: "paly-of-eight-or-gules", at: [[18.75, 40], [93.75, 40]], expect: "gules", why: "paly of eight: gules in pallets 2 and 8" },
  { shield: "barry-gules-ermine", at: [[50, 8.33], [50, 75]], expect: "gules", why: "barry with a fur: gules in stripes 1 and 5" },
  { shield: "barry-gules-ermine", at: [furSpot(1, 1), furSpot(1, 3)], expect: "sable", why: "barry with a fur: spots in stripes 2 and 4" },
  { shield: "barry-gules-ermine", at: [furGround(1, 1), furGround(1, 3)], expect: "argent", why: "barry with a fur: the ground in stripes 2 and 4" },
  { shield: "paly-ermine-azure", at: [[25, 40], [91.67, 40]], expect: "azure", why: "paly with a fur: azure in pallets 2 and 6" },
  // Bendy: pieces across the visible shield, the first in the sinister chief corner.
  { shield: "bendy-or-gules", at: [0, 2, 4].map((piece) => bendyPiece(6, piece, false)), expect: "or", why: "bendy: or in pieces 1, 3 and 5, the first in the sinister chief corner" },
  { shield: "bendy-or-gules", at: [1, 3].map((piece) => bendyPiece(6, piece, false)), expect: "gules", why: "bendy: gules in pieces 2 and 4" },
  { shield: "bendy-of-eight-or-gules", at: [0, 4, 6].map((piece) => bendyPiece(8, piece, false)), expect: "or", why: "bendy of eight: or in pieces 1, 5 and 7" },
  { shield: "bendy-of-eight-or-gules", at: [1, 5].map((piece) => bendyPiece(8, piece, false)), expect: "gules", why: "bendy of eight: gules in pieces 2 and 6" },
  { shield: "bendy-sinister-or-gules", at: [0, 2, 4].map((piece) => bendyPiece(6, piece, true)), expect: "or", why: "bendy sinister: or in pieces 1, 3 and 5, the first in the dexter chief corner" },
  { shield: "bendy-sinister-or-gules", at: [1, 3].map((piece) => bendyPiece(6, piece, true)), expect: "gules", why: "bendy sinister: gules in pieces 2 and 4" },
  { shield: "bendy-sinister-of-eight-or-gules", at: [0, 4, 6].map((piece) => bendyPiece(8, piece, true)), expect: "or", why: "bendy sinister of eight: or in pieces 1, 5 and 7" },
  { shield: "bendy-sinister-of-eight-or-gules", at: [1, 5].map((piece) => bendyPiece(8, piece, true)), expect: "gules", why: "bendy sinister of eight: gules in pieces 2 and 6" },
  { shield: "bendy-or-gules", at: bendyPiece(6, 5, false), expect: "gules", why: "bendy of six: gules in the last piece, on the curved base" },
  { shield: "bendy-of-eight-or-gules", at: bendyPiece(8, 7, false), expect: "gules", why: "bendy of eight: gules in the last piece, on the curved base" },
  { shield: "bendy-sinister-or-gules", at: bendyPiece(6, 5, true), expect: "gules", why: "bendy sinister of six: gules in the last piece, on the curved base" },
  { shield: "bendy-sinister-of-eight-or-gules", at: bendyPiece(8, 7, true), expect: "gules", why: "bendy sinister of eight: gules in the last piece, on the curved base" },
  { shield: "bendy-gules-ermine", at: furSpot(4, 1), expect: "sable", why: "bendy with a fur: a spot in piece 2" },
  { shield: "bendy-gules-ermine", at: [bendyPiece(6, 0, false), bendyPiece(6, 2, false)], expect: "gules", why: "bendy with a fur: gules in pieces 1 and 3" },

  // Near the flanks, leaning to a piece's edge, so a line at 45 degrees lands in the next piece.
  { shield: "bendy-of-eight-or-gules", at: [bendyFlank(8, 2, 0.88, 92), bendyFlank(8, 6, 0.12, 8)], expect: "or", why: "bendy of eight: or in pieces 3 and 7 near the flanks, parallel to per bend" },
  { shield: "bendy-of-eight-or-gules", at: [bendyFlank(8, 3, 0.88, 90), bendyFlank(8, 5, 0.12, 8)], expect: "gules", why: "bendy of eight: gules in pieces 4 and 6 near the flanks, parallel to per bend" },
  { shield: "bendy-sinister-of-eight-or-gules", at: [bendyFlank(8, 2, 0.88, 92, true), bendyFlank(8, 6, 0.12, 8, true)], expect: "or", why: "bendy sinister of eight: or in pieces 3 and 7 near the flanks, parallel to per bend sinister" },
  { shield: "bendy-sinister-of-eight-or-gules", at: [bendyFlank(8, 3, 0.88, 90, true), bendyFlank(8, 5, 0.12, 8, true)], expect: "gules", why: "bendy sinister of eight: gules in pieces 4 and 6 near the flanks, parallel to per bend sinister" },
  { shield: "chevronny-of-eight-or-gules", at: ["dexter", "sinister"].map((side) => chevronnyFlank(8, 2, 0.88, side)), expect: "or", why: "chevronny of eight: or in piece 3 near the flanks, parallel to per chevron" },
  { shield: "chevronny-of-eight-or-gules", at: ["dexter", "sinister"].map((side) => chevronnyFlank(8, 3, 0.88, side)), expect: "gules", why: "chevronny of eight: gules in piece 4 near the flanks, parallel to per chevron" },
  { shield: "chevronny-or-gules", at: ["dexter", "sinister"].map((side) => chevronnyFlank(6, 1, 0.5, side)), expect: "gules", why: "chevronny: gules in piece 2 at the flanks" },

  // Chevronny: lines parallel to per chevron's, the first tincture in the chief corners.
  { shield: "chevronny-or-gules", at: bothSides(6, [0, 2, 4]), expect: "or", why: "chevronny: or in pieces 1, 3 and 5, on both sides" },
  { shield: "chevronny-or-gules", at: bothSides(6, [1, 3, 5]), expect: "gules", why: "chevronny: gules in pieces 2, 4 and 6, on both sides" },
  { shield: "chevronny-of-eight-or-gules", at: bothSides(8, [0, 4, 6]), expect: "or", why: "chevronny of eight: or in pieces 1, 5 and 7" },
  { shield: "chevronny-of-eight-or-gules", at: bothSides(8, [1, 5, 7]), expect: "gules", why: "chevronny of eight: gules in pieces 2, 6 and 8" },
  { shield: "chevronny-or-gules w-[305px]!", at: [[49.8, 30], [50.2, 30], [49.8, 45], [50.2, 45], [49.8, 80], [50.2, 80]], expect: "gules", why: "chevronny: no seam down the centre in the gules piece" },
  { shield: "chevronny-or-gules w-[305px]!", at: [[49.8, 10], [50.2, 10], [49.8, 20], [50.2, 20], [49.8, 60], [50.2, 60]], expect: "or", why: "chevronny: no seam down the centre in the or piece" },
  { shield: "chevronny-gules-ermine", at: [furSpot(1, 1), furSpot(5, 1)], expect: "sable", why: "chevronny with a fur: spots in piece 2 on both sides" },
  { shield: "chevronny-gules-ermine", at: bothSides(6, [0, 2]), expect: "gules", why: "chevronny with a fur: gules in pieces 1 and 3" },
  { shield: "per-pale", quarters: ["chevronny-or-gules", "chevronny-or-gules"], at: bothHalves(bothSides(6, [0, 2, 4])), expect: "or", why: "chevronny of six in a per-pale half: or in pieces 1, 3 and 5, on both sides" },
  { shield: "per-fess", quarters: ["chevronny-or-gules", "gules"], at: inChief(bothSides(6, [0, 2, 4])), expect: "or", why: "chevronny of six in a per-fess chief: or in pieces 1, 3 and 5" },
  { shield: "per-pale", quarters: ["chevronny-or-gules", "chevronny-or-gules"], at: bothHalves(bothSides(6, [1, 3])), expect: "gules", why: "chevronny of six in a per-pale half: gules in pieces 2 and 4, on both sides" },
  { shield: "per-fess", quarters: ["chevronny-or-gules", "gules"], at: inChief(bothSides(6, [1, 3, 5])), expect: "gules", why: "chevronny of six in a per-fess chief: gules in pieces 2, 4 and 6" },
  { shield: "per-pale", quarters: ["chevronny-of-eight-or-gules", "chevronny-of-eight-or-gules"], at: bothHalves(bothSides(8, [0, 4, 6])), expect: "or", why: "chevronny of eight in a per-pale half: or in pieces 1, 5 and 7, on both sides" },
  { shield: "per-fess", quarters: ["chevronny-of-eight-or-gules", "gules"], at: inChief(bothSides(8, [0, 4, 6])), expect: "or", why: "chevronny of eight in a per-fess chief: or in pieces 1, 5 and 7" },
  { shield: "per-pale", quarters: ["chevronny-of-eight-or-gules", "chevronny-of-eight-or-gules"], at: bothHalves(bothSides(8, [1, 5])), expect: "gules", why: "chevronny of eight in a per-pale half: gules in pieces 2 and 6, on both sides" },
  { shield: "per-fess", quarters: ["chevronny-of-eight-or-gules", "gules"], at: inChief(bothSides(8, [1, 5, 7])), expect: "gules", why: "chevronny of eight in a per-fess chief: gules in pieces 2, 6 and 8" },
  { shield: "per-pale", quarters: ["chevronny-of-eight-or-gules", "chevronny-of-eight-or-gules"], at: bothHalves(["dexter", "sinister"].map((side) => chevronnyFlank(8, 2, 0.88, side))), expect: "or", why: "chevronny of eight in a per-pale half: or in piece 3 near the flanks, at the part's own angle" },
  { shield: "per-pale", quarters: ["chevronny-of-eight-or-gules", "chevronny-of-eight-or-gules"], at: bothHalves(["dexter", "sinister"].map((side) => chevronnyFlank(8, 3, 0.88, side))), expect: "gules", why: "chevronny of eight in a per-pale half: gules in piece 4 near the flanks, at the part's own angle" },
  { shield: "per-pale", quarters: ["chevronny-or-gules", "chevronny-or-gules"], at: bothHalves([[49, 10], [51, 10], [49, 60], [51, 60]]), expect: "or", why: "chevronny in a per-pale half: or in pieces 1 and 5 beside the centre line, at the part's own angle" },
  { shield: "per-pale", quarters: ["chevronny-or-gules", "chevronny-or-gules"], at: bothHalves([[49, 30], [51, 30], [49, 45], [51, 45], [49, 80], [51, 80]]), expect: "gules", why: "chevronny in a per-pale half: gules in pieces 4 and 6 beside the centre line, at the part's own angle" },
  { shield: "per-pale", quarters: ["chevronny-gules-ermine", "chevronny-gules-ermine"], at: bothHalves([[49, 10], [51, 10], [49, 60], [51, 60]]), expect: "gules", why: "chevronny with a fur in a per-pale half: gules beside the centre line, at the part's own angle" },
  { shield: "per-fess", quarters: ["chevronny-gules-ermine", "gules"], at: inChief(bothSides(6, [0, 2])), expect: "gules", why: "chevronny with a fur in a per-fess chief: gules in pieces 1 and 3" },
  // Seams show only where a tile boundary falls mid-pixel. At 306px a per-pale half's centre
  // (W/4) is at 76.5, its half-height (0.6W) at 183.6 and the chief's half-height (0.27W) at 82.6.
  // The chief's centre (W/2) needs an odd width: 305px puts it at 152.5.
  { shield: "per-pale w-[306px]!", quarters: ["chevronny-or-gules", "chevronny-or-gules"], at: bothHalves([[49.8, 30], [50.2, 30], [49.8, 45], [50.2, 45], [49.8, 80], [50.2, 80]]), expect: "gules", why: "chevronny: no seam down the centre of a per-pale half, in the gules piece" },
  { shield: "per-pale w-[306px]!", quarters: ["chevronny-or-gules", "chevronny-or-gules"], at: bothHalves([[49.8, 10], [50.2, 10], [49.8, 20], [50.2, 20], [49.8, 60], [50.2, 60]]), expect: "or", why: "chevronny: no seam down the centre of a per-pale half, in the or piece" },
  { shield: "per-pale w-[306px]!", quarters: ["chevronny-or-gules", "chevronny-or-gules"], at: bothHalves([[30, 49.8], [30, 50.2], [40, 49.8], [40, 50.2]]), expect: "gules", why: "chevronny: no seam across the middle of a per-pale half, in the gules piece" },
  { shield: "per-pale w-[306px]!", quarters: ["chevronny-or-gules", "chevronny-or-gules"], at: bothHalves([[8, 49.8], [8, 50.2], [14, 49.8], [14, 50.2]]), expect: "or", why: "chevronny: no seam across the middle of a per-pale half, in the or piece" },
  { shield: "per-fess w-[305px]!", quarters: ["chevronny-or-gules", "gules"], at: inChief([[49.8, 30], [50.2, 30], [49.8, 45], [50.2, 45], [49.8, 80], [50.2, 80]]), expect: "gules", why: "chevronny: no seam down the centre of a per-fess chief, in the gules piece" },
  { shield: "per-fess w-[305px]!", quarters: ["chevronny-or-gules", "gules"], at: inChief([[49.8, 10], [50.2, 10], [49.8, 20], [50.2, 20], [49.8, 60], [50.2, 60]]), expect: "or", why: "chevronny: no seam down the centre of a per-fess chief, in the or piece" },
  { shield: "per-fess w-[306px]!", quarters: ["chevronny-or-gules", "gules"], at: inChief([[30, 49.8], [30, 50.2], [40, 49.8], [40, 50.2]]), expect: "gules", why: "chevronny: no seam across the middle of a per-fess chief, in the gules piece" },
  { shield: "per-fess w-[306px]!", quarters: ["chevronny-or-gules", "gules"], at: inChief([[8, 49.8], [8, 50.2], [14, 49.8], [14, 50.2]]), expect: "or", why: "chevronny: no seam across the middle of a per-fess chief, in the or piece" },

  // Chequy: 5 across and 6 down, the first tincture in the dexter chief square.
  { shield: "chequy-or-azure", at: [chequySquare(0, 0), chequySquare(2, 0), chequySquare(4, 0), chequySquare(1, 1), chequySquare(3, 3), chequySquare(2, 4)], expect: "or", why: "chequy: or in the dexter chief square and alternately" },
  { shield: "chequy-or-azure", at: [chequySquare(1, 0), chequySquare(3, 0), chequySquare(0, 1), chequySquare(4, 1), chequySquare(2, 3), chequySquare(3, 4)], expect: "azure", why: "chequy: azure between the or squares" },
  { shield: "chequy-or-azure", at: chequySquare(2, 5), expect: "azure", why: "chequy: six rows down" },
  { shield: "chequy-gules-ermine", at: [furSpot(2, 0), furSpot(2, 2)], expect: "sable", why: "chequy with a fur: spots in ermine squares" },
  { shield: "chequy-gules-ermine", at: [chequySquare(0, 0), chequySquare(2, 2), chequySquare(4, 0)], expect: "gules", why: "chequy with a fur: gules squares, repeated down the field" },

  { shield: "barry-or-gules fess-counterchanged", at: [50, 41.67], expect: "gules", why: "a counterchanged fess on an or bar" },
  { shield: "barry-or-gules fess-counterchanged", at: [50, 55], expect: "or", why: "a counterchanged fess on a gules bar" },
  { shield: "barry-or-gules", charges: "in-fess counterchanged", items: ["roundel", "roundel"], at: [30, 45], expect: "gules", why: "a counterchanged charge on an or bar" },

  { shield: "per-pale-ermine-gules", charges: "in-fess counterchanged", items: ["roundel", "roundel"], at: [30, 45], expect: "gules", why: "a counterchanged charge on the ermine half" },
  { shield: "per-pale-ermine-gules", charges: "in-fess counterchanged", items: ["roundel", "roundel"], at: furSpot(4, 2), expect: "sable", why: "a counterchanged charge on the gules half, on the field's spot grid" },
  ...[
    ["per-pale-argent-gules", ring(ON.chevron.counts[3][0], ON.chevron.size), "argent", "gules", "a plain field"],
    ["per-pale-ermine-gules", [ON.chevron.counts[3][0]], "argent", "gules", "a fur field"],
    ["gyronny-argent-gules", ring(ON.chevron.counts[3][0], ON.chevron.size), "argent", "gules", "gyronny keeps its tinctures' order"],
  ].flatMap(([division, dexter, dexterTincture, sinisterTincture, what]) => {
    const shield = `${division} chevron-counterchanged`;
    const on = { shield, charges: "on counterchanged", items: Array(3).fill("roundel") };
    return [
      { ...on, at: dexter, expect: dexterTincture, why: `a counterchanged charge on a counterchanged chevron, dexter: ${what}` },
      { ...on, at: ring(ON.chevron.counts[3][2], ON.chevron.size), expect: sinisterTincture, why: `a counterchanged charge on a counterchanged chevron, sinister: ${what}` },
    ];
  }),
  { shield: "per-pale-argent-gules chevron-counterchanged", charges: "on counterchanged", items: Array(3).fill("roundel"), more: { charges: "between counterchanged", items: Array(3).fill("roundel") }, at: ring(BETWEEN.chevron.points[0], BETWEEN.chevron.size), expect: "gules", why: "a counterchanged charge between stays swapped, beside one on a counterchanged chevron" },
  ...["inescutcheon", "canton"].flatMap((kind) => {
    const onSub = SUB[kind][1];
    const inner = { kind, shield: "per-pale-or-azure chevron-vert", charges: "on counterchanged", items: Array(3).fill("roundel") };
    const shield = "per-pale-argent-gules chevron-counterchanged";
    const on = { shield, charges: "on counterchanged", items: Array(3).fill("roundel"), inner };
    return [
      { ...on, at: [onSub(ON.chevron.counts[3][0])], expect: "azure", why: `the ${kind}'s own counterchanged charge, dexter, doesn't take the shield's field` },
      { ...on, at: [onSub(ON.chevron.counts[3][2])], expect: "or", why: `the ${kind}'s own counterchanged charge, sinister, doesn't take the shield's field` },
    ];
  }),
  { shield: "per-pale-ermine-gules fess-counterchanged", at: [25, 45], expect: "gules", why: "a counterchanged fess on the ermine half" },
  { shield: "per-pale-ermine-gules fess-counterchanged", at: furSpot(4, 2), expect: "sable", why: "a counterchanged fess on the gules half, on the field's spot grid" },
  { shield: "azure fess-ermine", at: furSpot(1, 2), expect: "sable", why: "a spot on a fur fess, on the field's grid" },
  { shield: "azure fess-ermine", at: furGround(1, 2), expect: "argent", why: "the ground of a fur fess" },
  { shield: "azure fess-ermine", at: [50, 20], expect: "azure", why: "the field above a fur fess" },
  { shield: "azure chief-ermine", at: furSpot(1, 0), expect: "sable", why: "a spot on a fur chief" },
  { shield: "azure chief-ermine", at: furGround(1, 0), expect: "argent", why: "the ground of a fur chief" },
  { shield: "azure chief-ermine", at: [50, 50], expect: "azure", why: "the field below a fur chief" },
  { shield: "azure chevron-engrailed-ermine", at: [25, 60], expect: "argent", why: "the fur inside an engrailed chevron" },
  { shield: "azure chevron-engrailed-ermine", at: [20.56, 75.21], expect: "azure", why: "a bite in a fur engrailed chevron" },
  { shield: "azure fimbriated-gules fess-ermine", at: [50, 29], expect: "azure", why: "a fur fess isn't fimbriated" },
  ...charged("azure fess-ermine", "on", 22, [[20, 45], [50, 45], [80, 45]], "on a fess ermine"),
  ...charged("azure fess-gules", "on", 22, [[27, 20], [73, 20], [50, 42], [32, 64], [68, 64]], "five on a fess fall back to the default"),

  // Inescutcheon: `at` is still on the outer shield; onInner maps the inescutcheon's own points.
  { shield: "azure", inner: { shield: "gules" }, at: [50, 45], expect: "gules", why: "an inescutcheon at the fess point" },
  { shield: "azure", inner: { shield: "gules" }, at: [31, 45], expect: "azure", why: "the field beside an inescutcheon" },
  { shield: "azure chief-or", inner: { shield: "gules" }, at: [50, 30], expect: "gules", why: "a chief doesn't move the inescutcheon" },
  ...["fess-or", "fess-engrailed-or", "fess-ermine"].map((o) => (
    { shield: `azure ${o}`, charges: "", items: bezants(1), inner: { shield: "vert" }, at: [50, 45], expect: "vert", why: "an inescutcheon over an ordinary and a charge" }
  )),
  { shield: "per-pale-or-gules fess-counterchanged", inner: { shield: "vert" }, at: [45, 45], expect: "vert", why: "an inescutcheon over a counterchanged fess" },
  { shield: "azure fess-or", charges: "", items: bezants(1), first: true, inner: { shield: "vert" }, at: [50, 45], expect: "vert", why: "an inescutcheon before the charges still paints over them" },
  ...nested("azure", { shield: "gules" }, 50, [[50, 45]], "a charge on an inescutcheon"),
  ...nested("azure chief-or", { shield: "gules" }, 50, [[50, 45]], "a charge on an inescutcheon, on a shield with a chief"),
  ...nested("azure chief-or", { shield: "gules", items: ["bezant in-chief-point"] }, 22, [[50, 15]], "at the chief point on an inescutcheon, on a shield with a chief"),
  ...nested("azure chief-or", { shield: "gules", charges: "in-chief" }, 22, [[25, 17], [50, 15], [75, 17]], "three in chief on an inescutcheon, on a shield with a chief"),
  ...nested("azure chief-or", { shield: "gules chief-azure", charges: "in-chief" }, 18, [[25, 15], [50, 15], [75, 15]], "three in chief on an inescutcheon's chief"),
  ...nested("azure fess-or", { shield: "gules pale-argent", charges: "between" }, 18, [[18, 42], [82, 42]], "two between a pale on an inescutcheon, on a shield with a fess"),
  // Probed as size 12, though the chevron's charges are 15: at a third of the scale, 0.8 of a 15's
  // radius lands on the bezant's antialiased edge in Chromium.
  ...nested("azure fess-or", { shield: "gules chevron-argent", charges: "on" }, 12, [[50, 24], [50, 66]], "two on a chevron on an inescutcheon, on a shield with a fess"),
  { shield: "azure", inner: { shield: "per-pale-argent-gules", charges: "counterchanged", items: ["roundel"] }, at: onInner([40, 45]), expect: "gules", why: "a counterchanged charge on an inescutcheon, dexter half" },
  { shield: "azure", inner: { shield: "per-pale-argent-gules", charges: "counterchanged", items: ["roundel"] }, at: onInner([60, 45]), expect: "argent", why: "a counterchanged charge on an inescutcheon, sinister half" },
  { shield: "azure", inner: { shield: "gules cross-azure fimbriated-argent" }, at: onInner([36.5, 15]), expect: "argent", why: "a fimbriated cross on an inescutcheon" },
  // A bordure is a border, so on the shield it moves the inescutcheon inside it, like the charges.
  { shield: "azure", inner: { shield: "gules bordure-or" }, at: onInner([2, 45]), expect: "or", why: "an inescutcheon's bordure" },
  { shield: "azure", inner: { shield: "gules bordure-or" }, at: onInner([8, 45]), expect: "gules", why: "an inescutcheon's bordure is a third as wide" },
  { shield: "azure bordure-argent", inner: { shield: "gules" }, at: [2, 45], expect: "argent", why: "the shield's own bordure, with an inescutcheon" },
  { shield: "azure bordure-argent", inner: { shield: "gules" }, at: [6, 45], expect: "azure", why: "the shield's own bordure keeps its width" },

  // Canton: `at` is on the outer shield; onCanton maps the canton's own points.
  { shield: "azure", inner: { kind: "canton", shield: "gules" }, at: [[16, 16], [2, 2], [31, 31]], expect: "gules", why: "a canton in dexter chief" },
  { shield: "azure", inner: { kind: "canton", shield: "gules" }, at: [[36, 16], [16, 36]], expect: "azure", why: "the field beside and below a canton" },
  { shield: "azure bend-or", inner: { kind: "canton", shield: "gules" }, at: [10, 10], expect: "gules", why: "a canton over a bend" },
  { shield: "azure bend-or", inner: { kind: "canton", shield: "gules" }, at: [50, 50], expect: "or", why: "the bend beyond the canton" },
  { shield: "azure chief-or", inner: { kind: "canton", shield: "gules" }, at: [[16, 15], [16, 32]], expect: "gules", why: "a canton over a chief, and below it" },
  { shield: "azure chief-or", inner: { kind: "canton", shield: "gules" }, at: [50, 15], expect: "or", why: "the chief beside a canton" },
  // The bend's first charge, at (24, 24), is under the canton; the others show.
  { shield: "azure bend-gules", charges: "on", items: bezants(3), inner: { kind: "canton", shield: "vert" }, at: [24, 24], expect: "vert", why: "a canton over a charge" },
  { shield: "azure bend-gules", charges: "on", items: bezants(3), inner: { kind: "canton", shield: "vert" }, first: true, at: [24, 24], expect: "vert", why: "a canton before the charges still paints over them" },
  { shield: "azure bend-gules", charges: "on", items: bezants(3), inner: { kind: "canton", shield: "vert" }, at: ring([50, 50], 18), expect: "or", why: "charges beyond the canton" },
  { shield: "azure", inner: { kind: "canton", shield: "ermine" }, at: onCanton(furGround(0, 0)), expect: "argent", why: "a fur canton's ground (its spots are too small to probe)" },
  { shield: "sable", inner: { kind: "canton", shield: "argent cross-gules" }, at: onCanton([50, 45]), expect: "gules", why: "a cross on a canton" },
  { shield: "sable", inner: { kind: "canton", shield: "argent cross-gules" }, at: onCanton([20, 15]), expect: "argent", why: "the canton between the cross's arms" },
  { shield: "azure", inner: { kind: "canton", shield: "per-bend-or-gules" }, at: onCanton([75, 20]), expect: "or", why: "a divided canton, above the line" },
  { shield: "azure", inner: { kind: "canton", shield: "per-bend-or-gules" }, at: onCanton([20, 75]), expect: "gules", why: "a divided canton, below the line" },
  // Lined ordinaries (012): just outside the fixed charge, where the plain layout's charge was.
  { shield: "azure chevron-engrailed-argent", charges: "on", items: Array(3).fill("torteau"), at: [[13.67, 65], [86.33, 65]], expect: "argent", why: "engrailed shrinks the chevron's side charges" },
  { shield: "azure bend-engrailed-argent", charges: "between", items: Array(2).fill("torteau"), at: [[30, 59], [34, 60]], expect: "azure", why: "the engrailed bend's lower charge is moved off the edge" },
  { shield: "azure pall-invected-argent", charges: "between", items: Array(3).fill("torteau"), at: [[50, 17], [45, 16]], expect: "azure", why: "the invected pall's top charge is moved off the arms" },
  ...nested("azure", { kind: "canton", shield: "gules" }, 50, [[50, 45]], "a charge on a canton"),
  ...nested("azure chief-or", { kind: "canton", shield: "gules" }, 50, [[50, 45]], "a charge on a canton, on a shield with a chief"),
  ...nested("azure fess-or", { kind: "canton", shield: "gules pale-argent", charges: "between" }, 18, [[18, 42], [82, 42]], "two between a pale on a canton, on a shield with a fess"),
  // The canton and the chief surmount a bordure, which is 12px. The canton is still 100 × 120px.
  { shield: "azure bordure-or", inner: { kind: "canton", shield: "gules" }, at: [px(4, 4), px(4, 60), px(60, 4), px(95, 115), px(98, 118)], expect: "gules", why: "a canton over the bordure" },
  { shield: "azure bordure-or", inner: { kind: "canton", shield: "gules" }, at: [px(102, 60), px(110, 60), px(60, 122)], expect: "azure", why: "a canton over the bordure is a third of the whole shield" },
  { shield: "azure bordure-or", inner: { kind: "canton", shield: "gules" }, at: px(4, 200), expect: "or", why: "the bordure below a canton" },
  { shield: "azure", inner: { kind: "canton", shield: "gules" }, at: px(98, 118), expect: "gules", why: "a canton without a bordure" },
  { shield: "azure", inner: { kind: "canton", shield: "gules" }, at: [px(102, 60), px(60, 122)], expect: "azure", why: "a canton without a bordure is a third of the shield" },
  // The canton's own bordure is 4px, and its chief reaches 4 + 0.3 × 112 ≈ 37.6px down.
  { shield: "azure bordure-argent", inner: { kind: "canton", shield: "vert bordure-or chief-gules" }, at: [px(2, 60), px(98, 60), px(50, 118)], expect: "or", why: "a canton's own bordure, over the shield's" },
  { shield: "azure bordure-argent", inner: { kind: "canton", shield: "vert bordure-or chief-gules" }, at: px(50, 20), expect: "gules", why: "a chief on a canton with a bordure" },
  { shield: "azure bordure-argent", inner: { kind: "canton", shield: "vert bordure-or chief-gules" }, at: [px(2, 2), px(50, 2), px(98, 20)], expect: "gules", why: "a chief on a canton surmounts the canton's bordure" },
  { shield: "azure bordure-argent", inner: { kind: "canton", shield: "vert bordure-or chief-gules" }, at: px(50, 60), expect: "vert", why: "a canton's field below its chief" },
  // An inescutcheon is at (104.5, 107.8)px and 91 × 109px in a bordured shield; its canton is 30 × 36px.
  { shield: "azure bordure-argent", inner: { shield: "gules", inner: { kind: "canton", shield: "or" } }, at: [px(106.5, 109.8), px(132.5, 125.8), px(119.5, 141.8)], expect: "or", why: "a canton on an inescutcheon doesn't move by the shield's bordure" },
  { shield: "azure bordure-argent", inner: { shield: "gules", inner: { kind: "canton", shield: "or" } }, at: [px(137.5, 125.8), px(119.5, 146.8)], expect: "gules", why: "an inescutcheon beside and below its canton" },
  // A quarter isn't positioned, so its canton is placed on the shield's field, inside the bordure.
  { shield: "quarterly bordure-argent", quarters: [{ shield: "gules", inner: { kind: "canton", shield: "or" } }, "azure", "azure", "gules"], at: [px(6, 60), px(60, 6)], expect: "argent", why: "a canton in a quarter doesn't move over the bordure" },
  { shield: "quarterly bordure-argent", quarters: [{ shield: "gules", inner: { kind: "canton", shield: "or" } }, "azure", "azure", "gules"], at: px(20, 20), expect: "or", why: "a canton in a quarter" },
  { shield: "quarterly bordure-argent", quarters: [{ shield: "gules", inner: { kind: "canton", shield: "or" } }, "azure", "azure", "gules"], at: px(80, 40), expect: "gules", why: "a canton in a quarter is a third of the quarter" },
  // Each part of a divided shield is a coat of its own: a quarter's charges place within it,
  // so quarter 1's fess point is 45% of 45% down.
  { shield: "quarterly", quarters: [{ shield: "or", charges: "", items: ["roundel gules"] }, "azure", "azure", "or"], at: ring([25, 20.25], 25), expect: "gules", why: "a charge in a plain quarter" },
  { shield: "quarterly", quarters: [{ shield: "or", charges: "", items: ["roundel gules"] }, "azure", "azure", "or"], at: [55, 40], expect: "azure", why: "a charge in a plain quarter stays in it" },
  { shield: "quarterly cross-argent", quarters: ["or", "azure", "azure", { shield: "or", charges: "", items: ["roundel gules"] }], at: [50, 45], expect: "argent", why: "the shield's ordinary over a charge in a plain quarter" },
  { shield: "quarterly cross-argent", quarters: ["or", "azure", "azure", { shield: "or", charges: "", items: ["roundel gules"] }], at: [75, 72.5], expect: "gules", why: "a charge in a plain quarter, under the shield's ordinary" },
  { shield: "quarterly", quarters: [{ shield: "per-pale-or-azure", charges: "counterchanged", items: ["roundel"] }, "gules", "gules", "gules"], at: [19, 22.5], expect: "azure", why: "a counterchanged charge in a quarter, on its or half" },
  { shield: "quarterly", quarters: [{ shield: "per-pale-or-azure", charges: "counterchanged", items: ["roundel"] }, "gules", "gules", "gules"], at: [31, 22.5], expect: "or", why: "a counterchanged charge in a quarter, on its azure half" },
  // A fess is 30–60% of its quarter; the shield's chief doesn't push it down.
  { shield: "quarterly chief-or", quarters: ["gules", "gules", "azure fess-argent", "gules"], at: [25, 72], expect: "argent", why: "a quarter doesn't take the shield's chief's layout" },
  // On a shield, the grid quarterly and two-part per-fess split at the fess point, 45%.
  { shield: "quarterly", quarters: ["or", "azure", "azure", "or"], at: [25, 43], expect: "or", why: "a quartered shield's chief quarters end at 45%" },
  { shield: "quarterly", quarters: ["or", "azure", "azure", "or"], at: [25, 47], expect: "azure", why: "a quartered shield is split per-fess at 45%" },
  { shield: "per-fess", quarters: ["or", "azure"], at: [25, 47], expect: "azure", why: "a per-fess shield is split 45% of the way down the shield" },
  { shield: "azure bordure-or chief-gules", at: [px(4, 4), px(150, 4), px(296, 40), px(150, 110)], expect: "gules", why: "a chief over the bordure" },
  { shield: "azure bordure-or chief-gules", at: px(150, 116), expect: "azure", why: "a chief's lower edge stays at 30% of the field" },
  { shield: "azure bordure-or chief-gules", at: [px(4, 116), px(4, 200)], expect: "or", why: "the bordure below a chief" },
  { shield: "per-pale-or-gules bordure-argent chief-counterchanged", at: px(146, 50), expect: "gules", why: "a counterchanged chief with a bordure, dexter of the pale line" },
  { shield: "per-pale-or-gules bordure-argent chief-counterchanged", at: px(154, 50), expect: "or", why: "a counterchanged chief with a bordure, sinister of the pale line" },
  { shield: "per-pale-or-gules bordure-argent chief-counterchanged", at: [px(4, 4), px(296, 4), px(4, 100), px(296, 100)], expect: "argent", why: "a counterchanged chief leaves the bordure's strips unpainted" },
  // Seven scallops across the 276px field: bites at its middle and its first and last, 105.9px down.
  { shield: "azure bordure-argent chief-engrailed-or", at: [px(150, 105.9), px(31.7, 105.9), px(268.3, 105.9)], expect: "azure", why: "an engrailed chief's bites stay on the field" },
  { shield: "azure bordure-argent chief-engrailed-or", at: [px(4, 4), px(296, 4), px(4, 108), px(296, 108), px(150, 60)], expect: "or", why: "an engrailed chief's corners over the bordure" },
  { shield: "azure bordure-argent chief-engrailed-or", at: px(4, 200), expect: "argent", why: "the bordure below an engrailed chief" },
  // Of the first: the shield's first tincture, wherever it's painted.
  { shield: "per-pale-or-azure bend-of-the-first", at: [70, 70], expect: "or", why: "a bend of the first over the second tincture" },
  { shield: "per-pale-or-azure bend-of-the-first", at: [85, 40], expect: "azure", why: "the field beside a bend of the first" },
  { shield: "per-pale-ermine-azure bend-of-the-first", at: [70, 70], expect: "azure", why: "of the first after a fur paints nothing" },
  { shield: "per-pale-or-azure chief-engrailed-of-the-first", at: [75, 10], expect: "or", why: "an engrailed chief of the first" },
  { shield: "per-pale-or-azure bordure-of-the-first", at: [98, 45], expect: "or", why: "a bordure of the first" },
  { shield: "per-fess-azure-gules cross-or fimbriated-of-the-first", at: [36.5, 80], expect: "azure", why: "a fimbriation of the first" },
  { shield: "argent", inner: { kind: "canton", shield: "gules", items: ["roundel of-the-first"] }, at: ring(onCanton([50, 45]), 50 * CANTON), expect: "argent", why: "a charge of the first on a canton takes the shield's first" },
  { shield: "argent", inner: { kind: "canton", shield: "of-the-first", items: ["roundel gules"] }, at: onCanton([10, 10]), expect: "argent", why: "a canton of the first" },
  // Each quarter starts its own count: a pale of the first in quarter 2 is gules, over its argent half.
  { shield: "quarterly", quarters: ["or", "per-pale-gules-argent pale-of-the-first", "azure", "vert"], at: [80, 25], expect: "gules", why: "a quarter's own first" },
  { shield: "quarterly", quarters: ["or", "per-pale-gules-argent pale-of-the-first", "azure", "vert"], at: [92, 25], expect: "argent", why: "beside a pale of the first in a quarter" },
];

const LINES = ["", "-engrailed", "-invected", "-wavy", "-indented", "-embattled"];
const CONTACT = [
  ...ORDINARIES.flatMap((o) =>
    LINES.filter((line) => !line || lineOrdinaries(line.slice(1)).includes(o)).map((line) => ({
      shield: `azure ${o}${line}-or`,
    })),
  ),
  ...VOIDED.map(([o]) => ({ shield: `azure ${o}-voided-or` })),
];
// Torteaux on and between every ordinary under every line, to tune ON_SCALE and BETWEEN_LINED by
// eye: `on` at the largest count, `between` at the default count and at six.
const torteaux = (n) => Array(n).fill("torteau");
const LINED_CHARGES = Object.keys(BETWEEN).flatMap((o) =>
  LINES.filter((line) => !line || lineOrdinaries(line.slice(1)).includes(o)).flatMap((line) => {
    const shield = `azure ${o}${line}-argent`;
    const onCount = Math.max(...Object.keys(ON[o].counts).map(Number));
    const counts = [BETWEEN[o].points.length, ...(BETWEEN[o].counts?.[6] ? [6] : [])];
    return [
      { shield, charges: "on", items: torteaux(onCount) },
      ...counts.map((n) => ({ shield, charges: "between", items: torteaux(n) })),
    ];
  }),
);
const DIVIDED = DIVISIONS.flatMap((d) => [
  { shield: `${d}-or-azure` },
  { shield: `${d}-ermine-gules` },
]);
// Tile edges at % positions fall mid-pixel at this width, where seams show.
const ODD_WIDTH = 155;
// `more` is a second charges container, as { charges, items }.
const key = ({ kind, shield, charges, items, inner, first, more, quarters }) =>
  `${kind ?? ""}|${shield}|${charges}|${items}|${inner ? key(inner) : ""}|${first ?? ""}|${more ? key(more) : ""}|${quarters ? JSON.stringify(quarters) : ""}`;
const SHIELDS = [...new Map(PROBES.map((p) => [key(p), p])).values()];
const CHARGED = SHIELDS.filter((s) => s.items && !s.inner);
const NESTED = SHIELDS.filter((s) => s.inner);
const PLAIN = SHIELDS.filter((s) => !s.items && !s.inner);
const TINCTURE_MATCH_THRESHOLD = 12;

const isWithinThreshold = (threshold, gotRgb, wantRgb) => {
  return gotRgb.every((val, i) => val > wantRgb[i] - threshold && val < wantRgb[i] + threshold);
};

const nearest = (rgb, swatches) => {
  for (const [tincture, tinctureRgb] of Object.entries(swatches)) {
    if (isWithinThreshold(TINCTURE_MATCH_THRESHOLD, rgb, tinctureRgb)) {
      return tincture;
    }
  }

  return null;
};

const chargesOf = ({ charges, items }) =>
  items
    ? `<div class="charges ${charges ?? ""}">${items.map((c) => `<i class="${c}"></i>`).join("")}</div>`
    : "";
// `inner` is an inescutcheon, or a canton by `kind`, after the charges unless `first`. It can
// hold an `inner` of its own.
const nestedOf = (inner) =>
  inner
    ? `<div class="${inner.kind ?? "inescutcheon"} ${inner.shield}">${chargesOf(inner)}${nestedOf(inner.inner)}</div>`
    : "";
// `quarters` is each quarter's classes, for a `quarterly` shield, or { shield, charges, items, inner }.
const quarterOf = (q) =>
  typeof q === "string"
    ? `<div class="${q}"></div>`
    : `<div class="${q.shield}">${chargesOf(q)}${nestedOf(q.inner)}</div>`;
const markup = ({ shield, charges, items, inner, first, more, quarters }, attrs = "") => {
  const nested = nestedOf(inner);
  const own = chargesOf({ charges, items }) + (more ? chargesOf(more) : "");
  const content = (quarters ?? []).map(quarterOf).join("") + (first ? nested + own : own + nested);
  return `<div class="escutcheon ${shield}"${attrs}>${content}</div>`;
};
const describeShield = ({ shield, charges, items, more }) =>
  (items ? `${shield} · ${charges || "plain"} · ${items.join(", ")}` : shield) +
  (more ? ` · and ${more.charges || "plain"} · ${more.items.join(", ")}` : "");
const caption = (spec) =>
  spec.inner
    ? `${describeShield(spec)} · ${spec.inner.kind ?? "inescutcheon"}${spec.first ? " (first)" : ""} ${describeShield(spec.inner)}`
    : describeShield(spec);

// The CSS for every shield the probes and contact sheets draw.
const buildShields = (dir) => {
  const specs = [...SHIELDS, ...CONTACT, ...LINED_CHARGES, ...DIVIDED];
  const classes = [...specs.map((s) => markup(s)), ...TINCTURES.map((t) => `<i class="${t}"></i>`)];
  writeFileSync(join(dir, "index.html"), classes.join("\n"));
  return build({ dir });
};

const grid = (css, width, cells) => `<!doctype html>
<style>${css}</style>
<style>
  body { margin: 0; display: grid; grid-template-columns: repeat(6, ${width}px); gap: 20px; }
  .escutcheon { width: ${width}px; box-shadow: none; }
  .swatch { width: ${width}px; height: 40px; }
  figure { margin: 0; font: 14px sans-serif; text-align: center; }
</style>
${cells}`;

// One screenshot of the page, then each point's pixel, read back through a canvas.
const pixels = async (page, points) => {
  const png = await page.screenshot({ fullPage: true });
  return page.evaluate(
    async ({ src, points }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const context = canvas.getContext("2d");
      context.drawImage(img, 0, 0);
      return points.map(([x, y]) => [...context.getImageData(x, y, 1, 1).data.slice(0, 3)]);
    },
    { src: `data:image/png;base64,${png.toString("base64")}`, points },
  );
};

// `at` is one [x, y] point, or a list of them that must all match.
const spots = (at) => (Array.isArray(at[0]) ? at : [at]);

const probe = async (page, css) => {
  const cells = [
    ...TINCTURES.map((t) => `<div class="swatch ${t}" data-swatch="${t}"></div>`),
    ...SHIELDS.map((s, i) => markup(s, ` data-shield="${i}"`)),
  ].join("\n");
  // Whole-pixel rows, at least the tallest probe shield (306px wide, 367.2px tall), so each
  // shield starts on a whole y and a seam probe doesn't depend on the rows above it. The replace
  // must match grid()'s gap text.
  await page.setContent(
    grid(css, WIDTH, cells).replace(
      "gap: 20px;",
      "gap: 20px; grid-auto-rows: 368px; align-items: start;",
    ),
  );

  const boxes = await page.evaluate(() =>
    [...document.querySelectorAll("[data-swatch], [data-shield]")].map((el) => {
      const { x, y, width, height } = el.getBoundingClientRect();
      return { swatch: el.dataset.swatch, shield: el.dataset.shield, x, y, width, height };
    }),
  );
  const swatchBoxes = boxes.filter((b) => b.swatch);
  const shieldBoxes = boxes.filter((b) => b.shield !== undefined);

  const points = [
    ...swatchBoxes.map((b) => [Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2)]),
    ...PROBES.flatMap((p) => {
      const box = shieldBoxes[SHIELDS.findIndex((s) => key(s) === key(p))];
      return spots(p.at).map(([x, y]) => [
        Math.round(box.x + (x * box.width) / 100),
        Math.round(box.y + (y * box.height) / 100),
      ]);
    }),
  ];
  const read = await pixels(page, points);
  const swatches = Object.fromEntries(swatchBoxes.map((b, i) => [b.swatch, read[i]]));
  let next = swatchBoxes.length;
  return PROBES.map((p) => {
    const rgbs = spots(p.at).map(() => read[next++]);
    return { ...p, rgbs, swatches };
  });
};

const contactSheet = async (page, css, specs, columns, file, width = 150) => {
  const cells = specs
    .map((s) => `<figure>${markup(s)}<figcaption>${caption(s)}</figcaption></figure>`)
    .join("\n");
  await page.setContent(grid(css, width, cells).replace("repeat(6,", `repeat(${columns},`));
  mkdirSync(out, { recursive: true });
  await page.screenshot({ path: join(out, file), fullPage: true });
};

const dir = mkdtempSync(join(root, "test", ".tmp-"));
const failed = {};
let buildFailed = false;

try {
  const css = await buildShields(dir);
  for (const engine of [chromium, firefox]) {
    const name = engine.name();
    failed[name] = 0;
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ deviceScaleFactor: 1 });
      for (const result of await probe(page, css)) {
        const { at, expect, why, rgbs, swatches } = result;
        const miss = spots(at).findIndex((_, i) => nearest(rgbs[i], swatches) !== expect);
        if (miss !== -1) {
          failed[name]++;
          const [x, y] = spots(at)[miss].map((v) => +v.toFixed(1));
          const rgb = rgbs[miss];
          const seen = nearest(rgb, swatches) ?? `no tincture near (${rgb.join(", ")})`;
          console.error(`✗ ${name}: ${caption(result)}: ${why}`);
          console.error(`    at ${x}% ${y}%: got ${seen}, expected ${expect}`);
        }
      }
      try {
        await contactSheet(page, css, CONTACT, 9, `contact-${name}.png`);
        await contactSheet(page, css, CHARGED, 8, `charges-${name}.png`);
        await contactSheet(page, css, LINED_CHARGES, 6, `charges-lined-${name}.png`);
        await contactSheet(page, css, NESTED, 6, `inescutcheons-${name}.png`);
        await contactSheet(page, css, PLAIN, 8, `probes-${name}.png`);
        await contactSheet(page, css, DIVIDED, 8, `divisions-${name}.png`);
        await contactSheet(page, css, DIVIDED, 8, `divisions-odd-${name}.png`, ODD_WIDTH);
      } catch (error) {
        console.error(`  (no contact sheet for ${name}: ${error.message})`);
      }
    } finally {
      await browser.close();
    }
  }
} catch (error) {
  if (!error.buildFailed) {
    throw error;
  }
  console.error(error.message);
  buildFailed = true;
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// npm prints nothing when a script fails, so the last line must say.
const browsers = Object.keys(failed);
const failures = Object.values(failed).reduce((sum, n) => sum + n, 0);
const total = PROBES.length * browsers.length;
if (!buildFailed) {
  if (failures) {
    const each = browsers.map((b) => `${b} ${failed[b]}`).join(", ");
    console.error(`✗ ${failures} of ${total} probes failed (${each})`);
  } else {
    console.log(`✓ all ${total} probes passed (${browsers.join(", ")})`);
  }
}
process.exit(failures || buildFailed ? 1 : 0);
