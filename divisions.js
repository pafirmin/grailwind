/*
 * Grailwind CSS: field divisions as decoration.
 */
import plugin from "tailwindcss/plugin";
import { FURS, TINCTURES } from "./data.js";
import { furLayers } from "./furs.js";

// Horizontal lines of partition pass through the fess point, as the cross and fess do.
const FESS_POINT = "45%";

// Each division maps (first, second) tincture colours to background rules.
const layer = (image) => ({ "background-image": image });

const DIVISIONS = {
  // Vertical split: first on the dexter (viewer's left).
  "per-pale": (a, b) => layer(`linear-gradient(to right, ${a} 50%, ${b} 50%)`),

  // Horizontal split through the fess point: first in chief.
  "per-fess": (a, b) => layer(`linear-gradient(to bottom, ${a} ${FESS_POINT}, ${b} ${FESS_POINT})`),

  // Line from dexter chief to sinister base: first in the upper half.
  // With a corner-to-corner gradient, the 50% line joins the other two corners.
  "per-bend": (a, b) => layer(`linear-gradient(to bottom left, ${a} 50%, ${b} 50%)`),

  // Line from sinister chief to dexter base: first in the upper half.
  "per-bend-sinister": (a, b) => layer(`linear-gradient(to bottom right, ${a} 50%, ${b} 50%)`),

  // Quarters 1 and 4 (dexter chief, sinister base) are the first tincture.
  // Linear gradients rather than conic, which render jagged edges in some browsers.
  // With a fur, the bands can't overlap, or the fur's transparent half shows the band below.
  quarterly: (a, b, fur) => ({
    "background-image": `linear-gradient(to right, ${a} 50%, ${b} 50%), linear-gradient(to right, ${b} 50%, ${a} 50%)`,
    "background-size": `100% ${FESS_POINT}, 100% ${fur ? `calc(100% - ${FESS_POINT})` : "100%"}`,
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
};

// A division's background rules as one { image, size, position, repeat } per layer.
const toLayers = (rules) => {
  return rules["background-image"].split(/, (?=linear-gradient)/).map((gradient, i) => {
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
          utilities[`.${division}-${first}-${second}`] = {
            ...withFur(division, first, second, theme),
            ...counterchange(withFur(division, second, first, theme)),
          };
        }
      }
    }
  }

  addUtilities(utilities);
});
