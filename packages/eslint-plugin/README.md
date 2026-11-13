# @grailwind/eslint-plugin

[![Test](https://github.com/pafirmin/grailwind/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/pafirmin/grailwind/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/@grailwind/eslint-plugin/beta)](https://www.npmjs.com/package/@grailwind/eslint-plugin)
[![License: MIT](https://img.shields.io/npm/l/@grailwind/eslint-plugin)](https://github.com/pafirmin/grailwind/blob/main/packages/eslint-plugin/LICENSE)

ESLint rules for [Grailwind](https://grailwind.dev/) markup in JSX and HTML.

> **Beta.** Rules, their options and the `recommended` config may change between releases.

```sh
npm install --save-dev @grailwind/eslint-plugin@beta
```

It reads the tinctures, ordinaries and charges from your installed `grailwind`, so it needs
`grailwind` 0.9.x. For typos and other class errors, see
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
  `or fess-argent` is metal on metal. So are engrailed, invected, wavy, indented, embattled and voided ones
  (`fess-engrailed-argent`, `cross-voided-argent`).
- A fimbriated ordinary is checked against its fimbriation, and the fimbriation against the
  field: `or chevron-sable fimbriated-argent` is metal on metal (Argent on Or).
- Charges in a `charges` container are checked against the field.
- Charges in a `charges on` container are checked against the ordinary they lie on.
- Charges at `in-dexter-chief`, `in-chief-point` or `in-sinister-chief`, or in a
  `charges in-chief` container, are checked against the chief, if there is one.
- A plain canton or inescutcheon, one with nothing on it, is checked against the field it lies
  on. An inescutcheon's field is its one child. One with charges, an ordinary or a division
  counts as arms of its own and is exempt.

A divided field (`per-pale-or-gules`) has no single tincture, so nothing is checked against it.
Neither are `<img>` charges, charges with no tincture, or `bordure-*` with a non-heraldic colour.
Counterchanged ordinaries and charges take the field's tinctures swapped, so they're skipped too.

`of-the-first` is checked as the shield's first tincture (a quarter's own, but not a canton's or
an inescutcheon's), and reported if it can't be seen.

Furs count by their ground: `ermine` and `erminois` as metals, `ermines` and `pean` as colours.
`ermine fess-argent` is metal on metal. The vair family (`vair`, `potent`, `vairy-or-gules` and
the like) has no single ground, so it isn't checked. Authorities differ, so the `furs` option
changes this:

```js
"grailwind/rule-of-tincture": ["error", { furs: "ground" }]   // the default
"grailwind/rule-of-tincture": ["error", { furs: "exempt" }]   // furs go with anything
"grailwind/rule-of-tincture": ["error", {
  furs: { ermine: "metal", erminois: "exempt", ermines: "colour", pean: "colour", vair: "metal" },
}]
```

A fur left out of the map counts as it does by default.

### `charges-in-container`

Charges (`mullet`, `bezant`, `charge-[…]` and so on) must be direct children of a `charges`
container.

An arrangement (`in-chief`, `in-pale`, `between` and so on) goes on the container, not a charge.

### `field-in-shield`

A `heater` or `inescutcheon` is a frame round one child, the field, which carries the blazon.
This flags a tincture, division, ordinary, chief, bordure or `fimbriated-*` on the frame, as in
`<div class="heater azure">`, and a `charges` container directly in it, which would be taken for
the field. It also flags `escutcheon`, which is now `heater`:

```html
<div class="heater"><div class="azure fess-or"></div></div>
```

### `arrangement-needs-ordinary`

`charges between` and `charges on` take their positions from the ordinary on the shield. Without
one, other than a chief, they have nowhere to go.

### `one-ordinary`

An element draws one ordinary plus, optionally, a chief. With two, such as
`fess-azure chevron-gules`, only one shows. Two chiefs are flagged too. A `charges` container
takes one arrangement: `between`, `on`, `in-pale`, `in-fess`, `in-bend` or `in-bend-sinister`.
Counterchanged, engrailed, invected, wavy, indented, embattled, voided and fur ordinaries count as
ordinaries.

A charge at a named point (`in-dexter-chief` and so on) is a separate group in the blazon, so it
goes in its own `charges` container. Among other charges, it still counts towards their number
and shifts their positions: _three mullets, in dexter chief a crescent_ in one container lays
the mullets out as four.

### `modifier-needs-target`

Modifiers that would otherwise do nothing:

- `chevron-counterchanged` (any `<ordinary>-counterchanged`) needs a divided field on the same
  element, e.g. `per-pale-argent-gules`.
- `counterchanged` on `charges`, or on a charge, needs a divided field on the shield that holds
  the container.
- `fimbriated-*` needs a plain tinctured ordinary. A chief, and an engrailed, invected, wavy,
  indented, embattled, voided, fur or counterchanged ordinary, aren't fimbriated.
- `counterchanged` doesn't work on a charge with a transform (`rotate-*`, `scale-*`, `skew-*`,
  `translate-*`): the charge shows its own small copy of the field instead.

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

Two field tinctures on one element are a conflict, which this plugin leaves to
`better-tailwindcss/no-conflicting-classes`. It catches `or azure` and `ermine pean`, but not a
fur with a plain tincture (`ermine gules`) or with a division (`per-pale-ermine-gules
per-fess-or-azure`): their CSS properties differ, so it doesn't see them as conflicting
(eslint-plugin-better-tailwindcss 4.10.0).

The transform check knows Tailwind's transform utilities only. Other things that break
`counterchanged` the same way, such as `filter`, `perspective` or `will-change: transform`,
aren't flagged.
