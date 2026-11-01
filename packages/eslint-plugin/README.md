# @grailwind/eslint-plugin

ESLint rules for [Grailwind](https://pafirmin.github.io/grailwind/) markup in JSX and HTML.

```sh
npm install --save-dev @grailwind/eslint-plugin
```

It reads the tinctures, ordinaries and charges from your installed `grailwind`, so it needs
`grailwind` 0.2.0 or later. For typos and other class errors, see
[Linting](https://github.com/pafirmin/grailwind#linting) in the Grailwind README.

## Setup

ESLint 9 or later, flat config only. `recommended` turns on every rule as an error.

JSX and TSX use ESLint's own parser:

```js
// eslint.config.js
import grailwind from "@grailwind/eslint-plugin";

export default [
  {
    files: ["**/*.{jsx,tsx}"],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  },
  grailwind.configs.recommended,
];
```

HTML needs [`@html-eslint/parser`](https://html-eslint.org/):

```js
import grailwind from "@grailwind/eslint-plugin";
import html from "@html-eslint/parser";

export default [
  {
    files: ["**/*.html"],
    languageOptions: { parser: html },
    ...grailwind.configs.recommended,
  },
];
```

## Rules

### `rule-of-tincture`

No metal (`or`, `argent`) on metal, and no colour on colour.

- An ordinary, chief or bordure is checked against the field on the same element:
  `escutcheon or fess-argent` is metal on metal.
- Charges in a `charges` container are checked against the field.
- Charges in a `charges on` container are checked against the ordinary they lie on.
- Charges at `in-dexter-chief`, `in-chief` or `in-sinister-chief` are checked against the chief,
  if there is one.

A divided field (`per-pale-or-gules`) has no single tincture, so nothing is checked against it.
Neither are `<img>` charges, charges with no tincture, or `bordure-*` with a non-heraldic colour.

### `charges-in-container`

Charges (`mullet`, `bezant`, `charge-[…]` and so on) must be direct children of a `charges`
container.

### `arrangement-needs-ordinary`

`charges between` and `charges on` take their positions from the ordinary on the shield. Without
one, other than a chief, they have nowhere to go.

### `one-ordinary`

An element draws one ordinary plus, optionally, a chief. With two, such as
`fess-azure chevron-gules`, only one shows. Two chiefs are flagged too. A `charges` container
takes one arrangement: `between`, `on`, `in-pale`, `in-fess` or `in-bend`.

## Exceptions

Some real arms break the rule of tincture on purpose, e.g. Jerusalem, gold crosses on silver.
Mark these with a disable comment and a reason:

```html
<!-- eslint-disable-next-line grailwind/rule-of-tincture -- armes à enquérir -->
<i class="charge-[url(cross-potent.svg)] or"></i>
```

```jsx
{
  /* eslint-disable-next-line grailwind/rule-of-tincture -- armes à enquérir */
}
<i className="charge-[url(cross-potent.svg)] or" />;
```

To downgrade a rule instead, override it after `recommended`, e.g.
`{ rules: { "grailwind/rule-of-tincture": "warn" } }`.

## Limits

The rules read static class strings only: `class="…"`, `className="…"`, or a template literal
with no `${…}`. Anything dynamic, such as `clsx(…)` or a spread of props, is skipped rather than
guessed at. So are elements inside a component (`<Shield>…</Shield>`) or an expression
(`{items.map(…)}`), and classes with a variant (`md:gules`).
