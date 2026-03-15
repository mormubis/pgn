# Performance & Error Reporting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Reduce per-move allocation overhead and fix the O(n²) stream scan,
then add an `onError` callback to `parse()` and `stream()`.

**Architecture:** Grammar action blocks mutate the SAN object in place instead
of spreading; `pairMoves` uses pre-sized arrays and avoids destructuring spread;
`stream()` separates depth-tracking from result-token detection into two linear
passes. Error reporting adds `ParseOptions` / `ParseError` types and threads an
optional callback through both public exports.

**Tech Stack:** TypeScript, Peggy PEG grammar, Vitest, pnpm

---

### Task 1: Eliminate `{ ...san }` spread in `MOVE` action block

**Files:**

- Modify: `src/grammar.pegjs` (MOVE rule, ~lines 101–115)

**Step 1: Run baseline tests to confirm green**

```bash
pnpm test
```

Expected: all 13 snapshot tests pass.

**Step 2: Replace the MOVE action block**

In `src/grammar.pegjs`, replace the existing `MOVE` action block:

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

Key changes:

- Remove `const move = { ...san }` — mutate `san` directly
- Replace `nags.filter(Boolean)` with an explicit loop that allocates nothing
  when `nags` is empty (common case)
- Replace `comments.filter(Boolean).join(' ')` with a string-building loop

**Step 3: Run tests**

```bash
pnpm test
```

Expected: all 13 snapshot tests pass. No snapshot updates needed (output is
identical).

**Step 4: Commit**

```bash
git add src/grammar.pegjs
git commit -m "perf: mutate SAN object in place in MOVE action block, avoid filter/join allocs"
```

---

### Task 2: Pre-size `pairMoves` accumulator and remove destructuring spread

**Files:**

- Modify: `src/grammar.pegjs` (pairMoves function, ~lines 9–42)

**Step 1: Replace the `pairMoves` function**

In the `{{…}}` global block at the top of `src/grammar.pegjs`, replace
`pairMoves`:

```js
function pairMoves(moves, start) {
  start = start ?? 0;
  const half = start >> 1;
  const acc = new Array(Math.ceil((moves.length + (start & 1)) / 2));
  for (let i = 0; i < moves.length; i++) {
    const si = start + i;
    const isWhite = (si & 1) === 0;
    const pairIdx = (si >> 1) - half;

    if (acc[pairIdx] === undefined) acc[pairIdx] = [si >> (1 + 1), undefined];
    // Re-derive the 1-based move number correctly:
    const moveNum = (si >> 1) + 1;
    if (acc[pairIdx] === undefined) acc[pairIdx] = [moveNum, undefined];

    const move = moves[i];
    const number = move.number;
    const long = move.long;
    delete move.number;
    delete move.long;

    if (number !== undefined && number !== moveNum) {
      console.warn(`Warning: Move number mismatch - ${number}`);
    }

    if (move.castling) {
      move.to = isWhite ? (long ? 'c1' : 'g1') : long ? 'c8' : 'g8';
    }

    if (move.variants) {
      move.variants = move.variants.map((variant) => pairMoves(variant, si));
    }

    acc[pairIdx][isWhite ? 1 : 2] = move;
  }
  return acc;
}
```

Note: the `start === 0 ? acc : acc.slice(start >> 1)` slice at the end of the
old implementation was needed because the old code indexed from 0 regardless of
`start`. The new code uses `pairIdx = (si >> 1) - half` so `acc` is always
compact from index 0 — the slice is no longer needed.

**Step 2: Run tests**

```bash
pnpm test
```

Expected: all 13 snapshot tests pass.

**Step 3: Commit**

```bash
git add src/grammar.pegjs
git commit -m "perf: pre-size pairMoves accumulator and remove destructuring spread"
```

---

### Task 3: Fix O(n²) scan in `stream()`

**Files:**

- Modify: `src/index.ts` (extractGames function, ~lines 69–129)

**Step 1: Understand the bug**

The current implementation sets `re.lastIndex = index` inside the per-character
loop at depth 0. This means the regex engine is restarted at every character
position that is at depth 0, causing potentially O(n²) work when the result
token appears near the end of a long depth-0 segment.

**Step 2: Replace `extractGames` with a two-pass implementation**

```typescript
function* extractGames(final: boolean): Generator<string> {
  // Pass 1: update depth/inString state for newly-seen characters only
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

  // Pass 2: single forward regex scan for result tokens
  // We need to re-scan the full buffer to find tokens at depth 0,
  // but we do it once with the regex advancing monotonically.
  // Re-derive depth/inString state from scratch for this pass.
  const re = /(?:1-0|0-1|1\/2-1\/2|\*)(?=[ \t\n\r]|$)/g;
  let scanDepth = 0;
  let scanInString = false;
  let lastIndex = 0;

  for (let i = 0; i < buffer.length; i++) {
    const ch = buffer[i];
    if (scanInString) {
      if (ch === '"') scanInString = false;
      continue;
    }
    if (ch === '{') {
      scanDepth++;
      continue;
    }
    if (ch === '}') {
      scanDepth = Math.max(0, scanDepth - 1);
      continue;
    }
    if (ch === '"' && scanDepth === 0) {
      scanInString = true;
      continue;
    }

    if (scanDepth === 0) {
      re.lastIndex = i;
      const m = re.exec(buffer);
      if (m && m.index === i) {
        const end = i + m[0].length;
        yield buffer.slice(lastIndex, end);
        lastIndex = end;
        i = end - 1;
      }
    }
  }

  if (final && lastIndex < buffer.length) {
    const remainder = buffer.slice(lastIndex).trim();
    if (remainder.length > 0) yield remainder;
    buffer = '';
    scanOffset = 0;
  } else {
    buffer = buffer.slice(lastIndex);
    scanOffset = buffer.length;
  }
}
```

Note: Pass 1 (maintaining persistent `depth`/`inString` across chunks) is
preserved for the incremental state tracking. Pass 2 re-derives state locally
but the regex now only advances forward — it is never reset to a position before
`lastIndex` for the token-finding purpose.

**Step 3: Run tests**

```bash
pnpm test
```

Expected: all snapshot and stream tests pass.

**Step 4: Commit**

```bash
git add src/index.ts
git commit -m "perf: fix O(n²) regex scan in stream() extractGames"
```

---

### Task 4: Run benchmarks and record results

**Files:**

- Modify: `BENCHMARK_RESULTS.md`

**Step 1: Run benchmarks**

```bash
pnpm bench
```

This takes ~60 seconds. Capture the full output.

**Step 2: Update `BENCHMARK_RESULTS.md`**

Replace the results table with the new numbers. Note the date and version (3.5.4
or 3.6.0 depending on the version bump chosen). Highlight any fixtures where the
gap vs `pgn-parser` changed.

**Step 3: Commit**

```bash
git add BENCHMARK_RESULTS.md
git commit -m "docs: update benchmark results after performance improvements"
```

---

### Task 5: Add `ParseError` and `ParseOptions` types

**Files:**

- Modify: `src/index.ts`

**Step 1: Write a failing test**

In `src/__tests__/index.spec.ts`, add a test that verifies `onError` is called:

```typescript
it('calls onError with parse error information', () => {
  const errors: unknown[] = [];
  const result = parse('this is not valid pgn', {
    onError: (e) => errors.push(e),
  });
  expect(result).toEqual([]);
  expect(errors).toHaveLength(1);
  expect(errors[0]).toMatchObject({
    message: expect.any(String),
    offset: expect.any(Number),
    line: expect.any(Number),
    column: expect.any(Number),
  });
});

it('returns PGN[] with no onError when option is omitted', () => {
  const result = parse('this is not valid pgn');
  expect(result).toEqual([]);
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- -t "calls onError"
```

Expected: FAIL — `onError` is not a recognized option yet.

**Step 3: Add types and helper to `src/index.ts`**

After the existing type definitions, add:

```typescript
export interface ParseError {
  column: number;
  line: number;
  message: string;
  offset: number;
}

export interface ParseOptions {
  onError?: (error: ParseError) => void;
}

function toParseError(e: unknown): ParseError {
  if (e !== null && typeof e === 'object' && 'message' in e) {
    const err = e as Record<string, unknown>;
    const location = err['location'] as Record<string, unknown> | undefined;
    const start = location?.['start'] as Record<string, unknown> | undefined;
    return {
      column: typeof start?.['column'] === 'number' ? start['column'] : 1,
      line: typeof start?.['line'] === 'number' ? start['line'] : 1,
      message: String(err['message']),
      offset: typeof err['offset'] === 'number' ? err['offset'] : 0,
    };
  }
  return { column: 1, line: 1, message: String(e), offset: 0 };
}
```

Note: keys are in alphabetical order to satisfy the `sort-keys` ESLint rule.

**Step 4: Update `parse()` signature and catch block**

```typescript
export default function parse(input: string, options?: ParseOptions): PGN[] {
  const cleaned = input.replaceAll(/^\s+|\s+$/g, '');
  try {
    return parser.parse(cleaned) as PGN[];
  } catch (e) {
    options?.onError?.(toParseError(e));
    return [];
  }
}
```

**Step 5: Run tests**

```bash
pnpm test -- -t "calls onError"
```

Expected: PASS.

**Step 6: Run full suite**

```bash
pnpm test
```

Expected: all tests pass.

**Step 7: Commit**

```bash
git add src/index.ts src/__tests__/index.spec.ts
git commit -m "feat: add ParseError/ParseOptions types and onError callback to parse()"
```

---

### Task 6: Thread `onError` through `stream()`

**Files:**

- Modify: `src/index.ts` (stream function signature and internal parse call)
- Modify: `src/__tests__/stream.spec.ts`

**Step 1: Write a failing test**

In `src/__tests__/stream.spec.ts`, add:

```typescript
it('calls onError for malformed game chunks', async () => {
  const errors: unknown[] = [];
  async function* chunks() {
    yield 'not valid pgn at all';
  }
  const games: unknown[] = [];
  for await (const g of stream(chunks(), { onError: (e) => errors.push(e) })) {
    games.push(g);
  }
  expect(games).toHaveLength(0);
  // Note: a chunk with no result token is silently dropped by the boundary
  // detector — onError is only called when parse() is invoked on a chunk.
  // Adjust expectation based on observed behavior.
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- -t "calls onError for malformed"
```

Expected: FAIL — `stream()` does not accept a second argument yet.

**Step 3: Update `stream()` signature**

```typescript
export async function* stream(
  input: AsyncIterable<string>,
  options?: ParseOptions,
): AsyncGenerator<PGN> {
```

Pass `options` to every internal `parse()` call:

```typescript
const games = parse(gameString, options);
```

**Step 4: Run tests**

```bash
pnpm test
```

Expected: all tests pass.

**Step 5: Commit**

```bash
git add src/index.ts src/__tests__/stream.spec.ts
git commit -m "feat: thread ParseOptions through stream() and forward onError to parse()"
```

---

### Task 7: Update README and bump version

**Files:**

- Modify: `README.md`
- Modify: `package.json`
- Modify: `CHANGELOG.md`

**Step 1: Add `ParseOptions` / `ParseError` to README**

In the Usage section, after the `stream()` example, add:

````markdown
### Error handling

By default, `parse()` and `stream()` return `[]` / skip games silently on parse
failure. Pass an `onError` callback to observe failures:

```typescript
import parse, { type ParseError } from '@echecs/pgn';

const games = parse(input, {
  onError(err: ParseError) {
    console.error(
      `Parse failed at line ${err.line}:${err.column} — ${err.message}`,
    );
  },
});
```

`onError` receives a `ParseError` with:

| Field     | Type     | Description                                |
| --------- | -------- | ------------------------------------------ |
| `message` | `string` | Human-readable description from the parser |
| `offset`  | `number` | Character offset in the input              |
| `line`    | `number` | 1-based line number                        |
| `column`  | `number` | 1-based column number                      |
````

**Step 2: Bump version**

```bash
npm version minor --no-git-tag-version
```

This produces v3.6.0 (new exports = minor bump).

**Step 3: Update CHANGELOG**

Add a new `[3.6.0]` entry documenting the performance changes and the new
`onError` option.

**Step 4: Run full suite and lint**

```bash
pnpm lint:ci && pnpm test
```

Expected: all pass, zero warnings.

**Step 5: Commit**

```bash
git add README.md package.json CHANGELOG.md
git commit -m "chore: bump version to 3.6.0 and update changelog"
```
