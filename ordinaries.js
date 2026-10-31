/*
 * Grailwind CSS: ordinaries, e.g. `fess-or`.
 */
import plugin from "tailwindcss/plugin";

const TINCTURES = ["or", "argent", "gules", "azure", "vert", "purpure", "sable"];

const ORDINARIES = {
  pale: "polygon(35% 0, 65% 0, 65% 100%, 35% 100%)",
  fess: "polygon(0 30%, 100% 30%, 100% 60%, 0 60%)",
  bend: "polygon(0 0, 20% 0, 100% 80%, 100% 100%, 80% 100%, 0 20%)",
  "bend-sinister":
    "polygon(100% 0, 80% 0, 0 80%, 0 100%, 20% 100%, 100% 20%)",
  chevron: "polygon(50% 25%, 100% 75%, 100% 95%, 50% 45%, 0 95%, 0 75%)",
  cross:
    "polygon(40% 0, 60% 0, 60% 35%, 100% 35%, 100% 55%, 60% 55%, 60% 100%, 40% 100%, 40% 55%, 0 55%, 0 35%, 40% 35%)",
  saltire:
    "polygon(0 0, 15% 0, 50% 35%, 85% 0, 100% 0, 100% 15%, 65% 50%, 100% 85%, 100% 100%, 85% 100%, 50% 65%, 15% 100%, 0 100%, 0 85%, 35% 50%, 0 15%)",
  pall: "polygon(0 0, 15% 0, 50% 35%, 85% 0, 100% 0, 100% 15%, 60% 50%, 60% 100%, 40% 100%, 40% 50%, 0 15%)",
  chief: "polygon(0 0, 100% 0, 100% 30%, 0 30%)",
};

const PSEUDO = { chief: "&::after" };

export default plugin(({ addUtilities }) => {
  const utilities = {};

  for (const [ordinary, shape] of Object.entries(ORDINARIES)) {
    for (const tincture of TINCTURES) {
      utilities[`.${ordinary}-${tincture}`] = {
        position: "relative",
        [PSEUDO[ordinary] ?? "&::before"]: {
          content: '""',
          position: "absolute",
          inset: "0",
          "background-color": `var(--color-${tincture})`,
          "clip-path": shape,
        },
      };
    }
  }

  addUtilities(utilities);
});
