# Changelog

All notable changes to this project are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `grailwind/data` (experimental): the tinctures, metals and colours,
  ordinaries, charges and arrangement points as plain data, for tooling such as
  `@grailwind/eslint-plugin`. Its shape may change in any minor release.
- `@grailwind/eslint-plugin` 0.1.0-beta.0, a separate package: the rule of
  tincture and charge structure, for JSX and HTML. Install with
  `@grailwind/eslint-plugin@beta`.
- `in-bend-sinister`: two or three charges in a line from sinister chief to
  dexter base.
- Engrailed and invected ordinaries, e.g. `fess-engrailed-or` and
  `chief-invected-azure`. Browsers without `clip-path: shape()` draw them with
  straight edges.
- Furs: `ermine`, `ermines`, `erminois` and `pean`, on the field, on a charge,
  or in a division (`per-pale-ermine-gules`).
- Fur ordinaries, e.g. `chief-ermine` and `cross-engrailed-erminois`. They
  aren't fimbriated.

### Fixed

- An ordinary in a quarter no longer paints over the shield's own ordinary.

## [0.3.0] - 2026-11-01

### Added

- Counterchanged ordinaries: `<ordinary>-counterchanged` swaps the tinctures
  of a divided field, e.g. `per-pale-argent-gules chevron-counterchanged`.
- Counterchanged charges: `counterchanged` on a charge, or on the `charges`
  container for all of them.

### Changed

- The horizontal line of `per-fess-*` and `quarterly-*` fields now passes
  through the fess point, 45% down the shield, where the fess and cross are
  centred. It was at 50%.
- Charges are centred with negative margins instead of `translate`, so
  Tailwind's `translate-*` on a charge now moves it from its place.
- `escutcheon` sets `contain: layout`.

## [0.2.0] - 2026-11-01

### Added

- Charges `on` an ordinary: `charges on` places one, two, three or five charges
  along the pale, fess, bend, bend sinister, chevron, cross, saltire or pall.
- Fimbriation: `fimbriated-<tincture>` edges an ordinary with a narrow border,
  e.g. `cross-azure fimbriated-argent`.

### Fixed

- Charges at `in-dexter-chief`, `in-chief` and `in-sinister-chief` now sit on
  the chief when one is present, and charges are drawn above it.

## [0.1.0] - 2026-10-31

Initial release: tinctures, divisions, ordinaries, charges, strict mode and
custom SVG charges.

[Unreleased]: https://github.com/pafirmin/grailwind/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/pafirmin/grailwind/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/pafirmin/grailwind/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/pafirmin/grailwind/releases/tag/v0.1.0
