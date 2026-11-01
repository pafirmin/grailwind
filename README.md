# Grailwind CSS

![Eight coats of arms drawn with Grailwind: chevrons, quarters, fleurs-de-lis, a saltire, gyronny, a chief, a bend and a bordure](https://grailwind.dev/preview.png)

Heraldic blazon for [Tailwind CSS](https://tailwindcss.com). Draw coats of
arms, or style anything else, in the language heralds have used for 800 years:

```html
<div class="escutcheon azure chevron-or">
  <div class="charges between">
    <i class="mullet argent"></i>
    <i class="mullet argent"></i>
    <i class="mullet argent"></i>
  </div>
</div>
```

That's *Azure, a chevron Or between three mullets Argent*: a blue shield, a
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
  Tailwind's prefixes work as usual (`text-or`).
- **The shield:** `escutcheon`, plus `bordure-*`.
- **Divided fields:** `per-pale-or-gules`, `quarterly-azure-argent`,
  `gyronny-or-sable` and more, or `per-pale`, `per-fess` and `quarterly` for
  layout.
- **Ordinaries:** `fess-or`, `chevron-gules`, `cross-argent`, `chief-azure`
  and more, with `fimbriated-*` for a narrow border.
- **Charges:** `mullet`, `fleur-de-lis`, `bezant` and more, arranged by
  number, `in-pale`, `in-fess`, `in-bend`, `on` or `between` the ordinary, or
  placed at a named point such as `in-dexter-chief`, and sized with
  `charge-size-*`.
- **Your own charges:** any SVG, via `charge-[url(…)]`.

## Development

```sh
npm install
npm test            # checks both the default and strict builds
npm run dev:watch   # rebuilds the docs site on change and serves it at http://localhost:8000
```

## Licence

[MIT](LICENSE)
