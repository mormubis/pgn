# AGENTS.md — Coding Agent Reference

This file documents conventions, commands, and guidelines for agents working in
the `@echecs/pgn` repository.

**See also:** [`REFERENCES.md`](REFERENCES.md) |
[`COMPARISON.md`](COMPARISON.md) | [`SPEC.md`](SPEC.md)

**Backlog:** tracked in [GitHub Issues](https://github.com/echecsjs/pgn/issues).

---

## Project Overview

`@echecs/pgn` is a PGN (Portable Game Notation) chess parser and serializer. It
uses a [Peggy](https://peggyjs.org/) PEG parser compiled from
`src/grammar.pegjs`. The public API exports three functions:

- `parse(input: string, options?: ParseOptions): PGN[]` — parse PGN into
  structured objects
- `stringify(input: PGN | PGN[], options?: StringifyOptions): string` —
  serialize back to valid PGN
- `stream()` — **deprecated**, use `parse()` instead

---

Key source files:

| File                                | Role                                                      |
| ----------------------------------- | --------------------------------------------------------- |
| `src/index.ts`                      | Public API barrel — re-exports functions and types        |
| `src/types.ts`                      | All TypeScript type definitions                           |
| `src/parse.ts`                      | `parse()` entry point + error conversion                  |
| `src/stringify.ts`                  | `stringify()` — comment serialization + move list         |
| `src/stream.ts`                     | `stream()` — **deprecated** streaming parser              |
| `src/grammar.pegjs`                 | Peggy grammar source — **edit this, not the `.cjs`**      |
| `src/grammar.cjs`                   | **Generated** — compiled from `grammar.pegjs`, gitignored |
| `src/comments.ts`                   | Comment command parsing (`[%cal]`, `[%clk]`, `[%eval]`)   |
| `src/constants.ts`                  | Shared constants (`RESULT_TO_STR`, `STR_TAGS`)            |
| `src/warnings.ts`                   | Warning helpers (missing STR tags, result mismatch)       |
| `src/san.ts`                        | SAN notation reconstruction for `stringify()`             |
| `src/tags.ts`                       | Tag serialization for `stringify()`                       |
| `src/__tests__/index.spec.ts`       | Snapshot test suite (13 fixtures)                         |
| `src/__tests__/san.spec.ts`         | SAN notation, NAGs, comments, RAVs                        |
| `src/__tests__/stream.spec.ts`      | Streaming API tests                                       |
| `src/__tests__/stringify.spec.ts`   | Stringify + round-trip tests                              |
| `src/__tests__/index.bench.ts`      | Self-benchmarks                                           |
| `src/__tests__/comparison.bench.ts` | Cross-parser comparison benchmarks                        |
| `src/__tests__/grammar/`            | PGN fixture files used by tests                           |

---

## Commands

Use **pnpm** exclusively (no npm/yarn).

### Build

```bash
pnpm build              # compile grammar + bundle dist/ via tsdown
pnpm grammar:compile    # peggy --format commonjs -o src/grammar.cjs src/grammar.pegjs
```

### Test

```bash
pnpm test               # grammar:compile + vitest run (all tests)
```

`pnpm test` always recompiles the grammar first — no need to do it manually.

**Run a single test by fixture label:**

```bash
pnpm test -- --reporter=verbose -t "basic"
```

Available labels: `basic`, `benko`, `checkmate`, `comment`, `comments`,
`games32`, `lichess`, `long`, `multiple`, `promotion`, `single`, `twic`,
`variants`.

**Update snapshots** (only after intentional output changes):

```bash
pnpm test -- --update-snapshots
```

Snapshots live in `src/__tests__/__snapshots__/<label>.snap` and are committed
to git. Do not update them for pure performance changes.

### Lint & Format

```bash
pnpm lint               # ESLint + tsc --noEmit
pnpm lint:ci            # same, zero warnings allowed
pnpm format             # prettier --write
pnpm format:ci          # prettier --list-different (check only)
```

### Benchmarks

```bash
pnpm bench              # vitest bench --run (all benchmarks, takes ~60s)
```

---

## Grammar Workflow

Whenever `src/grammar.pegjs` is modified:

1. Run `pnpm test` — it recompiles and runs all 13 snapshots.
2. **Never edit `src/grammar.cjs` directly** — it is generated and gitignored.
3. Grammar rule names use `SCREAMING_SNAKE_CASE` (Peggy convention).

---

## Validation

Input validation is mostly provided by TypeScript's strict type system at
compile time. There is no runtime validation library — the type signatures
enforce correct usage. Do not add runtime type-checking guards (e.g. `typeof`
checks, assertion functions) unless there is an explicit trust boundary. The
Peggy grammar handles syntactic validation of PGN input at parse time.

---

## Release Protocol

Step-by-step process for releasing a new version. CI auto-publishes to npm when
`version` in `package.json` changes on `main`.

1. **Verify the package is clean:**

   ```bash
   pnpm lint && pnpm test && pnpm build
   ```

   Do not proceed if any step fails.

2. **Decide the semver level:**
   - `patch` — bug fixes, internal refactors with no API change
   - `minor` — new features, new exports, non-breaking additions
   - `major` — breaking changes to the public API

3. **Update `CHANGELOG.md`** following
   [Keep a Changelog](https://keepachangelog.com) format:

   ```markdown
   ## [x.y.z] - YYYY-MM-DD

   ### Added

   - …

   ### Changed

   - …

   ### Fixed

   - …

   ### Removed

   - …
   ```

   Include only sections that apply. Use past tense.

4. **Update `README.md`** if the release introduces new public API, changes
   usage examples, or deprecates/removes existing features.

5. **Bump the version:**

   ```bash
   npm version <major|minor|patch> --no-git-tag-version
   ```

6. **Commit and push:**

   ```bash
   git add package.json CHANGELOG.md README.md
   git commit -m "release: @echecs/pgn@x.y.z"
   git push
   ```

   **The push is mandatory.** The release workflow only triggers on push to
   `main`. A commit without a push means the release never happens.

7. **CI takes over:** GitHub Actions detects the version bump, runs format →
   lint → test, and publishes to npm.

Do not manually publish with `npm publish`.
