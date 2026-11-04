/*
 * Reading heraldry from a set of class names.
 */
import { UNKNOWN } from "./tree.js";
import {
  ARRANGEMENTS,
  CHARGES,
  COLOURS,
  DIVISIONS,
  FURS,
  LINES,
  METALS,
  OF_THE_FIRST,
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
// What a class can paint in: a tincture, or the field's first.
const PAINT = new Set([...TINCTURE, OF_THE_FIRST]);
const CHARGE = new Set([...CHARGES, ...Object.keys(ROUNDELS)]);
const FIMBRIATIONS = new Set([...TINCTURES, OF_THE_FIRST].map((t) => `fimbriated-${t}`));
const CHIEF_POINTS = new Set(["in-dexter-chief", "in-chief-point", "in-sinister-chief"]);
const POINT_CLASSES = new Set(Object.keys(POINTS).map((point) => `in-${point}`));
export const ALL_ARRANGEMENTS = ["between", "on", ...ARRANGEMENTS];

// Every ordinary class, e.g. `fess-or`, `fess-engrailed-ermine`, `fess-counterchanged` and
// `bordure-or`, mapped to its parts. A counterchanged ordinary has no tincture of its own.
const ORDINARY_CLASSES = new Map();
for (const ordinary of ORDINARIES) {
  for (const tincture of PAINT) {
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
for (const tincture of [...TINCTURES, OF_THE_FIRST]) {
  ORDINARY_CLASSES.set(`bordure-${tincture}`, { ordinary: "bordure", tincture });
}

// Each division class, mapped to its first tincture. Two furs in one division aren't generated.
const DIVISION_CLASSES = new Map();
for (const division of DIVISIONS) {
  for (const a of TINCTURE) {
    for (const b of TINCTURE) {
      if (a !== b && !(FUR.has(a) && FUR.has(b))) {
        DIVISION_CLASSES.set(`${division}-${a}-${b}`, a);
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
  const tinctures = [...classes].filter((cls) => PAINT.has(cls));
  return tinctures.length === 1 ? tinctures[0] : null;
}

const isEmptyNode = (node) => {
  switch (node.type) {
    case "Comment": {
      return true;
    }
    case "JSXExpressionContainer": {
      return node.expression.type === "JSXEmptyExpression";
    }
    case "Text":
    case "JSXText": {
      return node.value.trim() === "";
    }
    default: {
      return false;
    }
  }
};

// A canton or inescutcheon with nothing on it. Cantons/inescutcheons with their
// own arms are exempt from rule-of-tincture.
export function isPlain(el) {
  const { ordinaries, chiefs, bordures } = ordinariesOf(el.classes);
  return (
    fieldTincture(el.classes) !== null &&
    !ordinaries.length &&
    !chiefs.length &&
    !bordures.length &&
    (el.node.children ?? []).every(isEmptyNode)
  );
}

// A field's first tincture: its bare tincture, or its division's first.
const fieldFirst = (classes) => {
  const division = [...classes].find((cls) => DIVISION_CLASSES.has(cls));
  return division ? DIVISION_CLASSES.get(division) : fieldTincture(classes);
};

// `of-the-first` on an element: the nearest escutcheon's or quarter's first (not a canton's).
// Null if the shield can't be seen.
export function firstOf(el) {
  for (let node = el; node && node !== UNKNOWN; node = node.parent) {
    if (node.classes?.has("escutcheon") || node.parent?.classes?.has("quarterly")) {
      const first = fieldFirst(node.classes);
      return first === OF_THE_FIRST ? null : first;
    }
  }
  return null;
}

// A charge's tincture, and the class that gives it, e.g. `bezant` → or.
export function chargeTincture(classes) {
  const roundel = [...classes].find((cls) => ROUNDELS[cls]);
  if (roundel) {
    return { cls: roundel, tincture: ROUNDELS[roundel] };
  }
  const tinctures = [...classes].filter((cls) => PAINT.has(cls));
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

const atChiefPoint = (classes) => [...classes].some((cls) => CHIEF_POINTS.has(cls));

// A charge on the chief, if the shield has one: at a chief point, or arranged `in-chief`.
export const inChief = (container, charge) =>
  atChiefPoint(charge.classes) || container.classes.has("in-chief");

export const arrangementsOf = (classes) => ALL_ARRANGEMENTS.filter((name) => classes.has(name));

export const titleCase = (tincture) => tincture[0].toUpperCase() + tincture.slice(1);

export const describe = (name) => name.replaceAll("-", " ");
