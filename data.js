/*
 * Grailwind data shared by the CSS plugins and tooling such as the ESLint plugin.
 */

export const METALS = ["or", "argent"];
export const COLOURS = ["gules", "azure", "vert", "purpure", "sable"];
export const TINCTURES = [...METALS, ...COLOURS];

export const DIVISIONS = [
  "per-pale",
  "per-fess",
  "per-bend",
  "per-bend-sinister",
  "per-saltire",
  "quarterly",
  "gyronny",
  "barry",
  "barry-of-eight",
  "barry-of-ten",
  "paly",
  "paly-of-eight",
];

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
];

export const CHARGES = [
  "roundel",
  "annulet",
  "mullet",
  "lozenge",
  "billet",
  "crescent",
  "fleur-de-lis",
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
export const LINES = ["engrailed", "invected"];

// Each fur's [ground, spot] tinctures.
export const FURS = {
  ermine: ["argent", "sable"],
  ermines: ["sable", "argent"],
  erminois: ["or", "sable"],
  pean: ["sable", "or"],
};

// The points of the shield, as [left%, top%], for placing a single charge, e.g. `in-dexter-chief`.
export const POINTS = {
  "dexter-chief": [25, 17],
  chief: [50, 15],
  "sinister-chief": [75, 17],
  "honour-point": [50, 30],
  "fess-point": [50, 45],
  "nombril-point": [50, 60],
  "dexter-base": [30, 72],
  base: [50, 84],
  "sinister-base": [70, 72],
};

// Plain-field arrangements of a `charges` container, besides `between` and `on`.
export const ARRANGEMENTS = ["in-pale", "in-fess", "in-bend", "in-bend-sinister"];

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
    6: { size: 12, points: [[18, 14], [50, 11], [82, 14], [38, 66], [62, 66], [50, 84]] } } },
  cross: { size: 18, points: [[20, 17], [80, 17], [24, 72], [76, 72]] },
  saltire: { size: 16, points: [[50, 13], [14, 50], [86, 50], [50, 84]], counts: {
    2: { points: [[14, 50], [86, 50]] } } },
  pall: { size: 18, points: [[50, 11], [18, 56], [82, 56]], counts: {
    2: { points: [[18, 56], [82, 56]] } } },
  pile: { size: 20, points: [[18, 55], [82, 55]] },
};

// Where charges go for "on", along the ordinary's centre line, by number of charges.
// prettier-ignore
export const ON = {
  pale: { size: 20, counts: { 1: [[50, 45]], 2: [[50, 28], [50, 62]], 3: [[50, 18], [50, 45], [50, 72]] } },
  fess: { size: 22, counts: { 1: [[50, 45]], 2: [[30, 45], [70, 45]], 3: [[20, 45], [50, 45], [80, 45]] } },
  bend: { size: 18, counts: { 1: [[50, 50]], 2: [[33, 33], [67, 67]], 3: [[24, 24], [50, 50], [76, 76]] } },
  "bend-sinister": { size: 18, counts: { 1: [[50, 50]], 2: [[67, 33], [33, 67]], 3: [[76, 24], [50, 50], [24, 76]] } },
  chevron: { size: 12, counts: { 1: [[50, 36]], 3: [[20, 65], [50, 36], [80, 65]] } },
  cross: { size: 15, counts: { 1: [[50, 45]], 5: [[50, 15], [18, 45], [50, 45], [82, 45], [50, 80]] } },
  saltire: { size: 14, counts: { 1: [[50, 50]], 5: [[22, 22], [78, 22], [50, 50], [22, 78], [78, 78]] } },
  pall: { size: 14, counts: { 1: [[50, 50]], 3: [[22, 22], [78, 22], [50, 75]] } },
  pile: { size: 14, counts: { 1: [[50, 25]], 3: [[50, 14], [50, 34], [50, 54]] } },
};
