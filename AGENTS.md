# AGENTS.md — Coding Agent Reference

This file documents conventions, commands, and guidelines for agents working in
the `@echecs/pgn` repository.

---

## Project Overview

`@echecs/pgn` is a PGN (Portable Game Notation) chess parser. It uses a
[Peggy](https://peggyjs.org/) PEG parser compiled from `src/grammar.pegjs`. The
public API is a single default export: `parse(input: string): PGN[]`.

Key source files:

| File                                | Role                                                      |
| ----------------------------------- | --------------------------------------------------------- |
| `src/index.ts`                      | Public `parse()` entry point and TypeScript types         |
| `src/grammar.pegjs`                 | Peggy grammar source — **edit this, not the `.cjs`**      |
| `src/grammar.cjs`                   | **Generated** — compiled from `grammar.pegjs`, gitignored |
| `src/__tests__/index.spec.ts`       | Snapshot test suite (13 fixtures)                         |
| `src/__tests__/index.bench.ts`      | Self-benchmarks                                           |
| `src/__tests__/comparison.bench.ts` | Cross-parser comparison benchmarks                        |
| `src/__tests__/grammar/`            | PGN fixture files used by tests                           |

---

## Commands

Use **pnpm** exclusively (no npm/yarn).

### Build

```bash
pnpm build              # compile grammar + emit dist/ via tsc
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

- Use **ESM** (`import`/`export`). The package is `"type": "module"`.
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
  Errors are caught and silenced in `src/index.ts`.

---

## Testing Conventions

- Tests use **vitest** with file snapshots (`toMatchFileSnapshot`).
- Each of the 13 PGN fixtures has one snapshot file in
  `src/__tests__/__snapshots__/`.
- A 15-second per-test timeout accommodates `long.pgn` (~3 500 games).
- Benchmarks (`*.bench.ts`) are never run in CI.
- `sort-keys` and `no-console` are relaxed inside `__tests__/`.

---

## Release Process

Releases are automated via GitHub Actions on pushes to `main`:

1. The workflow checks whether `version` in `package.json` changed.
2. If changed, it runs format → lint → test, then publishes to npm.
3. **Bump version before committing:**
   ```bash
   npm version <major|minor|patch> --no-git-tag-version
   ```

Husky hooks enforce quality locally:

- **pre-commit**: `lint-staged` (prettier + eslint --fix on staged files)
- **pre-push**: format, lint, test (full suite)
