import assert from "node:assert/strict";
import { it } from "node:test";
import { Linter } from "eslint";
import plugin from "../src/index.js";

const lint = (options) =>
  new Linter().verify("<div className='heater'><div className='ermine fess-argent' /></div>", {
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { grailwind: plugin },
    rules: { "grailwind/rule-of-tincture": ["error", options] },
  });

it("rejects an unknown fur", () => {
  assert.throws(() => lint({ furs: { ermin: "metal" } }), /should NOT have additional properties/);
});

it("rejects an unknown kind", () => {
  assert.throws(
    () => lint({ furs: { ermine: "fur" } }),
    /should be equal to one of the allowed values/,
  );
});

it("rejects an unknown mode", () => {
  assert.throws(() => lint({ furs: "colour" }));
});
