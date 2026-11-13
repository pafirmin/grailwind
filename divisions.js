/*
 * Grailwind CSS: field divisions as decoration.
 */
import plugin from "tailwindcss/plugin";
import { FURS, TINCTURES } from "./data.js";
import { furLayers } from "./furs.js";

// The fess point, in % down the shield: horizontal lines of partition pass through it, as the
// cross and fess do.
const FESS_POINT = 45;

// The background-position that puts a tile FESS_POINT% high just below the fess point.
const BASE_TILES = ((100 * FESS_POINT) / (100 - FESS_POINT)).toFixed(2);

// Each division maps (first, second) tincture colours to background rules.
const layer = (image) => ({ "background-image": image });

// Equal stripes, the first tincture at the top (barry) or on the dexter (paly): one pair, tiled.
// The repeat must be explicit, as toLayers defaults to no-repeat for the fur variants.
const stripes = (to, pieces) => (a, b) => {
  const pair = `calc(200% / ${pieces})`;
  return {
    "background-image": `linear-gradient(to ${to}, ${a} 50%, ${b} 50%)`,
    "background-size": to === "bottom" ? `100% ${pair}` : `${pair} 100%`,
    "background-repeat": to === "bottom" ? "repeat-y" : "repeat-x",
  };
};

// How much of the corner-to-corner extent the shield covers: the base corner is cut away by the
// border-radius of 0 0 50% 50% / 0 0 45% 45% and the 5:6 aspect ratio in grailwind.css. It runs
// from the chief corner the bands start in to the tangent on the base curve.
const BENDY_VISIBLE = (() => {
  const [width, height] = [5, 6];
  const [radiusX, radiusY] = [width / 2, 0.45 * height];
  const [centreX, centreY] = [width / 2, height - radiusY];
  const tangent = Math.sqrt((height * radiusX) ** 2 + (width * radiusY) ** 2);
  return (width * height - height * centreX + width * centreY + tangent) / (2 * width * height);
})();

// Diagonal bands parallel to per bend, `pieces` equal ones across the visible part of the shield,
// the last running to the edge. Explicit stops, not a repeating gradient, so a canton's square
// corners don't show the first tincture again.
const bendy = (to, pieces) => (a, b) => {
  const stops = [];
  for (let i = 0; i < pieces; i++) {
    const start = i === 0 ? 0 : ((i * BENDY_VISIBLE * 100) / pieces).toFixed(2);
    const end = i === pieces - 1 ? 100 : (((i + 1) * BENDY_VISIBLE * 100) / pieces).toFixed(2);
    stops.push(`${i % 2 === 0 ? a : b} ${start}% ${end}%`);
  }
  return layer(`linear-gradient(to ${to}, ${stops.join(", ")})`);
};

// Four tiles, each half the box, so the lines follow the box's own proportions: a part of the
// shield is the whole one squeezed to fit, as per chevron's are. A tile's lines run parallel to its
// diagonal, dexter tiles `to bottom right` and sinister ones `to bottom left`.
// The period is 300/n of a tile's gradient line, which keeps a stripe's width on the whole shield.
// A lower tile starts half a gradient line further on, so its lines continue the upper tile's.
// Plain, the dexter and lower tiles overlap the others by 1px, hiding the seams. With a fur the
// transparent stripes would show the tile beneath, so they butt.
const chevronny = (pieces) => (a, b, fur) => {
  const period = 300 / pieces;
  const lowerStart = (period - (50 % period)) % period;
  const stripe = (to, start) =>
    `repeating-linear-gradient(to bottom ${to}, ${a} ${start}% ${start + period / 2}%, ${b} 0 ${start + period}%)`;
  const overlap = fur ? "50%" : "calc(50% + 1px)";

  return {
    "background-image": [
      stripe("left", 0),
      stripe("left", lowerStart),
      stripe("right", 0),
      stripe("right", lowerStart),
    ].join(", "),
    "background-size": [
      `50% 50%`,
      `50% ${overlap}`,
      `${overlap} 50%`,
      `${overlap} ${overlap}`,
    ].join(", "),
    "background-position": "right top, right bottom, left top, left bottom",
    "background-repeat": "no-repeat",
  };
};

const DIVISIONS = {
  // Vertical split: first on the dexter (viewer's left).
  "per-pale": (a, b) => layer(`linear-gradient(to right, ${a} 50%, ${b} 50%)`),

  // Horizontal split through the fess point: first in chief.
  "per-fess": (a, b) =>
    layer(`linear-gradient(to bottom, ${a} ${FESS_POINT}%, ${b} ${FESS_POINT}%)`),

  // Line from dexter chief to sinister base: first in the upper half.
  // With a corner-to-corner gradient, the 50% line joins the other two corners.
  "per-bend": (a, b) => layer(`linear-gradient(to bottom left, ${a} 50%, ${b} 50%)`),

  // Line from sinister chief to dexter base: first in the upper half.
  "per-bend-sinister": (a, b) => layer(`linear-gradient(to bottom right, ${a} 50%, ${b} 50%)`),

  "per-chevron": (a, b) =>
    a === "transparent"
      ? {
          "background-image": [
            `linear-gradient(to bottom right, ${a} 50%, ${b} 50%)`,
            `linear-gradient(to bottom left, ${a} 50%, ${b} 50%)`,
            `linear-gradient(${b}, ${b})`,
          ].join(", "),
          "background-size": "50% 50%, 50% 50%, 100% 15%",
          "background-position": "left 70%, right 70%, bottom",
          "background-repeat": "no-repeat",
        }
      : {
          "background-image": [
            `linear-gradient(to bottom right, ${a} 42.5%, transparent 42.5%)`,
            `linear-gradient(to bottom left, ${a} 42.5%, ${b} 42.5%)`,
          ].join(", "),
        },

  // Both lines of the saltire, from the top corners through the fess point to the flanks at 90%:
  // first in chief and base. Four tiles, each half the width and 45% high, with each half-line
  // as a tile's diagonal, and the base below them in the first tincture, 2px taller so Chromium
  // leaves no seam where it meets them. Two strips under the tiles fill the sub-pixel seam where
  // they meet: the first tincture down, the second across.
  "per-saltire": (a, b) => ({
    "background-image": [
      `linear-gradient(to bottom left, ${a} 50%, ${b} 50%)`,
      `linear-gradient(to bottom right, ${a} 50%, ${b} 50%)`,
      `linear-gradient(to bottom left, ${b} 50%, ${a} 50%)`,
      `linear-gradient(to bottom right, ${b} 50%, ${a} 50%)`,
      `linear-gradient(${a}, ${a})`,
      `linear-gradient(${a}, ${a})`,
      `linear-gradient(${b}, ${b})`,
    ].join(", "),
    "background-size": [
      ...Array(4).fill(`50% ${FESS_POINT}%`),
      `100% calc(${100 - 2 * FESS_POINT}% + 2px)`,
      "2px 100%",
      "100% 2px",
    ].join(", "),
    "background-position": [
      "left top",
      "right top",
      `right ${BASE_TILES}%`,
      `left ${BASE_TILES}%`,
      "bottom",
      "center",
      `center ${FESS_POINT}%`,
    ].join(", "),
    "background-repeat": "no-repeat",
  }),

  // Quarters 1 and 4 (dexter chief, sinister base) are the first tincture.
  // Linear gradients rather than conic, which render jagged edges in some browsers.
  // With a fur, the bands can't overlap, or the fur's transparent half shows the band below.
  quarterly: (a, b, fur) => ({
    "background-image": `linear-gradient(to right, ${a} 50%, ${b} 50%), linear-gradient(to right, ${b} 50%, ${a} 50%)`,
    "background-size": `100% ${FESS_POINT}%, 100% ${fur ? `calc(100% - ${FESS_POINT}%)` : "100%"}`,
    "background-position": fur ? "top, bottom" : "top, top",
    "background-repeat": "no-repeat",
  }),

  // Gyronny of eight: quarterly and per saltire, all through the fess point. The first tincture
  // is in the gyron just dexter of the top line. Per saltire's four tiles, then the base below
  // them split per pale, 2px taller so no seam shows. The background colour fills any sub-pixel
  // seam between tiles.
  gyronny: (a, b) => ({
    "background-color": b,
    "background-image": [
      `linear-gradient(to bottom left, ${a} 50%, ${b} 50%)`,
      `linear-gradient(to bottom right, ${b} 50%, ${a} 50%)`,
      `linear-gradient(to bottom left, ${b} 50%, ${a} 50%)`,
      `linear-gradient(to bottom right, ${a} 50%, ${b} 50%)`,
      `linear-gradient(to right, ${b} 50%, ${a} 50%)`,
    ].join(", "),
    "background-size": [
      ...Array(4).fill(`50% ${FESS_POINT}%`),
      `100% calc(${100 - 2 * FESS_POINT}% + 2px)`,
    ].join(", "),
    "background-position": [
      "left top",
      "right top",
      `right ${BASE_TILES}%`,
      `left ${BASE_TILES}%`,
      "bottom",
    ].join(", "),
    "background-repeat": "no-repeat",
  }),

  // Across the whole height, not through the fess point, so the shield's point clips the last bar.
  barry: stripes("bottom", 6),
  "barry-of-eight": stripes("bottom", 8),
  "barry-of-ten": stripes("bottom", 10),
  paly: stripes("right", 6),
  "paly-of-eight": stripes("right", 8),

  // Bendy has the first tincture in the sinister chief corner, bendy sinister in the dexter.
  bendy: bendy("bottom left", 6),
  "bendy-of-eight": bendy("bottom left", 8),
  "bendy-sinister": bendy("bottom right", 6),
  "bendy-sinister-of-eight": bendy("bottom right", 8),

  // The first tincture in the chief corners.
  chevronny: chevronny(6),
  "chevronny-of-eight": chevronny(8),

  // 5 across and 6 down, the first tincture in the dexter chief square. Conic starts at the top.
  // The repeat must be explicit, as with stripes.
  chequy: (a, b) => ({
    "background-image": `conic-gradient(${b} 0 25%, ${a} 0 50%, ${b} 0 75%, ${a} 0)`,
    "background-size": "40% calc(100% / 3)",
    "background-repeat": "repeat",
  }),
};

// A division's background rules as one { image, size, position, repeat } per layer.
const toLayers = (rules) => {
  return rules["background-image"]
    .split(/, (?=(?:repeating-)?(?:linear|conic)-gradient)/)
    .map((gradient, i) => {
      const size = (rules["background-size"] ?? "100% 100%").split(", ");
      const position = (rules["background-position"] ?? "0 0").split(", ");
      const repeat = (rules["background-repeat"] ?? "no-repeat").split(", ");

      return {
        image: gradient,
        size: size[i % size.length],
        position: position[i % position.length],
        repeat: repeat[i % repeat.length],
      };
    });
};

/**
 * A division with one fur: the fur's part is left transparent, over the fur's own layers.
 * @param {string} division The division's name.
 * @param {string} first The first tincture or fur.
 * @param {string} second The second tincture or fur; one of the two is a fur.
 * @param {Function} theme Tailwind's theme function, for the spots' colour.
 * @returns {{image: string, size: string, position: string, repeat: string}[]} The layers, top first.
 */
const furredLayers = (division, first, second, theme) => {
  const fur = FURS[first] ? first : second;
  const paint = (t) => (t === fur ? "transparent" : `var(--color-${t})`);
  return [
    ...toLayers(DIVISIONS[division](paint(first), paint(second), true)),
    ...furLayers(fur, theme),
  ];
};

/**
 * Layers joined into one comma-separated value per property.
 * @param {{image: string, size: string, position: string, repeat: string}[]} layers
 * @param {string} prefix The property prefix, such as "background" or "--field".
 * @returns {Object<string, string>} `<prefix>-image`, `-size`, `-position` and `-repeat`.
 */
const joinLayers = (layers, prefix) =>
  Object.fromEntries(
    ["image", "size", "position", "repeat"].map((p) => [
      `${prefix}-${p}`,
      layers.map((layer) => layer[p]).join(", "),
    ]),
  );

/**
 * A division with one fur, as background rules.
 * @param {string} division The division's name.
 * @param {string} first The first tincture or fur.
 * @param {string} second The second tincture or fur; one of the two is a fur.
 * @param {Function} theme Tailwind's theme function, for the spots' colour.
 * @returns {Object<string, string>} The four background-* properties.
 */
const withFur = (division, first, second, theme) =>
  joinLayers(furredLayers(division, first, second, theme), "background");

/**
 * The field's own layers as --field-* variables, for charges on a counterchanged ordinary.
 * A background colour becomes a last opaque layer, as the variables carry no colour.
 * @param {{image: string, size: string, position: string, repeat: string}[]} layers
 * @param {string} [color] The division's background-color, if it has one.
 * @returns {Object<string, string>} The four --field-* variables.
 */
const field = (layers, color) =>
  joinLayers(
    color
      ? [
          ...layers,
          {
            image: `linear-gradient(${color}, ${color})`,
            size: "100% 100%",
            position: "0 0",
            repeat: "no-repeat",
          },
        ]
      : layers,
    "--field",
  );

// The field with its tinctures swapped, for counterchanged ordinaries to paint.
const counterchange = (rules) =>
  Object.fromEntries(
    Object.entries(rules).map(([property, value]) => [
      property.replace("background-", "--counterchange-"),
      value,
    ]),
  );

export default plugin(({ addUtilities, theme }) => {
  const utilities = {};

  for (const [division, background] of Object.entries(DIVISIONS)) {
    for (const first of TINCTURES) {
      for (const second of TINCTURES) {
        if (first === second) {
          continue;
        }

        const a = `var(--color-${first})`;
        const b = `var(--color-${second})`;
        const unswapped = background(a, b);
        utilities[`.${division}-${first}-${second}`] = {
          ...unswapped,
          ...field(toLayers(unswapped), unswapped["background-color"]),
          ...counterchange(background(b, a)),
          "--field-first": a,
        };
      }
    }
  }

  // One fur and one tincture; two furs can't each be kept to their own part.
  for (const division of Object.keys(DIVISIONS)) {
    for (const fur of Object.keys(FURS)) {
      for (const tincture of TINCTURES) {
        for (const [first, second] of [
          [fur, tincture],
          [tincture, fur],
        ]) {
          const layers = furredLayers(division, first, second, theme);
          // Only a tincture can be "of the first"; a fur first leaves it unset.
          utilities[`.${division}-${first}-${second}`] = {
            ...joinLayers(layers, "background"),
            ...field(layers),
            ...counterchange(withFur(division, second, first, theme)),
            ...(!FURS[first] && { "--field-first": `var(--color-${first})` }),
          };
        }
      }
    }
  }

  addUtilities(utilities);
});
