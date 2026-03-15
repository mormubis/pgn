# Additional Warnings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Add three new `onWarning` triggers: move number mismatch, Result tag
mismatch, and duplicate tag names.

**Architecture:** Task 1 threads `onWarning` into the Peggy grammar via its
options object and a per-parse initializer block, replacing the existing
`console.warn` in `pairMoves`. Task 2 adds a post-parse `warnResultMismatch`
helper in `src/index.ts`. Task 3 modifies the `TAG` and `TAGS` grammar rules to
detect duplicate tag names with exact source positions, zero-overhead when
`onWarning` is not provided. Task 4 bumps to v3.8.0.

**Tech Stack:** TypeScript, Peggy PEG grammar, Vitest, pnpm

---

### Task 1: Move number mismatch via `onWarning`

**Files:**

- Modify: `src/grammar.pegjs` (per-parse initializer + `pairMoves`)
- Modify: `src/index.ts` (~line 114, `parser.parse` call)
- Modify: `src/__tests__/index.spec.ts`

**Background:**

`pairMoves` in `grammar.pegjs:33` currently calls
`console.warn('Warning: Move number mismatch - N')`. We want to route this
through `onWarning` when provided, keeping the `console.warn` fallback.

The mechanism: Peggy forwards all keys on the options object passed to
`parser.parse()` into the `peg$parse` closure. A per-parse initializer block
(single-brace `{ }` in Peggy grammar syntax, placed between the global block and
the first rule) runs once per parse call and can capture `options.onWarning`
into a `_warn` variable accessible by all action blocks.

**Step 1: Write a failing test**

In `src/__tests__/index.spec.ts`, add:

```typescript
it('calls onWarning for a move number mismatch', () => {
  const warnings: unknown[] = [];
  // Move numbers are wrong — 1. e4 is labelled as move 5
  const pgn =
    '[Event "E"]\n[Site "S"]\n[Date "2000.01.01"]\n[Round "1"]\n' +
    '[White "W"]\n[Black "B"]\n[Result "1-0"]\n\n5. e4 e5 1-0';
  const result = parse(pgn, { onWarning: (w) => warnings.push(w) });
  expect(result).toHaveLength(1);
  expect(
    warnings.some((w: any) => /Move number mismatch/.test(w.message)),
  ).toBe(true);
});
```

**Step 2: Run to verify it fails**

```bash
pnpm test -- -t "calls onWarning for a move number mismatch"
```

Expected: FAIL — `onWarning` is not called for move number mismatches yet.

**Step 3: Add the per-parse initializer to `grammar.pegjs`**

In `src/grammar.pegjs`, between the closing `}}` of the global block (line ~69)
and the `// ─── DATABASE` comment, add:

```pegjs
{
  // options is Peggy's options object; user-supplied keys pass through unchanged.
  // _warn is captured once per parse() call and used throughout action blocks.
  // @ts-expect-error — Peggy interop: options type is narrower than actual object
  const _warn = typeof options?.onWarning === 'function' ? options.onWarning : null;
}
```

**Step 4: Replace `console.warn` in `pairMoves`**

In `grammar.pegjs`, find (around line 33):

```js
if (number !== undefined && number !== moveNum) {
  console.warn(`Warning: Move number mismatch - ${number}`);
}
```

Replace with:

```js
if (number !== undefined && number !== moveNum) {
  if (_warn) {
    _warn({
      column: 1,
      line: 1,
      message: `Move number mismatch: expected ${moveNum}, got ${number}`,
      offset: 0,
    });
  } else {
    console.warn(`Warning: Move number mismatch - ${number}`);
  }
}
```

**Step 5: Pass `onWarning` to `parser.parse()` in `src/index.ts`**

Find (around line 114):

```typescript
const games = parser.parse(cleaned) as PGN[];
```

Replace with:

```typescript
const games = parser.parse(cleaned, {
  onWarning: options?.onWarning,
}) as PGN[];
```

**Step 6: Run the targeted test**

```bash
pnpm test -- -t "calls onWarning for a move number mismatch"
```

Expected: PASS.

**Step 7: Run full suite**

```bash
pnpm test
```

Expected: all tests pass. No snapshot changes.

**Step 8: Run lint**

```bash
pnpm lint:ci
```

Expected: zero errors, zero warnings.

**Step 9: Commit**

```bash
git add src/grammar.pegjs src/index.ts src/__tests__/index.spec.ts
git commit -m "feat: route move number mismatch through onWarning"
```

---

### Task 2: Result tag mismatch warning

**Files:**

- Modify: `src/index.ts`
- Modify: `src/__tests__/index.spec.ts`

**Background:**

After a successful parse, `game.result` holds the numeric form from `mapResult`
(`1`, `0`, `0.5`, or `'?'`). `game.meta.Result` holds the raw tag string (e.g.
`"1/2-1/2"`). If they conflict, fire `onWarning`.

**Step 1: Write failing tests**

In `src/__tests__/index.spec.ts`, add:

```typescript
it('calls onWarning when Result tag does not match termination marker', () => {
  const warnings: unknown[] = [];
  // Tag says 1/2-1/2 but game ends with 1-0
  const pgn =
    '[Event "E"]\n[Site "S"]\n[Date "2000.01.01"]\n[Round "1"]\n' +
    '[White "W"]\n[Black "B"]\n[Result "1/2-1/2"]\n\n1. e4 1-0';
  const result = parse(pgn, { onWarning: (w) => warnings.push(w) });
  expect(result).toHaveLength(1);
  expect(warnings).toHaveLength(1);
  expect(warnings[0]).toMatchObject({
    message: expect.stringMatching(/Result tag.*does not match/),
  });
});

it('does not call onWarning when Result tag matches termination marker', () => {
  const warnings: unknown[] = [];
  const pgn =
    '[Event "E"]\n[Site "S"]\n[Date "2000.01.01"]\n[Round "1"]\n' +
    '[White "W"]\n[Black "B"]\n[Result "1-0"]\n\n1. e4 1-0';
  parse(pgn, { onWarning: (w) => warnings.push(w) });
  // Only the onWarning for missing tags (none here) — no result mismatch
  expect(warnings.some((w: any) => /Result tag/.test(w.message))).toBe(false);
});
```

**Step 2: Run to verify they fail**

```bash
pnpm test -- -t "Result tag does not match"
```

Expected: FAIL.

**Step 3: Add `RESULT_TO_STR` map and `warnResultMismatch` helper to
`src/index.ts`**

After the `warnMissingSTR` function, add:

```typescript
const RESULT_TO_STR: Readonly<Record<string, string>> = {
  '0': '0-1',
  '0.5': '1/2-1/2',
  '1': '1-0',
  '?': '*',
};

function warnResultMismatch(
  games: PGN[],
  options: ParseOptions | undefined,
): void {
  if (!options?.onWarning) {
    return;
  }
  for (const game of games) {
    const tagResult = game.meta['Result'];
    const tokenResult = RESULT_TO_STR[String(game.result)];
    if (tagResult !== undefined && tagResult !== tokenResult) {
      options.onWarning({
        column: 1,
        line: 1,
        message: `Result tag "${tagResult}" does not match game termination marker "${tokenResult ?? String(game.result)}"`,
        offset: 0,
      });
    }
  }
}
```

Note: all keys in the `RESULT_TO_STR` object must be in alphabetical order
(`sort-keys` ESLint rule).

**Step 4: Call `warnResultMismatch` in `parse()`**

In `parse()`, after `warnMissingSTR`:

```typescript
warnMissingSTR(games, options);
warnResultMismatch(games, options);
return games;
```

**Step 5: Run targeted tests**

```bash
pnpm test -- -t "Result tag does not match"
```

Expected: PASS.

**Step 6: Run full suite and lint**

```bash
pnpm test && pnpm lint:ci
```

Expected: all pass, zero warnings.

**Step 7: Commit**

```bash
git add src/index.ts src/__tests__/index.spec.ts
git commit -m "feat: warn when Result tag does not match game termination marker"
```

---

### Task 3: Duplicate tag name warning

**Files:**

- Modify: `src/grammar.pegjs` (`TAG` and `TAGS` rules)
- Modify: `src/__tests__/index.spec.ts`

**Background:**

Uses the `_warn` variable from the per-parse initializer added in Task 1. When
`_warn` is null (no `onWarning`), `TAG` returns a plain object — zero overhead,
identical to today. When `_warn` is non-null, `TAG` embeds `_key` and `_loc`
(exact source position from `location().start`), and `TAGS` detects duplicates
before stripping those internal fields.

**Step 1: Write failing tests**

In `src/__tests__/index.spec.ts`, add:

```typescript
it('calls onWarning for a duplicate tag name', () => {
  const warnings: unknown[] = [];
  const pgn = '[Event "First"]\n[Event "Second"]\n[Result "1-0"]\n\n1. e4 1-0';
  const result = parse(pgn, { onWarning: (w) => warnings.push(w) });
  expect(result).toHaveLength(1);
  // meta.Event should be the last-write-wins value
  expect(result[0]?.meta['Event']).toBe('Second');
  expect(
    warnings.some((w: any) => /Duplicate tag.*Event/.test(w.message)),
  ).toBe(true);
});

it('reports exact line and column for the duplicate tag', () => {
  const warnings: unknown[] = [];
  // [Event "First"] is on line 1, [Event "Second"] starts on line 2 column 1
  const pgn = '[Event "First"]\n[Event "Second"]\n[Result "1-0"]\n\n1. e4 1-0';
  parse(pgn, { onWarning: (w) => warnings.push(w) });
  const dupe = (warnings as any[]).find((w) =>
    /Duplicate tag.*Event/.test(w.message),
  );
  expect(dupe).toBeDefined();
  expect(dupe.line).toBe(2);
  expect(dupe.column).toBe(1);
});
```

**Step 2: Run to verify they fail**

```bash
pnpm test -- -t "duplicate tag"
```

Expected: FAIL — no duplicate tag warning yet.

**Step 3: Update the `TAG` rule in `src/grammar.pegjs`**

Find:

```pegjs
TAG
  = "[" _ id:IDENTIFIER _ val:STRING _ "]"
  { return { [id]: val }; }
```

Replace with:

```pegjs
TAG
  = "[" _ id:IDENTIFIER _ val:STRING _ "]"
  { return _warn ? { _key: id, _loc: location().start, [id]: val } : { [id]: val }; }
```

**Step 4: Update the `TAGS` action block in `src/grammar.pegjs`**

Find:

```pegjs
TAGS
  = head:TAG tail:(_ t:TAG { return t; })*
  { return Object.assign({}, head, ...tail); }
  / ""
  { return {}; }
```

Replace with:

```pegjs
TAGS
  = head:TAG tail:(_ t:TAG { return t; })*
  {
    const all = [head, ...tail];
    if (_warn) {
      const seen = Object.create(null);
      for (const tag of all) {
        const key = tag._key;
        if (seen[key]) {
          _warn({
            column: tag._loc.column,
            line: tag._loc.line,
            message: `Duplicate tag: "${key}"`,
            offset: tag._loc.offset,
          });
        }
        seen[key] = true;
      }
      return Object.assign({}, ...all.map(({ _key: _, _loc: __, ...rest }) => rest));
    }
    return Object.assign({}, ...all);
  }
  / ""
  { return {}; }
```

**Step 5: Run targeted tests**

```bash
pnpm test -- -t "duplicate tag"
```

Expected: PASS.

**Step 6: Run full suite and lint**

```bash
pnpm test && pnpm lint:ci
```

Expected: all pass, zero lint warnings.

**Step 7: Commit**

```bash
git add src/grammar.pegjs src/__tests__/index.spec.ts
git commit -m "feat: warn on duplicate tag names with exact source position"
```

---

### Task 4: README, version bump to v3.8.0, CHANGELOG

**Files:**

- Modify: `README.md`
- Modify: `package.json`
- Modify: `CHANGELOG.md`

**Step 1: Bump version**

```bash
npm version minor --no-git-tag-version
```

Expected: `v3.8.0`

**Step 2: Update README**

In the `### Warnings` section, extend the "Currently fires for" line to include
the three new triggers:

```markdown
Currently fires for:

- Missing STR tags (`Black`, `Date`, `Event`, `Result`, `Round`, `Site`,
  `White`) — position fields are nominal placeholders
- Move number mismatch (declared move number doesn't match actual position) —
  position fields are nominal placeholders
- Result tag mismatch (`[Result "..."]` value differs from the game termination
  marker) — position fields are nominal placeholders
- Duplicate tag names — `line` and `column` point to the opening `[` of the
  duplicate tag
```

**Step 3: Add CHANGELOG entry**

Add `## [3.8.0] - 2026-03-15` immediately after `## [Unreleased]`:

```markdown
## [3.8.0] - 2026-03-15

### Added

- `onWarning` now fires for move number mismatches (e.g. `5. e4` appearing as
  the first move). Previously emitted unconditionally to `console.warn`; now
  routed through `onWarning` when provided, with `console.warn` as fallback.
- `onWarning` fires when the `[Result "..."]` tag value does not match the game
  termination marker at the end of the movetext.
- `onWarning` fires for duplicate tag names (same tag appearing more than once
  in the tag pair section). The `line` and `column` fields point to the opening
  `[` of the duplicate tag — exact source position.
```

**Step 4: Run full suite and lint**

```bash
pnpm lint:ci && pnpm test
```

Expected: all pass, zero warnings.

**Step 5: Commit and push**

```bash
git add README.md package.json CHANGELOG.md
git commit -m "chore: bump version to 3.8.0 and update changelog"
git push
```
