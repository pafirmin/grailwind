// Builds both entry points and checks which colours each one provides.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "node_modules/.bin/tailwindcss");
// Inside the project, so the build can resolve tailwindcss.
const dir = mkdtempSync(join(root, "test", ".tmp-"));

const CLASSES = ["bg-blue-500", "bg-azure", "azure", "fess-or", "per-pale-or-gules", "mullet", "in-dexter-chief", "charge-size-20", "cross-azure", "chief-or", "fimbriated-argent", "chevron-counterchanged", "chief-counterchanged", "quarterly-or-gules"];

// Rules without a plain `.class {` selector, checked by pattern.
const PATTERNS = {
  "bend-or publishes on points": /\.bend-or \{[^}]*--on-3-2-x: 50%;/,
  "on reads them, with a fallback": /\.on:has\( > :nth-child\(3\):last-child\) > :nth-child\(1\) \{\s*left: var\(--on-3-1-x, 28%\);/,
  "fimbriated-argent sets the fimbriation": /\.fimbriated-argent \{\s*--fimbriated: 1;\s*--fimbriation: var\(--color-argent\);/,
  "fimbriation vars don't inherit": /@property --fimbriated \{\s*syntax: "\*";\s*inherits: false;[^]*@property --fimbriation \{\s*syntax: "\*";\s*inherits: false;/,
  "an ordinary opts in to fimbriation": /\.cross-azure \{[^]*?&::before \{[^}]*--fimbriated: inherit;\s*--fimbriation: inherit;\s*background-color: var\(--fimbriation, var\(--color-azure\)\);/,
  "a fimbriated ordinary is widened": /\.cross-azure \{[^]*?&::before \{[^}]*clip-path: polygon\(calc\(40% - 3% \* var\(--fimbriated, 0\)\) 0,/,
  "a division publishes its swap": /\.per-pale-or-gules \{[^}]*--counterchange-image: linear-gradient\(to right, var\(--color-gules\) 50%, var\(--color-or\) 50%\);/,
  "quarterly splits at the fess point": /\.quarterly-or-gules \{[^}]*background-size: 100% 45%, 100% 100%;/,
  "counterchange vars don't inherit": /@property --counterchange-image \{\s*syntax: "\*";\s*inherits: false;/,
  "a counterchanged ordinary pulls them from its shield": /\.chevron-counterchanged \{[^]*?&::before \{[^}]*--counterchange-image: inherit;/,
  "a counterchanged ordinary paints it": /\.chevron-counterchanged \{[^]*?&::before \{[^}]*background-image: var\(--counterchange-image, none\);/,
  "a counterchanged ordinary sits below a chief": /\.chevron-counterchanged \{[^]*?clip-path: polygon\(50% calc\(25% \+ var\(--field-top, 0%\) \* 0\.75\),/,
  "a counterchanged ordinary isn't fimbriated": /\.chevron-counterchanged \{[^]*?&::before \{(?:(?!fimbriat)[^}])*\}/,
  "the chief isn't fimbriated": /\.chief-or \{[^]*?&::after \{(?:(?!fimbriat)[^}])*\}/,
};

const EXPECTED = {
  "grailwind.css": { "bg-blue-500": true },
  "strict.css": { "bg-blue-500": false },
};

writeFileSync(join(dir, "index.html"), `<div class="${CLASSES.join(" ")} bend-or on"></div>`);

const build = (entry) => {
  const input = join(dir, "input.css");
  const output = join(dir, "output.css");
  writeFileSync(
    input,
    `@import "tailwindcss" source(none);\n@source "./index.html";\n@import "${join(root, entry)}";\n`,
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
    for (const [name, pattern] of Object.entries(PATTERNS)) {
      if (!pattern.test(css)) {
        failures++;
        console.error(`✗ ${entry}: ${name}`);
      }
    }
    console.log(`${failures > before ? "✗" : "✓"} ${entry}`);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

process.exit(failures ? 1 : 0);
