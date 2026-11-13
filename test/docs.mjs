// Checks the docs' style tabs: every panel shows the same ordinaries, differing only in style.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LINES, ORDINARIES, VOIDABLE } from "../data.js";

const html = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");

const blocks = html
  .slice(html.indexOf('<div class="line-tabs">'), html.indexOf("<!-- end line tabs -->"))
  .split(/(?=<div\s+role="tabpanel")/)
  .slice(1);

const panels = blocks.map((block) => ({
  id: block.match(/id="panel-([\w-]+)"/)[1],
  figures: [
    ...block.matchAll(
      /<figure\s+data-blazon="([^"]+)"\s*>\s*<div\s+class="heater">\s*<div\s+class="([^"]+)"/g,
    ),
  ].map(([, blazon, classes]) => {
    const [field, ordinaryClass] = classes.split(" ");
    return { blazon, field, ordinaryClass };
  }),
}));

assert.deepEqual(
  panels.map((panel) => panel.id),
  ["plain", ...LINES, "voided"],
  "panel ids",
);

const [plain, ...stylePanels] = panels;

const ordinaryOf = (ordinaryClass) => ordinaryClass.slice(0, ordinaryClass.lastIndexOf("-"));
const plainOrdinaries = plain.figures.map((fig) => ordinaryOf(fig.ordinaryClass));
assert.deepEqual(
  [...plainOrdinaries].sort(),
  [...ORDINARIES].sort(),
  "plain panel is a permutation of ORDINARIES",
);

const pairs = plain.figures.map((fig) => `${fig.field} ${fig.ordinaryClass}`);
assert.equal(new Set(pairs).size, pairs.length, "tincture pairs are distinct");

for (const { id: style, figures } of stylePanels) {
  // Voided skips the ordinaries that can't be voided, keeping the plain order.
  const bases = plain.figures
    .map((base, i) => ({ base, ordinary: plainOrdinaries[i] }))
    .filter(({ ordinary }) => style !== "voided" || VOIDABLE.includes(ordinary));
  assert.equal(figures.length, bases.length, `${style}: figure count`);
  figures.forEach((fig, i) => {
    const { base, ordinary } = bases[i];
    const tincture = base.ordinaryClass.slice(ordinary.length + 1);
    assert.equal(fig.field, base.field, `${style} #${i}: field`);
    assert.equal(fig.ordinaryClass, `${ordinary}-${style}-${tincture}`, `${style} #${i}: class`);
    const words = base.blazon.split(" ");
    assert.equal(
      fig.blazon,
      [...words.slice(0, -1), style, words.at(-1)].join(" "),
      `${style} #${i}: blazon`,
    );
  });
}

console.log(`docs ok: ${panels.length} panels`);
