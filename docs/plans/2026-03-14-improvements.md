# @echecs/pgn Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Fix TypeScript types, eliminate the post-match regex in the SAN
grammar rule for performance, and add a streaming `stream()` async generator
export.

**Architecture:** Three independent changes in sequence: (1) types-only edit to
`src/index.ts`; (2) grammar restructure in `src/grammar.pegjs` replacing the
monolithic `SAN` rule with typed sub-rules; (3) new `stream` export in
`src/index.ts` with a chunk-buffering boundary-detection layer over `parse()`.

**Tech Stack:** TypeScript, Peggy PEG parser, Vitest (snapshot + unit tests),
pnpm

---

## Task 1: Fix TypeScript Types

**Files:**

- Modify: `src/index.ts`

### Step 1: Open the file and review the current types

Read `src/index.ts`. Identify the four things to change:

- `type Moves` → split into `MovePair` + `MoveList`
- `Move.from?: File | Rank` → `from?: Disambiguation`
- `type Variation` → simplify to `MoveList[]`
- Add `type Disambiguation = Square | File | Rank`

### Step 2: Apply the type changes

Replace the type block in `src/index.ts` with:

```typescript
type Disambiguation = Square | File | Rank;
type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
type Piece = 'B' | 'K' | 'N' | 'P' | 'Q' | 'R';
type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
type Result = '1-0' | '0-1' | '1/2-1/2' | '?';
type Square = `${File}${Rank}`;

interface Meta {
  Result: Result;
  [key: string]: string;
}

interface Move {
  annotations?: string[];
  capture?: boolean;
  castling?: boolean;
  check?: boolean;
  checkmate?: boolean;
  comment?: string;
  from?: Disambiguation;
  piece: Piece;
  promotion?: Piece;
  to: Square;
  variants?: Variation;
}

type MovePair = [number, Move, Move?];
type MoveList = MovePair[];

interface PGN {
  meta: Meta;
  moves: MoveList;
  result: 1 | 0 | 0.5 | '?';
}

type Variation = MoveList[];
```

Keep the `parse()` function signature unchanged (`parse(input: string): PGN[]`).

### Step 3: Run lint and type-check

```bash
pnpm lint
```

Expected: no errors. The type changes should be internally consistent and not
affect the implementation.

### Step 4: Run tests

```bash
pnpm test
```

Expected: all 13 snapshot tests pass (types don't affect runtime output).

### Step 5: Commit

```bash
git add src/index.ts
git commit -m "fix: widen Move.from to Disambiguation, rename Moves to MoveList"
```

---

## Task 2: Refactor SAN Grammar Rule (Performance)

**Files:**

- Modify: `src/grammar.pegjs`

**Do not edit `src/grammar.cjs`** — it is generated. `pnpm test` recompiles
automatically.

### Step 2.1: Understand the current SAN rule

Read `src/grammar.pegjs` lines 114–160. The rule:

1. Matches the full SAN string as `s` using ordered alternatives
2. Then re-parses `s` with a JavaScript regex to extract fields

The goal is to eliminate step 2 by having each alternative build the result
object directly.

### Step 2.2: Replace the SAN rule

Replace the entire `SAN` rule block (lines 114–160) with the following:

```pegjs
// ─── SAN ─────────────────────────────────────────────────────────────────────

SAN
  = CASTLING
  / PIECE_MOVE
  / PAWN_CAPTURE
  / PAWN_PUSH

CASTLING
  = "O-O-O" ind:$[+#]?
  { return { castling: true, long: true, piece: 'K', to: 'O-O-O', ...(ind === '+' ? { check: true } : ind === '#' ? { checkmate: true } : {}) }; }
  / "O-O" ind:$[+#]?
  { return { castling: true, long: false, piece: 'K', to: 'O-O', ...(ind === '+' ? { check: true } : ind === '#' ? { checkmate: true } : {}) }; }

PIECE_MOVE
  = piece:$[KQBNPR] disambig:DISAMBIG? cap:"x"? file:$[a-h] rank:$[1-8] promo:PROMO? ind:$[+#]?
  {
    const to = file + rank;
    const result = { piece, to };
    if (disambig)        result.from      = disambig;
    if (cap)             result.capture   = true;
    if (promo)           result.promotion = promo;
    if (ind === '+')     result.check     = true;
    if (ind === '#')     result.checkmate = true;
    return result;
  }

PAWN_CAPTURE
  = from:$[a-h] "x" file:$[a-h] rank:$[1-8] promo:PROMO? ind:$[+#]?
  {
    const to = file + rank;
    const result = { capture: true, from, piece: 'P', to };
    if (promo)       result.promotion = promo;
    if (ind === '+') result.check     = true;
    if (ind === '#') result.checkmate = true;
    return result;
  }

PAWN_PUSH
  = file:$[a-h] rank:$[1-8] promo:PROMO? ind:$[+#]?
  {
    const to = file + rank;
    const result = { piece: 'P', to };
    if (promo)       result.promotion = promo;
    if (ind === '+') result.check     = true;
    if (ind === '#') result.checkmate = true;
    return result;
  }

DISAMBIG
  = f:$[a-h] r:$[1-8] { return f + r; }
  / $[a-h]
  / $[1-8]

PROMO
  = "=" p:$[NBRQ] { return p; }
```

### Step 2.3: Run tests (expect snapshot failures)

```bash
pnpm test
```

Expected: some snapshot tests **fail** because the grammar restructure may
change output for edge cases (e.g. `from` values for full-disambiguation moves
now correctly output a square string rather than whatever the old regex
produced). Note which snapshots fail.

### Step 2.4: Update snapshots

```bash
pnpm test -- --update-snapshots
```

Then manually review the diff of updated snapshots in
`src/__tests__/__snapshots__/` to confirm all changes are correct improvements
(e.g. `from: "d1"` instead of `from: "d"` for fully-disambiguated moves). If any
diff looks wrong, revisit the grammar rules.

```bash
git diff src/__tests__/__snapshots__/
```

### Step 2.5: Run lint

```bash
pnpm lint
```

Expected: no errors.

### Step 2.6: Commit

```bash
git add src/grammar.pegjs src/__tests__/__snapshots__/
git commit -m "perf: restructure SAN rule to eliminate post-match regex"
```

### Step 2.7 (optional): Run benchmarks and update BENCHMARK_RESULTS.md

```bash
pnpm bench
```

Takes ~60 seconds. Record results in `BENCHMARK_RESULTS.md` and commit.

```bash
git add BENCHMARK_RESULTS.md
git commit -m "docs: update benchmark results after SAN rule restructure"
```

---

## Task 3: Add `stream()` Async Generator Export

**Files:**

- Modify: `src/index.ts`
- Create: `src/__tests__/stream.spec.ts`

### Step 3.1: Write the failing tests first

Create `src/__tests__/stream.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { stream } from '../index.js';

async function chunksOf(s: string, size: number): AsyncGenerator<string> {
  for (let i = 0; i < s.length; i += size) {
    yield s.slice(i, i + size);
  }
}

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const results: T[] = [];
  for await (const item of gen) {
    results.push(item);
  }
  return results;
}

const singleGame = `[Event "Test"]
[White "A"]
[Black "B"]
[Result "1-0"]

1. e4 e5 2. Nf3 1-0`;

const twoGames = `[Event "Game 1"]
[Result "1-0"]

1. e4 1-0

[Event "Game 2"]
[Result "0-1"]

1. d4 0-1`;

describe('stream()', () => {
  it('yields one game from a single-game input', async () => {
    const games = await collect(stream(chunksOf(singleGame, 1024)));
    expect(games).toHaveLength(1);
    expect(games[0]?.meta['White']).toBe('A');
  });

  it('yields multiple games from a multi-game input', async () => {
    const games = await collect(stream(chunksOf(twoGames, 1024)));
    expect(games).toHaveLength(2);
    expect(games[0]?.meta['Event']).toBe('Game 1');
    expect(games[1]?.meta['Event']).toBe('Game 2');
  });

  it('handles chunks that split across game boundaries', async () => {
    // Use tiny chunk size to force splits at every possible boundary
    const games = await collect(stream(chunksOf(twoGames, 5)));
    expect(games).toHaveLength(2);
  });

  it('handles chunks that split a result token', async () => {
    // "1/2-1/2" can be split mid-token
    const draw = `[Event "Draw"]
[Result "1/2-1/2"]

1. e4 e5 1/2-1/2`;
    const games = await collect(stream(chunksOf(draw, 3)));
    expect(games).toHaveLength(1);
    expect(games[0]?.result).toBe(0.5);
  });

  it('skips result tokens inside comments', async () => {
    const withComment = `[Event "Test"]
[Result "1-0"]

1. e4 { This is 1-0 territory } e5 1-0`;
    const games = await collect(stream(chunksOf(withComment, 1024)));
    expect(games).toHaveLength(1);
  });

  it('yields nothing for empty input', async () => {
    async function* empty(): AsyncGenerator<string> {}
    const games = await collect(stream(empty()));
    expect(games).toHaveLength(0);
  });

  it('accepts a Node.js-style ReadableStream of strings', async () => {
    // Simulate by passing an array wrapped in an async generator
    async function* fromArray(arr: string[]): AsyncGenerator<string> {
      for (const chunk of arr) {
        yield chunk;
      }
    }
    const games = await collect(stream(fromArray([singleGame])));
    expect(games).toHaveLength(1);
  });
});
```

### Step 3.2: Run to confirm tests fail

```bash
pnpm test -- -t "stream"
```

Expected: FAIL — `stream` is not exported.

### Step 3.3: Implement `stream()` in `src/index.ts`

Add the following after the `parse()` function:

```typescript
/**
 * Stream-parse a PGN AsyncIterable, yielding one PGN object per game.
 * Memory usage stays proportional to one game at a time.
 *
 * @param input - Any AsyncIterable<string> (Node.js readable stream, fetch body, etc.)
 */
export async function* stream(
  input: AsyncIterable<string>,
): AsyncGenerator<PGN> {
  let buffer = '';
  let depth = 0; // bracket depth — tracks {…} comment nesting

  function* flush(final: boolean): Generator<string> {
    // Scan buffer for RESULT tokens at depth 0
    const re = /(?:1-0|0-1|1\/2-1\/2|\*)(?=[ \t\n\r]|$)/g;
    let lastIndex = 0;

    for (let i = 0; i < buffer.length; i++) {
      const ch = buffer[i];
      if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth = Math.max(0, depth - 1);
      } else if (depth === 0) {
        re.lastIndex = i;
        const m = re.exec(buffer);
        if (m && m.index === i) {
          const end = i + m[0].length;
          yield buffer.slice(lastIndex, end);
          lastIndex = end;
          i = end - 1; // outer loop will increment
        }
      }
    }

    if (final && lastIndex < buffer.length) {
      const remainder = buffer.slice(lastIndex).trim();
      if (remainder.length > 0) {
        yield remainder;
      }
    }

    buffer = buffer.slice(lastIndex);
  }

  for await (const chunk of input) {
    buffer += chunk;
    for (const gameStr of flush(false)) {
      const games = parse(gameStr);
      if (games.length > 0) {
        yield games[0] as PGN;
      }
    }
  }

  for (const gameStr of flush(true)) {
    const games = parse(gameStr);
    if (games.length > 0) {
      yield games[0] as PGN;
    }
  }
}
```

### Step 3.4: Run the stream tests

```bash
pnpm test -- -t "stream"
```

Expected: all stream tests pass.

### Step 3.5: Run full test suite

```bash
pnpm test
```

Expected: all 13 snapshot tests + all stream tests pass.

### Step 3.6: Run lint

```bash
pnpm lint
```

Fix any issues before committing.

### Step 3.7: Commit

```bash
git add src/index.ts src/__tests__/stream.spec.ts
git commit -m "feat: add stream() async generator export for incremental PGN parsing"
```

---

## Task 4: Version Bump and Changelog

### Step 4.1: Bump version

The type renames (`Moves` → `MoveList`, `Variation` simplification) are breaking
for callers who import those type aliases, so this warrants a minor bump (or
major if the project follows strict semver for type changes).

```bash
npm version minor --no-git-tag-version
```

### Step 4.2: Update CHANGELOG.md

Add a new `[Unreleased]` or version entry at the top of `CHANGELOG.md`:

```markdown
## [3.5.0] - 2026-03-14

### Added

- `stream(input: AsyncIterable<string>): AsyncGenerator<PGN>` — new named export
  for incremental, memory-efficient parsing of large PGN databases

### Changed

- `Move.from` widened from `File | Rank` to `Disambiguation`
  (`Square | File | Rank`) to correctly type fully-disambiguated moves (e.g.
  `Qd1xe4` → `from: "d1"`)
- `type Moves` renamed to `MoveList`; new `MovePair = [number, Move, Move?]`
  tuple
- `type Variation` simplified to `MoveList[]`

### Performance

- Restructured `SAN` grammar rule to eliminate post-match regex on every move;
  closes remaining ~1.1–1.2x gap vs `pgn-parser` on move-heavy fixtures
```

### Step 4.3: Commit

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 3.5.0 and update changelog"
```

---

## Verification Checklist

Before considering the work done:

- [ ] `pnpm lint:ci` — zero warnings
- [ ] `pnpm test` — all tests pass
- [ ] `pnpm build` — dist/ builds cleanly
- [ ] Snapshot diffs reviewed and confirmed correct
- [ ] `stream()` is visible in `dist/index.d.ts`
