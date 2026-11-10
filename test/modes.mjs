// Builds both entry points and checks which colours each one provides.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ARRANGEMENTS,
  CHARGES,
  DIVISIONS,
  FURS,
  LINES,
  lineOrdinaries,
  OF_THE_FIRST,
  ORDINARIES,
  POINTS,
  ROUNDELS,
  TINCTURES,
  VOIDABLE,
} from "../data.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "node_modules/.bin/tailwindcss");
// Inside the project, so the build can resolve tailwindcss.
const dir = mkdtempSync(join(root, "test", ".tmp-"));

const CLASSES = [
  "bg-blue-500",
  "bg-azure",
  "azure",
  "fess-or",
  "per-pale-or-gules",
  "mullet",
  "in-dexter-chief",
  "charge-size-20",
  "cross-azure",
  "bend-sable",
  "chief-or",
  "fimbriated-argent",
  "chevron-counterchanged",
  "chief-counterchanged",
  "quarterly-or-gules",
  "escutcheon",
  "charges",
  "fess-engrailed-or",
  "chief-invected-azure",
  "chevron-engrailed-or",
  "ermine",
  "ermines",
  "erminois",
  "pean",
  "per-pale-ermine-gules",
  "quarterly-azure-ermine",
  "per-pale-ermine-ermines",
  "fess-ermine",
  "chief-pean",
  "cross-engrailed-erminois",
  "fess-wavy-or",
  "chevron-indented-or",
];

// Rules without a plain `.class {` selector, checked by pattern.
const PATTERNS = {
  "bend-or publishes on points": /\.bend-or \{[^}]*--on-3-2-x: 50%;/,
  "on reads them, with a fallback":
    /\.on:has\( > :nth-child\(3\):last-child\) > :nth-child\(1\) \{\s*left: var\(--on-3-1-x, 28%\);/,
  "five on an ordinary fall back to the default":
    /\.on:has\( > :nth-child\(5\):last-child\) > :nth-child\(1\) \{\s*left: var\(--on-5-1-x, 27%\);/,
  "five charges default to 2, 1, 2":
    /\.charges \{[^]*?&:where\(:has\( > :nth-child\(5\):last-child\)\) > :where\(:nth-child\(3\)\) \{\s*left: 50%;\s*top: 42%;/,
  "fess-or publishes between points by count": /\.fess-or \{[^}]*--between-2-1-x: 50%;/,
  "fess-or publishes a size for six between": /\.fess-or \{[^}]*--between-6-size: 14%;/,
  "two between read their count, then fall back by index":
    /\.between:has\( > :nth-child\(2\):last-child\) > :nth-child\(1\) \{\s*left: var\(--between-2-1-x, var\(--between-1-x\)\);/,
  "six between take their count's size":
    /\.between:has\( > :nth-child\(6\):last-child\) > :nth-child\(6\) \{[^}]*--charge-width: var\(--charge-size, var\(--between-6-size, var\(--between-size\)\)\);/,
  "fimbriated-argent sets the fimbriation":
    /\.fimbriated-argent \{\s*--fimbriated: 1;\s*--fimbriation: var\(--color-argent\);/,
  "fimbriation vars don't inherit":
    /@property --fimbriated \{\s*syntax: "\*";\s*inherits: false;[^]*@property --fimbriation \{\s*syntax: "\*";\s*inherits: false;/,
  "an ordinary opts in to fimbriation":
    /\.cross-azure \{[^]*?&::before \{[^}]*--fimbriated: inherit;\s*--fimbriation: inherit;\s*background-color: var\(--fimbriation, var\(--color-azure\)\);/,
  "a fimbriated ordinary is widened":
    /\.cross-azure \{[^]*?&::before \{[^}]*clip-path: polygon\(calc\(38% - 3% \* var\(--fimbriated, 0\)\) 0,/,
  "a division publishes its swap":
    /\.per-pale-or-gules \{[^}]*--counterchange-image: linear-gradient\(to right, var\(--color-gules\) 50%, var\(--color-or\) 50%\);/,
  "quarterly splits at the fess point":
    /\.quarterly-or-gules \{[^}]*background-size: 100% 45%, 100% 100%;/,
  "per saltire's strips fill the seam, not a background colour":
    /\.per-saltire-or-gules \{(?![^}]*background-color)[^}]*background-size: 50% 45%, 50% 45%, 50% 45%, 50% 45%, 100% calc\(10% \+ 2px\), 2px 100%, 100% 2px;/,
  "per saltire's seam strips cross at the fess point":
    /\.per-saltire-or-gules \{[^}]*background-position: [^;]*, [^,;]+ 45%;/,
  "grid quarterly stays equal off a shield":
    /\.quarterly \{\s*display: grid;[^}]*grid-template-rows: 1fr 1fr;/,
  "grid quarterly splits at the fess point on a shield":
    /\.quarterly \{[^]*?&:is\(\.escutcheon, \.escutcheon \*\) \{\s*grid-template-rows: 45fr 55fr;/,
  "grid per-fess splits at the fess point on a shield, in two parts only":
    /\.per-fess \{[^]*?&:is\(\.escutcheon, \.escutcheon \*\) \{\s*&:has\(> :last-child:nth-child\(2\)\) \{\s*grid-template-rows: 45fr 55fr;/,
  "counterchange vars don't inherit":
    /@property --counterchange-image \{\s*syntax: "\*";\s*inherits: false;/,
  "a counterchanged ordinary pulls them from its shield":
    /\.chevron-counterchanged \{[^]*?&::before \{[^}]*--counterchange-image: inherit;/,
  "a counterchanged ordinary paints it":
    /\.chevron-counterchanged \{[^]*?&::before \{[^}]*background-image: var\(--counterchange-image, none\);/,
  "a counterchanged ordinary sits below a chief":
    /\.chevron-counterchanged \{[^]*?clip-path: polygon\(50% calc\(22% \+ var\(--field-top, 0%\) \* 0\.78\),/,
  "a counterchanged ordinary isn't fimbriated":
    /\.chevron-counterchanged \{[^]*?&::before \{(?:(?!fimbriat)[^}])*\}/,
  "an ordinary is isolated": /\.bend-sable \{[^}]*isolation: isolate;/,
  "an ordinary paints over a quarter's own": /\.bend-sable \{[^]*?&::before \{[^}]*z-index: 1;/,
  "a counterchanged ordinary does too":
    /\.chevron-counterchanged \{[^]*?&::before \{[^}]*z-index: 1;/,
  "the chief stays under charges on it": /\.chief-or \{[^]*?&::after \{(?:(?!z-index)[^}])*\}/,
  "a canton doesn't inherit its shield's layout":
    /\.inescutcheon, \.canton[,\s][^{]*\{[^}]*--field-top: initial;/,
  "a part of a divided shield doesn't inherit its shield's layout":
    /:is\(\.quarterly, \.per-pale, \.per-fess\) > \* \{[^}]*--field-top: initial;/,
  "a part is contained only on a shield, not in a page layout":
    /\.per-pale \{[^}]*&:is\(\.escutcheon, \.escutcheon \*\) > \* \{[^}]*contain: layout;/,
  "in-bend-sinister runs from sinister chief":
    /\.in-bend-sinister:has\( > :nth-child\(3\):last-child\) > :nth-child\(1\) \{\s*left: 78%;\s*top: 16%;/,
  "in-chief takes the chief's points":
    /\.in-chief:has\( > :nth-child\(3\):last-child\) > :nth-child\(2\) \{\s*left: 50%;\s*top: var\(--chief-points-y, 15%\);/,
  "the escutcheon holds charges' fixed layers": /\.escutcheon \{[^}]*contain: layout;/,
  "the escutcheon starts the count of the first":
    /\.escutcheon \{[^}]*--the-first: var\(--field-first\);/,
  "each quarter starts its own":
    /\.quarterly \{[^}]*& > \* \{\s*--the-first: var\(--field-first\);/,
  "a field's bordure width doesn't inherit":
    /@property --bordure-inset \{\s*syntax: "<length>";\s*inherits: false;\s*initial-value: 0px;/,
  "a bordure publishes its width":
    /\.bordure-of-the-first \{[^}]*--bordure-inset: var\(--bordure-width, 0\.75rem\);/,
  "the escutcheon passes its bordure width down":
    /\.escutcheon \{[^}]*--outer-inset: var\(--bordure-inset\);/,
  "a quarter has no bordure to surmount": /\.quarterly \{[^}]*& > \* \{[^}]*--outer-inset: 0px;/,
  "the chief pulls its own element's bordure width":
    /\.chief-or \{[^]*?&::after \{[^}]*--bordure-inset: inherit;[^}]*clip-path: polygon\(calc\(-1 \* var\(--bordure-inset\)\)[^;]*\) content-box;/,
  "a field's first doesn't inherit":
    /@property --field-first \{\s*syntax: "\*";\s*inherits: false;/,
  "a bare tincture is a field's first": /\.gules \{[^}]*--field-first: var\(--color-gules\);/,
  "a division's first is its first tincture":
    /\.per-pale-or-gules \{[^}]*--field-first: var\(--color-or\);/,
  "of the first doesn't set a field's first": /\.of-the-first \{(?:(?!--field-first)[^}])*\}/,
  "a bend of the first":
    /\.bend-of-the-first \{[^]*?&::before \{[^}]*background-color: var\(--fimbriation, var\(--the-first, transparent\)\);/,
  "charges are centred with margins, not translate":
    /\.charges \{[^]*?& > \* \{(?:(?!translate)[^}])*margin: calc\(var\(--charge-width\) \/ -2\) 0 0 calc\(var\(--charge-width\) \/ -2\);/,
  "charges pass the swap down": /\.charges \{[^}]*--counterchange-image: inherit;/,
  "a counterchanged charge has a fixed layer":
    /\.charges > \.counterchanged \{[^]*?&::before \{[^}]*position: fixed;[^}]*background-image: var\(--counterchange-image\);/,
  "counterchanged on the container applies to each charge":
    /\.counterchanged\.charges > \* \{[^]*?&::before \{[^}]*position: fixed;/,
  "the chief isn't fimbriated": /\.chief-or \{[^]*?&::after \{(?:(?!fimbriat)[^}])*\}/,
  "fess-engrailed-or falls back to a polygon":
    /\.fess-engrailed-or \{[^}]*&::before \{[^}]*clip-path: polygon\([^;]*\);\s*clip-path: shape\(from 0 30%, arc to [^;]* ccw/,
  "fess-embattled-or falls back to a polygon":
    /\.fess-embattled-or \{[^}]*&::before \{[^}]*clip-path: polygon\([^;]*\);\s*clip-path: shape\(/,
  "fess-wavy-or falls back to a polygon":
    /\.fess-wavy-or \{[^}]*&::before \{[^}]*clip-path: polygon\([^;]*\);\s*clip-path: shape\(/,
  "chief-invected-azure bulges out":
    /\.chief-invected-azure \{[^}]*&::after \{[^}]*clip-path: polygon\([^;]*\) content-box;\s*clip-path: shape\([^;]*line to 100% 30%, arc to [^;]* cw,[^;]*\) content-box;/,
  "chevron-engrailed-or peaks where its arcs cross":
    /\.chevron-engrailed-or \{[^}]*&::before \{[^}]*clip-path: shape\(from 50% (?!22%)[\d.]+%,/,
  "ermine has an argent ground and sable spots":
    /\.ermine \{[^}]*background-color: var\(--color-argent\);[^}]*background-image: url\("data:image\/svg\+xml,[^"]*%23141414/,
  "pean has or spots":
    /\.pean \{[^}]*background-color: var\(--color-sable\);[^}]*background-image: url\("data:image\/svg\+xml,[^"]*%23f5c518/,
  "a fur on a charge is two tiles across, centred":
    /\.ermine \{[^]*?\.charges > & \{\s*background-size: 50% auto;\s*background-position: center;/,
  "a fur division leaves the fur's half transparent":
    /\.per-pale-ermine-gules \{[^}]*background-image: linear-gradient\(to right, transparent 50%, var\(--color-gules\) 50%\), url\("data:/,
  "fur quarterly doesn't overlap":
    /\.quarterly-azure-ermine \{[^}]*background-size: 100% 45%, 100% calc\(100% - 45%\), calc\(100% \/ 6\) auto, 100% 100%;/,
  "a fur division counterchanges":
    /\.per-pale-ermine-gules \{[^}]*--counterchange-image: linear-gradient\(to right, var\(--color-gules\) 50%, transparent 50%\), url\("data:/,
  "a fur ordinary paints the fur":
    /\.fess-ermine \{[^]*?&::before \{[^}]*background-color: var\(--color-argent\);[^}]*background-image: url\("data:[^"]*%23141414[^}]*clip-path: polygon\(0 30%, 100% 30%, 100% 60%, 0 60%\);/,
  // [^{]* keeps the match inside .fess-ermine's own block.
  "a fur ordinary isn't fimbriated": /\.fess-ermine \{[^{]*&::before \{(?:(?!fimbriat)[^}])*\}/,
  "an engrailed fur ordinary falls back to a polygon":
    /\.cross-engrailed-erminois \{[^]*?&::before \{[^}]*clip-path: polygon\([^;]*\);\s*clip-path: shape\(/,
};

const EXPECTED = {
  // Indented waits for the cornered ordinaries' artwork (064).
  "grailwind.css": {
    "bg-blue-500": true,
    "per-pale-ermine-ermines": false,
    "chevron-indented-or": false,
  },
  "strict.css": {
    "bg-blue-500": false,
    "per-pale-ermine-ermines": false,
    "chevron-indented-or": false,
  },
};

// Every class named in data.js must be generated, so tooling can't drift from the CSS.
const DATA_CLASSES = [
  ...TINCTURES,
  ...DIVISIONS.map((d) => `${d}-or-gules`),
  ...ORDINARIES.map((o) => `${o}-or`),
  ...CHARGES,
  ...Object.keys(ROUNDELS),
  ...ARRANGEMENTS,
  // Names the ESLint plugin builds from these lists.
  ...ORDINARIES.map((o) => `${o}-counterchanged`),
  ...TINCTURES.map((t) => `fimbriated-${t}`),
  "counterchanged",
  ...Object.keys(FURS),
  ...Object.keys(FURS).map((f) => `fess-${f}`),
  ...Object.keys(FURS).map((f) => `per-pale-${f}-gules`),
  ...LINES.flatMap((l) => lineOrdinaries(l).map((o) => `${o}-${l}-or`)),
  ...Object.keys(POINTS).map((p) => `in-${p}`),
  OF_THE_FIRST,
  ...ORDINARIES.map((o) => `${o}-${OF_THE_FIRST}`),
  ...LINES.flatMap((l) => lineOrdinaries(l).map((o) => `${o}-${l}-${OF_THE_FIRST}`)),
  `fimbriated-${OF_THE_FIRST}`,
  `bordure-${OF_THE_FIRST}`,
  ...VOIDABLE.map((o) => `${o}-voided-or`),
  "saltire-voided-ermine",
  `cross-voided-${OF_THE_FIRST}`,
  ...VOIDABLE.map((o) => `${o}-voided-counterchanged`),
];

writeFileSync(
  join(dir, "index.html"),
  `<div class="${[...CLASSES, ...DATA_CLASSES].join(" ")} bend-or on between counterchanged in-bend-sinister inescutcheon canton quarterly per-pale per-fess"></div>`,
);

const build = (entry, { css = "", source = "index.html" } = {}) => {
  const input = join(dir, "input.css");
  const output = join(dir, "output.css");
  writeFileSync(
    input,
    `@import "tailwindcss" source(none);\n@source "./${source}";\n@import "${join(root, entry)}";\n${css}`,
  );
  execFileSync(cli, ["-i", input, "-o", output], { stdio: "pipe" });
  return readFileSync(output, "utf8");
};

let failures = 0;

try {
  for (const [entry, overrides] of Object.entries(EXPECTED)) {
    const css = build(entry);
    const before = failures;
    for (const cls of CLASSES) {
      const expected = overrides[cls] ?? true;
      const actual = css.includes(`.${cls} {`);
      if (actual !== expected) {
        failures++;
        console.error(`✗ ${entry}: .${cls} should ${expected ? "" : "not "}exist`);
      }
    }
    for (const cls of DATA_CLASSES) {
      if (!new RegExp(`\\.${cls}[ :{.]`).test(css)) {
        failures++;
        console.error(`✗ ${entry}: data.js names .${cls}, which isn't generated`);
      }
    }
    for (const [name, pattern] of Object.entries(PATTERNS)) {
      if (!pattern.test(css)) {
        failures++;
        console.error(`✗ ${entry}: ${name}`);
      }
    }
    console.log(`${failures > before ? "✗" : "✓"} ${entry}`);
  }

  // Fur spots are baked in at build time, so a re-themed tincture must reach them.
  const themed = build("grailwind.css", { css: "@theme { --color-sable: #00ff00; }\n" });
  const furChecks = {
    "a re-themed sable reaches ermine's spots": /\.ermine \{[^}]*%2300ff00/.test(themed),
    "and a fur division's": /\.per-pale-ermine-gules \{[^}]*%2300ff00/.test(themed),
  };
  // Tailwind only emits the theme variables that generated CSS uses.
  writeFileSync(join(dir, "erminois.html"), `<div class="escutcheon erminois"></div>`);
  furChecks["a fur alone still defines its ground's colour"] = /--color-or: #f5c518;/.test(
    build("grailwind.css", { source: "erminois.html" }),
  );
  for (const [name, ok] of Object.entries(furChecks)) {
    if (!ok) {
      failures++;
      console.error(`✗ furs: ${name}`);
    }
  }
  console.log(`${Object.values(furChecks).every(Boolean) ? "✓" : "✗"} furs and the theme`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

process.exit(failures ? 1 : 0);
