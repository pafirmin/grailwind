// Turns the hand-drawn SVGs in drawings/ into paths.js.
//   npm run drawings                       write paths.js from drawings/*.svg
//   npm run drawings -- --check            exit 1 if paths.js is out of date
//   npm run drawings -- draft pile-engrailed   start drawings/pile-engrailed.svg from the generator
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { LINES } from "../data.js";
import { draftOutline, ORDINARIES, svgPath } from "../ordinaries.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "drawings");
const pathsFile = join(root, "paths.js");

// Fox-Davies figure for each drawing. The pall takes the saltire's.
const FIGURES = {
  heater: 210,
  "chevron-wavy": 133,
  "chevron-indented": 132,
  "chevron-embattled": 130,
  "cross-indented": 159,
  "cross-embattled": 158,
  "saltire-wavy": 189,
  "saltire-indented": 188,
  "saltire-embattled": 187,
  "pall-wavy": 189,
  "pall-indented": 188,
  "pall-embattled": 187,
  "pile-engrailed": 144,
  "pile-indented": 147,
  "pile-embattled": 146,
};

const round = (v) => +v.toFixed(2) || 0;

const ARGUMENTS = { M: 2, L: 2, H: 1, V: 1, C: 6, A: 7, Z: 0 };

// SVG path data to absolute segments, rounded to 2 decimals.
export const convertPath = (d, where = "path") => {
  const fail = (message) => {
    throw new Error(`${where}: ${message}`);
  };
  let i = 0;
  const skip = () => {
    while (i < d.length && /[\s,]/.test(d[i])) {
      i++;
    }
  };
  const number = () => {
    skip();
    const match = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(d.slice(i));
    if (!match) {
      fail(`expected a number at "${d.slice(i, i + 10)}"`);
    }
    i += match[0].length;
    return parseFloat(match[0]);
  };
  const flag = () => {
    skip();
    if (d[i] !== "0" && d[i] !== "1") {
      fail(`expected an arc flag at "${d.slice(i, i + 10)}"`);
    }
    return +d[i++];
  };

  const segments = [];
  let [x, y] = [0, 0];
  let [startX, startY] = [0, 0];
  let command = null;
  let moves = 0;
  let closed = false;
  skip();
  while (i < d.length) {
    if (/[A-Za-z]/.test(d[i])) {
      command = d[i++];
      if (!(command.toUpperCase() in ARGUMENTS)) {
        fail(`unsupported command "${command}" (only M L H V C A Z)`);
      }
    } else if (command === null || command.toUpperCase() === "Z") {
      fail(`unexpected number at "${d.slice(i, i + 10)}"`);
    }
    const upper = command.toUpperCase();
    const relative = command !== upper;
    if (closed && upper !== "Z") {
      fail("a second subpath");
    }
    if (upper === "M") {
      if (++moves > 1) {
        fail("a second subpath");
      }
    }
    if (upper === "Z") {
      segments.push(["Z"]);
      [x, y] = [startX, startY];
      closed = true;
      skip();
      command = "Z";
      continue;
    }
    const [dx, dy] = relative ? [x, y] : [0, 0];
    if (upper === "H") {
      x = number() + dx;
      segments.push(["L", round(x), round(y)]);
    } else if (upper === "V") {
      y = number() + (relative ? y : 0);
      segments.push(["L", round(x), round(y)]);
    } else if (upper === "C") {
      const n = [number(), number(), number(), number(), number(), number()];
      const abs = n.map((v, k) => v + (k % 2 === 0 ? dx : dy));
      [x, y] = [abs[4], abs[5]];
      segments.push(["C", ...abs.map(round)]);
    } else if (upper === "A") {
      const [rx, ry, rotation] = [number(), number(), number()];
      const [large, sweep] = [flag(), flag()];
      x = number() + dx;
      y = number() + dy;
      segments.push(["A", round(rx), round(ry), round(rotation), large, sweep, round(x), round(y)]);
    } else {
      x = number() + dx;
      y = number() + dy;
      if (upper === "M") {
        [startX, startY] = [x, y];
        segments.push(["M", round(x), round(y)]);
        // Further pairs after a move are lines.
        command = relative ? "l" : "L";
      } else {
        segments.push(["L", round(x), round(y)]);
      }
    }
    skip();
  }
  if (segments[0]?.[0] !== "M") {
    fail("a path must start with M");
  }
  if (segments.at(-1)[0] !== "Z") {
    fail("a path must end with Z");
  }
  return segments;
};

const TRANSFORM_HELP =
  "set Inkscape's Preferences > Behavior > Transforms > Store transformation: Optimized, and move the path, not the layer";

// The `d` of `<path id="outline">`, refusing a transform on it or any group around it.
export const outlineOf = (svg, file) => {
  const stack = [];
  for (const [, closing, name, attributes, selfClosing] of svg
    .replace(/<!--[^]*?-->/g, "")
    .matchAll(/<(\/?)([\w:-]+)([^>]*?)(\/?)>/g)) {
    if (closing) {
      stack.pop();
      continue;
    }
    const isOutline = name === "path" && /\bid=["']outline["']/.test(attributes);
    if (isOutline) {
      if (stack.some((attrs) => /\btransform=/.test(attrs)) || /\btransform=/.test(attributes)) {
        throw new Error(`${file}: the outline has a transform; ${TRANSFORM_HELP}`);
      }
      const d = /\sd=(?:"([^"]*)"|'([^']*)')/.exec(attributes);
      if (!d) {
        throw new Error(`${file}: the outline has no d attribute`);
      }
      return d[1] ?? d[2];
    }
    if (!selfClosing) {
      stack.push(attributes);
    }
  }
  throw new Error(`${file}: no <path id="outline">`);
};

// Shield outlines, drawn whole rather than as an ordinary with a line.
const OUTLINES = ["heater"];

// Splits a drawing's name, e.g. "pile-engrailed", into its ordinary and line.
export const parseName = (name, where) => {
  const line = LINES.find((l) => name.endsWith(`-${l}`));
  const ordinary = line && name.slice(0, -line.length - 1);
  if (!ordinary || !ORDINARIES[ordinary] || ordinary === "chief") {
    throw new Error(
      `${where}: "${name}" isn't ordinary-line, e.g. pile-engrailed; the chief has no drawings`,
    );
  }
  return { ordinary, line };
};

const readDrawings = () => {
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".svg")) : [];
  const paths = {};
  for (const file of files.sort()) {
    const key = file.slice(0, -4);
    if (!OUTLINES.includes(key)) {
      parseName(key, `drawings/${file}`);
    }
    paths[key] = convertPath(
      outlineOf(readFileSync(join(dir, file), "utf8"), `drawings/${file}`),
      `drawings/${file}`,
    );
  }
  return paths;
};

export const pathsSource = (paths) => {
  const entries = Object.entries(paths).map(
    ([key, segments]) =>
      `  ${JSON.stringify(key)}: [\n${segments.map((s) => `    ${JSON.stringify(s)},`).join("\n")}\n  ],\n`,
  );
  return [
    "// Generated by `npm run drawings` from drawings/*.svg. Do not edit.",
    entries.length
      ? `export const PATHS = {\n${entries.join("")}};\n`
      : "export const PATHS = {};\n",
  ].join("\n");
};

const pngHeight = (file, width) => {
  if (!existsSync(file)) {
    return 120;
  }
  const bytes = readFileSync(file);
  return Math.round((bytes.readUInt32BE(20) * width) / bytes.readUInt32BE(16));
};

const draft = (name) => {
  const { ordinary, line } = parseName(name, "draft");
  const file = join(dir, `${name}.svg`);
  if (existsSync(file)) {
    throw new Error(`drawings/${name}.svg already exists; delete it to start again`);
  }
  const guide = ORDINARIES[ordinary]
    .map(([px, py], k) => `${k ? "L" : "M"} ${+px.toFixed(3)} ${+((py * 120) / 100).toFixed(3)}`)
    .join(" ");
  const figure = FIGURES[name];
  const image = figure && `fig${String(figure).padStart(3, "0")}.png`;
  const figureLayer = figure
    ? `  <g inkscape:groupmode="layer" inkscape:label="FD Fig. ${figure}" id="fd" sodipodi:insensitive="true">
    <image xlink:href="../reference/fox-davies/images/${image}" x="110" y="0" width="100" height="${pngHeight(join(root, "reference/fox-davies/images", image), 100)}" />
  </g>\n`
    : "";
  const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" viewBox="0 0 100 120" width="500" height="600">
${figureLayer}  <g inkscape:groupmode="layer" inkscape:label="guide" id="guide" sodipodi:insensitive="true">
    <path d="${guide} Z" fill="none" stroke="#888" stroke-width="0.3" />
  </g>
  <g inkscape:groupmode="layer" inkscape:label="outline" id="outline-layer">
    <path id="outline" d="${svgPath(draftOutline(ordinary, line))}" fill="#c33" fill-opacity="0.5" stroke="#000" stroke-width="0.3" />
  </g>
</svg>
`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, svg);
  console.log(`wrote drawings/${name}.svg`);
};

const main = async () => {
  const [first, name] = process.argv.slice(2);
  if (first === "draft") {
    draft(name ?? "");
    return;
  }
  const drawn = readDrawings();
  const source = pathsSource(drawn);
  if (first === "--check") {
    const current = existsSync(pathsFile) ? readFileSync(pathsFile, "utf8") : "";
    if (current !== source) {
      const { PATHS } = await import(`${pathToFileURL(pathsFile).href}?${Date.now()}`);
      const keys = [...new Set([...Object.keys(PATHS), ...Object.keys(drawn)])].filter(
        (key) => JSON.stringify(PATHS[key]) !== JSON.stringify(drawn[key]),
      );
      console.error(
        `✗ paths.js is out of date${keys.length ? `: ${keys.join(", ")}` : ""}; run npm run drawings`,
      );
      process.exit(1);
    }
    console.log("✓ paths.js is up to date");
    return;
  }
  writeFileSync(pathsFile, source);
  console.log(`wrote paths.js (${Object.keys(drawn).length} drawings)`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
}
