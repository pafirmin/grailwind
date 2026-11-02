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

// `at` is [x%, y%] of the shield. Bite and bulge points are at the middle scallop of an inner
// edge, half the scallop's depth from the straight edge.
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
];

const LINES = ["", "-engrailed", "-invected"];
const CONTACT = ORDINARIES.flatMap((o) => LINES.map((line) => `azure ${o}${line}-or`));
const SHIELDS = [...new Set(PROBES.map((p) => p.shield))];
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

const build = (dir) => {
  const classes = [...SHIELDS, ...CONTACT, ...TINCTURES, "escutcheon"].join(" ");
  writeFileSync(join(dir, "index.html"), `<div class="${classes}"></div>`);
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

const probe = async (page, css) => {
  const cells = [
    ...TINCTURES.map((t) => `<div class="swatch ${t}" data-swatch="${t}"></div>`),
    ...SHIELDS.map((s, i) => `<div class="escutcheon ${s}" data-shield="${i}"></div>`),
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
    ...PROBES.map(({ shield, at: [x, y] }) => {
      const box = shieldBoxes[SHIELDS.indexOf(shield)];
      return [
        Math.round(box.x + (x * box.width) / 100),
        Math.round(box.y + (y * box.height) / 100),
      ];
    }),
  ];
  const read = await pixels(page, points);
  const swatches = Object.fromEntries(swatchBoxes.map((b, i) => [b.swatch, read[i]]));
  return PROBES.map((p, i) => ({ ...p, rgb: read[swatchBoxes.length + i], swatches }));
};

const contactSheet = async (page, css, engine) => {
  const cells = CONTACT.map(
    (s) => `<figure><div class="escutcheon ${s}"></div><figcaption>${s}</figcaption></figure>`,
  ).join("\n");
  await page.setContent(grid(css, 150, cells).replace("repeat(6,", "repeat(9,"));
  mkdirSync(out, { recursive: true });
  await page.screenshot({ path: join(out, `contact-${engine}.png`), fullPage: true });
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
      for (const { shield, at, expect, why, rgb, swatches } of await probe(page, css)) {
        const got = nearest(rgb, swatches);
        if (got === expect) {
          console.log(`✓ ${name}: ${shield}: ${why}`);
        } else {
          failures++;
          const seen = got ?? `no tincture near (${rgb.join(", ")})`;
          console.error(`✗ ${name}: ${shield}: ${why}`);
          console.error(`    at ${at[0]}% ${at[1]}%: got ${seen}, expected ${expect}`);
        }
      }
      try {
        await contactSheet(page, css, name);
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
