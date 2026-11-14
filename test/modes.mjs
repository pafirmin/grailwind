// Builds both entry points and checks which colours each one provides.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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
import {
  BORDURE_DEPTH,
  BORDURE_WIDTH,
  bordurePath,
  frameOutline,
  outlinePoints,
} from "../ordinaries.js";
import { PATHS } from "../paths.js";
import { build, root } from "./build.mjs";

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
  "heater",
  "inescutcheon",
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
  "pall-indented-or",
  "vair",
  "potent",
  "fur-5",
  "bordure-engrailed-or",
  "bordure-invected-or",
  "bordure-engrailed-of-the-first",
];

// The bordure's width and depth as the CSS writes them: an eighth is `calc(100cqw / 8)`.
const FRAME_BORDER = String.raw`calc\(100cqw \/ ${+(1 / BORDURE_WIDTH).toFixed(3)}\)`;
const CANTON_BORDER = String.raw`calc\(100cqw \/ ${+(3 / BORDURE_WIDTH).toFixed(3)}\)`;
const NARROWED = String.raw`0\.${String(+(1 - BORDURE_DEPTH).toFixed(3)).slice(2)}`;

// Rules without a plain `.class {` selector, checked by pattern.
const PATTERNS = {
  "engrailed shrinks the chevron's on charges": /\.chevron-engrailed-or \{[^}]*--on-size: 12%;/,
  "wavy leaves them": /\.chevron-wavy-or \{[^}]*--on-size: 15%;/,
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
    /\.quarterly \{[^]*?&:is\(\.heater, \.heater \*\) \{\s*grid-template-rows: 45fr 55fr;/,
  "grid per-fess splits at the fess point on a shield, in two parts only":
    /\.per-fess \{[^]*?&:is\(\.heater, \.heater \*\) \{\s*&:has\(> :last-child:nth-child\(2\)\) \{\s*grid-template-rows: 45fr 55fr;/,
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
  "an ordinary is isolated, but not on a frame's field":
    /\.bend-sable \{[^]*?&:not\(:is\(\.heater, \.inescutcheon\) > \*\) \{\s*isolation: isolate;/,
  "an ordinary paints over a quarter's own": /\.bend-sable \{[^]*?&::before \{[^}]*z-index: 1;/,
  "a counterchanged ordinary does too":
    /\.chevron-counterchanged \{[^]*?&::before \{[^}]*z-index: 1;/,
  "the chief goes over a frame's bordure ring": /\.chief-or \{[^]*?&::after \{[^}]*z-index: 3;/,
  "charges in chief go over the chief": /\.in-chief\.charges \{\s*z-index: 4;/,
  "a charge at a chief point raises its container over the chief":
    /\.charges:has\( > \.in-chief-point\) \{\s*z-index: 4;/,
  "a charge elsewhere doesn't": /^(?![^]*\.charges:has\( > \.in-base-point\))/,
  "a canton doesn't inherit its shield's layout":
    /\.inescutcheon, \.inescutcheon > \*, \.canton[,\s][^{]*\{[^}]*--field-top: initial;/,
  "a part of a divided shield doesn't inherit its shield's layout":
    /:is\(\.quarterly, \.per-pale, \.per-fess\) > \* \{[^}]*--field-top: initial;/,
  "a part is contained only on a shield, not in a page layout":
    /\.per-pale \{[^}]*&:is\(\.heater, \.heater \*\) > \* \{[^}]*contain: layout;/,
  "in-bend-sinister runs from sinister chief":
    /\.in-bend-sinister:has\( > :nth-child\(3\):last-child\) > :nth-child\(1\) \{\s*left: 78%;\s*top: 16%;/,
  "in-chief takes the chief's points":
    /\.in-chief:has\( > :nth-child\(3\):last-child\) > :nth-child\(2\) \{\s*left: 50%;\s*top: var\(--chief-points-y, 15%\);/,
  "the heater holds charges' fixed layers": /\.heater \{[^}]*contain: layout;/,
  "the heater's field starts the count of the first":
    /\.heater \{[^]*?& > \* \{[^}]*--the-first: var\(--field-first\);/,
  "an inescutcheon's field doesn't, as of the first is the shield's":
    /\.inescutcheon \{[^{}]*& > \* \{(?:(?!--the-first)[^}])*\}/,
  "the heater is a container, for its ring's cqw": new RegExp(
    String.raw`\.heater \{[^}]*container-type: inline-size;\s*--bordure-width: ${FRAME_BORDER};`,
  ),
  "so is an inescutcheon, so its ring is a third as wide": new RegExp(
    String.raw`\.inescutcheon \{[^}]*container-type: inline-size;\s*--bordure-width: ${FRAME_BORDER};`,
  ),
  "a frame clips to a polygon, then to its shape()":
    /\.heater \{\s*clip-path: polygon\(0 0, 100% 0, 100% 55%,[^;]*\);\s*clip-path: shape\(from 0 0, line to 100% 0, line to 100% 55%, curve to 50% 100% with[^;]*\);/,
  "an inescutcheon is a frame too":
    /\.inescutcheon \{\s*clip-path: polygon\([^;]*\);\s*clip-path: shape\(/,
  "a frame's outline is a 2px ring on top":
    /\.heater \{\s*clip-path:[^]*?&::before \{[^}]*z-index: 6;\s*background-color: var\(--color-sable\);\s*clip-path: polygon\(evenodd, [^;]*\);\s*clip-path: shape\(evenodd from 0 0, [^;]*, close, move to 2px 2px, line to calc\(100% - 2px\) 2px,/,
  "a frame's bordure ring sits under the chief, its width a var":
    /\.heater \{\s*clip-path:[^]*?&::after \{[^}]*z-index: 2;\s*clip-path: polygon\(evenodd, [^;]*\);\s*clip-path: shape\(evenodd from 0 0, [^;]*move to var\(--bordure-width\) var\(--bordure-width\),/,
  "a bordure is a border, so what's inside it lays out within it":
    /\.bordure-or \{\s*border-style: solid;\s*border-width: var\(--bordure-width, 0\.75rem\);\s*border-color: var\(--color-or\);/,
  "on a frame's field the border is transparent":
    /\.bordure-or \{[^}]*:is\(\.heater, \.inescutcheon\) > & \{\s*border-color: transparent;/,
  "and the frame's ring paints it":
    /\.bordure-or \{[^]*?:is\(\.heater, \.inescutcheon\):has\( ?> &\)::after \{\s*content: "";\s*background-color: var\(--color-or\);/,
  "a frame's ring of the first is the shield's first":
    /\.bordure-of-the-first \{[^]*?:is\(\.heater, \.inescutcheon\):has\( ?> &\)::after \{\s*content: "";\s*background-color: var\(--frame-first, transparent\);/,
  "a lined bordure's ring is a plain polygon, then a nonzero shape() with scallops in its inner edge":
    /\.bordure-engrailed-or \{[^]*?:has\( ?> &\)::after \{[^}]*background-color: var\(--color-or\);\s*clip-path: polygon\(evenodd, [^;]*\);\s*clip-path: shape\(nonzero from 0 0, [^;]*, close, move to [^;]*, curve to [^;]*, close\);/,
  "an engrailed bordure's field grows into the bites: the border and inset are narrower on a frame":
    new RegExp(
      String.raw`\.bordure-engrailed-or \{[^}]*border-width: var\(--bordure-width, 0\.75rem\);[^}]*:is\(\.heater, \.inescutcheon\) > & \{\s*border-color: transparent;\s*border-width: calc\(var\(--bordure-width\) \* ${NARROWED}\);\s*--bordure-inset: calc\(var\(--bordure-width\) \* ${NARROWED}\);`,
    ),
  "an invected bordure's isn't":
    /\.bordure-invected-or \{[^}]*:is\(\.heater, \.inescutcheon\) > & \{\s*border-color: transparent;\s*\}/,
  "off a frame the border keeps the full width":
    /\.bordure-engrailed-or \{\s*border-style: solid;\s*border-width: var\(--bordure-width, 0\.75rem\);\s*border-color: var\(--color-or\);\s*--bordure-inset: var\(--bordure-width, 0\.75rem\);/,
  "a lined ring of the first is the shield's first":
    /\.bordure-engrailed-of-the-first \{[^]*?:has\( ?> &\)::after \{[^}]*background-color: var\(--frame-first, transparent\);/,
  "a frame's first inherits, to reach its ::after":
    /@property --frame-first \{\s*syntax: "\*";\s*inherits: true;/,
  "a tincture sets its frame's first":
    /\.gules \{[^}]*\.heater:has\( ?> &\) \{\s*--frame-first: var\(--color-gules\);/,
  "an inescutcheon doesn't, so it inherits the shield's":
    /^(?![^]*\.inescutcheon[^{,]*:has\( ?> &\) \{\s*--frame-first)/,
  "a division sets its frame's first":
    /\.per-pale-or-gules \{[^}]*\.heater:has\( ?> &\) \{\s*--frame-first: var\(--color-or\);/,
  "a canton's bordure is a third of the shield's": new RegExp(
    String.raw`\.canton \{[^}]*--bordure-width: ${CANTON_BORDER};`,
  ),
  "no .escutcheon selector is left": /^(?![^]*\.escutcheon\b)/,
  "each quarter starts its own":
    /\.quarterly \{[^}]*& > \* \{\s*--the-first: var\(--field-first\);/,
  "a field's bordure width doesn't inherit":
    /@property --bordure-inset \{\s*syntax: "<length>";\s*inherits: false;\s*initial-value: 0px;/,
  "a bordure as a border publishes its width":
    /\.bordure-of-the-first \{[^}]*--bordure-inset: var\(--bordure-width, 0\.75rem\);/,
  "a frame's field passes its bordure width down":
    /\.heater \{[^]*?& > \* \{[^}]*--outer-inset: var\(--bordure-inset\);/,
  "a counterchanged charge's layer steps in by the field's bordure":
    /\.heater \{[^]*?& > \* \{[^}]*--layer-inset: var\(--bordure-inset\);/,
  "but not in a canton or a part of a divided shield, which hold their own layers":
    /\.canton \{[^}]*--layer-inset: 0px;[^]*\.per-pale \{[^}]*&:is\(\.heater, \.heater \*\) > \* \{[^}]*--layer-inset: 0px;|\.per-pale \{[^}]*&:is\(\.heater, \.heater \*\) > \* \{[^}]*--layer-inset: 0px;[^]*\.canton \{[^}]*--layer-inset: 0px;/,
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
    /\.charges > \.counterchanged \{[^]*?&::before \{[^}]*position: fixed;\s*inset: var\(--layer-inset, 0px\);[^}]*background-image: var\(--on-counterchange-image, var\(--counterchange-image\)\);/,
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
    /\.quarterly-azure-ermine \{[^}]*background-size: 100% 45%, 100% calc\(100% - 45%\), calc\(100% \/ var\(--fur-across, 6\)\) auto, 100% 100%;/,
  "a fur division counterchanges":
    /\.per-pale-ermine-gules \{[^}]*--counterchange-image: linear-gradient\(to right, var\(--color-gules\) 50%, transparent 50%\), url\("data:/,
  "a fur ordinary paints the fur":
    /\.fess-ermine \{[^]*?&::before \{[^}]*background-color: var\(--color-argent\);[^}]*background-image: url\("data:[^"]*%23141414[^}]*clip-path: polygon\(0 30%, 100% 30%, 100% 60%, 0 60%\);/,
  // [^{]* keeps the match inside .fess-ermine's own block.
  "a fur ordinary isn't fimbriated": /\.fess-ermine \{[^{]*&::before \{(?:(?!fimbriat)[^}])*\}/,
  "fur-<n> sets the tiles across": /\.fur-5 \{\s*--fur-across: 5;\s*\}/,
  "ermine's offset follows the tiles across":
    /\.ermine \{[^}]*background-size: calc\(100% \/ var\(--fur-across, 6\)\) auto;\s*background-position: calc\(-100% \/ \(4 \* \(var\(--fur-across, 6\) - 1\)\)\) calc\(-100% \/ \(4 \* \(var\(--fur-across, 6\) - 1\)\)\);/,
  "vair is 4 across from the top left, its argent panes on an azure ground":
    /\.vair \{[^}]*background-color: var\(--color-azure\);[^}]*background-image: url\("data:image\/svg\+xml,[^"]*%23[^"]*"\);\s*background-size: calc\(100% \/ var\(--fur-across, 4\)\) auto;\s*background-position: 0 0;/,
  "potent is 3 across":
    /\.potent \{[^}]*background-size: calc\(100% \/ var\(--fur-across, 3\)\) auto;/,
  "an engrailed fur ordinary falls back to a polygon":
    /\.cross-engrailed-erminois \{[^]*?&::before \{[^}]*clip-path: polygon\([^;]*\);\s*clip-path: shape\(/,
};

const EXPECTED = {
  // A cornered ordinary takes indented, drawn by hand (064).
  "grailwind.css": {
    "bg-blue-500": true,
    "per-pale-ermine-ermines": false,
    "pall-indented-or": true,
  },
  "strict.css": {
    "bg-blue-500": false,
    "per-pale-ermine-ermines": false,
    "pall-indented-or": true,
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
  `<div class="${[...CLASSES, ...DATA_CLASSES].join(" ")} bend-or on between counterchanged in-bend-sinister inescutcheon canton quarterly per-pale per-fess bordure-or"></div>`,
);

let checks = 0;
let failures = 0;
let buildFailed = false;

try {
  for (const [entry, overrides] of Object.entries(EXPECTED)) {
    const css = await build({ dir, entry });
    checks += CLASSES.length + DATA_CLASSES.length + Object.keys(PATTERNS).length;
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
  }

  // Fur spots are baked in at build time, so a re-themed tincture must reach them.
  const themed = await build({ dir, css: "@theme { --color-sable: #00ff00; }\n" });
  const furChecks = {
    "a re-themed sable reaches ermine's spots": /\.ermine \{[^}]*%2300ff00/.test(themed),
    "and a fur division's": /\.per-pale-ermine-gules \{[^}]*%2300ff00/.test(themed),
  };
  // Tailwind only emits the theme variables that generated CSS uses.
  writeFileSync(
    join(dir, "erminois.html"),
    `<div class="heater"><div class="erminois"></div></div>`,
  );
  furChecks["a fur alone still defines its ground's colour"] = /--color-or: #f5c518;/.test(
    await build({ dir, source: "erminois.html" }),
  );
  checks += Object.keys(furChecks).length;
  for (const [name, ok] of Object.entries(furChecks)) {
    if (!ok) {
      failures++;
      console.error(`✗ furs: ${name}`);
    }
  }
  // A lined bordure's inner edge, in real units, at its one geometry: BORDURE_WIDTH of a 5:6
  // frame. Its scallop counts are pinned so a placement bug can't move the render probes along
  // with it: update them when tuning BORDURE_WIDTH, BORDURE_SCALLOP or CORNER_LOBE.
  const PINS = {
    engrailed: { sweep: 1, top: 5, side: 8, lobes: 2 },
    invected: { sweep: -1, top: 6, side: 9, lobes: 0 },
  };
  const inset = BORDURE_WIDTH * 100;
  const innerEdge = outlinePoints(PATHS.heater, 256).map(([x, y]) => [
    inset + (x * (100 - 2 * inset)) / 100,
    inset + (y * (120 - 2 * inset)) / 120,
  ]);
  const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6;
  /**
   * How far a point is outside a polygon.
   * @param {number[][]} polygon Its points.
   * @param {number[]} point [x, y].
   * @returns {number} 0 inside it, else the distance to its nearest edge.
   */
  const outside = (polygon, [x, y]) => {
    let inside = false;
    let nearest = Infinity;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [a, b] = [polygon[j], polygon[i]];
      if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) {
        inside = !inside;
      }
      const length = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
      const t = Math.max(
        0,
        Math.min(1, ((x - a[0]) * (b[0] - a[0]) + (y - a[1]) * (b[1] - a[1])) / length),
      );
      nearest = Math.min(
        nearest,
        Math.hypot(x - a[0] - t * (b[0] - a[0]), y - a[1] - t * (b[1] - a[1])),
      );
    }
    return inside ? 0 : nearest;
  };
  /**
   * @param {{ from: number[], c1: number[], c2: number[], to: number[] }} piece A cubic.
   * @param {number} t From 0 to 1.
   * @returns {number[]} Its point at t.
   */
  const bezier = ({ from, c1, c2, to }, t) => {
    const weights = [(1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2, t ** 3];
    return [0, 1].map((axis) =>
      [from, c1, c2, to].reduce((sum, point, i) => sum + weights[i] * point[axis], 0),
    );
  };
  for (const [line, { sweep, top, side, lobes }] of Object.entries(PINS)) {
    const pieces = bordurePath(PATHS.heater, sweep);
    const scallops = pieces.filter(({ kind }) => kind === "scallop");
    const onTopEdge = ([, y]) => Math.abs(y - inset) < 1e-6;
    const onTop = scallops.filter(({ from, to }) => onTopEdge(from) && onTopEdge(to));
    const points = pieces.flatMap(({ from, c1, c2 }) => [from, c1, c2]);
    // An engrailed field reaches the scallops' depth past the chord line and no further; an
    // invected one only to the chord line. Give or take 0.05 (0.15px at 300px), for sampling.
    const reach = Math.max(
      ...pieces.flatMap((piece) =>
        Array.from({ length: 41 }, (_, i) => outside(innerEdge, bezier(piece, i / 40))),
      ),
    );
    // Neighbouring chords: each turns less than a right angle from the last, and they're within
    // 15% of each other's length.
    const chord = ({ from, to }) => [to[0] - from[0], to[1] - from[1]];
    const even = scallops.every((piece, i) => {
      const previous = scallops[i - 1];
      if (!previous || !near(previous.to, piece.from)) {
        return true;
      }
      const [a, b] = [chord(previous), chord(piece)];
      const [lengthA, lengthB] = [Math.hypot(...a), Math.hypot(...b)];
      return (
        a[0] * b[0] + a[1] * b[1] >= -1e-9 &&
        Math.abs(lengthA - lengthB) / Math.max(lengthA, lengthB) <= 0.15
      );
    });
    const [, shape] = frameOutline(PATHS.heater).lined("10px", sweep);
    const inner = shape.slice(shape.indexOf("move to ") + "move to ".length).split(", ");
    const results = {
      [`${top} scallops along the top`]: onTop.length === top,
      [`${side} down each side`]: scallops.length - onTop.length === 2 * side,
      [`${lobes} lobes`]: pieces.length - scallops.length === 2 * lobes,
      closed: pieces.every((piece, i) => near(piece.from, pieces.at(i - 1).to)),
      "mirror-symmetric": points.every(([x, y]) =>
        points.some((other) => near([100 - x, y], other)),
      ),
      "reaches no further out than its field":
        reach <= (sweep > 0 ? BORDURE_DEPTH * inset : 0) + 0.05,
      "chords run forward and are even": even,
      "top scallops bulge the right way": onTop.every(
        ({ from, c1 }) => Math.sign(from[1] - c1[1]) === sweep,
      ),
      "its shape() starts where it moves to, with a curve per piece":
        inner[0] === inner.at(-2).split(" with ")[0].replace("curve to ", "") &&
        inner.length - 2 === pieces.length &&
        !shape.includes("NaN"),
    };
    checks += Object.keys(results).length;
    for (const [name, ok] of Object.entries(results)) {
      if (!ok) {
        failures++;
        console.error(`✗ ${line} bordure: ${name}`);
      }
    }
  }
} catch (error) {
  if (!error.buildFailed) {
    throw error;
  }
  console.error(error.message);
  buildFailed = true;
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// npm prints nothing when a script fails, so the last line must say.
if (!buildFailed) {
  if (failures) {
    console.error(`✗ ${failures} of ${checks} checks failed`);
  } else {
    console.log(`✓ all ${checks} checks passed`);
  }
}
process.exit(failures || buildFailed ? 1 : 0);
