/*
 * Grailwind CSS: charges and their arrangement.
 */
import plugin from "tailwindcss/plugin";
import { POINTS, ROUNDELS } from "./data.js";

const star = (cx, cy, r, points = 5) => {
  const coords = [];
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 ? r * 0.382 : r;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    coords.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return `<polygon points="${coords.join(" ")}"/>`;
};

const SHAPES = {
  roundel: `<circle cx="50" cy="50" r="46"/>`,
  annulet: `<circle cx="50" cy="50" r="39" fill="none" stroke="#000" stroke-width="14"/>`,
  mullet: star(50, 53, 48),
  lozenge: `<polygon points="50,2 84,50 50,98 16,50"/>`,
  billet: `<rect x="28" y="4" width="44" height="92"/>`,
  crescent: `<mask id="m"><rect width="100" height="100" fill="#fff"/><circle cx="50" cy="35" r="35"/></mask><circle cx="50" cy="54" r="42" mask="url(#m)"/>`,
  "fleur-de-lis": `
    <path d="M50 2C61 16 64 36 55 56H45C36 36 39 16 50 2Z"/>
    <path d="M55 56C57 38 70 24 84 26C97 29 99 46 89 52C92 44 87 37 80 39C71 42 66 50 66 56Z"/>
    <path d="M45 56C43 38 30 24 16 26C3 29 1 46 11 52C8 44 13 37 20 39C29 42 34 50 34 56Z"/>
    <rect x="28" y="56" width="44" height="9" rx="2"/>
    <path d="M45 65H55C55 74 53 82 50 90C47 82 45 74 45 65Z"/>
    <path d="M58 65C62 74 72 80 84 78C80 88 64 90 56 74Z"/>
    <path d="M42 65C38 74 28 80 16 78C20 88 36 90 44 74Z"/>`,
};

// Points as [left%, top%] of the shield, plus a charge size as % of its width.
// The default for each number of charges, e.g. three are placed 2 and 1.
// prettier-ignore
const DEFAULTS = {
  1: { size: 50, points: [[50, 45]] },
  2: { size: 30, points: [[50, 24], [50, 66]] },
  3: { size: 28, points: [[28, 25], [72, 25], [50, 64]] },
  4: { size: 24, points: [[30, 24], [70, 24], [32, 60], [68, 60]] },
  5: { size: 22, points: [[27, 20], [73, 20], [50, 42], [32, 64], [68, 64]] },
  6: { size: 20, points: [[20, 18], [50, 18], [80, 18], [35, 42], [65, 42], [50, 66]] },
};

const POINT_SIZE = 22;

// With a chief on the shield, these points sit on it (see ordinaries.js).
const CHIEF_POINTS = new Set(["dexter-chief", "chief", "sinister-chief"]);

// prettier-ignore
const ARRANGEMENTS = {
  "in-pale": {
    2: { size: 30, points: [[50, 24], [50, 66]] },
    3: { size: 22, points: [[50, 16], [50, 43], [50, 70]] },
  },
  "in-fess": {
    2: { size: 30, points: [[30, 45], [70, 45]] },
    3: { size: 24, points: [[22, 45], [50, 45], [78, 45]] },
  },
  "in-bend": {
    2: { size: 28, points: [[30, 26], [70, 64]] },
    3: { size: 22, points: [[22, 16], [50, 45], [78, 74]] },
  },
  "in-bend-sinister": {
    2: { size: 28, points: [[70, 26], [30, 64]] },
    3: { size: 22, points: [[78, 16], [50, 45], [22, 74]] },
  },
};

const svgUrl = (shape) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${shape}</svg>`,
  )}")`;

const maskRules = (image) => ({
  "mask-image": image,
  "mask-size": "contain",
  "mask-repeat": "no-repeat",
  "mask-position": "center",
});

const place = ([left, top], size) => ({
  left: `${left}%`,
  top: `${top}%`,
  "--charge-width": `var(--charge-size, ${size}%)`,
});

// The field with its tinctures swapped, from the shield's division (see divisions.js).
const COUNTERCHANGE = ["color", "image", "size", "position", "repeat"];
const inheritCounterchange = Object.fromEntries(
  COUNTERCHANGE.map((n) => [`--counterchange-${n}`, "inherit"]),
);

// A layer the size of the shield, as the escutcheon is the containing block
// for fixed positioning. The charge's mask cuts it to shape.
const counterchanged = {
  ...inheritCounterchange,
  "&::before": {
    content: '""',
    position: "fixed",
    inset: "0",
    ...inheritCounterchange,
    ...Object.fromEntries(
      COUNTERCHANGE.map((n) => [`background-${n}`, `var(--counterchange-${n})`]),
    ),
  },
};

const hasCount = (n) => `:has(> :nth-child(${n}):last-child)`;

export default plugin(({ addUtilities, matchUtilities }) => {
  // User-defined charges from images
  matchUtilities({ charge: maskRules }, { type: ["url"] });

  const utilities = {};

  for (const [name, shape] of Object.entries(SHAPES)) {
    utilities[`.${name}`] = maskRules(svgUrl(shape));
  }

  for (const [name, tincture] of Object.entries(ROUNDELS)) {
    utilities[`.${name}`] = {
      ...maskRules(svgUrl(SHAPES.roundel)),
      "background-color": `var(--color-${tincture})`,
    };
  }

  // Defaults use :where() so arrangements and `between` always win.
  const charges = {
    position: "absolute",
    inset: "var(--field-top, 0%) 0 0",
    // Above the chief, which is painted last, so charges can sit on it.
    "z-index": "1",
    ...inheritCounterchange,
    "& > *": {
      position: "absolute",
      "aspect-ratio": "1",
      // Centred with margins, not translate: a transform would stop a
      // counterchanged charge's fixed layer from lining up with the shield.
      width: "var(--charge-width)",
      margin: "calc(var(--charge-width) / -2) 0 0 calc(var(--charge-width) / -2)",
      "object-fit": "contain",
    },
  };
  for (const [count, { size, points }] of Object.entries(DEFAULTS)) {
    points.forEach((point, i) => {
      charges[`&:where(${hasCount(count)}) > :where(:nth-child(${i + 1}))`] = place(point, size);
    });
  }
  utilities[".charges"] = charges;

  for (const [name, counts] of Object.entries(ARRANGEMENTS)) {
    const arrangement = {};
    for (const [count, { size, points }] of Object.entries(counts)) {
      points.forEach((point, i) => {
        arrangement[`&${hasCount(count)} > :nth-child(${i + 1})`] = place(point, size);
      });
    }
    utilities[`.${name}`] = arrangement;
  }

  // Positions come from the ordinary on the shield (see ordinaries.js).
  const between = {};
  for (let i = 1; i <= 4; i++) {
    between[`& > :nth-child(${i})`] = {
      left: `var(--between-${i}-x)`,
      top: `var(--between-${i}-y)`,
      "--charge-width": "var(--charge-size, var(--between-size))",
    };
  }
  // The counts some ordinary overrides in BETWEEN's `counts` (see data.js).
  for (const count of [2, 6]) {
    for (let i = 1; i <= count; i++) {
      between[`&${hasCount(count)} > :nth-child(${i})`] = {
        left: `var(--between-${count}-${i}-x, var(--between-${i}-x))`,
        top: `var(--between-${count}-${i}-y, var(--between-${i}-y))`,
        "--charge-width": `var(--charge-size, var(--between-${count}-size, var(--between-size)))`,
      };
    }
  }
  utilities[".between"] = between;

  // Falls back to the plain-field default when the ordinary has no points for this count.
  // An undefined var() would otherwise unset `left`/`top` instead of  deferring to the :where() default.
  const on = {};
  for (const count of [1, 2, 3, 5]) {
    const fallback = DEFAULTS[count];
    for (let i = 1; i <= count; i++) {
      const [left, top] = fallback?.points[i - 1] ?? [];
      const at = (axis, value) =>
        value === undefined
          ? `var(--on-${count}-${i}-${axis})`
          : `var(--on-${count}-${i}-${axis}, ${value}%)`;
      on[`&${hasCount(count)} > :nth-child(${i})`] = {
        left: at("x", left),
        top: at("y", top),
        "--charge-width": `var(--charge-size, var(--on-size, ${fallback?.size ?? 16}%))`,
      };
    }
  }
  utilities[".on"] = on;

  for (const [name, [left, top]] of Object.entries(POINTS)) {
    utilities[`.in-${name}`] = {
      ".charges > &": CHIEF_POINTS.has(name)
        ? {
            left: `${left}%`,
            top: `var(--chief-points-y, ${top}%)`,
            "--charge-width": `var(--charge-size, var(--chief-points-size, ${POINT_SIZE}%))`,
          }
        : place([left, top], POINT_SIZE),
    };
  }

  // On a charge, or on `charges` for all of them.
  utilities[".counterchanged"] = {
    ".charges > &": counterchanged,
    "&.charges > *": counterchanged,
  };

  addUtilities(utilities);
});
