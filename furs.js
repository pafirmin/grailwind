/*
 * Grailwind CSS: furs, as a tiled pattern over a ground tincture: ermine's spots, or the vair
 * family's panes.
 */
import plugin from "tailwindcss/plugin";
import { FUR_PATTERNS, FURS } from "./data.js";

/**
 * An SVG image as a CSS background-image value.
 * @param {string} viewBox The SVG's viewBox, e.g. "0 0 50 60".
 * @param {string} fill A CSS colour, e.g. "#f2f2f2", for everything in `body`.
 * @param {string} body SVG elements, drawn in `fill`.
 * @returns {string} A CSS `url("data:image/svg+xml,…")`.
 */
const svg = (viewBox, fill, body) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}'><g fill='${fill}'>${body}</g></svg>`,
  )}")`;

const SPOT = [
  `<circle cx='0' cy='-8.5' r='1.9'/><circle cx='-3.4' cy='-5.6' r='1.9'/><circle cx='3.4' cy='-5.6' r='1.9'/>`,
  `<path d='M0,-4.5 C0.8,-1 2.6,4 5,9.5 L2.1,7.6 L0,11 L-2.1,7.6 L-5,9.5 C-2.6,4 -0.8,-1 0,-4.5 Z'/>`,
].join("");

// A 5:6 tile, the shield's own shape, so whole tiles fill it: a spot at its centre, and quarters of one at each
// corner that join up with the neighbouring tiles.
export const AT = [
  [25, 30],
  [0, 0],
  [50, 0],
  [0, 60],
  [50, 60],
];
/**
 * Ermine's tile: the spots, on a transparent ground.
 * @param {string} fill A CSS colour for the spots.
 * @returns {string} A CSS `url(…)`, from svg().
 */
const ermineTile = (fill) =>
  svg(
    "0 0 50 60",
    fill,
    AT.map(([x, y]) => `<g transform='translate(${x} ${y})'>${SPOT}</g>`).join(""),
  );

// The vair family's pane is PANE wide, and its row as high as its outline. Each outline is the
// pane's right side, from its top down to its base, about the pane's centre line; the left side
// mirrors it. Each side is symmetric about its own midpoint, so the gap between two panes is the
// same pane reversed. A vair row is 1.08 panes high, the heater's chief quarters' height over
// width (45% of 6/5 over a half), so n panes across one are n whole rows down it.
const PANE = 75;
const VAIR_ROW = 81;
const SLOPE = VAIR_ROW / 4;
const POTENT_ROW = 45;
const OUTLINES = {
  // Slope to the shoulder, upright side, flare to the base corner.
  vair: [
    [0, 0],
    [PANE / 4, SLOPE],
    [PANE / 4, VAIR_ROW - SLOPE],
    [PANE / 2, VAIR_ROW],
  ],
  // A T: the crossbar on top, twice the stem.
  potent: [
    [PANE / 3, 0],
    [PANE / 3, POTENT_ROW / 2],
    [PANE / 6, POTENT_ROW / 2],
    [PANE / 6, POTENT_ROW],
  ],
};

/**
 * @param {string} pattern A value of FUR_PATTERNS, e.g. "counter-vair".
 * @returns {"ermine" | "vair" | "potent"} The family, which sets the pane's outline and density.
 */
const family = (pattern) =>
  pattern.endsWith("potent") ? "potent" : pattern.endsWith("vair") ? "vair" : "ermine";

/**
 * One pane, pointing up, with its top centre at (0, 0).
 * @param {number[][]} outline The pane's right side as [x, y] points, e.g. OUTLINES.vair.
 * @returns {string} An SVG `<path>`, with no fill of its own.
 */
const pane = (outline) => {
  const right = outline.map(([x, y]) => `${x},${y}`);
  const left = outline.toReversed().map(([x, y]) => `${-x},${y}`);
  return `<path d='M${[...right, ...left].join(" L")} Z'/>`;
};

/**
 * The vair family's tile, PANE wide and two rows high. Only the first tincture's panes are drawn;
 * the ground shows through the gaps between them as the second tincture's panes.
 *
 * Row 1 has one pane, centred. Row 2 is offset half a pane in vair and potent, drawn at both edges
 * so the halves join across tiles; in the counter- forms it's mirrored, base to base with row 1.
 *
 * @param {"vair" | "counter-vair" | "potent" | "counter-potent"} pattern
 * @param {string} fill A CSS colour for the drawn panes, e.g. argent's "#f2f2f2" in vair.
 * @returns {string} A CSS `url(…)`, from svg().
 */
const paneTile = (pattern, fill) => {
  const outline = OUTLINES[family(pattern)];
  const row = outline.at(-1)[1];
  const at = (x, y, path) => `<g transform='translate(${x} ${y})'>${path}</g>`;
  const viewBox = `0 0 ${PANE} ${2 * row}`;
  if (pattern.startsWith("counter-")) {
    // Both rows as one outline: two paths meeting base to base leave a hairline where each one's
    // edge is antialiased.
    const mirrored = outline.toReversed().map(([x, y]) => [x, 2 * row - y]);
    return svg(viewBox, fill, at(PANE / 2, 0, pane([...outline, ...mirrored])));
  }
  const path = pane(outline);
  return svg(
    viewBox,
    fill,
    [at(PANE / 2, 0, path), at(0, row, path), at(PANE, row, path)].join(""),
  );
};

/**
 * A fur's tile. The SVG can't read CSS variables, so it takes the theme's colour at build time.
 * @param {string} fur A key of FURS, e.g. "vairy-or-gules".
 * @param {Function} theme Tailwind's theme() lookup.
 * @returns {string} A CSS `url(…)` of the drawn tincture only; the ground isn't in it.
 */
const tile = (fur, theme) => {
  const pattern = FUR_PATTERNS[fur];
  const fill = theme(`colors.${FURS[fur][1]}`);
  return pattern === "ermine" ? ermineTile(fill) : paneTile(pattern, fill);
};

/**
 * `fur-<n>` sets --fur-across, n whole tiles across the field. It's left unregistered, so each
 * family keeps its own default: 6 for ermine; 4 for vair, which Fox-Davies calls vair, between
 * beffroi (3) and menu-vair (6); and 3 for potent, as in Fox-Davies' and Parker's figures.
 * @param {number} fallback Tiles across when no `fur-<n>` is set.
 * @returns {string} A CSS var() for the number of tiles across.
 */
const across = (fallback) => `var(--fur-across, ${fallback})`;
// A quarter of a tile up and left, so whole spots sit along the top and sides. A % position is a
// share of (box - tile), which is (n - 1) tiles.
const SHIFT = `calc(-100% / (4 * (${across(6)} - 1)))`;
const FIELDS = {
  ermine: { size: `calc(100% / ${across(6)}) auto`, position: `${SHIFT} ${SHIFT}` },
  // A whole number of panes, from the top left, or below a frame's outline (see vairBelow).
  vair: {
    size: `calc(100% / ${across(4)}) var(--vair-height, auto)`,
    position: "0 var(--vair-top, 0px)",
  },
  potent: { size: `calc(100% / ${across(3)}) auto`, position: "0 0" },
};
/**
 * Starts a vair field's panes below a frame's outline, so their points are whole, with the rows
 * squashed by the outline's width so whole rows still end on a line, such as the fess point.
 * @param {string} outline The outline's width, e.g. "2px".
 * @param {string} [line] Where the rows end, as a share of the box's height, e.g. "100%" for
 *   the bottom of a chief quarter. Without it the panes only move down.
 * @param {number} [rowsPerPane] Rows above the line for each pane across: 1 in a chief quarter,
 *   as VAIR_ROW is 1.08 panes; 0.5 above the fess point on the whole field.
 * @returns {Record<string, string>} --vair-top, and --vair-height for the tile's two rows.
 */
export const vairBelow = (outline, line, rowsPerPane) => ({
  "--vair-top": outline,
  ...(line && {
    "--vair-height": `calc(2 * (${line} - ${outline}) / (${rowsPerPane} * ${across(4)}))`,
  }),
});

/**
 * @param {string} fur A key of FURS.
 * @returns {{ size: string, position: string }} The CSS background-size and -position of its tile.
 */
const field = (fur) => FIELDS[family(FUR_PATTERNS[fur])];

// Ermine's spots on a bordure are 1.4 bordure widths across. At the default eighth, the side
// columns are then on the ring's centre lines (3.5 widths = 5 half-tiles), whatever the width.
const RING_ERMINE_TILE = 1.4;
// A bordure's panes are one row across its width, so the tile is as wide as the pane's share of it.
const RINGS = {
  ermine: {
    size: `calc(${RING_ERMINE_TILE} * var(--bordure-width)) auto`,
    position: `center calc(var(--bordure-width) / 2)`,
  },
  vair: { size: `calc(var(--bordure-width) * ${PANE} / ${VAIR_ROW}) auto`, position: "center 0" },
  potent: {
    size: `calc(var(--bordure-width) * ${PANE} / ${POTENT_ROW}) auto`,
    position: "center 0",
  },
};

/**
 * A fur on a frame's bordure ring, sized to the bordure's width, not to `fur-<n>`.
 * @param {string} fur A key of FURS.
 * @param {Function} theme Tailwind's theme() lookup.
 * @returns {Record<string, string>} CSS background declarations for the ring's ::after.
 */
export const ringBackground = (fur, theme) => {
  const ring = RINGS[family(FUR_PATTERNS[fur])];
  return {
    "background-color": `var(--color-${FURS[fur][0]})`,
    "background-image": tile(fur, theme),
    "background-size": ring.size,
    "background-position": ring.position,
    "background-repeat": "repeat",
  };
};

/**
 * The layers under a fur in a divided field: the pattern, then the ground.
 * @param {string} fur A key of FURS.
 * @param {Function} theme Tailwind's theme() lookup.
 * @returns {{ image: string, size: string, position: string, repeat: string }[]} Background
 *   layers, top first.
 */
export const furLayers = (fur, theme) => {
  const ground = `var(--color-${FURS[fur][0]})`;
  return [
    { image: tile(fur, theme), ...field(fur), repeat: "repeat" },
    {
      image: `linear-gradient(${ground}, ${ground})`,
      size: "100% 100%",
      position: "0 0",
      repeat: "no-repeat",
    },
  ];
};

/**
 * A fur on its own, as on the field or an ordinary.
 * @param {string} fur A key of FURS.
 * @param {Function} theme Tailwind's theme() lookup.
 * @returns {Record<string, string>} CSS background declarations.
 */
export const furBackground = (fur, theme) => ({
  "background-color": `var(--color-${FURS[fur][0]})`,
  "background-image": tile(fur, theme),
  "background-size": field(fur).size,
  "background-position": field(fur).position,
  "background-repeat": "repeat",
});

export default plugin(({ addUtilities, theme }) => {
  const utilities = {};

  for (const fur of Object.keys(FURS)) {
    utilities[`.${fur}`] = {
      ...furBackground(fur, theme),
      // Two tiles across a charge, centred, so ermine has a whole spot in its middle.
      ".charges > &": {
        "background-size": "50% auto",
        "background-position": "center",
      },
    };
  }

  addUtilities(utilities);
});
