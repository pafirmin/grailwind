// Renders shields in Chromium and Firefox and checks the tincture at chosen points.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "node_modules/.bin/tailwindcss");
const out = join(root, "test", ".render");

const TINCTURES = ["or", "argent", "gules", "azure", "vert", "purpure", "sable"];
const ORDINARIES = [
  "pale",
  "fess",
  "bend",
  "bend-sinister",
  "chevron",
  "cross",
  "saltire",
  "pall",
  "chief",
];
const WIDTH = 300;

const bezants = (n) => Array.from({ length: n }, () => "bezant");

// A charge's centre, plus four points at 0.8 of its radius, so that a charge moved by more than
// a fifth of its radius leaves one of them uncovered. A roundel's radius is 0.46 of its width.
const ring = ([x, y], size) => {
  const r = 0.8 * 0.46 * size;
  const ry = (r * 5) / 6;
  return [
    [x, y],
    [x - r, y],
    [x + r, y],
    [x, y - ry],
    [x, y + ry],
  ];
};

// One probe per charge; `charges` is the container's classes besides `charges`, and `size` the
// charge width as % of the shield's.
const charged = (shield, charges, size, points, why) =>
  points.map((point, i) => ({
    shield,
    charges,
    items: bezants(points.length),
    at: ring(point, size),
    expect: "or",
    why: points.length > 1 ? `${why}, charge ${i + 1}` : why,
  }));
// A fur's tile, as % of the shield: 6 across, and 5:6 like the shield, so the same % down.
const FUR_TILE = 100 / 6;
const furSpot = (k, j) => [FUR_TILE * (k + 0.25), FUR_TILE * (j + 0.25) + FUR_TILE / 10];
const furGround = (k, j) => [FUR_TILE * (k + 0.75), FUR_TILE * (j + 0.25)];
const gap = (shield, charges, n) => ({ shield, charges, items: bezants(n), expect: "azure" });
const atPoint = (name, at) => [
  {
    shield: "azure",
    charges: "",
    items: [`bezant in-${name}`],
    at: ring(at, 22),
    expect: "or",
    why: `in ${name}`,
  },
];

// `at` is [x%, y%] of the shield. Bite and bulge points are at the middle scallop of an inner
// edge, half the scallop's depth from the straight edge. Charges are bezants, whose centres
// sit at the points in charges.js and the ordinaries' `between`/`on` tables.
// prettier-ignore
const PROBES = [
  { shield: "azure pale-or", at: [50, 30], expect: "or", why: "the pale is drawn" },
  { shield: "azure pale-or", at: [20, 30], expect: "azure", why: "the field beside the pale" },
  { shield: "azure fess-or", at: [50, 45], expect: "or", why: "the fess is drawn" },
  { shield: "azure fess-or", at: [50, 15], expect: "azure", why: "the field above the fess" },
  { shield: "azure bend-or", at: [50, 50], expect: "or", why: "the bend is drawn" },
  { shield: "azure bend-or", at: [75, 25], expect: "azure", why: "the field above the bend" },
  { shield: "azure bend-sinister-or", at: [50, 50], expect: "or", why: "the bend sinister is drawn" },
  { shield: "azure bend-sinister-or", at: [25, 25], expect: "azure", why: "the field above the bend sinister" },
  { shield: "azure chevron-or", at: [25, 60], expect: "or", why: "the chevron is drawn" },
  { shield: "azure chevron-or", at: [50, 60], expect: "azure", why: "the field under the chevron" },
  { shield: "azure cross-or", at: [50, 45], expect: "or", why: "the cross is drawn" },
  { shield: "azure cross-or", at: [20, 20], expect: "azure", why: "the field in the first quarter" },
  { shield: "azure saltire-or", at: [50, 50], expect: "or", why: "the saltire is drawn" },
  { shield: "azure saltire-or", at: [50, 20], expect: "azure", why: "the field above the saltire" },
  { shield: "azure pall-or", at: [50, 70], expect: "or", why: "the pall's foot is drawn" },
  { shield: "azure pall-or", at: [50, 20], expect: "azure", why: "the field above the pall" },
  { shield: "azure chief-or", at: [50, 15], expect: "or", why: "the chief is drawn" },
  { shield: "azure chief-or", at: [50, 50], expect: "azure", why: "the field below the chief" },

  { shield: "azure pale-engrailed-or", at: [62.7, 50], expect: "azure", why: "a bite in the pale" },
  { shield: "azure fess-engrailed-or", at: [50, 32.1], expect: "azure", why: "a bite in the fess" },
  { shield: "azure bend-engrailed-or", at: [58.1, 41.3], expect: "azure", why: "a bite in the bend" },
  { shield: "azure bend-sinister-engrailed-or", at: [41.9, 41.3], expect: "azure", why: "a bite in the bend sinister" },
  { shield: "azure chevron-engrailed-or", at: [20.6, 72.2], expect: "azure", why: "a bite in the chevron" },
  { shield: "azure cross-engrailed-or", at: [80, 36.9], expect: "azure", why: "a bite in the cross" },
  { shield: "azure saltire-engrailed-or", at: [85, 73.2], expect: "azure", why: "a bite in the saltire" },
  { shield: "azure pall-engrailed-or", at: [73.7, 14.4], expect: "azure", why: "a bite in the pall" },
  { shield: "azure chief-engrailed-or", at: [50, 27.9], expect: "azure", why: "a bite in the chief" },
  { shield: "gules chevron-engrailed-or", at: [50, 27], expect: "gules", why: "no sliver above the chevron's peak" },

  { shield: "azure fess-invected-or", at: [50, 27.9], expect: "or", why: "a bulge on the fess" },
  { shield: "azure bend-sinister-invected-or", at: [38.1, 38.7], expect: "or", why: "a bulge on the bend sinister" },
  { shield: "azure chief-invected-or", at: [50, 32.1], expect: "or", why: "a bulge on the chief" },

  { shield: "or chevron-gules chief-azure", at: [50, 38], expect: "or", why: "the chevron moves below a chief" },
  { shield: "gules cross-azure fimbriated-argent", at: [38.5, 15], expect: "argent", why: "the cross's fimbriation" },
  { shield: "gules cross-azure fimbriated-argent", at: [50, 45], expect: "azure", why: "the fimbriated cross itself" },
  { shield: "per-pale-or-gules chevron-counterchanged", at: [25, 60], expect: "gules", why: "the counterchanged chevron's dexter half" },
  { shield: "per-pale-or-gules chevron-counterchanged", at: [75, 60], expect: "or", why: "the counterchanged chevron's sinister half" },

  ...charged("azure", "", 50, [[50, 45]], "one charge"),
  ...charged("azure", "", 30, [[50, 24], [50, 66]], "two charges"),
  ...charged("azure", "", 28, [[28, 25], [72, 25], [50, 64]], "three charges, 2 and 1"),
  ...charged("azure", "", 24, [[30, 24], [70, 24], [32, 60], [68, 60]], "four charges"),
  ...charged("azure", "", 22, [[27, 20], [73, 20], [50, 42], [32, 64], [68, 64]], "five charges, in saltire"),
  ...charged("azure", "", 20, [[20, 18], [50, 18], [80, 18], [35, 42], [65, 42], [50, 66]], "six charges"),
  { ...gap("azure", "", 3), at: [50, 25], why: "three charges: a gap between the top two" },

  ...charged("azure", "in-pale", 30, [[50, 24], [50, 66]], "two in pale"),
  ...charged("azure", "in-pale", 22, [[50, 16], [50, 43], [50, 70]], "three in pale"),
  ...charged("azure", "in-fess", 30, [[30, 45], [70, 45]], "two in fess"),
  ...charged("azure", "in-fess", 24, [[22, 45], [50, 45], [78, 45]], "three in fess"),
  { ...gap("azure", "in-fess", 3), at: [36, 45], why: "three in fess: a gap between the first two" },
  ...charged("azure", "in-bend", 28, [[30, 26], [70, 64]], "two in bend"),
  ...charged("azure", "in-bend", 22, [[22, 16], [50, 45], [78, 74]], "three in bend"),
  ...charged("azure", "in-bend-sinister", 28, [[70, 26], [30, 64]], "two in bend sinister"),
  ...charged("azure", "in-bend-sinister", 22, [[78, 16], [50, 45], [22, 74]], "three in bend sinister"),

  ...atPoint("dexter-chief", [25, 17]),
  ...atPoint("chief", [50, 15]),
  ...atPoint("sinister-chief", [75, 17]),
  ...atPoint("honour-point", [50, 30]),
  ...atPoint("fess-point", [50, 45]),
  ...atPoint("nombril-point", [50, 60]),
  ...atPoint("dexter-base", [30, 72]),
  ...atPoint("base", [50, 84]),
  ...atPoint("sinister-base", [70, 72]),

  { shield: "azure chief-gules", charges: "", items: ["bezant in-chief"], at: ring([50, 15], 18), expect: "or", why: "a charge in chief sits on the chief" },
  { shield: "azure chief-gules", charges: "", items: ["bezant in-fess-point"], at: ring([50, 61.5], 22), expect: "or", why: "the fess point moves below a chief" },
  { shield: "azure chief-gules", charges: "", items: ["bezant in-fess-point"], at: [50, 45], expect: "azure", why: "nothing left at the old fess point" },
  ...charged("azure chief-gules", "", 28, [[28, 47.5], [72, 47.5], [50, 74.8]], "three charges below a chief"),

  ...charged("azure pale-gules", "between", 18, [[18, 42], [82, 42]], "between a pale"),
  ...charged("azure fess-gules", "between", 20, [[30, 15], [70, 15], [50, 78]], "between a fess"),
  ...charged("azure bend-gules", "between", 24, [[70, 26], [30, 68]], "between a bend"),
  ...charged("azure bend-sinister-gules", "between", 24, [[30, 26], [70, 68]], "between a bend sinister"),
  ...charged("azure chevron-gules", "between", 22, [[24, 22], [76, 22], [50, 70]], "between a chevron"),
  ...charged("azure cross-gules", "between", 18, [[20, 17], [80, 17], [24, 72], [76, 72]], "between a cross"),
  ...charged("azure saltire-gules", "between", 16, [[50, 13], [14, 50], [86, 50], [50, 84]], "between a saltire"),
  ...charged("azure pall-gules", "between", 18, [[50, 11], [18, 56], [82, 56]], "between a pall"),

  ...charged("azure pale-gules", "on", 20, [[50, 18], [50, 45], [50, 72]], "on a pale"),
  ...charged("azure fess-gules", "on", 22, [[20, 45], [50, 45], [80, 45]], "on a fess"),
  ...charged("azure bend-gules", "on", 18, [[24, 24], [50, 50], [76, 76]], "on a bend"),
  ...charged("azure bend-sinister-gules", "on", 18, [[76, 24], [50, 50], [24, 76]], "on a bend sinister"),
  ...charged("azure chevron-gules", "on", 12, [[20, 65], [50, 36], [80, 65]], "on a chevron"),
  ...charged("azure cross-gules", "on", 15, [[50, 15], [18, 45], [50, 45], [82, 45], [50, 80]], "on a cross"),
  ...charged("azure saltire-gules", "on", 14, [[22, 22], [78, 22], [50, 50], [22, 78], [78, 78]], "on a saltire"),
  ...charged("azure pall-gules", "on", 14, [[22, 22], [78, 22], [50, 75]], "on a pall"),

  { shield: "azure", charges: "", items: ["bezant"], at: [68, 45], expect: "or", why: "one charge is half the shield wide" },
  { shield: "azure", charges: "charge-size-20", items: ["bezant"], at: [68, 45], expect: "azure", why: "charge-size-20 shrinks it" },
  ...charged("azure", "charge-size-20", 20, [[50, 45]], "a resized charge"),

  { shield: "per-pale-or-gules", charges: "in-fess counterchanged", items: ["roundel", "roundel"], at: [30, 45], expect: "gules", why: "a counterchanged charge on the or half" },
  { shield: "per-pale-or-gules", charges: "in-fess counterchanged", items: ["roundel", "roundel"], at: [70, 45], expect: "or", why: "a counterchanged charge on the gules half" },

  // Fur spots on the field, from furs.js: tiles 6 across, so spots sit at (T/4 + kT, T/4 + jT) and
  // (3T/4 + kT, 3T/4 + jT), where T is a tile. furSpot is a spot's body, a tenth of a tile below its
  // centre; furGround is empty ground between spots.
  { shield: "ermine", at: furSpot(1, 1), expect: "sable", why: "an ermine spot" },
  { shield: "ermine", at: furGround(1, 1), expect: "argent", why: "the ermine ground" },
  { shield: "ermines", at: furSpot(1, 1), expect: "argent", why: "an ermines spot" },
  { shield: "ermines", at: furGround(1, 1), expect: "sable", why: "the ermines ground" },
  { shield: "erminois", at: furSpot(1, 1), expect: "sable", why: "an erminois spot" },
  { shield: "erminois", at: furGround(1, 1), expect: "or", why: "the erminois ground" },
  { shield: "pean", at: furSpot(1, 1), expect: "or", why: "a pean spot" },
  { shield: "pean", at: furGround(1, 1), expect: "sable", why: "the pean ground" },

  // A charge is two tiles across, centred, so a spot sits at its centre.
  { shield: "gules", charges: "", items: ["mullet ermine"], at: [50, 47.5], expect: "sable", why: "a spot at the charge's centre" },
  { shield: "gules", charges: "", items: ["mullet ermine"], at: [50, 39.17], expect: "argent", why: "the fur's ground in the mullet" },
  { shield: "gules", charges: "", items: ["mullet ermine"], at: [27, 27], expect: "gules", why: "the field outside the mullet" },

  { shield: "per-pale-ermine-gules", at: furSpot(1, 1), expect: "sable", why: "a spot on the ermine half" },
  { shield: "per-pale-ermine-gules", at: furSpot(4, 1), expect: "gules", why: "no spot on the gules half" },
  { shield: "quarterly-ermine-azure", at: furSpot(1, 1), expect: "sable", why: "a spot in quarter 1" },
  { shield: "quarterly-ermine-azure", at: furGround(1, 1), expect: "argent", why: "the ground in quarter 1" },
  { shield: "quarterly-ermine-azure", at: furSpot(4, 1), expect: "azure", why: "quarter 2 is azure" },
  { shield: "quarterly-ermine-azure", at: furSpot(1, 4), expect: "azure", why: "quarter 3 is azure" },
  { shield: "quarterly-ermine-azure", at: furSpot(4, 4), expect: "sable", why: "a spot in quarter 4" },
  { shield: "gyronny-gules-ermine", at: [45, 5], expect: "gules", why: "the first gyron" },
  { shield: "gyronny-gules-ermine", at: furSpot(0, 2), expect: "sable", why: "a spot in the second gyron" },
  { shield: "gyronny-gules-ermine", at: furGround(0, 2), expect: "argent", why: "the ground in the second gyron" },

  { shield: "per-pale-ermine-gules", charges: "in-fess counterchanged", items: ["roundel", "roundel"], at: [30, 45], expect: "gules", why: "a counterchanged charge on the ermine half" },
  { shield: "per-pale-ermine-gules", charges: "in-fess counterchanged", items: ["roundel", "roundel"], at: furSpot(4, 2), expect: "sable", why: "a counterchanged charge on the gules half, on the field's spot grid" },
  { shield: "per-pale-ermine-gules fess-counterchanged", at: [25, 45], expect: "gules", why: "a counterchanged fess on the ermine half" },
  { shield: "per-pale-ermine-gules fess-counterchanged", at: furSpot(4, 2), expect: "sable", why: "a counterchanged fess on the gules half, on the field's spot grid" },
  { shield: "azure fess-ermine", at: furSpot(1, 2), expect: "sable", why: "a spot on a fur fess, on the field's grid" },
  { shield: "azure fess-ermine", at: furGround(1, 2), expect: "argent", why: "the ground of a fur fess" },
  { shield: "azure fess-ermine", at: [50, 20], expect: "azure", why: "the field above a fur fess" },
  { shield: "azure chief-ermine", at: furSpot(1, 0), expect: "sable", why: "a spot on a fur chief" },
  { shield: "azure chief-ermine", at: furGround(1, 0), expect: "argent", why: "the ground of a fur chief" },
  { shield: "azure chief-ermine", at: [50, 50], expect: "azure", why: "the field below a fur chief" },
  { shield: "azure chevron-engrailed-ermine", at: [25, 60], expect: "argent", why: "the fur inside an engrailed chevron" },
  { shield: "azure chevron-engrailed-ermine", at: [20.6, 72.2], expect: "azure", why: "a bite in a fur engrailed chevron" },
  { shield: "azure fimbriated-gules fess-ermine", at: [50, 29], expect: "azure", why: "a fur fess isn't fimbriated" },
  ...charged("azure fess-ermine", "on", 22, [[20, 45], [50, 45], [80, 45]], "on a fess ermine"),
  ...charged("azure fess-gules", "on", 22, [[27, 20], [73, 20], [50, 42], [32, 64], [68, 64]], "five on a fess fall back to the default"),
];

const LINES = ["", "-engrailed", "-invected"];
const CONTACT = ORDINARIES.flatMap((o) =>
  LINES.map((line) => ({ shield: `azure ${o}${line}-or` })),
);
const key = ({ shield, charges, items }) => `${shield}|${charges}|${items}`;
const SHIELDS = [...new Map(PROBES.map((p) => [key(p), p])).values()];
const CHARGED = SHIELDS.filter((s) => s.items);
const TINCTURE_MATCH_THRESHOLD = 12;

const isWithinThreshold = (threshold, gotRgb, wantRgb) => {
  return gotRgb.every((val, i) => val > wantRgb[i] - threshold && val < wantRgb[i] + threshold);
};

const nearest = (rgb, swatches) => {
  for (const [tincture, tinctureRgb] of Object.entries(swatches)) {
    if (isWithinThreshold(TINCTURE_MATCH_THRESHOLD, rgb, tinctureRgb)) {
      return tincture;
    }
  }

  return null;
};

const markup = ({ shield, charges, items }, attrs = "") => {
  const inner = items
    ? `<div class="charges ${charges}">${items.map((c) => `<i class="${c}"></i>`).join("")}</div>`
    : "";
  return `<div class="escutcheon ${shield}"${attrs}>${inner}</div>`;
};
const caption = ({ shield, charges, items }) =>
  items ? `${shield} · ${charges || "plain"} · ${items.join(", ")}` : shield;

const build = (dir) => {
  const specs = [...SHIELDS, ...CONTACT];
  const classes = [...specs.map((s) => markup(s)), ...TINCTURES.map((t) => `<i class="${t}"></i>`)];
  writeFileSync(join(dir, "index.html"), classes.join("\n"));
  const input = join(dir, "input.css");
  const output = join(dir, "output.css");
  writeFileSync(
    input,
    `@import "tailwindcss" source(none);\n@source "./index.html";\n@import "${join(root, "grailwind.css")}";\n`,
  );
  execFileSync(cli, ["-i", input, "-o", output], { stdio: "pipe" });
  return readFileSync(output, "utf8");
};

const grid = (css, width, cells) => `<!doctype html>
<style>${css}</style>
<style>
  body { margin: 0; display: grid; grid-template-columns: repeat(6, ${width}px); gap: 20px; }
  .escutcheon { width: ${width}px; box-shadow: none; }
  .swatch { width: ${width}px; height: 40px; }
  figure { margin: 0; font: 14px sans-serif; text-align: center; }
</style>
${cells}`;

// One screenshot of the page, then each point's pixel, read back through a canvas.
const pixels = async (page, points) => {
  const png = await page.screenshot({ fullPage: true });
  return page.evaluate(
    async ({ src, points }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const context = canvas.getContext("2d");
      context.drawImage(img, 0, 0);
      return points.map(([x, y]) => [...context.getImageData(x, y, 1, 1).data.slice(0, 3)]);
    },
    { src: `data:image/png;base64,${png.toString("base64")}`, points },
  );
};

// `at` is one [x, y] point, or a list of them that must all match.
const spots = (at) => (Array.isArray(at[0]) ? at : [at]);

const probe = async (page, css) => {
  const cells = [
    ...TINCTURES.map((t) => `<div class="swatch ${t}" data-swatch="${t}"></div>`),
    ...SHIELDS.map((s, i) => markup(s, ` data-shield="${i}"`)),
  ].join("\n");
  await page.setContent(grid(css, WIDTH, cells));

  const boxes = await page.evaluate(() =>
    [...document.querySelectorAll("[data-swatch], [data-shield]")].map((el) => {
      const { x, y, width, height } = el.getBoundingClientRect();
      return { swatch: el.dataset.swatch, shield: el.dataset.shield, x, y, width, height };
    }),
  );
  const swatchBoxes = boxes.filter((b) => b.swatch);
  const shieldBoxes = boxes.filter((b) => b.shield !== undefined);

  const points = [
    ...swatchBoxes.map((b) => [Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2)]),
    ...PROBES.flatMap((p) => {
      const box = shieldBoxes[SHIELDS.findIndex((s) => key(s) === key(p))];
      return spots(p.at).map(([x, y]) => [
        Math.round(box.x + (x * box.width) / 100),
        Math.round(box.y + (y * box.height) / 100),
      ]);
    }),
  ];
  const read = await pixels(page, points);
  const swatches = Object.fromEntries(swatchBoxes.map((b, i) => [b.swatch, read[i]]));
  let next = swatchBoxes.length;
  return PROBES.map((p) => {
    const rgbs = spots(p.at).map(() => read[next++]);
    return { ...p, rgbs, swatches };
  });
};

const contactSheet = async (page, css, specs, columns, file) => {
  const cells = specs
    .map((s) => `<figure>${markup(s)}<figcaption>${caption(s)}</figcaption></figure>`)
    .join("\n");
  await page.setContent(grid(css, 150, cells).replace("repeat(6,", `repeat(${columns},`));
  mkdirSync(out, { recursive: true });
  await page.screenshot({ path: join(out, file), fullPage: true });
};

const dir = mkdtempSync(join(root, "test", ".tmp-"));
let failures = 0;

try {
  const css = build(dir);
  for (const engine of [chromium, firefox]) {
    const name = engine.name();
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ deviceScaleFactor: 1 });
      for (const result of await probe(page, css)) {
        const { at, expect, why, rgbs, swatches } = result;
        const miss = spots(at).findIndex((_, i) => nearest(rgbs[i], swatches) !== expect);
        if (miss === -1) {
          console.log(`✓ ${name}: ${caption(result)}: ${why}`);
        } else {
          failures++;
          const [x, y] = spots(at)[miss].map((v) => +v.toFixed(1));
          const rgb = rgbs[miss];
          const seen = nearest(rgb, swatches) ?? `no tincture near (${rgb.join(", ")})`;
          console.error(`✗ ${name}: ${caption(result)}: ${why}`);
          console.error(`    at ${x}% ${y}%: got ${seen}, expected ${expect}`);
        }
      }
      try {
        await contactSheet(page, css, CONTACT, 9, `contact-${name}.png`);
        await contactSheet(page, css, CHARGED, 8, `charges-${name}.png`);
      } catch (error) {
        console.error(`  (no contact sheet for ${name}: ${error.message})`);
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

process.exit(failures ? 1 : 0);
