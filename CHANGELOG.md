# Changelog

All notable changes to this project are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Crosses and the shakefork as charges: `cross-couped`, `cross-potent`,
  `cross-pattee`, `maltese-cross`, `cross-crosslet`, `cross-moline`,
  `cross-fleury` and `shakefork`.
- `semy`: a semé, one built-in charge strewn across the field, e.g. bezanty or
  crusilly.
- Voided ordinaries, e.g. `cross-voided-argent`: the field shows through.
- Reversed ordinaries: `pile-reversed-*`, `chevron-reversed-*` and
  `pall-reversed-*`, upside down.

### Fixed

- Charges, a canton or an inescutcheon in a quarter (or a half of `per-pale` or
  `per-fess`) are placed and counterchanged within it, under the shield's own
  ordinary, rather than against the whole shield.

## [0.5.0] - 2026-11-04

### Added

- `in-chief` and `in-base`: one to three charges along the chief or base. On a
  chief, they sit on it. The ESLint plugin reports an arrangement put on a
  charge rather than its container.
- `-of-the-first`: the field's first tincture, as in a blazon, e.g.
  `pale-of-the-first`. The ESLint plugin checks it.
- Striped fields: `barry-*` and `paly-*` (of six), `barry-of-eight-*`,
  `barry-of-ten-*` and `paly-of-eight-*`. The first tincture is in chief or
  on the dexter. They take furs and counterchanged, like the other divisions.
- `per-saltire-*`: a field divided on both diagonals, the first tincture in
  chief and base.
- Bars, named by count: `bar-*`, `two-bars-*` and `three-bars-*`. They take
  lines, furs, fimbriation and counterchanged, like the fess.
- `pile-*`: a wedge from the chief to a point. It takes lines, furs,
  fimbriation and counterchanged, one or three charges `on` it, and two
  `between`.
- `canton`: a ninth of the shield in dexter chief, over every ordinary and
  charge, with its own field, divisions, ordinaries and charges, like the
  inescutcheon.
- Six charges `between` a fess, bend, bend sinister, chevron or pale.
- `inescutcheon`: a small shield at the centre of the arms, over everything
  else, with its own field, ordinaries and charges. A bordure on it is a third
  as wide.
- The ESLint plugin checks a plain canton or inescutcheon against the field it
  lies on. One with anything on it counts as arms of its own.

### Changed

- The `in-chief` and `in-base` points are now `in-chief-point` and
  `in-base-point`, like the honour, fess and nombril points.
- The canton and the chief surmount a bordure, as in heraldry. The canton is
  still a third of the whole shield, and the chief's lower edge doesn't move.
- `@grailwind/eslint-plugin` 0.1.0-beta.1 needs `grailwind` 0.5.x, for the
  renamed points.

### Fixed

- Two charges `between` a fess, saltire or pall are placed one each side.

## [0.4.0] - 2026-11-03

### Added

- `grailwind/data` (experimental): the tinctures, metals and colours, furs,
  ordinaries and their lines, charges, arrangements and points as plain data,
  for tooling such as `@grailwind/eslint-plugin`. Its shape may change in any
  minor release.
- `@grailwind/eslint-plugin` 0.1.0-beta.0, a separate package: the rule of
  tincture and charge structure, for JSX and HTML. Install with
  `@grailwind/eslint-plugin@beta`. It knows engrailed, invected and fur
  ordinaries, and counts furs by their ground (configurable).
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

- Five charges now default to 2, 1, 2 (in saltire). They were invisible on a
  plain field, and piled up in a corner on an ordinary without five points.
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

[Unreleased]: https://github.com/pafirmin/grailwind/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/pafirmin/grailwind/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/pafirmin/grailwind/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/pafirmin/grailwind/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/pafirmin/grailwind/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/pafirmin/grailwind/releases/tag/v0.1.0
