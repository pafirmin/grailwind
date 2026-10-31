/*
 * Grailwind CSS: field divisions as decoration.
 */
import plugin from "tailwindcss/plugin";

const TINCTURES = ["or", "argent", "gules", "azure", "vert", "purpure", "sable"];

// Each division maps (first, second) tincture colours to a background.
const DIVISIONS = {
  // Vertical split: first on the dexter (viewer's left).
  "per-pale": (a, b) => `linear-gradient(to right, ${a} 50%, ${b} 50%)`,

  // Horizontal split: first in chief.
  "per-fess": (a, b) => `linear-gradient(to bottom, ${a} 50%, ${b} 50%)`,

  // Line from dexter chief to sinister base: first in the upper half.
  // With a corner-to-corner gradient, the 50% line joins the other two corners.
  "per-bend": (a, b) => `linear-gradient(to bottom left, ${a} 50%, ${b} 50%)`,

  // Line from sinister chief to dexter base: first in the upper half.
  "per-bend-sinister": (a, b) =>
    `linear-gradient(to bottom right, ${a} 50%, ${b} 50%)`,

  // Quarters 1 and 4 (dexter chief, sinister base) are the first tincture.
  // The conic gradient starts at 12 o'clock and runs clockwise, so it begins
  // with quarter 2.
  quarterly: (a, b) =>
    `conic-gradient(${b} 0 25%, ${a} 0 50%, ${b} 0 75%, ${a} 0)`,

  // Gyronny of eight: the first tincture is in the gyron just dexter of the
  // top line, which is the last of the eight going clockwise from 12 o'clock.
  gyronny: (a, b) => `repeating-conic-gradient(${b} 0 12.5%, ${a} 0 25%)`,
};

export default plugin(({ addUtilities }) => {
  const utilities = {};

  for (const [division, background] of Object.entries(DIVISIONS)) {
    for (const first of TINCTURES) {
      for (const second of TINCTURES) {
        if (first === second) continue;

        utilities[`.${division}-${first}-${second}`] = {
          "background-image": background(
            `var(--color-${first})`,
            `var(--color-${second})`,
          ),
        };
      }
    }
  }

  addUtilities(utilities);
});
