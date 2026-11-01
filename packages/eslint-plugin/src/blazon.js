/*
 * Reading heraldry from a set of class names.
 */
import {
  ARRANGEMENTS,
  CHARGES,
  COLOURS,
  DIVISIONS,
  METALS,
  ORDINARIES,
  ROUNDELS,
  TINCTURES,
} from "grailwind/data";

const METAL = new Set(METALS);
const COLOUR = new Set(COLOURS);
const TINCTURE = new Set(TINCTURES);
const CHARGE = new Set([...CHARGES, ...Object.keys(ROUNDELS)]);
const CHIEF_POINTS = new Set(["in-dexter-chief", "in-chief", "in-sinister-chief"]);
export const ALL_ARRANGEMENTS = ["between", "on", ...ARRANGEMENTS];

// Every `{ordinary}-{tincture}` and `bordure-{tincture}` class, mapped to its parts.
const ORDINARY_CLASSES = new Map();
for (const ordinary of [...ORDINARIES, "bordure"]) {
  for (const tincture of TINCTURES)
    ORDINARY_CLASSES.set(`${ordinary}-${tincture}`, { ordinary, tincture });
}

const DIVISION_CLASSES = new Set();
for (const division of DIVISIONS) {
  for (const a of TINCTURES)
    for (const b of TINCTURES) if (a !== b) DIVISION_CLASSES.add(`${division}-${a}-${b}`);
}

export const kind = (tincture) =>
  METAL.has(tincture) ? "metal" : COLOUR.has(tincture) ? "colour" : null;

export const sameKind = (a, b) => a && b && kind(a) && kind(a) === kind(b);

// The ordinaries on an element, as { cls, ordinary, tincture }, by kind.
export function ordinariesOf(classes) {
  const found = { ordinaries: [], chiefs: [], bordures: [] };
  for (const cls of classes) {
    const match = ORDINARY_CLASSES.get(cls);
    if (!match) continue;
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

// The single bare tincture of a plain field. A divided field, or none, has no tincture.
export function fieldTincture(classes) {
  if ([...classes].some((cls) => DIVISION_CLASSES.has(cls))) return null;
  const tinctures = [...classes].filter((cls) => TINCTURE.has(cls));
  return tinctures.length === 1 ? tinctures[0] : null;
}

// A charge's tincture, and the class that gives it, e.g. `bezant` → or.
export function chargeTincture(classes) {
  const roundel = [...classes].find((cls) => ROUNDELS[cls]);
  if (roundel) return { cls: roundel, tincture: ROUNDELS[roundel] };
  const tinctures = [...classes].filter((cls) => TINCTURE.has(cls));
  return tinctures.length === 1 ? { cls: tinctures[0], tincture: tinctures[0] } : null;
}

export const chargeName = (classes) =>
  [...classes].find((cls) => CHARGE.has(cls)) ??
  ([...classes].some((cls) => cls.startsWith("charge-[")) ? "charge" : null);

export const isCharge = (classes) => chargeName(classes) !== null;

export const atChiefPoint = (classes) => [...classes].some((cls) => CHIEF_POINTS.has(cls));

export const arrangementsOf = (classes) => ALL_ARRANGEMENTS.filter((name) => classes.has(name));

export const titleCase = (tincture) => tincture[0].toUpperCase() + tincture.slice(1);

export const describe = (name) => name.replaceAll("-", " ");
