# Comment Commands Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Parse `[%cal]`, `[%csl]`, `[%clk]`, and `[%eval]` embedded commands
from PGN comment strings and expose them as typed fields (`arrows`, `squares`,
`clock`, `eval`) on the `Move` object.

**Architecture:** Post-process comment strings in `src/index.ts` using regex
extraction. The grammar produces raw comment strings as today. A new
`parseCommentCommands()` function strips known command strings, returns
structured fields, and sets them on the move. Unknown commands are left in the
comment string unchanged.

**Tech Stack:** TypeScript, Peggy (grammar unchanged), vitest

---

### Task 1: Add type definitions

**Files:**

- Modify: `src/index.ts:3-27`

**Step 1: Add new types after the existing type aliases (line 8), before
`interface Meta`**

```typescript
type AnnotationColor = 'B' | 'G' | 'R' | 'Y';

interface Arrow {
  color: AnnotationColor;
  from: string;
  to: string;
}

interface SquareAnnotation {
  color: AnnotationColor;
  square: string;
}

type Eval =
  | { depth?: number; type: 'cp'; value: number }
  | { depth?: number; type: 'mate'; value: number };
```

Note: the new interface is named `SquareAnnotation` (not `Square`) to avoid
conflicting with the existing `type Square = \`${File}${Rank}\`` on line 7.

**Step 2: Add new optional fields to `interface Move` (currently lines 15-27)**

```typescript
interface Move {
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
```

Keys stay alphabetically sorted (existing ESLint rule).

**Step 3: Run lint**

```bash
pnpm lint:types
```

Expected: no new errors (fields are optional, no consumers broken).

**Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: add Arrow, SquareAnnotation, Eval types and Move fields"
```

---

### Task 2: Write failing tests for `[%cal]` and `[%csl]`

**Files:**

- Modify: `src/__tests__/index.spec.ts`

**Step 1: Add a new `describe` block for comment commands after the existing
tests**

```typescript
describe('comment commands', () => {
  it('parses [%cal] single arrow', () => {
    const pgn = '1. e4 { [%cal Ge2e4] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.arrows).toEqual([
      { color: 'G', from: 'e2', to: 'e4' },
    ]);
  });

  it('parses [%cal] multiple arrows with mixed colours', () => {
    const pgn = '1. e4 { [%cal Ge2e4,Ra1h1,Gb1b8] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.arrows).toEqual([
      { color: 'G', from: 'e2', to: 'e4' },
      { color: 'R', from: 'a1', to: 'h1' },
      { color: 'G', from: 'b1', to: 'b8' },
    ]);
  });

  it('parses [%csl] single square', () => {
    const pgn = '1. e4 { [%csl Rd4] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.squares).toEqual([
      { color: 'R', square: 'd4' },
    ]);
  });

  it('parses [%csl] multiple squares', () => {
    const pgn = '1. e4 { [%csl Rd4,Ge5,Yf6] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.squares).toEqual([
      { color: 'R', square: 'd4' },
      { color: 'G', square: 'e5' },
      { color: 'Y', square: 'f6' },
    ]);
  });

  it('parses [%csl] and [%cal] in the same comment', () => {
    const pgn = '1. e4 { [%csl Ga1][%cal Ra1h1,Gb1b8] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.squares).toEqual([
      { color: 'G', square: 'a1' },
    ]);
    expect(result[0]?.moves[0]?.[1]?.arrows).toEqual([
      { color: 'R', from: 'a1', to: 'h1' },
      { color: 'G', from: 'b1', to: 'b8' },
    ]);
  });
});
```

**Step 2: Run the new tests to verify they fail**

```bash
pnpm test -- --reporter=verbose -t "parses \[%cal\]|parses \[%csl\]"
```

Expected: FAIL — `arrows` and `squares` fields are `undefined`.

---

### Task 3: Write failing tests for `[%clk]` and `[%eval]`

**Files:**

- Modify: `src/__tests__/index.spec.ts`

**Step 1: Add clock and eval tests inside the same
`describe('comment commands')` block**

```typescript
it('parses [%clk] to seconds', () => {
  const pgn = '1. e4 { [%clk 3:25:45] } e5 1-0';
  const result = parse(pgn);
  expect(result[0]?.moves[0]?.[1]?.clock).toBe(12345);
});

it('parses [%clk] with sub-second precision', () => {
  const pgn = '1. e4 { [%clk 0:00:01.234] } e5 1-0';
  const result = parse(pgn);
  expect(result[0]?.moves[0]?.[1]?.clock).toBe(1.234);
});

it('parses [%eval] centipawn score', () => {
  const pgn = '1. e4 { [%eval -0.80] } e5 1-0';
  const result = parse(pgn);
  expect(result[0]?.moves[0]?.[1]?.eval).toEqual({ type: 'cp', value: -0.8 });
});

it('parses [%eval] mate with depth', () => {
  const pgn = '1. e4 { [%eval #1,5] } e5 1-0';
  const result = parse(pgn);
  expect(result[0]?.moves[0]?.[1]?.eval).toEqual({
    type: 'mate',
    value: 1,
    depth: 5,
  });
});

it('parses [%eval] negative mate', () => {
  const pgn = '1. e4 { [%eval #-2] } e5 1-0';
  const result = parse(pgn);
  expect(result[0]?.moves[0]?.[1]?.eval).toEqual({ type: 'mate', value: -2 });
});

it('[%eval] centipawn values 199-219 round-trip losslessly', () => {
  for (let cp = 199; cp <= 219; cp++) {
    const value = cp / 100;
    const pgn = `1. e4 { [%eval ${value.toFixed(2)}] } e5 1-0`;
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.eval).toEqual({ type: 'cp', value });
  }
});
```

**Step 2: Run to verify they fail**

```bash
pnpm test -- --reporter=verbose -t "parses \[%clk\]|parses \[%eval\]|round-trip"
```

Expected: FAIL — `clock` and `eval` are `undefined`.

---

### Task 4: Write failing tests for comment text handling

**Files:**

- Modify: `src/__tests__/index.spec.ts`

**Step 1: Add text-handling tests inside the same `describe('comment commands')`
block**

```typescript
it('strips commands from comment text', () => {
  const pgn = '1. e4 { Great move! [%cal Ge2e4] } e5 1-0';
  const result = parse(pgn);
  expect(result[0]?.moves[0]?.[1]?.comment).toBe('Great move!');
  expect(result[0]?.moves[0]?.[1]?.arrows).toEqual([
    { color: 'G', from: 'e2', to: 'e4' },
  ]);
});

it('omits comment field when only commands are present', () => {
  const pgn = '1. e4 { [%clk 1:00:00] } e5 1-0';
  const result = parse(pgn);
  expect(result[0]?.moves[0]?.[1]?.clock).toBe(3600);
  expect(result[0]?.moves[0]?.[1]?.comment).toBeUndefined();
});

it('leaves unknown commands in the comment string', () => {
  const pgn = '1. e4 { foo [%bar 1,2] baz } e5 1-0';
  const result = parse(pgn);
  expect(result[0]?.moves[0]?.[1]?.comment).toBe('foo [%bar 1,2] baz');
});

it('leaves malformed [%cal] token in comment and parses valid tokens', () => {
  const pgn = '1. e4 { [%cal ZZZ,Ge2e4] } e5 1-0';
  const result = parse(pgn);
  expect(result[0]?.moves[0]?.[1]?.arrows).toEqual([
    { color: 'G', from: 'e2', to: 'e4' },
  ]);
});
```

**Step 2: Run to verify they fail**

```bash
pnpm test -- --reporter=verbose -t "strips commands|omits comment|leaves unknown|malformed"
```

Expected: FAIL.

---

### Task 5: Implement `parseCommentCommands()`

**Files:**

- Modify: `src/index.ts`

**Step 1: Add the function before the `parse()` export (around line 133)**

```typescript
const CAL_CSL_RE =
  /\[%(?:cal|csl)\s+([BGRYRGYB][a-h][1-8](?:[a-h][1-8])?(?:,[BGRYRGYB][a-h][1-8](?:[a-h][1-8])?)*)\]/gi;

const CLK_RE = /\[%clk\s+(\d+):(\d{2}):(\d{2}(?:\.\d+)?)\]/i;

const EVAL_RE =
  /\[%eval\s+(?:#([+-]?\d+)|([+-]?(?:\d+\.?\d*|\.\d+)))(?:,(\d+))?\]/i;

interface CommentFields {
  arrows?: Arrow[];
  clock?: number;
  comment?: string;
  eval?: Eval;
  squares?: SquareAnnotation[];
}

function parseCommentCommands(raw: string): CommentFields {
  const result: CommentFields = {};
  let text = raw;

  // [%cal] and [%csl]
  const arrows: Arrow[] = [];
  const squares: SquareAnnotation[] = [];
  text = text.replace(CAL_CSL_RE, (match, tokens: string) => {
    for (const token of tokens.split(',')) {
      const color = token[0] as AnnotationColor;
      if (!color || !/^[BGRY]$/i.test(color)) {
        continue;
      }
      const rest = token.slice(1);
      if (rest.length === 2) {
        squares.push({ color, square: rest });
      } else if (rest.length === 4) {
        arrows.push({ color, from: rest.slice(0, 2), to: rest.slice(2) });
      }
      // malformed token — skip silently
    }
    return '';
  });
  if (arrows.length > 0) {
    result.arrows = arrows;
  }
  if (squares.length > 0) {
    result.squares = squares;
  }

  // [%clk]
  const clkMatch = CLK_RE.exec(text);
  if (clkMatch) {
    const h = parseInt(clkMatch[1]!, 10);
    const m = parseInt(clkMatch[2]!, 10);
    const s = parseFloat(clkMatch[3]!);
    result.clock = h * 3600 + m * 60 + s;
    text = text.replace(CLK_RE, '');
  }

  // [%eval]
  const evalMatch = EVAL_RE.exec(text);
  if (evalMatch) {
    const depth =
      evalMatch[3] !== undefined ? parseInt(evalMatch[3], 10) : undefined;
    if (evalMatch[1] !== undefined) {
      result.eval = {
        ...(depth !== undefined && { depth }),
        type: 'mate',
        value: parseInt(evalMatch[1], 10),
      };
    } else if (evalMatch[2] !== undefined) {
      result.eval = {
        ...(depth !== undefined && { depth }),
        type: 'cp',
        value: parseFloat(evalMatch[2]),
      };
    }
    text = text.replace(EVAL_RE, '');
  }

  // Clean up remaining text
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length > 0) {
    result.comment = trimmed;
  }

  return result;
}
```

**Step 2: Run lint to verify types are clean**

```bash
pnpm lint:types
```

Expected: no errors.

---

### Task 6: Wire `parseCommentCommands()` into the grammar action

The comment is assembled at `src/grammar.pegjs:171`:

```
if (text.length > 0) san.comment = text.replace(/\n/g, '');
```

This runs inside Peggy action code — TypeScript in a `.pegjs` file. The cleanest
approach is to keep the grammar producing the raw string and post-process it in
`src/index.ts` where `move.comment` is set. Look at where the grammar results
are consumed.

**Files:**

- Modify: `src/grammar.pegjs:50-65` (the `applyRaw` / move assembly block)

**Step 1: Find the grammar action that builds the final move object**

Read `src/grammar.pegjs:40-75` — the `MOVE` rule action assembles the final move
by copying fields from the raw SAN result:

```
if (raw.comment !== undefined) { move.comment = raw.comment; }
```

This is the integration point. Replace the single-field copy with a call that
spreads the parsed command fields:

```javascript
if (raw.comment !== undefined) {
  const fields = options.parseCommentCommands(raw.comment);
  if (fields.arrows !== undefined) {
    move.arrows = fields.arrows;
  }
  if (fields.clock !== undefined) {
    move.clock = fields.clock;
  }
  if (fields.eval !== undefined) {
    move.eval = fields.eval;
  }
  if (fields.squares !== undefined) {
    move.squares = fields.squares;
  }
  if (fields.comment !== undefined) {
    move.comment = fields.comment;
  }
}
```

But `parseCommentCommands` is defined in `index.ts`, not in the grammar. The
grammar already receives an `options` object — check what it receives.

**Step 2: Read `src/grammar.pegjs:1-30` to understand the options pattern**

The grammar receives `options.onWarning`. We can pass `parseCommentCommands` the
same way, or we can do the post-processing in `src/index.ts` after parsing, by
walking the returned `PGN[]` and processing each move's comment.

**Preferred approach: post-process in `index.ts` after `parser.parse()`**

Add a `processComments()` function that walks games and replaces raw comments:

```typescript
function processComments(games: PGN[]): void {
  for (const game of games) {
    for (const pair of game.moves) {
      for (let i = 1; i <= 2; i++) {
        const move = pair[i] as Move | undefined;
        if (move?.comment !== undefined) {
          const fields = parseCommentCommands(move.comment);
          delete (move as Partial<Move>).comment;
          if (fields.arrows !== undefined) {
            move.arrows = fields.arrows;
          }
          if (fields.clock !== undefined) {
            move.clock = fields.clock;
          }
          if (fields.eval !== undefined) {
            move.eval = fields.eval;
          }
          if (fields.squares !== undefined) {
            move.squares = fields.squares;
          }
          if (fields.comment !== undefined) {
            move.comment = fields.comment;
          }
        }
      }
    }
  }
}
```

Note: `pair[i]` uses type `Move | undefined`. The `delete` trick clears the
existing comment before conditionally re-setting it.

**Step 3: Call `processComments()` inside `parse()`, after grammar parsing
succeeds**

In `src/index.ts`, change the try block from:

```typescript
const games = parser.parse(cleaned, { onWarning: options?.onWarning }) as PGN[];
warnMissingSTR(games, options);
warnResultMismatch(games, options);
return games;
```

to:

```typescript
const games = parser.parse(cleaned, { onWarning: options?.onWarning }) as PGN[];
processComments(games);
warnMissingSTR(games, options);
warnResultMismatch(games, options);
return games;
```

**Step 4: Run the failing tests to verify they now pass**

```bash
pnpm test -- --reporter=verbose -t "comment commands"
```

Expected: all 13 new tests PASS.

**Step 5: Run the full suite**

```bash
pnpm test
```

Expected: all tests pass. Note: the `comments` snapshot will need updating — see
Task 7.

---

### Task 7: Update the `comments` snapshot

The `comments.pgn` fixture contains real `[%cal]` and `[%csl]` commands. After
Task 6, these are now parsed into structured fields instead of appearing in the
raw comment string, so the existing snapshot will fail.

**Step 1: Run the full test suite and note which snapshots fail**

```bash
pnpm test 2>&1 | grep -A 5 "snapshot"
```

**Step 2: Update snapshots**

```bash
pnpm test -- --update-snapshots
```

**Step 3: Review the updated snapshot**

```bash
git diff src/__tests__/__snapshots__/
```

Verify that:

- `arrows` and `squares` arrays appear where raw `[%cal]`/`[%csl]` strings were
- Plain comment text is preserved
- No regressions in other fixtures

**Step 4: Run full suite one more time to confirm clean**

```bash
pnpm test
```

Expected: all tests pass, no snapshot failures.

**Step 5: Commit**

```bash
git add src/index.ts src/__tests__/index.spec.ts src/__tests__/__snapshots__/
git commit -m "feat: parse [%cal], [%csl], [%clk], [%eval] comment commands"
```

---

### Task 8: Handle RAV (variants) comment processing

The `processComments()` in Task 6 only walks the top-level move list. RAV
(Recursive Annotation Variations) moves also have comments that need processing.

**Step 1: Check if variants are present in the Move type**

`move.variants` is `Variation = MoveList[]` — an array of move lists. Comments
inside RAVs need the same treatment.

**Step 2: Make `processComments()` recursive**

```typescript
function processMoveList(moves: MoveList): void {
  for (const pair of moves) {
    for (let i = 1; i <= 2; i++) {
      const move = pair[i] as Move | undefined;
      if (move !== undefined) {
        if (move.comment !== undefined) {
          const fields = parseCommentCommands(move.comment);
          delete (move as Partial<Move>).comment;
          if (fields.arrows !== undefined) {
            move.arrows = fields.arrows;
          }
          if (fields.clock !== undefined) {
            move.clock = fields.clock;
          }
          if (fields.eval !== undefined) {
            move.eval = fields.eval;
          }
          if (fields.squares !== undefined) {
            move.squares = fields.squares;
          }
          if (fields.comment !== undefined) {
            move.comment = fields.comment;
          }
        }
        if (move.variants !== undefined) {
          for (const variation of move.variants) {
            processMoveList(variation);
          }
        }
      }
    }
  }
}

function processComments(games: PGN[]): void {
  for (const game of games) {
    processMoveList(game.moves);
  }
}
```

**Step 3: Add a test for RAV comment processing**

```typescript
it('parses [%clk] in a RAV variation comment', () => {
  const pgn = '1. e4 (1. d4 { [%clk 1:00:00] } d5) e5 1-0';
  const result = parse(pgn);
  const rav = result[0]?.moves[0]?.[1]?.variants?.[0];
  expect(rav?.[0]?.[1]?.clock).toBe(3600);
});
```

**Step 4: Run to verify the test fails first, then implement, then passes**

```bash
pnpm test -- --reporter=verbose -t "RAV variation"
```

**Step 5: Replace `processComments` with the recursive version in
`src/index.ts`**

**Step 6: Run again to verify it passes**

```bash
pnpm test
```

**Step 7: Commit**

```bash
git add src/index.ts src/__tests__/index.spec.ts
git commit -m "fix: process comment commands in RAV variations recursively"
```

---

### Task 9: Bump version, update CHANGELOG and README, push

**Step 1: Bump version**

```bash
npm version minor --no-git-tag-version
```

This is a minor bump (`3.9.0`) because new fields are added to the public `Move`
type — additive but a visible API change.

**Step 2: Update `CHANGELOG.md`**

Add under `## [Unreleased]`:

```markdown
## [3.9.0] - 2026-03-16

### Added

- `Move` now exposes structured fields parsed from embedded PGN comment
  commands:
  - `arrows?: Arrow[]` — from `[%cal ...]` (coloured arrows)
  - `squares?: SquareAnnotation[]` — from `[%csl ...]` (coloured squares)
  - `clock?: number` — from `[%clk ...]` (remaining time in seconds)
  - `eval?: Eval` — from `[%eval ...]` (engine evaluation: centipawns or
    mate-in-N, with optional depth)
- New exported types: `AnnotationColor`, `Arrow`, `SquareAnnotation`, `Eval`
- Command strings are stripped from `move.comment`; unknown `[%...]` commands
  are left in the comment string unchanged.
- De-facto standard followed:
  [python-chess](https://python-chess.readthedocs.io/en/latest/pgn.html)
```

**Step 3: Update README**

Add a section under the PGN object docs describing the new fields and their
types. Reference the design doc at
`docs/plans/2026-03-16-comment-commands-design.md` for the full format
specification.

**Step 4: Run full verification**

```bash
pnpm lint:ci && pnpm test
```

Expected: lint clean, all tests pass.

**Step 5: Commit and push**

```bash
git add CHANGELOG.md package.json README.md
git commit -m "chore: bump version to 3.9.0 and update changelog"
git push
```
