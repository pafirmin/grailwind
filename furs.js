/*
 * Grailwind CSS: furs, as a tiled pattern of spots over a ground tincture.
 */
import plugin from "tailwindcss/plugin";

// Each fur's [ground, spot] tinctures.
export const FURS = {
  ermine: ["argent", "sable"],
  ermines: ["sable", "argent"],
  erminois: ["or", "sable"],
  pean: ["sable", "or"],
};

const SPOT = [
  `<circle cx='0' cy='-8.5' r='1.9'/><circle cx='-3.4' cy='-5.6' r='1.9'/><circle cx='3.4' cy='-5.6' r='1.9'/>`,
  `<path d='M0,-4.5 C0.8,-1 2.6,4 5,9.5 L2.1,7.6 L0,11 L-2.1,7.6 L-5,9.5 C-2.6,4 -0.8,-1 0,-4.5 Z'/>`,
].join("");

// A 5:6 tile, the shield's own shape, so whole tiles fill it: a spot at its centre, and quarters of one at each
// corner that join up with the neighbouring tiles.
const AT = [
  [25, 30],
  [0, 0],
  [50, 0],
  [0, 60],
  [50, 60],
];
const tile = (fill) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 50 60'><g fill='${fill}'>${AT.map(
      ([x, y]) => `<g transform='translate(${x} ${y})'>${SPOT}</g>`,
    ).join("")}</g></svg>`,
  )}")`;

// The spots are baked into an SVG, which can't read CSS variables, so they take the theme's
// value at build time.
const spots = (fur, theme) => tile(theme(`colors.${FURS[fur][1]}`));

// Spots across the field, one per tile in each row.
const ACROSS = 6;

// A quarter of a tile up and left, so whole spots sit along the top and sides. A % position is a
// share of (box - tile), which is (ACROSS - 1) tiles.
const SHIFT = `${-100 / (4 * (ACROSS - 1))}%`;
const FIELD = { size: `calc(100% / ${ACROSS}) auto`, position: `${SHIFT} ${SHIFT}` };

// The layers under a fur in a divided field: the spots, then the ground.
export const furLayers = (fur, theme) => {
  const ground = `var(--color-${FURS[fur][0]})`;
  return [
    { image: spots(fur, theme), ...FIELD, repeat: "repeat" },
    {
      image: `linear-gradient(${ground}, ${ground})`,
      size: "100% 100%",
      position: "0 0",
      repeat: "no-repeat",
    },
  ];
};

export default plugin(({ addUtilities, theme }) => {
  const utilities = {};

  for (const [fur, [ground]] of Object.entries(FURS)) {
    utilities[`.${fur}`] = {
      "background-color": `var(--color-${ground})`,
      "background-image": spots(fur, theme),
      "background-size": FIELD.size,
      "background-position": FIELD.position,
      "background-repeat": "repeat",
      // Two tiles across a charge, centred, so a whole spot sits in its middle.
      ".charges > &": {
        "background-size": "50% auto",
        "background-position": "center",
      },
    };
  }

  addUtilities(utilities);
});
