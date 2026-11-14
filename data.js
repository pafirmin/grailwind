/*
 * Grailwind data shared by the CSS plugins and tooling such as the ESLint plugin.
 */

export const METALS = ["or", "argent"];
export const COLOURS = ["gules", "azure", "vert", "purpure", "sable"];
export const TINCTURES = [...METALS, ...COLOURS];
// Paints in the field's first tincture, as "of the first" in a blazon.
export const OF_THE_FIRST = "of-the-first";

export const DIVISIONS = [
  "per-pale",
  "per-fess",
  "per-bend",
  "per-bend-sinister",
  "per-chevron",
  "per-saltire",
  "quarterly",
  "gyronny",
  "barry",
  "barry-of-eight",
  "barry-of-ten",
  "paly",
  "paly-of-eight",
  "bendy",
  "bendy-of-eight",
  "bendy-sinister",
  "bendy-sinister-of-eight",
  "chevronny",
  "chevronny-of-eight",
  "chequy",
];

// The classes that frame a field: a shape round one child, which carries the blazon.
export const FRAMES = ["heater", "inescutcheon"];

// The lines a bordure can have besides plain, e.g. `bordure-engrailed-or`.
export const BORDURE_LINES = ["engrailed", "invected"];

// Ordinaries that can be reversed, e.g. `pile-reversed-or`: the same shape upside down.
export const REVERSIBLE = ["chevron", "pall", "pile"];
const reversed = (ordinary) => `${ordinary}-reversed`;

export const ORDINARIES = [
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
  ...REVERSIBLE.map(reversed),
];

export const CHARGES = [
  "roundel",
  "annulet",
  "mullet",
  "lozenge",
  "billet",
  "crescent",
  "fleur-de-lis",
  "cross-couped",
  "cross-potent",
  "cross-pattee",
  "maltese-cross",
  "cross-crosslet",
  "cross-moline",
  "cross-fleury",
  "shakefork",
];

// Roundels have their own names by tincture.
export const ROUNDELS = {
  bezant: "or",
  plate: "argent",
  torteau: "gules",
  hurt: "azure",
  pellet: "sable",
};

// Lines of partition for an ordinary's edge, e.g. `fess-engrailed-or`.
export const LINES = ["engrailed", "invected", "wavy", "indented", "embattled"];

// The ordinaries that take a line: every one, the cornered ones drawn by hand (064).
export const lineOrdinaries = () => ORDINARIES;

// Ordinaries that can be voided, e.g. `cross-voided-argent`.
export const VOIDABLE = [
  "pale",
  "fess",
  "bar",
  "bend",
  "bend-sinister",
  "chevron",
  "cross",
  "saltire",
  "pall",
  "pile",
  ...REVERSIBLE.map(reversed),
];

// The vair family: plain vair and potent are argent and azure, and the -y forms take a metal and a
// colour, metal first as blazon writes them.
const VAIRS = ["vair", "counter-vair", "potent", "counter-potent"];
const VAIRY = {
  vair: "vairy",
  "counter-vair": "counter-vairy",
  potent: "potenty",
  "counter-potent": "counter-potenty",
};

// Each fur's pattern: ermine's spots, or the vair family's panes.
export const FUR_PATTERNS = {
  ermine: "ermine",
  ermines: "ermine",
  erminois: "ermine",
  pean: "ermine",
  ...Object.fromEntries(VAIRS.map((pattern) => [pattern, pattern])),
  ...Object.fromEntries(
    VAIRS.flatMap((pattern) =>
      METALS.flatMap((metal) =>
        COLOURS.map((colour) => [`${VAIRY[pattern]}-${metal}-${colour}`, pattern]),
      ),
    ),
  ),
};

// Each fur's [ground, drawn] tinctures: ermine's spots, or the vair family's panes that point up in
// the top row, which is the first tincture blazoned.
export const FURS = {
  ermine: ["argent", "sable"],
  ermines: ["sable", "argent"],
  erminois: ["or", "sable"],
  pean: ["sable", "or"],
  ...Object.fromEntries(VAIRS.map((pattern) => [pattern, ["azure", "argent"]])),
  ...Object.fromEntries(
    VAIRS.flatMap((pattern) =>
      METALS.flatMap((metal) =>
        COLOURS.map((colour) => [`${VAIRY[pattern]}-${metal}-${colour}`, [colour, metal]]),
      ),
    ),
  ),
};

// The points of the shield, as [left%, top%], for placing a single charge, e.g. `in-dexter-chief`.
export const POINTS = {
  "dexter-chief": [25, 17],
  "chief-point": [50, 15],
  "sinister-chief": [75, 17],
  "honour-point": [50, 30],
  "fess-point": [50, 45],
  "nombril-point": [50, 60],
  "dexter-base": [30, 72],
  "base-point": [50, 84],
  "sinister-base": [70, 72],
};

// Plain-field arrangements of a `charges` container, besides `between` and `on`.
export const ARRANGEMENTS = [
  "in-pale",
  "in-fess",
  "in-bend",
  "in-bend-sinister",
  "in-chief",
  "in-base",
  "semy",
];

// Where charges go for "between", as [left%, top%], plus their size as % of width.
// `counts` overrides the points (and optionally the size) for one number of charges.
// prettier-ignore
export const BETWEEN = {
  pale: { size: 18, points: [[18, 42], [82, 42]], counts: {
    6: { size: 14, points: [[18, 18], [18, 45], [18, 70], [82, 18], [82, 45], [82, 70]] } } },
  fess: { size: 20, points: [[30, 15], [70, 15], [50, 78]], counts: {
    2: { points: [[50, 15], [50, 78]] },
    6: { size: 14, points: [[20, 14], [50, 14], [80, 14], [32, 70], [68, 70], [50, 86]] } } },
  bend: { size: 24, points: [[70, 26], [30, 68]], counts: {
    6: { size: 14, points: [[48, 9], [76, 12], [84, 38], [9, 48], [18, 72], [38, 84]] } } },
  "bend-sinister": { size: 24, points: [[30, 26], [70, 68]], counts: {
    6: { size: 14, points: [[52, 9], [24, 12], [16, 38], [91, 48], [82, 72], [62, 84]] } } },
  chevron: { size: 22, points: [[24, 22], [76, 22], [50, 70]], counts: {
    6: { size: 12, points: [[18, 14], [50, 11], [82, 14], [40, 72], [60, 72], [50, 84]] } } },
  cross: { size: 18, points: [[20, 17], [80, 17], [24, 72], [76, 72]] },
  saltire: { size: 16, points: [[50, 13], [14, 45], [86, 45], [50, 84]], counts: {
    2: { points: [[14, 45], [86, 45]] } } },
  pall: { size: 18, points: [[50, 11], [18, 56], [82, 56]], counts: {
    2: { points: [[18, 56], [82, 56]] } } },
  pile: { size: 20, points: [[18, 55], [82, 55]] },
};

// `on` charges shrink on lines that cut deep into the ordinary, by line.
export const ON_SCALE = { engrailed: 0.8, indented: 0.9 };

// Where charges go for "on", along the ordinary's centre line, by number of charges.
// prettier-ignore
export const ON = {
  pale: { size: 20, counts: { 1: [[50, 45]], 2: [[50, 28], [50, 62]], 3: [[50, 18], [50, 45], [50, 72]] } },
  fess: { size: 22, counts: { 1: [[50, 45]], 2: [[30, 45], [70, 45]], 3: [[20, 45], [50, 45], [80, 45]] } },
  bend: { size: 18, counts: { 1: [[50, 50]], 2: [[33, 33], [67, 67]], 3: [[24, 24], [50, 50], [76, 76]] } },
  "bend-sinister": { size: 18, counts: { 1: [[50, 50]], 2: [[67, 33], [33, 67]], 3: [[76, 24], [50, 50], [24, 76]] } },
  chevron: { size: 15, counts: { 1: [[50, 36]], 3: [[20, 65], [50, 36], [80, 65]] } },
  cross: { size: 15, counts: { 1: [[50, 45]], 5: [[50, 15], [18, 45], [50, 45], [82, 45], [50, 80]] } },
  saltire: { size: 16, counts: { 1: [[50, 45]], 5: [[22, 19.8], [78, 19.8], [50, 45], [22, 70.2], [78, 70.2]] } },
  pall: { size: 16, counts: { 1: [[50, 40]], 3: [[26, 20.8], [74, 20.8], [50, 75]] } },
  pile: { size: 14, counts: { 1: [[50, 25]], 3: [[50, 14], [50, 34], [50, 54]] } },
};

const mirror = (points) => points.map(([x, y]) => [x, 100 - y]);
const mapValues = (object, fn) =>
  Object.fromEntries(Object.entries(object).map(([key, value]) => [key, fn(value)]));

for (const ordinary of REVERSIBLE) {
  const { size, points, counts = {} } = BETWEEN[ordinary];
  BETWEEN[reversed(ordinary)] = {
    size,
    points: mirror(points),
    counts: mapValues(counts, (count) => ({ ...count, points: mirror(count.points) })),
  };
  ON[reversed(ordinary)] = {
    size: ON[ordinary].size,
    counts: mapValues(ON[ordinary].counts, mirror),
  };
}

// Mirrored, the lower charges would clip on the heater's curved flanks.
// prettier-ignore
BETWEEN["chevron-reversed"] = {
  ...BETWEEN["chevron-reversed"],
  points: [[26, 76], [74, 76], [50, 30]],
  counts: { 6: { size: 12, points: [[26, 78], [50, 89], [74, 78], [40, 28], [60, 28], [50, 16]] } },
};

// `between` overrides where a line's edge hits a charge, by ordinary and line; the rest falls
// back to the plain ordinary's. The sinister bend and the reversed pall are mirrored from these.
// prettier-ignore
export const BETWEEN_LINED = {
  bend: {
    engrailed: { points: [[70, 26], [24, 72]] },
    invected: { points: [[70, 26], [24, 72]] },
    wavy: { points: [[70, 26], [24, 72]] },
    indented: { points: [[70, 26], [24, 72]] },
  },
  chevron: {
    embattled: { counts: { 6: { size: 10, points: [[16, 13], [50, 8], [84, 13], [40, 72], [60, 72], [50, 84]] } } },
  },
  "chevron-reversed": {
    embattled: { points: [[26, 76], [74, 76], [50, 24]] },
  },
  pall: {
    invected: { points: [[50, 8], [18, 56], [82, 56]] },
    wavy: { points: [[50, 8], [18, 56], [82, 56]] },
    indented: { points: [[50, 8], [18, 56], [82, 56]] },
    embattled: { points: [[50, 8], [18, 56], [82, 56]] },
  },
};

const mirrorX = (points) => points.map(([x, y]) => [100 - x, y]);
const mirrorLined = (entry, flip) => ({
  ...entry,
  ...(entry.points && { points: flip(entry.points) }),
  ...(entry.counts && {
    counts: mapValues(entry.counts, (count) => ({ ...count, points: flip(count.points) })),
  }),
});
BETWEEN_LINED["bend-sinister"] = mapValues(BETWEEN_LINED.bend, (entry) =>
  mirrorLined(entry, mirrorX),
);
BETWEEN_LINED["pall-reversed"] = mapValues(BETWEEN_LINED.pall, (entry) =>
  mirrorLined(entry, mirror),
);
