# @echecs/pgn — Performance & Error Reporting Design

**Date**: 2026-03-15 **Status**: Approved **Scope**: Two independent
improvements in priority order

---

## Overview

Two improvements to `@echecs/pgn` v3.5.3:

1. **Performance** — eliminate per-move object allocation overhead in grammar
   action blocks, fix O(n²) boundary scan in `stream()`, and pre-size
   `pairMoves` accumulator
2. **Error reporting** — add an optional `onError` callback to `parse()` and
   `stream()` so callers can observe parse failures without breaking backward
   compatibility

Each is independent and will be implemented and released separately.

---

## 1. Performance

### Problem

The consistent ~1.1x gap vs `pgn-parser` on move-heavy fixtures comes from three
identifiable sources:

| Location                              | Issue                                                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MOVE` action block (`grammar.pegjs`) | `{ ...san }` spreads a throwaway intermediate object on every move before mutating it                                                                                     |
| `MOVE` action block                   | `nags.filter(Boolean)` and `comments.filter(Boolean).join(' ')` allocate intermediate arrays even when there are no annotations/comments (the overwhelmingly common case) |
| `stream()` (`index.ts`)               | `re.lastIndex = index` is reassigned inside the per-character depth-0 loop, potentially causing O(n²) regex work on dense result tokens                                   |
| `pairMoves` (`grammar.pegjs`)         | Accumulator grown via index assignment without pre-sizing; two-step slot writes                                                                                           |

### Changes

#### Grammar action blocks (`grammar.pegjs`)

Replace `{ number, long, ...move } = moves[i]` spread in `pairMoves` and the
`{ ...san }` spread in `MOVE` with direct in-place mutation of the object
already allocated by the SAN rule:

```pegjs
MOVE
  = num:NUMBER? _ san:SAN nags:(_ n:NAG { return n; })* comments:(_ c:COMMENT { return c; })*
  {
    if (num !== null) san.number = num;
    if (nags.length > 0) {
      const out = [];
      for (let i = 0; i < nags.length; i++) { if (nags[i]) out.push(nags[i]); }
      if (out.length > 0) san.annotations = out;
    }
    if (comments.length > 0) {
      let text = '';
      for (let i = 0; i < comments.length; i++) {
        if (comments[i]) text += (text ? ' ' : '') + comments[i];
      }
      if (text.length > 0) san.comment = text.replace(/\n/g, '');
    }
    return san;
  }
```

Replace `nags.filter(Boolean)` / `comments.filter(Boolean).join(' ')` with
explicit loops that allocate nothing on the empty case.

#### `pairMoves` (`grammar.pegjs`)

Pre-size the accumulator and eliminate the destructuring spread:

```js
function pairMoves(moves, start) {
  start = start ?? 0;
  const acc = new Array(Math.ceil((moves.length + (start & 1)) / 2));
  for (let i = 0; i < moves.length; i++) {
    const si = start + i;
    const isWhite = (si & 1) === 0;
    const index = (si - (isWhite ? 0 : 1)) >> 1;
    const slotIndex = index - (start >> 1);

    if (acc[slotIndex] === undefined) acc[slotIndex] = [index + 1, undefined];

    const move = moves[i];
    const { number, long } = move;
    delete move.number;
    delete move.long;

    if (number !== undefined && number !== index + 1) {
      console.warn(`Warning: Move number mismatch - ${number}`);
    }

    if (move.castling) {
      move.to = isWhite ? (long ? 'c1' : 'g1') : long ? 'c8' : 'g8';
    }

    if (move.variants) {
      move.variants = move.variants.map((variant) => pairMoves(variant, si));
    }

    acc[slotIndex][isWhite ? 1 : 2] = move;
  }
  return start === 0 ? acc : acc.slice(start >> 1);
}
```

#### `stream()` (`index.ts`)

Fix the O(n²) scan by separating the depth/string state update pass from the
result-token detection pass. Run a single forward regex scan from `lastIndex`
rather than re-anchoring the regex on every depth-0 character:

```typescript
function* extractGames(final: boolean): Generator<string> {
  // Pass 1: update depth/inString state for newly-seen characters (scanOffset → end)
  for (let i = scanOffset; i < buffer.length; i++) {
    const ch = buffer[i];
    if (inString) {
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '{') {
      depth++;
      continue;
    }
    if (ch === '}') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (ch === '"' && depth === 0) {
      inString = true;
      continue;
    }
  }
  scanOffset = buffer.length;

  // Pass 2: single regex scan from lastIndex to find result tokens at depth 0
  // (depth/inString tracking is already complete, so we can use a simpler
  //  single-pass approach — see implementation notes)
  // ...
}
```

The key fix: `re.lastIndex` advances monotonically forward per chunk; it is
never reset to a position before `lastIndex`.

### Expected impact

- Eliminates one heap allocation per move (the spread intermediate object)
- Eliminates array allocation per move for the common no-annotation case
- Reduces `stream()` scan from O(n²) worst-case to O(n) per chunk
- Pre-sizing `pairMoves` accumulator reduces V8 array growth reallocation

Snapshots do not change (output is identical). Benchmarks should be re-run after
each change to measure regression or improvement.

---

## 2. Error Reporting

### Problem

`parse()` catches all Peggy parse exceptions and returns `[]` with no observable
signal. For multi-game files this is especially lossy — a single malformed game
silently discards the error. `stream()` has the same silent-skip behavior.
Callers cannot distinguish an empty file from a parse failure.

### Changes

#### New types (`index.ts`)

```typescript
interface ParseError {
  message: string; // human-readable description from the Peggy parser
  offset: number; // character offset in the input string
  line: number; // 1-based line number
  column: number; // 1-based column number
}

interface ParseOptions {
  onError?: (error: ParseError) => void;
}
```

#### Updated signatures

```typescript
export default function parse(input: string, options?: ParseOptions): PGN[]

export async function* stream(
  input: AsyncIterable<string>,
  options?: ParseOptions,
): AsyncGenerator<PGN>
```

#### Helper

```typescript
function toParseError(e: unknown): ParseError {
  if (e && typeof e === 'object' && 'message' in e) {
    const { message, offset = 0, location } = e as any;
    return {
      message: String(message),
      offset,
      line: location?.start?.line ?? 1,
      column: location?.start?.column ?? 1,
    };
  }
  return { message: String(e), offset: 0, line: 1, column: 1 };
}
```

#### `parse()` change

```typescript
} catch (e) {
  options?.onError?.(toParseError(e));
  return [];
}
```

#### `stream()` change

Pass `options` through to the internal `parse()` call so per-game errors are
surfaced via the same callback.

### Compatibility

Fully backward-compatible. The `options` parameter is optional; omitting it
produces identical behavior to v3.5.3. No breaking change. Warrants a minor
version bump.

### Error information quality

Peggy's thrown parse errors include `message` (e.g.
`Expected "O-O" or [a-h] but "X" found`), `offset` (absolute character
position), and `location.start` (`{ line, column }`). These are surfaced
directly with no transformation beyond the shape normalization in
`toParseError`.

---

## Implementation Order

1. **Performance** — `grammar.pegjs` action block and `pairMoves` changes first,
   then `stream()` scan fix. Run `pnpm test` (no snapshot changes expected) and
   `pnpm bench` after each sub-step.
2. **Error reporting** — `src/index.ts` only, no grammar changes. Add
   `ParseError` / `ParseOptions` types, update `parse()` and `stream()`
   signatures, add tests.

Each step must pass `pnpm test` and `pnpm lint:ci` before merging.
