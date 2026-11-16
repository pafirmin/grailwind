// Checks the drawings tooling: the SVG converter, and that a generated outline survives the trip
// through an SVG path to a CSS shape().
import { convertPath, outlineOf, parseName } from "../drawings/build.mjs";
import { lineOrdinaries } from "../data.js";
import { PATHS } from "../paths.js";
import {
  draftOutline,
  DRAWN,
  flipPath,
  frameOutline,
  generatedShape,
  pathShape,
  svgPath,
} from "../ordinaries.js";

let checks = 0;
let failures = 0;
const check = (name, ok, detail = "") => {
  checks++;
  if (!ok) {
    failures++;
    console.error(`✗ ${name}${detail ? `\n${detail}` : ""}`);
  }
};

const throws = (run, mention) => {
  try {
    run();
  } catch (error) {
    return error.message.includes(mention);
  }
  return false;
};

const NUMBER = /-?\d+\.?\d*/g;

// Equal but for the numbers, which may differ by `tolerance` (the converter rounds to 0.01 units).
const sameShape = (a, b, tolerance = 0.02) => {
  const [numbersA, numbersB] = [a, b].map((text) => text.match(NUMBER).map(Number));
  return (
    a.replace(NUMBER, "#") === b.replace(NUMBER, "#") &&
    numbersA.every((n, i) => Math.abs(n - numbersB[i]) <= tolerance)
  );
};

const drawnShape = (ordinary, line) =>
  pathShape(convertPath(svgPath(draftOutline(ordinary, line))));

for (const [ordinary, line] of [
  ["chevron", "engrailed"],
  ["cross", "invected"],
  ["pall", "wavy"],
  ["pile", "engrailed"],
]) {
  const expected = generatedShape(ordinary, line);
  const actual = drawnShape(ordinary, line);
  check(
    `${ordinary}-${line} round-trips through an SVG path`,
    sameShape(actual, expected),
    `  expected ${expected}\n  actual   ${actual}`,
  );
}

{
  const expected = generatedShape("pile-reversed", "engrailed");
  const actual = pathShape(flipPath(convertPath(svgPath(draftOutline("pile", "engrailed")))));
  check(
    "pile-engrailed flipped matches the generated pile-reversed-engrailed",
    sameShape(actual, expected),
    `  expected ${expected}\n  actual   ${actual}`,
  );
}

{
  const drawn = [
    ["M", 10, 24],
    ["C", 20, 30, 40, 36, 50, 48],
    ["A", 5, 6, 30, 1, 1, 60, 60],
    ["Z"],
  ];
  check(
    "pathShape formats a cubic and a rotated large arc",
    pathShape(drawn) ===
      "shape(from 10% 20%, curve to 50% 40% with 20% 25% / 40% 30%, arc to 60% 50% of 5% 5% cw large rotate 30deg, close)",
    `  ${pathShape(drawn)}`,
  );
  const flipped = flipPath(drawn);
  check(
    "flipPath flips a cubic's control points and negates the arc's rotation",
    JSON.stringify(flipped) ===
      JSON.stringify([
        ["M", 10, 96],
        ["C", 20, 90, 40, 84, 50, 72],
        ["A", 5, 6, -30, 1, 0, 60, 60],
        ["Z"],
      ]),
    `  ${JSON.stringify(flipped)}`,
  );
}

for (const name of ["pile-engrailled", "cros-wavy", "chief-wavy", "wavy"]) {
  check(
    `parseName rejects ${name}`,
    throws(() => parseName(name, "x.svg"), "x.svg"),
  );
}
check(
  "parseName accepts bend-sinister-embattled",
  JSON.stringify(parseName("bend-sinister-embattled", "x.svg")) ===
    JSON.stringify({ ordinary: "bend-sinister", line: "embattled" }),
);

{
  // The upper half of an ellipse filling the box: its middle sample is the top centre.
  const dome = frameOutline([["M", 0, 60], ["A", 50, 60, 0, 0, 1, 100, 60], ["Z"]]);
  check(
    "a frame's polygon samples its arcs",
    dome.outer[0].startsWith("polygon(0 50%, ") && dome.outer[0].includes(", 50% 0, "),
    `  ${dome.outer[0]}`,
  );
  check(
    "a frame's ring scales its arcs' radii with the inset box",
    dome
      .ring("2px")[1]
      .endsWith(
        "move to 2px calc(2px + 0.5 * (100% - 2 * 2px)), arc to calc(100% - 2px) calc(2px + 0.5 * (100% - 2 * 2px)) of calc(0.5 * (100% - 2 * 2px)) calc(0.5 * (100% - 2 * 2px)) cw, close)",
      ),
    `  ${dome.ring("2px")[1]}`,
  );
}
check("the heater is a frame, not an ordinary", !("heater" in DRAWN) && "heater" in PATHS);

const SQUARE = [["M", 10, 20], ["L", 30, 20], ["L", 30, 40], ["L", 10, 40], ["Z"]];
const CONVERSIONS = {
  "absolute lines": ["M10 20 L30 20 L30 40 L10 40 Z", SQUARE],
  "relative lines": ["m10 20 l20 0 l0 20 l-20 0 z", SQUARE],
  "H and V": ["M10 20H30V40H10Z", SQUARE],
  "relative h and v": ["M10 20 h20 v20 h-20 z", SQUARE],
  "implicit lineto after M": ["M10,20 30,20 30,40 10,40 Z", SQUARE],
  "implicit relative lineto after m": ["m10 20 20 0 0 20 -20 0z", SQUARE],
  "repeated coordinates": ["M10 20 L30 20 30 40 10 40 Z", SQUARE],
  "packed numbers": ["M10 20L30 20L30 40L10 40Z", SQUARE],
  "negative numbers packed": ["M-.5.5L1e-1-2Z", [["M", -0.5, 0.5], ["L", 0.1, -2], ["Z"]]],
  "cubic, absolute and relative": [
    "M0 0 C1 2 3 4 5 6 c1 1 2 2 3 3 Z",
    [["M", 0, 0], ["C", 1, 2, 3, 4, 5, 6], ["C", 6, 7, 7, 8, 8, 9], ["Z"]],
  ],
  "arc, relative": ["M0 0 a5 5 0 0 1 10 0 Z", [["M", 0, 0], ["A", 5, 5, 0, 0, 1, 10, 0], ["Z"]]],
  "arc with packed flags": [
    "M0 0 a5 5 0 015 5 Z",
    [["M", 0, 0], ["A", 5, 5, 0, 0, 1, 5, 5], ["Z"]],
  ],
  "rounding to 2 decimals": ["M0.004 0.006 L1.005 2 Z", [["M", 0, 0.01], ["L", 1, 2], ["Z"]]],
};
for (const [name, [d, expected]] of Object.entries(CONVERSIONS)) {
  let actual;
  try {
    actual = convertPath(d);
  } catch (error) {
    actual = error.message;
  }
  check(
    `converter: ${name}`,
    JSON.stringify(actual) === JSON.stringify(expected),
    `  ${JSON.stringify(actual)}`,
  );
}

const REJECTED = {
  "a quadratic": "M0 0 Q 1 1 2 2 Z",
  "a smooth curve": "M0 0 S 1 1 2 2 Z",
  "a second subpath": "M0 0 L1 1 Z M5 5 L6 6 Z",
  "an open path": "M0 0 L1 1",
  "a path with no move": "L1 1 Z",
};
for (const [name, d] of Object.entries(REJECTED)) {
  check(
    `converter rejects ${name}`,
    throws(() => convertPath(d, "x.svg"), "x.svg"),
  );
}

const svg = (path, group = "") =>
  `<svg><g ${group}><path ${path} id="outline" d="M0 0 L1 1 Z"/></g></svg>`;
check("outlineOf reads the outline", outlineOf(svg(""), "x.svg") === "M0 0 L1 1 Z");
check(
  "outlineOf rejects a transform on the path",
  throws(
    () => outlineOf(svg('transform="translate(1,2)"'), "x.svg"),
    "x.svg: the outline has a transform",
  ),
);
check(
  "outlineOf rejects a transform on a group",
  throws(
    () => outlineOf(svg("", 'transform="translate(1,2)"'), "x.svg"),
    "Store transformation: Optimized",
  ),
);

check(
  "the chevron embattled isn't flipped onto the chevron reversed's outer edges",
  !("chevron-reversed-embattled" in DRAWN) || "chevron-reversed-embattled" in PATHS,
);

// The generator can't draw these lines round a corner, so a cornered ordinary takes them only
// once it's drawn.
const CORNERED = [
  ...["chevron", "cross", "saltire", "pall", "pile"].flatMap((o) => [o, `${o}-reversed`]),
  "chevronel",
  "two-chevronels",
  "three-chevronels",
];
for (const line of ["indented", "embattled"]) {
  for (const ordinary of lineOrdinaries(line).filter((o) => CORNERED.includes(o))) {
    check(`${ordinary}-${line} is drawn`, `${ordinary}-${line}` in DRAWN);
  }
}

/**
 * A drawing's subpaths, each starting at its "M".
 * @param {Array[]} segments A drawing, as in paths.js.
 * @returns {Array[][]} The subpaths.
 */
const subpaths = (segments) => {
  const parts = [];
  for (const segment of segments) {
    if (segment[0] === "M") {
      parts.push([]);
    }
    parts.at(-1).push(segment);
  }
  return parts;
};

// Where each command keeps its y values; the rest of its numbers don't move.
const Y_INDEXES = { M: [1], L: [1], C: [1, 3, 5], A: [6] };

/**
 * How far down each segment of `moved` lies from the same segment of `original`, if every point
 * of the segment moved by the same amount and none moved across.
 * @param {Array[]} original A drawing, as in paths.js.
 * @param {Array[]} moved The same drawing, its points moved up or down.
 * @returns {(number|null)[]|null} Each segment's move (null for "Z"), or null if they don't match.
 */
const segmentMoves = (original, moved) => {
  if (original.length !== moved.length) {
    return null;
  }
  const moves = original.map(([command, ...n], i) => {
    const [movedCommand, ...m] = moved[i];
    if (command !== movedCommand || n.length !== m.length) {
      return undefined;
    }
    if (command === "Z") {
      return null;
    }
    const ys = Y_INDEXES[command];
    const down = m[ys[0]] - n[ys[0]];
    const matches = n.every((value, j) =>
      ys.includes(j) ? Math.abs(m[j] - value - down) < 1e-6 : m[j] === value,
    );
    return matches ? down : undefined;
  });
  return moves.includes(undefined) ? null : moves;
};

/**
 * Whether a drawing is the same drawing moved down, every point by the same amount.
 * @param {Array[]} original A drawing, as in paths.js.
 * @param {Array[]} moved The drawing to compare.
 * @param {number} down The expected move, in real units.
 * @returns {boolean} True if every point moved by `down`.
 */
const movedBy = (original, moved, down) =>
  segmentMoves(original, moved)?.every((move) => move === null || Math.abs(move - down) < 1e-6) ??
  false;

/**
 * How far a chevron segment moves to narrow it to a chevronel, worked out from which side of the
 * chevron's centre line, y = 42 + 1.2|x − 50|, the segment ends: a flank join takes the edge it
 * ends on.
 * @param {Array} segment One segment of a chevron drawing, as in paths.js.
 * @returns {number|null} 7.8 (down) on the upper edge, -7.8 on the lower, null for "Z".
 */
const expectedMove = (segment) => {
  if (segment[0] === "Z") {
    return null;
  }
  const [x, y] = [segment.at(-2), segment.at(-1)];
  return y < 42 + 1.2 * Math.abs(x - 50) ? 7.8 : -7.8;
};

// 059 (diminutives and cotises): the chevron's drawing narrowed by 7.8 units an edge, stacked a
// chevronel's width (15.6) apart, three moved down by eye per line.
for (const [line, shift] of [
  ["indented", 6],
  ["embattled", 14.4],
]) {
  const chevron = PATHS[`chevron-${line}`];
  const single = DRAWN[`chevronel-${line}`];
  const moves = single && segmentMoves(chevron, single);
  const expectedMoves = chevron.map(expectedMove);
  const peakYs = chevron
    .filter((segment) => segment.at(-2) === 50)
    .map((segment) => segment.at(-1));
  const peakMove = (y) =>
    moves?.[chevron.findIndex((segment) => segment.at(-2) === 50 && segment.at(-1) === y)];
  check(
    `chevronel-${line} is chevron-${line} with its upper edge moved 7.8 units down, its lower up`,
    moves?.every((move, i) =>
      move === null ? expectedMoves[i] === null : Math.abs(move - expectedMoves[i]) < 1e-6,
    ),
    `  ${JSON.stringify(single)}`,
  );
  check(
    `chevronel-${line}'s upper peak moved down and its lower peak up`,
    Math.abs(peakMove(Math.min(...peakYs)) - 7.8) < 1e-6 &&
      Math.abs(peakMove(Math.max(...peakYs)) + 7.8) < 1e-6,
  );
}

// The wavy chevronel is drawn, not derived.
check(
  "chevronel-wavy is its drawing",
  "chevronel-wavy" in PATHS &&
    JSON.stringify(DRAWN["chevronel-wavy"]) === JSON.stringify(PATHS["chevronel-wavy"]),
);

for (const [line, shift] of [
  ["indented", 6],
  ["embattled", 14.4],
  ["wavy", 6],
]) {
  const single = DRAWN[`chevronel-${line}`];
  for (const [name, offsets] of [
    ["two-chevronels", [-15.6, 15.6]],
    ["three-chevronels", [-31.2, 0, 31.2].map((offset) => +(offset + shift).toFixed(2))],
  ]) {
    const parts = subpaths(DRAWN[`${name}-${line}`] ?? []);
    check(
      `${name}-${line} is chevronel-${line} at ${offsets.join(", ")}`,
      parts.length === offsets.length &&
        parts.every((part, i) => movedBy(single, part, offsets[i])),
      `  ${parts.length} subpaths`,
    );
  }
  const three = DRAWN[`three-chevronels-${line}`];
  const shape = three ? pathShape(three) : "";
  check(
    `three-chevronels-${line}'s shape moves to each later chevronel`,
    shape.match(/move to/g)?.length === 2 && shape.endsWith("close)"),
    `  ${shape}`,
  );
}

if (failures) {
  console.error(`✗ ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`✓ all ${checks} checks passed`);
