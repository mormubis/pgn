# @echecs/pgn Improvements Design

**Date**: 2026-03-14 **Status**: Approved **Scope**: Three independent
improvements in priority order

---

## Overview

Three improvements to `@echecs/pgn` v3.4.0:

1. **TypeScript type fixes** — correct `Move.from`, tighten `Moves` and
   `Variation`
2. **Performance** — eliminate post-match regex in `SAN`, micro-optimise
   `pairMoves`
3. **Streaming API** — new `stream()` async generator export

Each is independent and can be implemented and released separately.

---

## 1. TypeScript Type Fixes

### Problem

| Location    | Current type                             | Problem                                                                                                |
| ----------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `Move.from` | `File \| Rank`                           | Full-disambiguation moves (e.g. `Qd1xe4`) emit a `Square` (`"d1"`), which is not covered               |
| `Moves`     | `[number, Move] \| [number, Move, Move]` | Confusing — used as both a tuple type and an array element type; second element optionality is unclear |
| `Variation` | complex union                            | Hard to read; does not cleanly match runtime output                                                    |

### Solution

```typescript
// New alias — documents intent
type Disambiguation = Square | File | Rank;

interface Move {
  annotations?: string[];
  capture?: boolean;
  castling?: boolean;
  check?: boolean;
  checkmate?: boolean;
  comment?: string;
  from?: Disambiguation; // was: File | Rank
  piece: Piece;
  promotion?: Piece;
  to: Square;
  variants?: Variation;
}

// Rename Moves → MoveList; introduce MovePair tuple
type MovePair = [number, Move, Move?];
type MoveList = MovePair[];

interface PGN {
  meta: Meta;
  moves: MoveList;
  result: 1 | 0 | 0.5 | '?';
}

// Variation: one MoveList per RAV branch
type Variation = MoveList[];
```

### Compatibility

`Moves` → `MoveList` and the `Variation` simplification are breaking for callers
who imported those type aliases by name. Runtime behaviour is unchanged.
Warrants a minor version bump.

---

## 2. Performance: Eliminate Post-Match Regex in SAN

### Problem

The `SAN` Peggy rule matches the full SAN string, then re-parses it with a
JavaScript regex to extract fields. The regex runs on every move even for simple
pawn pushes like `e4` — redundant work since Peggy already consumed the
structure character by character.

### Solution

Split `SAN` into separate named rules. Each rule builds its result object
directly in its action block. No post-match regex.

```pegjs
SAN
  = CASTLING
  / PIECE_MOVE
  / PAWN_CAPTURE
  / PAWN_PUSH

CASTLING
  = "O-O-O" ind:[+#]?
  { return { castling: true, long: true, piece: 'K', to: 'O-O-O', … }; }
  / "O-O" ind:[+#]?
  { return { castling: true, long: false, piece: 'K', to: 'O-O', … }; }

PAWN_PUSH
  = file:[a-h] rank:[1-8] promo:("=" p:[NBRQ] { return p; })? ind:[+#]?
  { return { piece: 'P', to: file + rank, … }; }

PAWN_CAPTURE
  = from:[a-h] "x" file:[a-h] rank:[1-8] promo:(…)? ind:[+#]?
  { return { capture: true, from, piece: 'P', to: file + rank, … }; }

PIECE_MOVE
  = piece:[KQBNPR] disambig:DISAMBIG? cap:"x"? file:[a-h] rank:[1-8] promo:(…)? ind:[+#]?
  { return { capture: !!cap, from: disambig, piece, to: file + rank, … }; }

DISAMBIG
  = f:[a-h] r:[1-8] { return f + r; }
  / f:[a-h]         { return f; }
  / r:[1-8]         { return r; }
```

Also apply a micro-optimisation to `pairMoves`: pre-size the accumulator and
replace the `isWhite` branch with direct bit arithmetic for the write slot.

### Impact

Removes a regex execution on every move. Expected to close or eliminate the
remaining ~1.1–1.2x gap vs `pgn-parser` on move-heavy fixtures. Snapshots
require updating after this change.

---

## 3. Streaming API

### New export

```typescript
export async function* stream(
  input: AsyncIterable<string>,
): AsyncGenerator<PGN>
```

Accepts any `AsyncIterable<string>` (Node.js readable stream, fetch body, array
of chunks, etc.). Yields one `PGN` per completed game. Memory stays proportional
to one game at a time.

### Architecture

A thin buffer layer in front of the existing `parse()`. No grammar changes.

1. Consume chunks from `input`, appending to a rolling string buffer.
2. After each chunk, scan the buffer for game boundaries using a bracket-depth
   tracker to avoid false matches inside `{…}` comments.
3. A boundary is the `RESULT` token (`1-0`, `0-1`, `1/2-1/2`, `*`) followed by
   whitespace or end-of-input, at bracket depth 0.
4. Slice each complete game from the buffer, call `parse()`, and `yield` the
   single `PGN` object.
5. On iterator exhaustion, flush any remaining buffer content.

### Boundary detection

```typescript
const RESULT_RE = /(?:1-0|0-1|1\/2-1\/2|\*)(?=\s|$)/g;
```

Safe because `RESULT` tokens only appear at game end in well-formed PGN. A
bracket-depth counter guards against matches inside `{…}` comments.

### Edge cases

| Case                                 | Handling                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| Result token inside `{…}` comment    | Bracket-depth tracker prevents false split                                        |
| Chunk boundary splits a result token | Buffer accumulation — token not matched until complete                            |
| Malformed game                       | `parse()` returns `[]`; game silently skipped (consistent with existing contract) |
| Empty input                          | Generator returns without yielding                                                |

### Usage

```typescript
import { createReadStream } from 'node:fs';
import { stream } from '@echecs/pgn';

const chunks = createReadStream('database.pgn', { encoding: 'utf8' });
for await (const game of stream(chunks)) {
  console.log(game.meta.White, 'vs', game.meta.Black);
}
```

### Module exports

```typescript
export default parse; // existing — unchanged
export { stream }; // new named export
```

No `package.json` changes needed.

---

## Implementation Order

1. TypeScript types — `src/index.ts` only, no grammar changes, update snapshots
2. Performance — `src/grammar.pegjs` restructure + `pairMoves` micro-opt, update
   snapshots, run benchmarks
3. Streaming API — new `stream` function in `src/index.ts`, new test fixtures

Each step should pass `pnpm test` and `pnpm lint:ci` before moving to the next.
