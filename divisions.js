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

// The direction of `to bottom right` on the shield (aspect-ratio 5 / 6 in grailwind.css), so
// chevronny's lines run parallel to per chevron's, the field's diagonals.
const CHEVRON_ANGLE = 180 - (Math.atan(6 / 5) * 180) / Math.PI;

// A half box is 75% as long as the whole along this angle (45/sqrt(61) over 60/sqrt(61)).
// Plain, the sinister half sits over a full-width dexter layer, which hides the centre seam.
// With a fur the layers can't overlap, as the transparent stripes would show the layer below.
const chevronny = (pieces) => (a, b, fur) => {
  const stripe = (angle, length) =>
    `repeating-linear-gradient(${angle}deg, ${a} 0 calc(${length}% / ${pieces}), ${b} 0 calc(${2 * length}% / ${pieces}))`;
  const sinister = stripe(-CHEVRON_ANGLE, 100);

  return fur
    ? {
        "background-image": [stripe(CHEVRON_ANGLE, 100), sinister].join(", "),
        "background-size": "50% 100%",
        "background-position": "left, right",
        "background-repeat": "no-repeat",
      }
    : {
        "background-image": [sinister, stripe(CHEVRON_ANGLE, 75)].join(", "),
        "background-size": "50% 100%, 100% 100%",
        "background-position": "right, left",
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

  // Gyronny of eight: each quarter split corner to corner. The first tincture
  // is in the gyron just dexter of the top line. The background colour fills
  // any sub-pixel seam between quarters.
  gyronny: (a, b) => ({
    "background-color": b,
    "background-image": [
      `linear-gradient(to bottom left, ${a} 50%, ${b} 50%)`,
      `linear-gradient(to bottom right, ${b} 50%, ${a} 50%)`,
      `linear-gradient(to bottom left, ${b} 50%, ${a} 50%)`,
      `linear-gradient(to bottom right, ${a} 50%, ${b} 50%)`,
    ].join(", "),
    "background-size": "50% 50%",
    "background-position": "left top, right top, right bottom, left bottom",
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

// A division with one fur: the fur's part is left transparent, over the fur's own layers.
const withFur = (division, first, second, theme) => {
  const fur = FURS[first] ? first : second;
  const paint = (t) => (t === fur ? "transparent" : `var(--color-${t})`);
  const all = [
    ...toLayers(DIVISIONS[division](paint(first), paint(second), true)),
    ...furLayers(fur, theme),
  ];
  return Object.fromEntries(
    ["image", "size", "position", "repeat"].map((p) => [
      `background-${p}`,
      all.map((layer) => layer[p]).join(", "),
    ]),
  );
};

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
        utilities[`.${division}-${first}-${second}`] = {
          ...background(a, b),
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
          // Only a tincture can be "of the first"; a fur first leaves it unset.
          utilities[`.${division}-${first}-${second}`] = {
            ...withFur(division, first, second, theme),
            ...counterchange(withFur(division, second, first, theme)),
            ...(!FURS[first] && { "--field-first": `var(--color-${first})` }),
          };
        }
      }
    }
  }

  addUtilities(utilities);
});
