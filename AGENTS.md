# AGENTS.md — Coding Agent Reference

This file documents conventions, commands, and guidelines for agents working in
the `@echecs/pgn` repository.

**Backlog:** See [`BACKLOG.md`](BACKLOG.md) for pending work items. Update it
after completing any work.

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

## Similar Libraries

Use these to cross-check output when testing:

- [`pgn-parser`](https://www.npmjs.com/package/pgn-parser) — PEG.js-based PGN
  parser with JS data structure output.
- [`chess.js`](https://www.npmjs.com/package/chess.js) — includes PGN
  parsing/serialisation as part of its full chess engine.
- [`chessops`](https://www.npmjs.com/package/chessops) — TypeScript library with
  async streaming PGN parser and game tree model.
- [`@chess-fu/pgn-parser`](https://www.npmjs.com/package/@chess-fu/pgn-parser) —
  PGN parser with SAN/LAN support.

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

## Code Style

### Formatting (Prettier)

- Single quotes for strings
- Trailing commas everywhere (`trailingComma: 'all'`)
- `quoteProps: 'consistent'`
- Prose wrapping always in markdown

Prettier runs automatically on commit via `lint-staged`.

### Imports

- **ESM-only** — the package ships only ESM. Do not add a CJS build.
  `grammar.cjs` is an internal Peggy artefact, not a published entry point.
- Always include `.js` extensions on relative imports (NodeNext resolution).
- Import order enforced by `eslint-plugin-import-x` — violation is an error:
  1. Built-ins and external packages
  2. Internal aliases (`@/**`)
  3. Parent and sibling paths
  4. Type-only imports
  - Each group separated by a blank line.
- Named imports must be sorted alphabetically (`sort-imports` rule).
- Use `import type` for type-only imports — mixing type/value in one import
  statement is an error (`@typescript-eslint/consistent-type-imports`).

```typescript
// Correct
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import parse from '../index.js';

// Wrong — missing 'type', wrong extension, mixed type/value
import { Parser, type Grammar } from './grammar';
```

### TypeScript

- **Strict mode** on: `strict`, `noUncheckedIndexedAccess`,
  `noImplicitOverride`.
- `noImplicitAny` is **off** — relaxed for Peggy action block interop.
- All exported functions must have explicit return types
  (`@typescript-eslint/explicit-module-boundary-types` is an error).
- Prefer `interface` for object shapes, `type` for unions/aliases.
- Avoid `!` non-null assertions; use explicit narrowing or optional chaining
  (`@typescript-eslint/no-non-null-assertion` is a warning).
- `@ts-expect-error` is acceptable only at Peggy grammar interop boundaries.

### Naming Conventions

- **Files**: `camelCase.ts` for source, `kebab-case.pgn` for fixtures.
- **Types / Interfaces**: `PascalCase`.
- **Variables and functions**: `camelCase`.
- **Grammar rule names**: `SCREAMING_SNAKE_CASE`.
- **Object keys**: sorted alphabetically — `sort-keys` is an error in source,
  relaxed in tests.

```typescript
// Correct — keys sorted
const move = { capture: true, from: 'e', piece: 'P', to: 'd5' };

// Wrong — unsorted
const move = { piece: 'P', to: 'd5', capture: true };
```

### Other Rules

- `curly: 'all'` — always use braces, even for single-line `if` bodies.
- `eqeqeq` — use `===` / `!==`, never `==`.
- No `console.log` (`no-console` is a warning). Use `console.warn` only for
  expected diagnostic output (e.g. move number mismatches in the grammar).
- The parser is fully **synchronous** — do not introduce `async`/`await`
  anywhere in `src/index.ts` or `src/grammar.pegjs`.

### Error Handling

- `parse()` returns `[]` on any parse failure — it never throws to callers.
  Errors are caught and silenced in `src/parse.ts`.

---

## Validation

Input validation is mostly provided by TypeScript's strict type system at
compile time. There is no runtime validation library — the type signatures
enforce correct usage. Do not add runtime type-checking guards (e.g. `typeof`
checks, assertion functions) unless there is an explicit trust boundary. The
Peggy grammar handles syntactic validation of PGN input at parse time.

---

## Testing Conventions

- Tests use **vitest** with file snapshots (`toMatchFileSnapshot`).
- Each of the 13 PGN fixtures has one snapshot file in
  `src/__tests__/__snapshots__/`.
- A 15-second per-test timeout accommodates `long.pgn` (~3 500 games).
- Benchmarks (`*.bench.ts`) are never run in CI.
- `sort-keys` and `no-console` are relaxed inside `__tests__/`.

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

7. **CI takes over:** GitHub Actions detects the version bump, runs format →
   lint → test, and publishes to npm.

Do not manually publish with `npm publish`.
