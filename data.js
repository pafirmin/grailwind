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
  "quarterly",
  "gyronny",
];

export const ORDINARIES = [
  "pale",
  "fess",
  "bend",
  "bend-sinister",
  "chevron",
  "cross",
  "saltire",
  "pall",
  "chief",
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

// Plain-field arrangements of a `charges` container, besides `between` and `on`.
export const ARRANGEMENTS = ["in-pale", "in-fess", "in-bend"];

// Where charges go for "between", as [left%, top%], plus their size as % of width.
// prettier-ignore
export const BETWEEN = {
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
export const ON = {
  pale: { size: 20, counts: { 1: [[50, 45]], 2: [[50, 28], [50, 62]], 3: [[50, 18], [50, 45], [50, 72]] } },
  fess: { size: 22, counts: { 1: [[50, 45]], 2: [[30, 45], [70, 45]], 3: [[20, 45], [50, 45], [80, 45]] } },
  bend: { size: 18, counts: { 1: [[50, 50]], 2: [[33, 33], [67, 67]], 3: [[24, 24], [50, 50], [76, 76]] } },
  "bend-sinister": { size: 18, counts: { 1: [[50, 50]], 2: [[67, 33], [33, 67]], 3: [[76, 24], [50, 50], [24, 76]] } },
  chevron: { size: 12, counts: { 1: [[50, 36]], 3: [[20, 65], [50, 36], [80, 65]] } },
  cross: { size: 15, counts: { 1: [[50, 45]], 5: [[50, 15], [18, 45], [50, 45], [82, 45], [50, 80]] } },
  saltire: { size: 14, counts: { 1: [[50, 50]], 5: [[22, 22], [78, 22], [50, 50], [22, 78], [78, 78]] } },
  pall: { size: 14, counts: { 1: [[50, 50]], 3: [[22, 22], [78, 22], [50, 75]] } },
};
