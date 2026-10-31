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

// Where charges go for "between", as [left%, top%], plus their size as % of width.
const BETWEEN = {
  pale: { size: 18, points: [[18, 42], [82, 42]] },
  fess: { size: 20, points: [[30, 15], [70, 15], [50, 78]] },
  bend: { size: 24, points: [[70, 26], [30, 68]] },
  "bend-sinister": { size: 24, points: [[30, 26], [70, 68]] },
  chevron: { size: 22, points: [[24, 22], [76, 22], [50, 70]] },
  cross: { size: 18, points: [[20, 17], [80, 17], [24, 72], [76, 72]] },
  saltire: { size: 16, points: [[50, 13], [14, 50], [86, 50], [50, 84]] },
  pall: { size: 18, points: [[50, 11], [18, 56], [82, 56]] },
};

// Where charges go for "on", along the ordinary's centre line, by number of charges.
const ON = {
  pale: { size: 20, counts: { 1: [[50, 45]], 2: [[50, 28], [50, 62]], 3: [[50, 18], [50, 45], [50, 72]] } },
  fess: { size: 22, counts: { 1: [[50, 45]], 2: [[30, 45], [70, 45]], 3: [[20, 45], [50, 45], [80, 45]] } },
  bend: { size: 18, counts: { 1: [[50, 50]], 2: [[33, 33], [67, 67]], 3: [[24, 24], [50, 50], [76, 76]] } },
  "bend-sinister": { size: 18, counts: { 1: [[50, 50]], 2: [[67, 33], [33, 67]], 3: [[76, 24], [50, 50], [24, 76]] } },
  chevron: { size: 12, counts: { 1: [[50, 36]], 3: [[20, 65], [50, 36], [80, 65]] } },
  cross: { size: 15, counts: { 1: [[50, 45]], 5: [[50, 15], [18, 45], [50, 45], [82, 45], [50, 80]] } },
  saltire: { size: 14, counts: { 1: [[50, 50]], 5: [[22, 22], [78, 22], [50, 50], [22, 78], [78, 78]] } },
  pall: { size: 14, counts: { 1: [[50, 50]], 3: [[22, 22], [78, 22], [50, 75]] } },
};

const betweenVars = ({ size, points }) => {
  const vars = { "--between-size": `${size}%` };
  points.forEach(([left, top], i) => {
    vars[`--between-${i + 1}-x`] = `${left}%`;
    vars[`--between-${i + 1}-y`] = `${top}%`;
  });
  return vars;
};

const onVars = ({ size, counts }) => {
  const vars = { "--on-size": `${size}%` };
  for (const [count, points] of Object.entries(counts)) {
    points.forEach(([left, top], i) => {
      vars[`--on-${count}-${i + 1}-x`] = `${left}%`;
      vars[`--on-${count}-${i + 1}-y`] = `${top}%`;
    });
  }
  return vars;
};

export default plugin(({ addUtilities }) => {
  const utilities = {};

  for (const [ordinary, shape] of Object.entries(ORDINARIES)) {
    for (const tincture of TINCTURES) {
      utilities[`.${ordinary}-${tincture}`] = {
        position: "relative",
        ...(BETWEEN[ordinary] && betweenVars(BETWEEN[ordinary])),
        ...(ON[ordinary] && onVars(ON[ordinary])),
        // With a chief, everything else is drawn in the field below it.
        ...(ordinary === "chief" && {
          "--field-top": "30%",
          // The chief's centre line, relative to the charges container below it.
          "--chief-points-y": "calc(-15% / 0.7)",
          "--chief-points-size": "18%",
        }),
        [PSEUDO[ordinary] ?? "&::before"]: {
          content: '""',
          position: "absolute",
          inset: ordinary === "chief" ? "0" : "var(--field-top, 0%) 0 0",
          "background-color": `var(--color-${tincture})`,
          "clip-path": shape,
        },
      };
    }
  }

  addUtilities(utilities);
});
