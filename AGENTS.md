# AGENTS.md — Coding Agent Reference

This file documents conventions, commands, and guidelines for agents working in
the `@echecs/pgn` repository.

---

## Project Overview

`@echecs/pgn` is a PGN (Portable Game Notation) chess parser. It tokenises PGN
input with a [moo](https://github.com/no-context/moo) lexer and parses it with a
[nearley](https://nearley.js.org/) Earley parser compiled from `src/grammar.ne`.
The public API is a single default export: `parse(input: string): PGN[]`.

Key source files:

| File                                | Role                                                   |
| ----------------------------------- | ------------------------------------------------------ |
| `src/index.ts`                      | Public `parse()` entry point and TypeScript types      |
| `src/lexer.ts`                      | Moo stateful lexer                                     |
| `src/grammar.ne`                    | Nearley grammar source (edit this, not the `.cjs`)     |
| `src/grammar.cjs`                   | **Generated** — compiled from `grammar.ne`, gitignored |
| `src/__tests__/index.spec.ts`       | Snapshot test suite                                    |
| `src/__tests__/index.bench.ts`      | Self-benchmarks                                        |
| `src/__tests__/comparison.bench.ts` | Cross-parser comparison benchmarks                     |
| `src/__tests__/grammar/`            | PGN fixture files used by tests                        |

---

## Commands

Use **pnpm** exclusively (no npm/yarn).

### Build

```bash
pnpm build              # compile grammar + emit dist/ via tsc
pnpm grammar:compile    # nearleyc src/grammar.ne -o src/grammar.cjs (only)
```

The grammar **must be recompiled** after any change to `src/grammar.ne` before
tests or the build will use a stale `.cjs`.

### Test

```bash
pnpm test               # grammar:compile + vitest run (all tests)
```

**Run a single test by name:**

```bash
pnpm test -- --reporter=verbose -t "basic"
```

The test name matches the fixture label (e.g. `basic`, `benko`, `checkmate`,
`comment`, `comments`, `games32`, `lichess`, `long`, `multiple`, `promotion`,
`single`, `twic`, `variants`).

**Update snapshots** (after intentional output changes):

```bash
pnpm test -- --update-snapshots
```

Snapshots live in `src/__tests__/__snapshots__/<label>.snap` and are committed
to git.

### Lint & Format

```bash
pnpm lint               # ESLint + tsc --noEmit
pnpm lint:ci            # same, zero warnings allowed
pnpm format             # prettier --write on all files
pnpm format:ci          # prettier --list-different (check only)
```

### Benchmarks

```bash
pnpm bench              # vitest bench --run (all benchmarks)
```

### Debug the lexer

```bash
# Place a PGN file at ./test.pgn, then:
npx tsx tokenizer.ts    # prints each token as TYPE("value")
```

---

## Grammar Workflow

Whenever `src/grammar.ne` is modified:

1. Run `pnpm grammar:compile` to regenerate `src/grammar.cjs`.
2. Run `pnpm test` to verify all 13 snapshots still match.
3. **Do not edit `src/grammar.cjs` directly** — it is generated and gitignored.

---

## Code Style

### Formatting (Prettier)

- Single quotes for strings
- Trailing commas everywhere (`trailingComma: 'all'`)
- `quoteProps: 'consistent'`
- Prose wrapping on in markdown

Prettier runs automatically on commit via `lint-staged`.

### Imports

- Use **ESM** (`import`/`export`). The package is `"type": "module"`.
- Import order is enforced by `eslint-plugin-import-x`:
  1. Built-ins and external packages (blank line)
  2. Internal aliases (`@/**`) (blank line)
  3. Parent and sibling paths (blank line)
  4. Type-only imports
- Named imports must be sorted alphabetically (`sort-imports`).
- Use `import type` for type-only imports
  (`@typescript-eslint/consistent-type-imports` is an error).

```typescript
// Correct
import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

import parse from '../index.js';

// Wrong — mixed type/value import without 'type'
import { Parser, type Grammar } from 'nearley';
```

- Always include `.js` extensions on relative imports (NodeNext module
  resolution).

### TypeScript

- **Strict mode** is on: `strict`, `noUncheckedIndexedAccess`,
  `noImplicitOverride`.
- `noImplicitAny` is **off** (relaxed for grammar interop code).
- Prefer `interface` for object shapes, `type` for unions/aliases.
- Avoid `!` non-null assertions; use explicit narrowing or optional chaining.
  `@typescript-eslint/no-non-null-assertion` is a warning.
- `@ts-expect-error` is acceptable only at nearley/moo interop boundaries (see
  `src/index.ts` and `src/lexer.ts`).

### Naming Conventions

- **Files**: `camelCase.ts` for source, `kebab-case.pgn` for fixtures.
- **Types / Interfaces**: `PascalCase`.
- **Variables and functions**: `camelCase`.
- **Grammar rule names**: `SCREAMING_SNAKE_CASE` (nearley convention).
- **Object keys**: sorted alphabetically (`sort-keys` ESLint rule is an error).

```typescript
// Correct — keys sorted
const move = {
  capture: true,
  from: 'e',
  piece: 'P',
  to: 'd5',
};

// Wrong — unsorted
const move = { piece: 'P', to: 'd5', capture: true };
```

### Error Handling

- The `parse()` function returns `[]` on any parse failure (no throws to
  callers). Errors from nearley are caught and silenced at `src/index.ts:59`.
- Do not add `console.log` calls; `no-console` is a warning. Use `console.warn`
  only for diagnostic messages that are expected in production (e.g. move number
  mismatches in the grammar).

### No async in the parser

The parser is fully synchronous. Do not introduce `async`/`await` into
`src/index.ts` or `src/lexer.ts`.

---

## Testing Conventions

- Tests use **vitest** with file snapshots (`toMatchFileSnapshot`).
- Each of the 13 PGN fixtures has one corresponding snapshot file.
- A 15-second per-test timeout is set to accommodate large files (`long.pgn` has
  ~3 500 games).
- After any change to parser output, update snapshots explicitly and review the
  diff before committing.
- Benchmarks (`*.bench.ts`) are separate from unit tests and are never run in
  CI.

---

## Release Process

Releases are automated via GitHub Actions on pushes to `main`:

1. The workflow checks whether `version` in `package.json` changed.
2. If changed, it runs format → lint → test, then publishes to npm.
3. **Bump the version with
   `npm version <major|minor|patch> --no-git-tag-version`** before committing,
   so the automation picks it up.

Husky hooks enforce quality locally:

- **pre-commit**: `lint-staged` (prettier + eslint --fix on staged files)
- **pre-push**: format, lint, test (full suite)
