# Grailwind CSS

[![Test](https://github.com/pafirmin/grailwind/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/pafirmin/grailwind/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/grailwind)](https://www.npmjs.com/package/grailwind)
[![ESLint plugin](https://img.shields.io/npm/v/@grailwind/eslint-plugin/beta?label=eslint-plugin)](https://www.npmjs.com/package/@grailwind/eslint-plugin)
[![License: MIT](https://img.shields.io/npm/l/grailwind)](https://github.com/pafirmin/grailwind/blob/main/LICENSE)

![Eight coats of arms drawn with Grailwind: chevrons, quarters, fleurs-de-lis, a saltire, gyronny, a chief, a bend and a bordure](https://grailwind.dev/preview.png)

Heraldic blazon for [Tailwind CSS](https://tailwindcss.com). Draw coats of
arms, or style anything else, in the language heralds have used for 800 years:

```html
<div class="heater">
  <div class="azure chevron-or">
    <div class="charges between">
      <i class="mullet argent"></i>
      <i class="mullet argent"></i>
      <i class="mullet argent"></i>
    </div>
  </div>
</div>
```

That's _Azure, a chevron Or between three mullets Argent_: a blue shield, a
gold chevron, and three silver stars around it.

**[Read the documentation](https://grailwind.dev/)** for every class, with live examples.

> Grailwind is a light-hearted project at version 0.x, so class names may
> still change.

## Install

Grailwind is a plugin for Tailwind CSS v4.

```sh
npm install -D grailwind
```

Import it after Tailwind:

```css
@import "tailwindcss";
@import "grailwind";
```

This adds the heraldic tinctures (`or`, `argent`, `gules`, `azure`, `vert`,
`purpure`, `sable`) alongside Tailwind's own colours.

For a more authentic experience, import `grailwind/strict` instead, and the
tinctures replace Tailwind's colours entirely.

## What's included

- **Tinctures:** a tincture on its own sets the background (`azure`), and
  Tailwind's prefixes work as usual (`text-or`). There are also the furs `ermine`,
  `ermines`, `erminois`, `pean`, `vair` and `potent` (with `vairy-or-gules` and the like), which
  work in divisions too, and `fur-<n>` sets their density.
- **The shield:** `heater`, a pointed shield round its one child, the field, plus `bordure-*` (a
  eighth of the shield wide, also `bordure-engrailed-*` and `bordure-invected-*`), `inescutcheon` (a
  small shield at the centre) and `canton` (a ninth of the shield in dexter chief), each with its
  own field and charges.
- **Divided fields:** `per-pale-or-gules`, `quarterly-azure-argent`,
  `gyronny-or-sable`, `barry-argent-azure`, `bendy-argent-gules`, `chequy-or-azure` and more, or
  `per-pale`, `per-fess` and `quarterly` for layout.
- **Ordinaries:** `fess-or`, `chevron-gules`, `cross-argent`, `chief-azure`,
  `two-bars-or` and more, with `fimbriated-*` for a narrow border,
  `fess-engrailed-or` and the like for an engrailed, invected, wavy, indented or embattled edge,
  `cross-voided-argent` and the like to show the field through it,
  `pile-reversed-or` (also the chevron and pall) to turn one upside down,
  `chief-ermine` and the like in a fur, or `chevron-counterchanged` and the like
  on a divided field.
- **Charges:** `mullet`, `fleur-de-lis`, `bezant`, crosses and more, arranged by
  number, `in-pale`, `in-fess`, `in-bend`, `in-bend-sinister`, `on` or `between`
  the ordinary, or placed at a named point such as `in-dexter-chief`, strewn
  `semy` across the field, sized with `charge-size-*`, and `counterchanged` on
  a divided field.
- **Your own charges:** any SVG, via `charge-[url(…)]`.

## Linting

For typos and clashing classes, use
[`eslint-plugin-better-tailwindcss`](https://github.com/schoero/eslint-plugin-better-tailwindcss).
It reads Grailwind's classes from your CSS entry file, so it flags `fess-ore` or
`per-pale-or-or`, and catches two classes fighting over the same thing, such as
`bend-sable bend-or`:

```js
// eslint.config.js
import betterTailwindcss from "eslint-plugin-better-tailwindcss";

export default [
  {
    plugins: { "better-tailwindcss": betterTailwindcss },
    settings: { "better-tailwindcss": { entryPoint: "src/app.css" } },
    rules: {
      "better-tailwindcss/no-unknown-classes": "error",
      "better-tailwindcss/no-conflicting-classes": "error",
    },
  },
];
```

For the heraldry itself, such as the rule of tincture and charges outside a `charges`
container, there is [`@grailwind/eslint-plugin`](packages/eslint-plugin) (beta).

The plugin reads names from `grailwind/data`. That export is **experimental**: it's there for
Grailwind's own tooling, and its shape may change in any minor release.

## Development

```sh
npm install
npm test            # checks the default and strict builds, and the ESLint plugin
npm run test:render # renders shields in Chromium and Firefox and checks their colours;
                    # run `npx playwright install chromium firefox` first
npm run format      # formats with Prettier; CI runs format:check
npm run dev:watch   # rebuilds the docs site on change and serves it at http://localhost:8000
```

## Licence

[MIT](LICENSE)
