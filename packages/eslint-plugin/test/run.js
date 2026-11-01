import { describe, it } from "node:test";
import htmlParser from "@html-eslint/parser";
import { RuleTester } from "eslint";

RuleTester.describe = describe;
RuleTester.it = it;

const jsx = new RuleTester({ languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } });
const html = new RuleTester({ languageOptions: { parser: htmlParser } });

const toJsx = (code) => `const shield = (\n${code.replaceAll(" class=", " className=")}\n);`;

const cases = (list, convert) =>
  list.map((c) => (typeof c === "string" ? convert(c) : { ...c, code: convert(c.code) }));

// Runs each case written as HTML (with `class=`) as HTML and as JSX.
export function run(name, rule, { valid = [], invalid = [], jsxOnly = {} }) {
  html.run(name, rule, { valid: cases(valid, (c) => c), invalid: cases(invalid, (c) => c) });
  jsx.run(name, rule, {
    valid: [...cases(valid, toJsx), ...(jsxOnly.valid ?? [])],
    invalid: [...cases(invalid, toJsx), ...(jsxOnly.invalid ?? [])],
  });
}
