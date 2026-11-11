// Builds the CSS with the Tailwind CLI, as a user would, and explains a build that fails.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { stripVTControlCharacters } from "node:util";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "node_modules/.bin/tailwindcss");

// Tailwind's message, from the box it draws around it.
const tailwindMessage = (stderr) => {
  const text = stripVTControlCharacters(String(stderr ?? ""));
  const boxed = text
    .split("\n")
    .filter((line) => line.startsWith("│"))
    .map((line) => line.slice(1).trim());
  return boxed.length ? boxed.join(" ") : text.trim();
};

// Where the repo's own code threw, as "divisions.js:284:16": the innermost frame of
// `error.stack` (V8 lists the throw first, then its callers) outside node_modules and this file.
const whereThrown = (error) => {
  const re = /file:\/\/.*:[0-9]+:[0-9]+/;

  if (!error?.stack) {
    return;
  }

  for (const line of error.stack.split("\n")) {
    const match = line.match(re)?.[0];
    if (!match) {
      continue;
    }

    if (match.includes("node_modules")) {
      continue;
    }

    const path = fileURLToPath(match);
    if (path.includes(fileURLToPath(import.meta.url))) {
      continue;
    }

    return relative(root, path);
  }
};

// Everything the plugins call on Tailwind's plugin API.
const STUBS = { addUtilities() {}, matchUtilities() {}, addBase() {}, theme: () => "#000000" };

// Tailwind drops the stack, so run each plugin here to find the line that throws.
const diagnose = async () => {
  const css = readFileSync(join(root, "grailwind.css"), "utf8");
  for (const [, file] of css.matchAll(/@plugin "(.+?)"/g)) {
    try {
      const { default: plugin } = await import(pathToFileURL(join(root, file)));
      plugin.handler(STUBS);
    } catch (error) {
      return whereThrown(error);
    }
  }
};

// `dir` is a temp dir inside the repo, so the build can resolve tailwindcss.
export const build = async ({ dir, entry = "grailwind.css", source = "index.html", css = "" }) => {
  const input = join(dir, "input.css");
  const output = join(dir, "output.css");
  writeFileSync(
    input,
    `@import "tailwindcss" source(none);\n@source "./${source}";\n@import "${join(root, entry)}";\n${css}`,
  );
  try {
    execFileSync(cli, ["-i", input, "-o", output], { stdio: "pipe" });
  } catch (error) {
    const at = await diagnose();
    const failure = new Error(
      `✗ CSS build failed: ${tailwindMessage(error.stderr)}${at ? `\n    at ${at}` : ""}`,
    );
    failure.buildFailed = true;
    throw failure;
  }
  return readFileSync(output, "utf8");
};
