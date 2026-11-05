// Renders shields in Chromium and Firefox and checks the tincture at chosen points.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "node_modules/.bin/tailwindcss");
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
  { shield: "azure chevron-or", at: [25, 60], expect: "or", why: "the chevron is drawn" },
  { shield: "azure chevron-or", at: [50, 60], expect: "azure", why: "the field under the chevron" },
  { shield: "azure cross-or", at: [50, 45], expect: "or", why: "the cross is drawn" },
  { shield: "azure cross-or", at: [20, 20], expect: "azure", why: "the field in the first quarter" },
  { shield: "azure saltire-or", at: [50, 50], expect: "or", why: "the saltire is drawn" },
  { shield: "azure saltire-or", at: [50, 20], expect: "azure", why: "the field above the saltire" },
  { shield: "azure pall-or", at: [50, 70], expect: "or", why: "the pall's foot is drawn" },
  { shield: "azure pall-or", at: [50, 20], expect: "azure", why: "the field above the pall" },
  { shield: "azure chief-or", at: [50, 15], expect: "or", why: "the chief is drawn" },
  { shield: "azure chief-or", at: [50, 50], expect: "azure", why: "the field below the chief" },

  { shield: "azure pale-engrailed-or", at: [62.7, 50], expect: "azure", why: "a bite in the pale" },
  { shield: "azure fess-engrailed-or", at: [50, 32.1], expect: "azure", why: "a bite in the fess" },
  { shield: "azure bend-engrailed-or", at: [58.1, 41.3], expect: "azure", why: "a bite in the bend" },
  { shield: "azure bend-sinister-engrailed-or", at: [41.9, 41.3], expect: "azure", why: "a bite in the bend sinister" },
  { shield: "azure chevron-engrailed-or", at: [20.6, 72.2], expect: "azure", why: "a bite in the chevron" },
  { shield: "azure cross-engrailed-or", at: [80, 36.9], expect: "azure", why: "a bite in the cross" },
  { shield: "azure saltire-engrailed-or", at: [85, 73.2], expect: "azure", why: "a bite in the saltire" },
  { shield: "azure pall-engrailed-or", at: [73.7, 14.4], expect: "azure", why: "a bite in the pall" },
  { shield: "azure chief-engrailed-or", at: [50, 27.9], expect: "azure", why: "a bite in the chief" },
  { shield: "gules chevron-engrailed-or", at: [50, 27], expect: "gules", why: "no sliver above the chevron's peak" },

  { shield: "azure fess-invected-or", at: [50, 27.9], expect: "or", why: "a bulge on the fess" },
  { shield: "azure bend-sinister-invected-or", at: [38.1, 38.7], expect: "or", why: "a bulge on the bend sinister" },
  { shield: "azure chief-invected-or", at: [50, 32.1], expect: "or", why: "a bulge on the chief" },

  { shield: "or chevron-gules chief-azure", at: [50, 38], expect: "or", why: "the chevron moves below a chief" },
  { shield: "gules cross-azure fimbriated-argent", at: [38.5, 15], expect: "argent", why: "the cross's fimbriation" },
  { shield: "gules cross-azure fimbriated-argent", at: [50, 45], expect: "azure", why: "the fimbriated cross itself" },
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
  // The pile's sides run from (20, 0) and (80, 0) to (50, 85), so at 40% down they're at 34.12 and 65.88.
  { shield: "azure pile-or", at: [[50, 20], [50, 50], [50, 78], [35.62, 40], [64.38, 40]], expect: "or", why: "the pile is drawn, down to near its tip" },
  { shield: "azure pile-or", at: [[20, 20], [80, 20], [32.62, 40], [67.38, 40], [50, 88]], expect: "azure", why: "the field either side and below the tip" },
  // Eight scallops a side, each 4.6 units deep; the bite is half that in from the middle of the fifth from the tip.
  { shield: "azure pile-engrailed-or", at: [[35.36, 36.64], [64.64, 36.64]], expect: "azure", why: "a bite in each side of the pile" },
  { shield: "azure pile-engrailed-or", at: [[50, 20], [37.88, 41.79], [62.12, 41.79]], expect: "or", why: "the engrailed pile, by a cusp on each side" },
  { shield: "azure pile-engrailed-or", at: [50, 84], expect: "azure", why: "no sliver below the engrailed pile's tip" },
  // Fimbriated, each side moves out 3.13% across, and the tip down to 93.9%.
  { shield: "gules pile-azure fimbriated-argent", at: [[32.62, 40], [67.38, 40], [50, 88]], expect: "argent", why: "the pile's fimbriation, on each side and below the tip" },
  { shield: "gules pile-azure fimbriated-argent", at: [[35.62, 40], [64.38, 40], [50, 1], [50, 30], [50, 60], [50, 80]], expect: "azure", why: "the pile itself, just inside each side and down its centre line" },
  { shield: "gules pile-azure fimbriated-argent", at: [[29.12, 40], [70.88, 40], [20, 80]], expect: "gules", why: "the field beyond the pile's fimbriation" },
  // At an odd width the two tiles meet mid-pixel, at 152.5px: 49.8% and 50.2% read pixels 152 and 153.
  // A multiple of 5, so the 5:6 shield's height stays whole and later rows stay on the pixel grid.
  { shield: "gules pile-azure fimbriated-argent w-[305px]!", at: [[49.8, 20], [50.2, 20], [49.8, 50], [50.2, 50], [49.8, 75], [50.2, 75]], expect: "azure", why: "no seam down a fimbriated pile where its tiles meet" },
  // Below a chief, the pile's y is 30 + 0.7y; across, it's unchanged.
  { shield: "gules pile-azure fimbriated-argent chief-or", at: [[32.62, 58], [67.38, 58]], expect: "argent", why: "the fimbriation of a pile below a chief" },
  { shield: "gules pile-azure fimbriated-argent chief-or", at: [[35.62, 58], [64.38, 58], [50, 40]], expect: "azure", why: "a fimbriated pile below a chief" },
  { shield: "gules pile-azure fimbriated-argent chief-or", at: [[29.12, 58], [70.88, 58]], expect: "gules", why: "the field beside a fimbriated pile below a chief" },
  { shield: "per-pale-or-gules pile-counterchanged", at: [45, 30], expect: "gules", why: "the counterchanged pile's dexter half" },
  { shield: "per-pale-or-gules pile-counterchanged", at: [[55, 30], [20, 30]], expect: "or", why: "the counterchanged pile's sinister half, and the field beside it" },
  { shield: "azure pile-ermine", at: [furSpot(2, 0), furSpot(3, 1)], expect: "sable", why: "spots on a fur pile" },
  { shield: "azure pile-ermine", at: [[15, 20], [85, 20]], expect: "azure", why: "the field beside a fur pile" },

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
  ...charged("azure cross-gules", "between", 18, [[20, 17], [80, 17], [24, 72], [76, 72]], "between a cross"),
  ...charged("azure saltire-gules", "between", 16, [[50, 13], [14, 50], [86, 50], [50, 84]], "between a saltire"),
  ...charged("azure pall-gules", "between", 18, [[50, 11], [18, 56], [82, 56]], "between a pall"),

  ...charged("azure pile-gules", "between", 20, [[18, 55], [82, 55]], "between a pile"),
  ...charged("azure pile-gules chief-or", "between", 20, [[18, 68.5], [82, 68.5]], "between a pile below a chief"),
  ...charged("azure pale-gules", "on", 20, [[50, 18], [50, 45], [50, 72]], "on a pale"),
  ...charged("azure fess-gules", "on", 22, [[20, 45], [50, 45], [80, 45]], "on a fess"),
  ...charged("azure bend-gules", "on", 18, [[24, 24], [50, 50], [76, 76]], "on a bend"),
  ...charged("azure bend-sinister-gules", "on", 18, [[76, 24], [50, 50], [24, 76]], "on a bend sinister"),
  ...charged("azure chevron-gules", "on", 12, [[20, 65], [50, 36], [80, 65]], "on a chevron"),
  ...charged("azure cross-gules", "on", 15, [[50, 15], [18, 45], [50, 45], [82, 45], [50, 80]], "on a cross"),
  ...charged("azure saltire-gules", "on", 14, [[22, 22], [78, 22], [50, 50], [22, 78], [78, 78]], "on a saltire"),
  ...charged("azure pall-gules", "on", 14, [[22, 22], [78, 22], [50, 75]], "on a pall"),
  ...charged("azure pile-gules", "on", 14, [[50, 25]], "one on a pile"),
  ...charged("azure pile-gules", "on", 14, [[50, 14], [50, 34], [50, 54]], "three on a pile"),
  // The pile is 10.9% each side of its centre line at 54% down, and a roundel 6.4%.
  { shield: "azure pile-gules", charges: "on", items: bezants(3), at: [[42.5, 54], [57.5, 54]], expect: "gules", why: "the lowest of three on a pile fits inside it" },
  ...charged("azure pile-gules chief-or", "on", 14, [[50, 39.8], [50, 53.8], [50, 67.8]], "three on a pile below a chief"),
  { shield: "azure pile-gules chief-or", charges: "on", items: bezants(3), at: [[42.5, 67.8], [57.5, 67.8]], expect: "gules", why: "the lowest of three on a pile fits inside it, below a chief" },

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

  // Per saltire's diagonals run from each corner to the centre, so each probe pair straddles one.
  { shield: "per-saltire-or-gules", at: [50, 15], expect: "or", why: "or in chief" },
  { shield: "per-saltire-or-gules", at: [50, 80], expect: "or", why: "or in base" },
  { shield: "per-saltire-or-gules", at: [15, 50], expect: "gules", why: "gules in the dexter flank" },
  { shield: "per-saltire-or-gules", at: [85, 50], expect: "gules", why: "gules in the sinister flank" },
  { shield: "per-saltire-or-gules", at: [[50, 45], [50, 55]], expect: "or", why: "or above and below the crossing" },
  { shield: "per-saltire-or-gules", at: [[45, 50], [55, 50]], expect: "gules", why: "gules either side of the crossing" },
  { shield: "per-saltire-or-gules", at: [[25, 22], [75, 22]], expect: "or", why: "or above the upper diagonals" },
  { shield: "per-saltire-or-gules", at: [[25, 28], [75, 28]], expect: "gules", why: "gules below the upper diagonals" },
  { shield: "per-saltire-or-gules", at: [[25, 72], [75, 72]], expect: "gules", why: "gules above the lower diagonals" },
  { shield: "per-saltire-or-gules", at: [[25, 78], [75, 78]], expect: "or", why: "or below the lower diagonals" },
  { shield: "per-saltire-or-gules saltire-argent", at: [[25, 25], [75, 25], [25, 75], [75, 75], [50, 50]], expect: "argent", why: "a saltire covers the seams" },
  { shield: "per-saltire-ermine-azure", at: furSpot(2, 0), expect: "sable", why: "a spot in chief" },
  { shield: "per-saltire-ermine-azure", at: furGround(2, 0), expect: "argent", why: "the ground in chief" },
  { shield: "per-saltire-ermine-azure", at: furSpot(2, 4), expect: "sable", why: "a spot in base" },
  { shield: "per-saltire-ermine-azure", at: [[15, 50], [85, 50]], expect: "azure", why: "the flanks are azure" },
  { shield: "per-saltire-gules-ermine", at: [[50, 10], [50, 80]], expect: "gules", why: "gules in chief and base" },
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
  { shield: "barry-or-gules fess-counterchanged", at: [50, 41.67], expect: "gules", why: "a counterchanged fess on an or bar" },
  { shield: "barry-or-gules fess-counterchanged", at: [50, 55], expect: "or", why: "a counterchanged fess on a gules bar" },
  { shield: "barry-or-gules", charges: "in-fess counterchanged", items: ["roundel", "roundel"], at: [30, 45], expect: "gules", why: "a counterchanged charge on an or bar" },

  { shield: "per-pale-ermine-gules", charges: "in-fess counterchanged", items: ["roundel", "roundel"], at: [30, 45], expect: "gules", why: "a counterchanged charge on the ermine half" },
  { shield: "per-pale-ermine-gules", charges: "in-fess counterchanged", items: ["roundel", "roundel"], at: furSpot(4, 2), expect: "sable", why: "a counterchanged charge on the gules half, on the field's spot grid" },
  { shield: "per-pale-ermine-gules fess-counterchanged", at: [25, 45], expect: "gules", why: "a counterchanged fess on the ermine half" },
  { shield: "per-pale-ermine-gules fess-counterchanged", at: furSpot(4, 2), expect: "sable", why: "a counterchanged fess on the gules half, on the field's spot grid" },
  { shield: "azure fess-ermine", at: furSpot(1, 2), expect: "sable", why: "a spot on a fur fess, on the field's grid" },
  { shield: "azure fess-ermine", at: furGround(1, 2), expect: "argent", why: "the ground of a fur fess" },
  { shield: "azure fess-ermine", at: [50, 20], expect: "azure", why: "the field above a fur fess" },
  { shield: "azure chief-ermine", at: furSpot(1, 0), expect: "sable", why: "a spot on a fur chief" },
  { shield: "azure chief-ermine", at: furGround(1, 0), expect: "argent", why: "the ground of a fur chief" },
  { shield: "azure chief-ermine", at: [50, 50], expect: "azure", why: "the field below a fur chief" },
  { shield: "azure chevron-engrailed-ermine", at: [25, 60], expect: "argent", why: "the fur inside an engrailed chevron" },
  { shield: "azure chevron-engrailed-ermine", at: [20.6, 72.2], expect: "azure", why: "a bite in a fur engrailed chevron" },
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
  ...nested("azure fess-or", { shield: "gules chevron-argent", charges: "on" }, 12, [[50, 24], [50, 66]], "two on a chevron on an inescutcheon, on a shield with a fess"),
  { shield: "azure", inner: { shield: "per-pale-argent-gules", charges: "counterchanged", items: ["roundel"] }, at: onInner([40, 45]), expect: "gules", why: "a counterchanged charge on an inescutcheon, dexter half" },
  { shield: "azure", inner: { shield: "per-pale-argent-gules", charges: "counterchanged", items: ["roundel"] }, at: onInner([60, 45]), expect: "argent", why: "a counterchanged charge on an inescutcheon, sinister half" },
  { shield: "azure", inner: { shield: "gules cross-azure fimbriated-argent" }, at: onInner([38.5, 15]), expect: "argent", why: "a fimbriated cross on an inescutcheon" },
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
  // Each part of a divided shield is a coat of its own: a quarter is 5:6, so its charges place as on a shield.
  { shield: "quarterly", quarters: [{ shield: "or", charges: "", items: ["roundel gules"] }, "azure", "azure", "or"], at: ring([25, 22.5], 25), expect: "gules", why: "a charge in a plain quarter" },
  { shield: "quarterly", quarters: [{ shield: "or", charges: "", items: ["roundel gules"] }, "azure", "azure", "or"], at: [55, 45], expect: "azure", why: "a charge in a plain quarter stays in it" },
  { shield: "quarterly cross-argent", quarters: ["or", "azure", "azure", { shield: "or", charges: "", items: ["roundel gules"] }], at: [50, 45], expect: "argent", why: "the shield's ordinary over a charge in a plain quarter" },
  { shield: "quarterly cross-argent", quarters: ["or", "azure", "azure", { shield: "or", charges: "", items: ["roundel gules"] }], at: [75, 72.5], expect: "gules", why: "a charge in a plain quarter, under the shield's ordinary" },
  { shield: "quarterly", quarters: [{ shield: "per-pale-or-azure", charges: "counterchanged", items: ["roundel"] }, "gules", "gules", "gules"], at: [19, 22.5], expect: "azure", why: "a counterchanged charge in a quarter, on its or half" },
  { shield: "quarterly", quarters: [{ shield: "per-pale-or-azure", charges: "counterchanged", items: ["roundel"] }, "gules", "gules", "gules"], at: [31, 22.5], expect: "or", why: "a counterchanged charge in a quarter, on its azure half" },
  // A fess is 30–60% of its quarter; the shield's chief doesn't push it down.
  { shield: "quarterly chief-or", quarters: ["gules", "gules", "azure fess-argent", "gules"], at: [25, 72], expect: "argent", why: "a quarter doesn't take the shield's chief's layout" },
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
  { shield: "per-fess-azure-gules cross-or fimbriated-of-the-first", at: [38.5, 80], expect: "azure", why: "a fimbriation of the first" },
  { shield: "argent", inner: { kind: "canton", shield: "gules", items: ["roundel of-the-first"] }, at: ring(onCanton([50, 45]), 50 * CANTON), expect: "argent", why: "a charge of the first on a canton takes the shield's first" },
  { shield: "argent", inner: { kind: "canton", shield: "of-the-first", items: ["roundel gules"] }, at: onCanton([10, 10]), expect: "argent", why: "a canton of the first" },
  // Each quarter starts its own count: a pale of the first in quarter 2 is gules, over its argent half.
  { shield: "quarterly", quarters: ["or", "per-pale-gules-argent pale-of-the-first", "azure", "vert"], at: [80, 25], expect: "gules", why: "a quarter's own first" },
  { shield: "quarterly", quarters: ["or", "per-pale-gules-argent pale-of-the-first", "azure", "vert"], at: [92, 25], expect: "argent", why: "beside a pale of the first in a quarter" },
];

const LINES = ["", "-engrailed", "-invected"];
const CONTACT = ORDINARIES.flatMap((o) =>
  LINES.map((line) => ({ shield: `azure ${o}${line}-or` })),
);
// `more` is a second charges container, as { charges, items }.
const key = ({ kind, shield, charges, items, inner, first, more, quarters }) =>
  `${kind ?? ""}|${shield}|${charges}|${items}|${inner ? key(inner) : ""}|${first ?? ""}|${more ? key(more) : ""}|${quarters ? JSON.stringify(quarters) : ""}`;
const SHIELDS = [...new Map(PROBES.map((p) => [key(p), p])).values()];
const CHARGED = SHIELDS.filter((s) => s.items && !s.inner);
const NESTED = SHIELDS.filter((s) => s.inner);
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

const build = (dir) => {
  const specs = [...SHIELDS, ...CONTACT];
  const classes = [...specs.map((s) => markup(s)), ...TINCTURES.map((t) => `<i class="${t}"></i>`)];
  writeFileSync(join(dir, "index.html"), classes.join("\n"));
  const input = join(dir, "input.css");
  const output = join(dir, "output.css");
  writeFileSync(
    input,
    `@import "tailwindcss" source(none);\n@source "./index.html";\n@import "${join(root, "grailwind.css")}";\n`,
  );
  execFileSync(cli, ["-i", input, "-o", output], { stdio: "pipe" });
  return readFileSync(output, "utf8");
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
  await page.setContent(grid(css, WIDTH, cells));

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

const contactSheet = async (page, css, specs, columns, file) => {
  const cells = specs
    .map((s) => `<figure>${markup(s)}<figcaption>${caption(s)}</figcaption></figure>`)
    .join("\n");
  await page.setContent(grid(css, 150, cells).replace("repeat(6,", `repeat(${columns},`));
  mkdirSync(out, { recursive: true });
  await page.screenshot({ path: join(out, file), fullPage: true });
};

const dir = mkdtempSync(join(root, "test", ".tmp-"));
let failures = 0;

try {
  const css = build(dir);
  for (const engine of [chromium, firefox]) {
    const name = engine.name();
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ deviceScaleFactor: 1 });
      for (const result of await probe(page, css)) {
        const { at, expect, why, rgbs, swatches } = result;
        const miss = spots(at).findIndex((_, i) => nearest(rgbs[i], swatches) !== expect);
        if (miss === -1) {
          console.log(`✓ ${name}: ${caption(result)}: ${why}`);
        } else {
          failures++;
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
        await contactSheet(page, css, NESTED, 6, `inescutcheons-${name}.png`);
      } catch (error) {
        console.error(`  (no contact sheet for ${name}: ${error.message})`);
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

process.exit(failures ? 1 : 0);
