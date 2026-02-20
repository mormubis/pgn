# Action Block Optimizations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce per-move overhead in `src/grammar.pegjs` by eliminating redundant allocations, redundant regex parsing, and V8-deoptimising mutations.

**Architecture:** All changes are confined to `src/grammar.pegjs` (global initializer + rule action blocks). The public API and all TypeScript types are unchanged. All 13 snapshot tests must continue to pass exactly.

**Tech Stack:** Peggy v5, vitest snapshots

---

## Background

After the nearley → Peggy migration, `@echecs/pgn` is still ~1.5x slower than
`pgn-parser` on most fixtures. The gap is not in the PEG engine itself but in
what the action blocks do per move. Four specific inefficiencies account for
most of the overhead:

1. **SAN double-parse** — the PEG engine already parses SAN character-by-character;
   the action block then fires a full named-group regex over the same string,
   parsing it a second time.
2. **`pickBy` intermediate allocations** — `Object.entries` + `filter` +
   `Object.fromEntries` allocates 3 intermediate objects per move to discard
   falsy properties from a known fixed set of 7 keys.
3. **`delete` mutations in `pairMoves`** — `delete move.number` and
   `delete move.long` cause V8 hidden-class transitions on every move object.
4. **Unconditional filter/join/replace on empty arrays** — `[].filter(Boolean).
   join(' ').replace(/\n/g, '')` runs on every move even when no NAGs or
   comments are present (>90% of moves).

A bonus fix: `.slice(Math.floor(start / 2))` at the end of `pairMoves`
copies the accumulator unconditionally; at the top level `start=0` always,
making it a wasteful full copy.

---

## Correctness gate

After each task, run:

```bash
pnpm test
```

from `/Users/mormubis/workspace/echecs/pgn/.worktrees/perf-optimizations`.

All 13 tests must pass. **Do not update snapshots** — the output must be
byte-identical to what exists today, because these are pure performance
optimizations with no semantic changes.

After all tasks, run the benchmarks:

```bash
pnpm bench
```

and compare against the numbers in `BENCHMARK_RESULTS.md`.

---

### Task 1: Replace `pickBy` with direct conditional assignment in SAN action

**Files:**
- Modify: `src/grammar.pegjs` (lines 1–6, 144–165)

The `pickBy` helper (lines 2–6) and its call site in the SAN action (lines
153–164) together allocate three intermediate objects for every non-castling
move. Replace with direct conditional property assignment.

**Step 1: Replace the `pickBy` function and its call site**

In the global initializer (`{{ }}`), **remove** the `pickBy` function entirely
(lines 2–6):

```js
// DELETE this function:
function pickBy(obj, pred) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => pred(v))
  );
}
```

In the SAN action block (lines 144–165), replace the regex + pickBy call with
direct labeled-label extraction. The SAN rule already captures each token as
`s`, so we still use `s` for castling detection. For non-castling moves, use
the named-group regex result but build the object directly without `pickBy`:

```pegjs
SAN
  = s:$(
      "O-O-O" [+#]? / "O-O" [+#]?
      / [KQBNPR] [a-h] [1-8] "x" [a-h] [1-8] ("=" [NBRQ])? [+#]?
      / [KQBNPR] [a-h] [1-8] [a-h] [1-8] ("=" [NBRQ])? [+#]?
      / [KQBNPR] [a-h] "x" [a-h] [1-8] ("=" [NBRQ])? [+#]?
      / [KQBNPR] [1-8] "x" [a-h] [1-8] ("=" [NBRQ])? [+#]?
      / [KQBNPR] [a-h] [a-h] [1-8] ("=" [NBRQ])? [+#]?
      / [KQBNPR] [1-8] [a-h] [1-8] ("=" [NBRQ])? [+#]?
      / [KQBNPR] "x" [a-h] [1-8] ("=" [NBRQ])? [+#]?
      / [KQBNPR] [a-h] [1-8] ("=" [NBRQ])? [+#]?
      / [a-h] "x" [a-h] [1-8] ("=" [NBRQ])? [+#]?
      / [a-h] [1-8] ("=" [NBRQ])? [+#]?
    )
  {
    if (s.startsWith('O-O')) {
      const isLong = s.startsWith('O-O-O');
      return { castling: true, long: isLong, piece: 'K', to: isLong ? 'O-O-O' : 'O-O' };
    }
    const m = s.match(
      /^([KQBNPR])?([a-h][1-8]|[a-h]|[1-8])?(x)?([a-h][1-8])(?:=([NBRQ]))?([+#])?$/
    );
    const piece      = (m && m[1]) ? m[1] : 'P';
    const from       = (m && m[2]) ? m[2] : undefined;
    const capture    = !!(m && m[3]);
    const to         = m ? m[4] : undefined;
    const promotion  = (m && m[5]) ? m[5] : undefined;
    const indication = (m && m[6]) ? m[6] : undefined;
    const result = { piece, to };
    if (from)      result.from      = from;
    if (capture)   result.capture   = true;
    if (promotion) result.promotion = promotion;
    if (indication === '+') result.check     = true;
    if (indication === '#') result.checkmate = true;
    return result;
  }
```

Note: the regex switches from named groups (`(?<piece>...)`) to indexed groups
(`(...)`) — indexed group access is faster in V8 than named-group access via
`m.groups`.

**Step 2: Compile and test**

```bash
pnpm test
```

Expected: 13 passed, 0 failed. No snapshot changes.

**Step 3: Commit**

```bash
git add src/grammar.pegjs
git commit -m "perf: replace pickBy with direct property assignment in SAN action"
```

---

### Task 2: Guard NAG/comment processing with length checks in MOVE action

**Files:**
- Modify: `src/grammar.pegjs` (lines 102–113)

The MOVE action currently runs `filter/join/replace` on every move regardless
of whether there are NAGs or comments. Guard all three operations.

**Step 1: Replace the MOVE action block**

Current (lines 103–113):
```pegjs
MOVE
  = num:NUMBER? _ san:SAN nags:(_ n:NAG { return n; })* comments:(_ c:COMMENT { return c; })*
  {
    const annotations = nags.filter(Boolean);
    const commentText = comments.filter(Boolean).join(' ').replace(/\n/g, '');
    return {
      ...(num !== null && { number: num }),
      ...(annotations.length > 0 && { annotations }),
      ...(commentText.length > 0 && { comment: commentText }),
      ...san,
    };
  }
```

Replace with:
```pegjs
MOVE
  = num:NUMBER? _ san:SAN nags:(_ n:NAG { return n; })* comments:(_ c:COMMENT { return c; })*
  {
    const move = { ...san };
    if (num !== null) move.number = num;
    if (nags.length > 0) {
      const annotations = nags.filter(Boolean);
      if (annotations.length > 0) move.annotations = annotations;
    }
    if (comments.length > 0) {
      const commentText = comments.filter(Boolean).join(' ').replace(/\n/g, '');
      if (commentText.length > 0) move.comment = commentText;
    }
    return move;
  }
```

This makes the common case (no NAGs, no comments) cost only: one object spread
(`{ ...san }`), one null check, and a return. The `filter/join/replace` chain
only runs when there are actually NAGs or comments present.

**Step 2: Compile and test**

```bash
pnpm test
```

Expected: 13 passed, 0 failed. No snapshot changes.

**Step 3: Commit**

```bash
git add src/grammar.pegjs
git commit -m "perf: guard NAG/comment processing behind length checks in MOVE action"
```

---

### Task 3: Remove V8-deoptimising `delete` mutations from `pairMoves`

**Files:**
- Modify: `src/grammar.pegjs` (lines 8–43)

`delete move.number` and `delete move.long` cause V8 hidden-class transitions
on every move object, deoptimising property access. Replace with
destructuring-and-omit to avoid mutation, and guard the `.slice()` call.

**Step 1: Replace the `pairMoves` function**

Current (lines 8–43):
```js
function pairMoves(moves, start) {
  start = start ?? 0;
  return moves.reduce((acc, move, i) => {
    const color = (start + i) % 2 === 0 ? 'white' : 'black';
    const index = Math.floor((start + i) / 2);

    if (acc[index] === undefined) {
      acc[index] = [index + 1, undefined];
    }

    if (move.number !== undefined && move.number !== index + 1) {
      console.warn(
        `Warning: Move number mismatch - ${move.number}`
      );
    }
    delete move.number;

    if (move.castling) {
      move.to =
        color === 'white'
          ? move.long ? 'c1' : 'g1'
          : move.long ? 'c8' : 'g8';
      delete move.long;
    }

    if (move.variants) {
      move.variants = move.variants.map((variant) =>
        pairMoves(variant, start + i)
      );
    }

    acc[index][color === 'white' ? 1 : 2] = move;

    return acc;
  }, []).slice(Math.floor(start / 2));
}
```

Replace with:
```js
function pairMoves(moves, start) {
  start = start ?? 0;
  const acc = [];
  for (let i = 0; i < moves.length; i++) {
    const si = start + i;
    const isWhite = si % 2 === 0;
    const index = (si - (isWhite ? 0 : 1)) >> 1;

    if (acc[index] === undefined) {
      acc[index] = [index + 1, undefined];
    }

    const { number, long, ...move } = moves[i];

    if (number !== undefined && number !== index + 1) {
      console.warn(`Warning: Move number mismatch - ${number}`);
    }

    if (move.castling) {
      move.to = isWhite
        ? (long ? 'c1' : 'g1')
        : (long ? 'c8' : 'g8');
    }

    if (move.variants) {
      move.variants = move.variants.map((variant) =>
        pairMoves(variant, si)
      );
    }

    acc[index][isWhite ? 1 : 2] = move;
  }
  return start === 0 ? acc : acc.slice(start >> 1);
}
```

Key changes:
- `reduce` → `for` loop (avoids callback overhead and closure allocation per iteration)
- `delete move.number` / `delete move.long` → `const { number, long, ...move } = moves[i]` (destructure-and-omit, no mutation, no hidden-class transitions)
- `(start + i)` computed once as `si` per iteration
- `Math.floor(x / 2)` → `x >> 1` (integer right shift — same result for non-negative integers, no float conversion)
- `.slice(Math.floor(start / 2))` guarded: only called when `start !== 0` (variant calls); top-level calls (`start=0`) return `acc` directly

**Step 2: Compile and test**

```bash
pnpm test
```

Expected: 13 passed, 0 failed. No snapshot changes.

**Step 3: Commit**

```bash
git add src/grammar.pegjs
git commit -m "perf: remove delete mutations and reduce allocations in pairMoves"
```

---

### Task 4: Run benchmarks and update results

**Step 1: Run benchmarks**

```bash
pnpm bench
```

This will take several minutes (`long.pgn` is the slow one).

**Step 2: Compare against baseline**

The baseline numbers are in `BENCHMARK_RESULTS.md` (the numbers from after the
Peggy migration). Record the new numbers and compute the improvement ratio for
each fixture.

**Step 3: Update BENCHMARK_RESULTS.md**

Update the file with the new numbers. Add a new section or update the summary
table to show the before/after for this optimization pass.

**Step 4: Commit**

```bash
git add BENCHMARK_RESULTS.md
git commit -m "docs: update benchmark results after action block optimizations"
```

---

## Notes

- `src/grammar.cjs` is gitignored — never commit it. It is regenerated by `pnpm grammar:compile` (which `pnpm test` calls automatically).
- `pnpm test` calls `pnpm grammar:compile` first, so you never need to compile manually before testing.
- The 13 snapshot files in `src/__tests__/__snapshots__/` must not change. These optimizations are pure performance improvements with no output changes.
- The `result` field is numeric (`1`, `0`, `0.5`, or `"?"`). This is intentional and must not change.
- Castling `to` squares: white O-O → `g1`, O-O-O → `c1`; black O-O → `g8`, O-O-O → `c8`.
- The `variants` snapshot has `undefined` as the second element of some tuples — this is correct and must be preserved by `pairMoves`.
