/*
 * Reading heraldry from a set of class names.
 */
import {
  ARRANGEMENTS,
  CHARGES,
  COLOURS,
  DIVISIONS,
  FURS,
  LINES,
  METALS,
  ORDINARIES,
  POINTS,
  ROUNDELS,
  TINCTURES,
} from "grailwind/data";

const METAL = new Set(METALS);
const COLOUR = new Set(COLOURS);
const FUR = new Set(Object.keys(FURS));
// Anything a field, ordinary or charge can be painted in.
const TINCTURE = new Set([...TINCTURES, ...FUR]);
const CHARGE = new Set([...CHARGES, ...Object.keys(ROUNDELS)]);
const FIMBRIATIONS = new Set(TINCTURES.map((t) => `fimbriated-${t}`));
const CHIEF_POINTS = new Set(["in-dexter-chief", "in-chief", "in-sinister-chief"]);
const POINT_CLASSES = new Set(Object.keys(POINTS).map((point) => `in-${point}`));
export const ALL_ARRANGEMENTS = ["between", "on", ...ARRANGEMENTS];

// Every ordinary class, e.g. `fess-or`, `fess-engrailed-ermine`, `fess-counterchanged` and
// `bordure-or`, mapped to its parts. A counterchanged ordinary has no tincture of its own.
const ORDINARY_CLASSES = new Map();
for (const ordinary of ORDINARIES) {
  for (const tincture of TINCTURE) {
    const fur = FUR.has(tincture);
    ORDINARY_CLASSES.set(`${ordinary}-${tincture}`, { ordinary, tincture, fur });
    for (const line of LINES) {
      ORDINARY_CLASSES.set(`${ordinary}-${line}-${tincture}`, { ordinary, tincture, fur, line });
    }
  }
  ORDINARY_CLASSES.set(`${ordinary}-counterchanged`, {
    ordinary,
    tincture: null,
    counterchanged: true,
  });
}
for (const tincture of TINCTURES) {
  ORDINARY_CLASSES.set(`bordure-${tincture}`, { ordinary: "bordure", tincture });
}

// Two furs in one division aren't generated.
const DIVISION_CLASSES = new Set();
for (const division of DIVISIONS) {
  for (const a of TINCTURE) {
    for (const b of TINCTURE) {
      if (a !== b && !(FUR.has(a) && FUR.has(b))) {
        DIVISION_CLASSES.add(`${division}-${a}-${b}`);
      }
    }
  }
}

// Only a plain, tinctured ordinary is fimbriated (see ordinaries.js).
export const isFimbriable = (o) => !o.counterchanged && !o.line && !o.fur;

export const isFur = (tincture) => FUR.has(tincture);

const groundKind = (fur) => kind(FURS[fur][0]);

// What the rule's `furs` option makes of one fur: "metal", "colour" or "exempt". The rule's
// schema has already checked the option.
const furChoice = (fur, option) => {
  if (option === "ground") {
    return groundKind(fur);
  }
  if (option === "exempt") {
    return "exempt";
  }
  // A map: a fur left out counts by its ground.
  return option[fur] ?? groundKind(fur);
};

// Each fur's kind for kind() and sameKind(). Exempt is null, which they treat as "no check".
export function furKinds(option = "ground") {
  const kinds = {};
  for (const fur of Object.keys(FURS)) {
    const choice = furChoice(fur, option);
    kinds[fur] = choice === "exempt" ? null : choice;
  }
  return kinds;
}

// `furs` is the map from furKinds().
export const kind = (tincture, furs) => {
  if (FUR.has(tincture)) {
    return furs[tincture];
  }
  return METAL.has(tincture) ? "metal" : COLOUR.has(tincture) ? "colour" : null;
};

export const sameKind = (a, b, furs) => {
  const k = a && b && kind(a, furs);
  return Boolean(k) && k === kind(b, furs);
};

// The ordinaries on an element, as { cls, ordinary, tincture }, by kind.
export function ordinariesOf(classes) {
  const found = { ordinaries: [], chiefs: [], bordures: [] };
  for (const cls of classes) {
    const match = ORDINARY_CLASSES.get(cls);
    if (!match) {
      continue;
    }
    const list =
      match.ordinary === "chief"
        ? "chiefs"
        : match.ordinary === "bordure"
          ? "bordures"
          : "ordinaries";
    found[list].push({ cls, ...match });
  }
  return found;
}

export const isDivided = (classes) => [...classes].some((cls) => DIVISION_CLASSES.has(cls));

// The single bare tincture of a plain field. A divided field, or none, has no tincture.
export function fieldTincture(classes) {
  if (isDivided(classes)) {
    return null;
  }
  const tinctures = [...classes].filter((cls) => TINCTURE.has(cls));
  return tinctures.length === 1 ? tinctures[0] : null;
}

// A charge's tincture, and the class that gives it, e.g. `bezant` → or.
export function chargeTincture(classes) {
  const roundel = [...classes].find((cls) => ROUNDELS[cls]);
  if (roundel) {
    return { cls: roundel, tincture: ROUNDELS[roundel] };
  }
  const tinctures = [...classes].filter((cls) => TINCTURE.has(cls));
  return tinctures.length === 1 ? { cls: tinctures[0], tincture: tinctures[0] } : null;
}

// The element's fimbriation, e.g. `fimbriated-argent` → argent, or null.
export function fimbriationOf(classes) {
  const found = [...classes].filter((cls) => FIMBRIATIONS.has(cls));
  return found.length === 1
    ? { cls: found[0], tincture: found[0].slice("fimbriated-".length) }
    : null;
}

export const chargeName = (classes) =>
  [...classes].find((cls) => CHARGE.has(cls)) ??
  ([...classes].some((cls) => cls.startsWith("charge-[")) ? "charge" : null);

export const isCharge = (classes) => chargeName(classes) !== null;

export const pointOf = (classes) => [...classes].find((cls) => POINT_CLASSES.has(cls));

export const atChiefPoint = (classes) => [...classes].some((cls) => CHIEF_POINTS.has(cls));

export const arrangementsOf = (classes) => ALL_ARRANGEMENTS.filter((name) => classes.has(name));

export const titleCase = (tincture) => tincture[0].toUpperCase() + tincture.slice(1);

export const describe = (name) => name.replaceAll("-", " ");
