# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.5.3] - 2026-03-14

### Fixed

- Castling moves with check or checkmate indicators (`O-O+`, `O-O#`, `O-O-O+`,
  `O-O-O#`) now correctly set `check: true` / `checkmate: true` on the returned
  Move object — previously the indicator was consumed and silently discarded
- Security: pin `vite>=6.4.1`, `rollup>=4.59.0`, `glob>=10.5.0` via pnpm
  overrides to resolve 8 Dependabot CVEs in devDependencies

### Changed

- Grammar: extract `applyIndicators` preamble helper to eliminate repeated
  `promo`/`ind` logic across all SAN action blocks

### Internal

- Add `vitest.config.ts` to exclude `grammar.cjs` and bench files from coverage
  reporting — coverage now reflects only authored source (`index.ts`)
- Add explicit SAN unit tests for all grammar alternatives and indicator
  combinations, covering patterns that snapshot tests cannot detect regressions
  in (full-square disambiguation, castling indicators, promotion+checkmate,
  etc.)

## [3.5.2] - 2026-03-14

### Fixed

- Benchmark: `benko.pgn` moved to multi-game group and compared with the correct
  `parseGames` API — previously called `parseGame` (single-game), causing all
  comparison parsers to error
- Benchmark: `comments.pgn` BOM (`U+FEFF`) now stripped before parsing, enabling
  comparison against `@mliebelt/pgn-parser` and `pgn-parser`
- Benchmark: fixture exclusion reasons documented in `BENCHMARK_RESULTS.md` and
  in bench source comments

## [3.5.1] - 2026-03-14

### Changed

- README: document `stream()` API with signature and Node.js usage example
- README: update type names (`Moves` → `MoveList`) and clarify `Move.from`
  disambiguation and move tuple slot semantics
- Updated benchmark results for v3.5.0 SAN rule restructure

## [3.5.0] - 2026-03-14

### Added

- `stream(input: AsyncIterable<string>): AsyncGenerator<PGN>` — new named export
  for incremental, memory-efficient parsing of large PGN databases

### Changed

- `Move.from` widened from `File | Rank` to `Disambiguation`
  (`Square | File | Rank`) to correctly type fully-disambiguated moves (e.g.
  `Qd1xe4` → `from: "d1"`)
- `type Moves` renamed to `MoveList`; new
  `MovePair = [number, Move | undefined, Move?]` tuple
- `type Variation` simplified to `MoveList[]`

### Performance

- Restructured `SAN` grammar rule to eliminate post-match regex on every move;
  closes remaining ~1.1–1.2x gap vs `pgn-parser` on move-heavy fixtures

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
