/*
 * Grailwind CSS: charges and their arrangement.
 */
import plugin from "tailwindcss/plugin";

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
  crescent: `<mask id="m"><rect width="100" height="100" fill="#fff"/><circle cx="50" cy="38" r="36"/></mask><circle cx="50" cy="56" r="44" mask="url(#m)"/>`,
  "fleur-de-lis": `
    <path d="M50 2C61 16 64 36 55 56H45C36 36 39 16 50 2Z"/>
    <path d="M55 56C57 38 70 24 84 26C97 29 99 46 89 52C92 44 87 37 80 39C71 42 66 50 66 56Z"/>
    <path d="M45 56C43 38 30 24 16 26C3 29 1 46 11 52C8 44 13 37 20 39C29 42 34 50 34 56Z"/>
    <rect x="28" y="56" width="44" height="9" rx="2"/>
    <path d="M45 65H55C55 74 53 82 50 90C47 82 45 74 45 65Z"/>
    <path d="M58 65C62 74 72 80 84 78C80 88 64 90 56 74Z"/>
    <path d="M42 65C38 74 28 80 16 78C20 88 36 90 44 74Z"/>`,
};

// Roundels have their own names by tincture.
const ROUNDELS = {
  bezant: "or",
  plate: "argent",
  torteau: "gules",
  hurt: "azure",
  pellet: "sable",
};

// Points as [left%, top%] of the shield, plus a charge size as % of its width.
// The default for each number of charges, e.g. three are placed 2 and 1.
const DEFAULTS = {
  1: { size: 50, points: [[50, 45]] },
  2: { size: 30, points: [[50, 24], [50, 66]] },
  3: { size: 28, points: [[28, 25], [72, 25], [50, 64]] },
  4: { size: 24, points: [[30, 24], [70, 24], [32, 60], [68, 60]] },
  6: { size: 20, points: [[20, 18], [50, 18], [80, 18], [35, 42], [65, 42], [50, 66]] },
};

// The points of the shield, for placing a single charge, e.g. `in-dexter-chief`.
const POINTS = {
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
const POINT_SIZE = 22;

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
  width: `var(--charge-size, ${size}%)`,
});

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
    inset: "0",
    "& > *": {
      position: "absolute",
      "aspect-ratio": "1",
      translate: "-50% -50%",
      "object-fit": "contain",
    },
  };
  for (const [count, { size, points }] of Object.entries(DEFAULTS)) {
    points.forEach((point, i) => {
      charges[`&:where(${hasCount(count)}) > :where(:nth-child(${i + 1}))`] =
        place(point, size);
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
      width: "var(--charge-size, var(--between-size))",
    };
  }
  utilities[".between"] = between;

  for (const [name, point] of Object.entries(POINTS)) {
    utilities[`.in-${name}`] = { ".charges > &": place(point, POINT_SIZE) };
  }

  addUtilities(utilities);
});
