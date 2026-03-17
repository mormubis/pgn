# Stringify Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Add a `stringify(input: PGN | PGN[], options?: ParseOptions): string`
export that converts parsed PGN objects back to valid PGN strings with semantic
fidelity.

**Architecture:** Split `src/index.ts` into focused modules (`src/types.ts`,
`src/parse.ts`, `src/stream.ts`), then implement `src/stringify.ts` with helpers
for tags, SAN, move lists, and comment commands. All tests must pass throughout.
Public API unchanged — `src/index.ts` becomes a thin re-export barrel.

**Tech Stack:** TypeScript, vitest, pnpm

---

### Task 1: Extract types into `src/types.ts`

**Files:**

- Create: `src/types.ts`
- Modify: `src/index.ts`

**Step 1: Create `src/types.ts`** with all type definitions currently in
`src/index.ts` lines 1–88:

```typescript
export type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
export type Piece = 'B' | 'K' | 'N' | 'P' | 'Q' | 'R';
export type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
export type Result = '1-0' | '0-1' | '1/2-1/2' | '?';
export type Square = `${File}${Rank}`;
export type Disambiguation = Square | File | Rank;

export type AnnotationColor = 'B' | 'C' | 'G' | 'O' | 'R' | 'Y';

export interface Arrow {
  color: AnnotationColor;
  from: string;
  to: string;
}

export interface SquareAnnotation {
  color: AnnotationColor;
  square: string;
}

export type Eval =
  | { depth?: number; type: 'cp'; value: number }
  | { depth?: number; type: 'mate'; value: number };

export interface Meta {
  Result?: Result;
  [key: string]: string | undefined;
}

export interface Move {
  annotations?: string[];
  arrows?: Arrow[];
  capture?: boolean;
  castling?: boolean;
  check?: boolean;
  checkmate?: boolean;
  clock?: number;
  comment?: string;
  eval?: Eval;
  from?: Disambiguation;
  piece: Piece;
  promotion?: Piece;
  squares?: SquareAnnotation[];
  to: Square;
  variants?: Variation;
}

export type MovePair = [number, Move | undefined, Move?];
export type MoveList = MovePair[];

export interface PGN {
  meta: Meta;
  moves: MoveList;
  result: 1 | 0 | 0.5 | '?';
}

export type Variation = MoveList[];

export interface ParseError {
  column: number;
  line: number;
  message: string;
  offset: number;
}

export interface ParseOptions {
  onError?: (error: ParseError) => void;
  onWarning?: (warning: ParseWarning) => void;
}

export interface ParseWarning {
  column: number;
  line: number;
  message: string;
  offset: number;
}
```

Note: `File`, `Piece`, `Rank`, `Result`, `Square`, `Disambiguation` were
previously unexported — they should now be exported from `types.ts` since
`stringify.ts` will need them. This is not a public API change since `index.ts`
controls what is re-exported.

**Step 2: Update `src/index.ts`** to import types from `./types.js` and remove
the inline type declarations. Keep all function implementations in `index.ts`
for now — this task only moves types.

```typescript
import type {
  Disambiguation,
  Eval,
  Meta,
  Move,
  MoveList,
  MovePair,
  PGN,
  Piece,
  Result,
  Square,
  Variation,
} from './types.js';
export type {
  AnnotationColor,
  Arrow,
  Eval,
  ParseError,
  ParseOptions,
  ParseWarning,
  PGN,
  SquareAnnotation,
} from './types.js';
```

**Step 3: Run lint and tests**

```bash
pnpm lint:ci && pnpm test
```

Expected: lint clean, all 126 tests pass. No behaviour change.

**Step 4: Commit**

```bash
git add src/types.ts src/index.ts
git commit -m "refactor: extract types into src/types.ts"
```

---

### Task 2: Extract `parse()` into `src/parse.ts`

**Files:**

- Create: `src/parse.ts`
- Modify: `src/index.ts`

**Step 1: Create `src/parse.ts`** by moving these functions from `src/index.ts`:

- `STR_TAGS` constant
- `warnMissingSTR()`
- `RESULT_TO_STR` constant
- `warnResultMismatch()`
- `CAL_CSL_RE`, `CLK_RE`, `EVAL_RE` constants
- `CommentFields` interface
- `parseCommentCommands()`
- `processMoveList()`
- `processComments()`
- `toParseError()`
- `parse()` default export

Add all necessary imports at the top:

```typescript
import parser from './grammar.cjs';
import type { Eval, Meta, Move, MoveList, PGN, Result } from './types.js';
export type { ParseError, ParseOptions, ParseWarning } from './types.js';
import type {
  AnnotationColor,
  Arrow,
  ParseError,
  ParseOptions,
  ParseWarning,
  SquareAnnotation,
} from './types.js';
```

Export `parse` as the default export and also `RESULT_TO_STR` (needed by
`stringify.ts` later) and `STR_TAGS`.

**Step 2: Update `src/index.ts`** to import from `./parse.js`:

```typescript
export { default, RESULT_TO_STR, STR_TAGS } from './parse.js';
```

**Step 3: Run lint and tests**

```bash
pnpm lint:ci && pnpm test
```

Expected: lint clean, all 126 tests pass.

**Step 4: Commit**

```bash
git add src/parse.ts src/index.ts
git commit -m "refactor: extract parse() into src/parse.ts"
```

---

### Task 3: Extract `stream()` into `src/stream.ts`

**Files:**

- Create: `src/stream.ts`
- Modify: `src/index.ts`

**Step 1: Create `src/stream.ts`** by moving `StringReadableStream`,
`readableStreamToIterable()`, and `stream()` from `src/index.ts`.

Add imports:

```typescript
import type { ParseOptions, PGN } from './types.js';
import parse from './parse.js';
```

Export `stream` as a named export.

**Step 2: Update `src/index.ts`**:

```typescript
export { stream } from './stream.js';
```

**Step 3: Run lint and tests**

```bash
pnpm lint:ci && pnpm test
```

Expected: lint clean, all 126 tests pass.

**Step 4: Commit**

```bash
git add src/stream.ts src/index.ts
git commit -m "refactor: extract stream() into src/stream.ts"
```

---

### Task 4: Write failing tests for `stringify` — tags and result

**Files:**

- Create: `src/__tests__/stringify.spec.ts`

**Step 1: Create `src/__tests__/stringify.spec.ts`** with the first batch of
tests. The `stringify` export does not exist yet — these tests must fail with
"stringify is not a function" or similar.

```typescript
import { describe, expect, it } from 'vitest';

import parse, { stringify } from '../index.js';

describe('stringify', () => {
  describe('tags', () => {
    it('emits STR tags first in spec order', () => {
      const pgn =
        '[Event "Test"]\n[Site "??"]\n[Date "2024.01.01"]\n[Round "1"]\n[White "A"]\n[Black "B"]\n[Result "1-0"]\n\n1. e4 1-0';
      const result = parse(pgn);
      const output = stringify(result);
      const lines = output.split('\n');
      expect(lines[0]).toBe('[Event "Test"]');
      expect(lines[1]).toBe('[Site "??"]');
      expect(lines[2]).toBe('[Date "2024.01.01"]');
      expect(lines[3]).toBe('[Round "1"]');
      expect(lines[4]).toBe('[White "A"]');
      expect(lines[5]).toBe('[Black "B"]');
      expect(lines[6]).toBe('[Result "1-0"]');
    });

    it('emits extra tags after STR in alphabetical order', () => {
      const pgn =
        '[Event "Test"]\n[Site "?"]\n[Date "?"]\n[Round "?"]\n[White "?"]\n[Black "?"]\n[Result "*"]\n[Zebra "last"]\n[Annotator "first"]\n\n*';
      const result = parse(pgn);
      const output = stringify(result);
      const lines = output.split('\n');
      expect(lines[7]).toBe('[Annotator "first"]');
      expect(lines[8]).toBe('[Zebra "last"]');
    });

    it('omits tags with undefined values', () => {
      const pgn = '1. e4 1-0';
      const result = parse(pgn);
      const output = stringify(result);
      expect(output).not.toContain('[Event');
    });

    it('emits correct result termination markers', () => {
      const cases: Array<[string, string]> = [
        ['1-0', '1-0'],
        ['0-1', '0-1'],
        ['1/2-1/2', '1/2-1/2'],
        ['*', '*'],
      ];
      for (const [tag, marker] of cases) {
        const pgn = `[Result "${tag}"]\n\n${marker}`;
        const [game] = parse(pgn);
        expect(stringify(game!)).toContain(marker);
      }
    });
  });
});
```

**Step 2: Run to verify tests fail**

```bash
pnpm test -- --reporter=verbose -t "stringify"
```

Expected: FAIL — `stringify` is not exported from `../index.js`.

---

### Task 5: Write failing tests for `stringify` — SAN reconstruction

**Files:**

- Modify: `src/__tests__/stringify.spec.ts`

**Step 1: Add SAN tests** inside the `describe('stringify')` block:

```typescript
describe('SAN reconstruction', () => {
  function stringifyMove(san: string): string {
    const pgn = `1. ${san} e5 1-0`;
    const [game] = parse(pgn);
    const output = stringify(game!);
    // extract the first move from the movetext
    return output.split('\n\n')[1]!.split(' ')[1]!;
  }

  it('serializes a simple piece move', () => {
    expect(stringifyMove('Nf3')).toBe('Nf3');
  });

  it('serializes a pawn push', () => {
    expect(stringifyMove('e4')).toBe('e4');
  });

  it('serializes a piece capture', () => {
    expect(stringifyMove('Nxf3')).toBe('Nxf3');
  });

  it('serializes a pawn capture', () => {
    const pgn = '1. e4 d5 2. exd5 1-0';
    const [game] = parse(pgn);
    const output = stringify(game!);
    expect(output).toContain('exd5');
  });

  it('serializes kingside castling', () => {
    const pgn = '1. e4 e5 2. Nf3 Nf6 3. Bc4 Bc5 4. O-O 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).toContain('O-O');
  });

  it('serializes queenside castling', () => {
    const pgn = '1. d4 d5 2. Nc3 Nc6 3. Bf4 Bf5 4. Qd2 Qd7 5. O-O-O 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).toContain('O-O-O');
  });

  it('serializes promotion', () => {
    const pgn = '[Result "1-0"]\n\n1. e4 e5 2. e8=Q 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).toContain('e8=Q');
  });

  it('serializes check indicator', () => {
    const pgn = '1. e4 e5 2. Qh5+ 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).toContain('Qh5+');
  });

  it('serializes checkmate indicator', () => {
    const pgn = '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).toContain('Qxf7#');
  });

  it('serializes file disambiguation', () => {
    const pgn = '1. Nbd7 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).toContain('Nbd7');
  });

  it('serializes rank disambiguation', () => {
    const pgn = '1. N1f3 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).toContain('N1f3');
  });

  it('serializes full-square disambiguation', () => {
    const pgn = '1. Nb1d2 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).toContain('Nb1d2');
  });
});
```

**Step 2: Run to verify tests fail**

```bash
pnpm test -- --reporter=verbose -t "SAN reconstruction"
```

Expected: FAIL.

---

### Task 6: Write failing tests for `stringify` — move numbers, NAGs, comments, RAVs

**Files:**

- Modify: `src/__tests__/stringify.spec.ts`

**Step 1: Add remaining tests** inside `describe('stringify')`:

```typescript
describe('move numbers', () => {
  it('always prefixes white moves with N.', () => {
    const pgn = '1. e4 e5 2. Nf3 1-0';
    const [game] = parse(pgn);
    const output = stringify(game!);
    expect(output).toContain('1. e4');
    expect(output).toContain('2. Nf3');
  });

  it('prefixes black move with N... only after annotation', () => {
    const pgn = '1. e4 { comment } 1... e5 1-0';
    const [game] = parse(pgn);
    const output = stringify(game!);
    expect(output).toContain('1...');
  });

  it('does not prefix black move with N... when no annotation between', () => {
    const pgn = '1. e4 e5 1-0';
    const [game] = parse(pgn);
    const output = stringify(game!);
    expect(output).not.toContain('1...');
  });
});

describe('NAGs', () => {
  it('serializes a single NAG after the move', () => {
    const pgn = '1. e4 $1 e5 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).toContain('e4 $1');
  });

  it('serializes multiple NAGs after the move', () => {
    const pgn = '1. e4 $1 $6 e5 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).toContain('e4 $1 $6');
  });
});

describe('comments and annotations', () => {
  it('serializes a plain comment', () => {
    const pgn = '1. e4 { great move } e5 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).toContain('{ great move }');
  });

  it('serializes [%cal] arrows', () => {
    const pgn = '1. e4 { [%cal Ge2e4] } e5 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).toContain('[%cal Ge2e4]');
  });

  it('serializes [%csl] squares', () => {
    const pgn = '1. e4 { [%csl Rd4] } e5 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).toContain('[%csl Rd4]');
  });

  it('serializes [%clk] clock from seconds', () => {
    const pgn = '1. e4 { [%clk 1:00:00] } e5 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).toContain('[%clk 1:00:00]');
  });

  it('serializes [%clk] with sub-second precision', () => {
    const pgn = '1. e4 { [%clk 0:00:01.5] } e5 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).toContain('[%clk 0:00:01.5]');
  });

  it('serializes [%eval] centipawn', () => {
    const pgn = '1. e4 { [%eval 0.82] } e5 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).toContain('[%eval 0.82]');
  });

  it('serializes [%eval] mate', () => {
    const pgn = '1. e4 { [%eval #3] } e5 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).toContain('[%eval #3]');
  });

  it('serializes [%eval] mate with depth', () => {
    const pgn = '1. e4 { [%eval #1,5] } e5 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).toContain('[%eval #1,5]');
  });

  it('serializes all annotation commands and text together', () => {
    const pgn =
      '1. e4 { [%cal Ge2e4] [%csl Rd4] [%clk 0:10:00] [%eval 0.50] good move } e5 1-0';
    const [game] = parse(pgn);
    const output = stringify(game!);
    expect(output).toContain('[%cal Ge2e4]');
    expect(output).toContain('[%csl Rd4]');
    expect(output).toContain('[%clk 0:10:00]');
    expect(output).toContain('[%eval 0.50]');
    expect(output).toContain('good move');
  });

  it('emits no comment block when move has no annotations', () => {
    const pgn = '1. e4 e5 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).not.toContain('{');
  });
});

describe('RAVs', () => {
  it('serializes a single variation', () => {
    const pgn = '1. e4 (1. d4 d5) e5 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).toContain('(1. d4');
  });

  it('serializes nested variations', () => {
    const pgn = '1. e4 (1. d4 (1. c4 c5) d5) e5 1-0';
    const [game] = parse(pgn);
    expect(stringify(game!)).toContain('(1. c4');
  });
});

describe('warnings', () => {
  it('fires onWarning for bad castling destination', () => {
    const warnings: string[] = [];
    // Manually construct a game with invalid castling
    const [game] = parse('1. e4 e5 1-0');
    // Inject an invalid castling move
    const move = game!.moves[0]![1]!;
    (move as any).castling = true;
    (move as any).to = 'e4'; // not a valid castling destination
    stringify(game!, { onWarning: (w) => warnings.push(w.message) });
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('fires onWarning for negative clock and clamps to 0', () => {
    const warnings: string[] = [];
    const [game] = parse('1. e4 { [%clk 0:01:00] } e5 1-0');
    game!.moves[0]![1]!.clock = -5;
    const output = stringify(game!, {
      onWarning: (w) => warnings.push(w.message),
    });
    expect(warnings.length).toBeGreaterThan(0);
    expect(output).toContain('[%clk 0:00:00]');
  });
});

describe('multiple games', () => {
  it('separates multiple games with a blank line', () => {
    const pgn = '[Result "1-0"]\n\n1. e4 1-0\n\n[Result "0-1"]\n\n1. d4 0-1';
    const games = parse(pgn);
    const output = stringify(games);
    expect(output.split('[Result').length).toBe(3); // header + 2 games
  });
});

describe('round-trip', () => {
  it('parse → stringify → parse produces equivalent games for basic.pgn', () => {
    const { readFileSync } = require('node:fs');
    const pgn = readFileSync(require.resolve('./grammar/basic.pgn'), 'utf8');
    const original = parse(pgn);
    const roundTripped = parse(stringify(original));
    expect(roundTripped).toHaveLength(original.length);
    for (let i = 0; i < original.length; i++) {
      expect(roundTripped[i]!.result).toBe(original[i]!.result);
      expect(roundTripped[i]!.moves).toHaveLength(original[i]!.moves.length);
    }
  });
});
```

**Step 2: Run to verify tests fail**

```bash
pnpm test -- --reporter=verbose -t "stringify"
```

Expected: FAIL.

---

### Task 7: Implement `src/stringify.ts`

**Files:**

- Create: `src/stringify.ts`

**Step 1: Create `src/stringify.ts`**

```typescript
import type {
  Eval,
  Meta,
  Move,
  MoveList,
  MovePair,
  PGN,
  ParseOptions,
} from './types.js';

const STR_TAGS = [
  'Event',
  'Site',
  'Date',
  'Round',
  'White',
  'Black',
  'Result',
] as const;

const RESULT_TO_MARKER: Readonly<Record<string, string>> = {
  '0': '0-1',
  '0.5': '1/2-1/2',
  '1': '1-0',
  '?': '*',
};

// ─── Tags ────────────────────────────────────────────────────────────────────

function stringifyTags(meta: Meta): string {
  const lines: string[] = [];

  // STR tags first in spec order
  for (const key of STR_TAGS) {
    const value = meta[key];
    if (value !== undefined) {
      lines.push(`[${key} "${value}"]`);
    }
  }

  // Remaining tags in alphabetical order
  const strSet = new Set<string>(STR_TAGS);
  for (const key of Object.keys(meta).sort()) {
    if (!strSet.has(key)) {
      const value = meta[key];
      if (value !== undefined) {
        lines.push(`[${key} "${value}"]`);
      }
    }
  }

  return lines.join('\n');
}

// ─── SAN ─────────────────────────────────────────────────────────────────────

const KINGSIDE_SQUARES = new Set(['g1', 'g8']);
const QUEENSIDE_SQUARES = new Set(['c1', 'c8']);

function stringifySAN(move: Move, options?: ParseOptions): string {
  if (move.castling) {
    if (KINGSIDE_SQUARES.has(move.to)) {
      return applyIndicators('O-O', move);
    }
    if (QUEENSIDE_SQUARES.has(move.to)) {
      return applyIndicators('O-O-O', move);
    }
    options?.onWarning?.({
      column: 1,
      line: 1,
      message: `Invalid castling destination: ${move.to}`,
      offset: 0,
    });
    return '';
  }

  let san = '';

  if (move.piece !== 'P') {
    san += move.piece;
    if (move.from !== undefined) {
      san += move.from;
    }
    if (move.capture) {
      san += 'x';
    }
    san += move.to;
  } else {
    // Pawn
    if (move.capture) {
      // from is a file for pawn captures
      san += (move.from ?? '') + 'x' + move.to;
    } else {
      if (!move.to) {
        options?.onWarning?.({
          column: 1,
          line: 1,
          message: 'Pawn move missing destination square',
          offset: 0,
        });
        return '';
      }
      san += move.to;
    }
    if (move.promotion !== undefined) {
      san += '=' + move.promotion;
    }
  }

  return applyIndicators(san, move);
}

function applyIndicators(san: string, move: Move): string {
  if (move.checkmate) {
    return san + '#';
  }
  if (move.check) {
    return san + '+';
  }
  return san;
}

// ─── Comment commands ─────────────────────────────────────────────────────────

function secondsToClk(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const sPad = Number.isInteger(s)
    ? String(s).padStart(2, '0')
    : s.toFixed(s < 10 ? 1 : undefined).padStart(4, '0');
  return `${h}:${String(m).padStart(2, '0')}:${sPad}`;
}

function stringifyEval(e: Eval): string {
  const depth = 'depth' in e && e.depth !== undefined ? `,${e.depth}` : '';
  if (e.type === 'mate') {
    return `[%eval #${e.value}${depth}]`;
  }
  return `[%eval ${e.value.toFixed(2)}${depth}]`;
}

function stringifyComment(move: Move, options?: ParseOptions): string {
  const parts: string[] = [];

  if (move.arrows && move.arrows.length > 0) {
    const tokens = move.arrows.map((a) => `${a.color}${a.from}${a.to}`);
    parts.push(`[%cal ${tokens.join(',')}]`);
  }

  if (move.squares && move.squares.length > 0) {
    const tokens = move.squares.map((s) => `${s.color}${s.square}`);
    parts.push(`[%csl ${tokens.join(',')}]`);
  }

  if (move.clock !== undefined) {
    let clock = move.clock;
    if (clock < 0) {
      options?.onWarning?.({
        column: 1,
        line: 1,
        message: `Negative clock value: ${clock}`,
        offset: 0,
      });
      clock = 0;
    }
    parts.push(`[%clk ${secondsToClk(clock)}]`);
  }

  if (move.eval !== undefined) {
    parts.push(stringifyEval(move.eval));
  }

  if (move.comment !== undefined) {
    parts.push(move.comment);
  }

  if (parts.length === 0) {
    return '';
  }

  return `{ ${parts.join(' ')} }`;
}

// ─── Move list ────────────────────────────────────────────────────────────────

function hasAnnotation(move: Move): boolean {
  return (
    (move.annotations !== undefined && move.annotations.length > 0) ||
    move.comment !== undefined ||
    move.arrows !== undefined ||
    move.squares !== undefined ||
    move.clock !== undefined ||
    move.eval !== undefined ||
    (move.variants !== undefined && move.variants.length > 0)
  );
}

function stringifyMoveList(moves: MoveList, options?: ParseOptions): string {
  const tokens: string[] = [];

  for (const pair of moves) {
    const [moveNumber, white, black] = pair;

    if (white !== undefined) {
      tokens.push(`${moveNumber}.`);
      tokens.push(stringifySAN(white, options));

      if (white.annotations && white.annotations.length > 0) {
        tokens.push(white.annotations.join(' '));
      }

      const whiteComment = stringifyComment(white, options);
      if (whiteComment) {
        tokens.push(whiteComment);
      }

      if (white.variants && white.variants.length > 0) {
        for (const variation of white.variants) {
          tokens.push(`(${stringifyMoveList(variation, options)})`);
        }
      }
    }

    if (black !== undefined) {
      // Black needs a move number indication if there was annotation after white
      const needsMoveNumber = white === undefined || hasAnnotation(white);

      if (needsMoveNumber) {
        tokens.push(`${moveNumber}...`);
      }

      tokens.push(stringifySAN(black, options));

      if (black.annotations && black.annotations.length > 0) {
        tokens.push(black.annotations.join(' '));
      }

      const blackComment = stringifyComment(black, options);
      if (blackComment) {
        tokens.push(blackComment);
      }

      if (black.variants && black.variants.length > 0) {
        for (const variation of black.variants) {
          tokens.push(`(${stringifyMoveList(variation, options)})`);
        }
      }
    }
  }

  return tokens.join(' ');
}

// ─── Public API ───────────────────────────────────────────────────────────────

function stringifyOne(game: PGN, options?: ParseOptions): string {
  const tags = stringifyTags(game.meta);
  const movetext = stringifyMoveList(game.moves, options);
  const result = RESULT_TO_MARKER[String(game.result)] ?? '*';
  const header = tags.length > 0 ? tags + '\n\n' : '';
  return `${header}${movetext} ${result}\n`;
}

export function stringify(input: PGN | PGN[], options?: ParseOptions): string {
  if (Array.isArray(input)) {
    return input.map((game) => stringifyOne(game, options)).join('\n');
  }
  return stringifyOne(input, options);
}
```

**Step 2: Run the tests**

```bash
pnpm test -- --reporter=verbose -t "stringify"
```

Expected: most tests should pass. Note any failures and fix them.

**Step 3: Run lint**

```bash
pnpm lint:ci
```

Fix any issues.

**Step 4: Do NOT commit yet** — wait for Task 8 to wire up the export.

---

### Task 8: Export `stringify` from `src/index.ts`

**Files:**

- Modify: `src/index.ts`

**Step 1: Add export to `src/index.ts`**

```typescript
export { stringify } from './stringify.js';
```

**Step 2: Run full test suite**

```bash
pnpm lint:ci && pnpm test
```

Expected: lint clean, all tests pass including all stringify tests.

**Step 3: Commit**

```bash
git add src/stringify.ts src/index.ts src/__tests__/stringify.spec.ts
git commit -m "feat: add stringify() to serialize PGN objects to string"
```

---

### Task 9: Bump version, update CHANGELOG and README, push

**Step 1: Bump minor version** (new public export)

```bash
npm version minor --no-git-tag-version
```

Expected: `4.0.0` — this is a major version because we are also splitting
`src/index.ts` into multiple files, which could affect consumers who import
internal paths (though that was never supported). If the team prefers `3.10.0`,
use `pnpm version minor` instead.

Actually: the public API only gains `stringify` (additive) and the file split is
internal. Use **minor**:

```bash
npm version minor --no-git-tag-version
```

Expected: `3.10.0`.

**Step 2: Update `CHANGELOG.md`**

Add under `## [Unreleased]`:

```markdown
## [3.10.0] - 2026-03-17

### Added

- `stringify(input: PGN | PGN[], options?: ParseOptions): string` — converts
  parsed PGN objects back to valid PGN strings (semantic round-trip fidelity).
  Accepts a single game or an array. Reconstructs SAN from `Move` fields,
  re-serializes annotation commands (`[%cal]`, `[%csl]`, `[%clk]`, `[%eval]`)
  back into comment blocks, and preserves RAVs and NAGs.

### Changed

- `src/index.ts` refactored into focused internal modules (`src/types.ts`,
  `src/parse.ts`, `src/stream.ts`, `src/stringify.ts`). Public API unchanged.
```

**Step 3: Update `README.md`**

Add `stringify` to the API section documenting:

- Signature: `stringify(input: PGN | PGN[], options?: ParseOptions): string`
- Brief description: converts parsed PGN objects back to PGN strings
- Note that `onWarning` fires for recoverable issues (invalid castling, negative
  clock)
- Small example showing round-trip usage

**Step 4: Run full verification**

```bash
pnpm lint:ci && pnpm test
```

Expected: lint clean, all tests pass.

**Step 5: Commit and push**

```bash
git add CHANGELOG.md package.json README.md
git commit -m "chore: bump version to 3.10.0 and update docs"
git push
```
