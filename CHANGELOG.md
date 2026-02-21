# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.4.0] - 2026-02-21

### Changed

- Rewrote README following `@echecs/elo` library style with badges, Why, Quick
  Start, Usage, and Contributing sections
- Updated AGENTS.md to reflect Peggy migration and remove stale nearley/moo
  references

### Added

- Features section in README highlighting RAV and NAG support with a parser
  comparison table
- Performance section in README with benchmark results table
- Codecov badge to README

### Removed

- `docs.yml` workflow (no hosted docs in this project)

## [3.3.0] - 2026-02-21

### Added

- Peggy PEG parser replacing nearley/moo for O(n) linear-time parsing —
  delivering up to 10× throughput improvement on large PGN files
- Comparative benchmark (`comparison.bench.ts`) measuring `@echecs/pgn` against
  `@mliebelt/pgn-parser` and `chess.js`

### Performance

- Replaced `pickBy` with direct property assignment in SAN action block,
  reducing allocations per move
- Added length-check guards before NAG and comment processing in MOVE action,
  skipping unnecessary work for moves without annotations
- Removed `delete` mutations and reduced allocations in `pairMoves`, avoiding V8
  hidden-class transitions

### Removed

- Stale `tokenizer.ts` debug script

## [3.2.1] - 2026-02-20

### Fixed

- Sort `multiGameFixtures` keys in comparison benchmark to satisfy the
  `sort-keys` lint rule

## [3.2.0] - 2026-02-20

### Added

- Comparative PGN parser benchmark (`comparison.bench.ts`) for cross-library
  performance tracking

### Performance

- Reduced Earley parser overhead via grammar and caching optimizations

## [3.1.3] - 2025-03-27

### Fixed

- Removed accidental production dependency introduced in 3.1.2

## [3.1.2] - 2025-03-01

### Fixed

- Increased per-test timeout to accommodate `long.pgn` (~3 500 games) on slow CI
  runners

## [3.1.1] - 2025-03-01

### Fixed

- Corrected `.js` extension on relative imports in test files (NodeNext
  resolution)

## [3.1.0] - 2025-03-01

### Added

- moo tokenizer for faster lexing
- New grammar supporting the full PGN specification including RAV (recursive
  annotated variations) and NAG (numeric annotation glyphs)

[unreleased]: https://github.com/mormubis/pgn/compare/v3.4.0...HEAD
[3.4.0]: https://github.com/mormubis/pgn/compare/v3.3.0...v3.4.0
[3.3.0]: https://github.com/mormubis/pgn/compare/v3.2.1...v3.3.0
[3.2.1]: https://github.com/mormubis/pgn/compare/v3.2.0...v3.2.1
[3.2.0]: https://github.com/mormubis/pgn/compare/v3.1.3...v3.2.0
[3.1.3]: https://github.com/mormubis/pgn/compare/v3.1.2...v3.1.3
[3.1.2]: https://github.com/mormubis/pgn/compare/v3.1.1...v3.1.2
[3.1.1]: https://github.com/mormubis/pgn/compare/v3.1.0...v3.1.1
[3.1.0]: https://github.com/mormubis/pgn/releases/tag/v3.1.0
