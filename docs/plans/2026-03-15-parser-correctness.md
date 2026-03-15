# Parser Correctness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Fix four parser correctness gaps: BOM handling, escaped quotes in tag
values, tagless games, and a new `onWarning` callback for missing STR tags.

**Architecture:** Tasks 1–3 are grammar or `parse()` changes with dedicated
tests; Task 4 adds `ParseWarning`/`onWarning` to `ParseOptions` and a
`warnMissingSTR` helper in `src/index.ts`. Each task is independent and must
pass `pnpm test` + `pnpm lint:ci` before the next begins.

**Tech Stack:** TypeScript, Peggy PEG grammar, Vitest, pnpm

---

### Task 1: Strip BOM in `parse()` and `stream()`

**Files:**

- Modify: `src/index.ts` (~line 72 for `parse()`, ~line 167 for `stream()`)
- Modify: `src/__tests__/comparison.bench.ts` (~line 13, remove manual BOM
  strip)
- Modify: `src/__tests__/index.spec.ts`
- Modify: `src/__tests__/stream.spec.ts`

**Background:** `parse()` currently does `input.replaceAll(/^\s+|\s+$/g, '')`.
`\uFEFF` (UTF-8 BOM) is not whitespace so it causes a silent parse failure.
`stream()` appends chunks directly to `buffer` with no BOM handling.

**Step 1: Write a failing test for `parse()`**

In `src/__tests__/index.spec.ts`, add inside the existing `describe` block:

```typescript
it('strips a UTF-8 BOM from the start of input', () => {
  const withBom = '\uFEFF[Event "Test"]\n[Result "*"]\n\n*';
  const result = parse(withBom);
  expect(result).toHaveLength(1);
  expect(result[0]?.meta['Event']).toBe('Test');
});
```

**Step 2: Run to verify it fails**

```bash
pnpm test -- -t "strips a UTF-8 BOM"
```

Expected: FAIL — returns `[]` because `\uFEFF` is not stripped.

**Step 3: Fix `parse()` in `src/index.ts`**

Replace:

```typescript
const cleaned = input.replaceAll(/^\s+|\s+$/g, '');
```

With:

```typescript
const cleaned = input.replace(/^\uFEFF/, '').replaceAll(/^\s+|\s+$/g, '');
```

**Step 4: Write a failing test for `stream()`**

In `src/__tests__/stream.spec.ts`, add:

```typescript
it('strips a UTF-8 BOM from the start of the first chunk', async () => {
  const pgn = '[Event "Test"]\n[Result "*"]\n\n*';
  const games = await collect(stream(fromArray(['\uFEFF' + pgn])));
  expect(games).toHaveLength(1);
  expect(games[0]?.meta['Event']).toBe('Test');
});
```

**Step 5: Run to verify it fails**

```bash
pnpm test -- -t "strips a UTF-8 BOM from the start of the first chunk"
```

Expected: FAIL.

**Step 6: Fix `stream()` in `src/index.ts`**

In the `for await (const chunk of input)` loop, replace:

```typescript
buffer += chunk;
```

With:

```typescript
if (buffer.length === 0) {
  buffer = chunk.replace(/^\uFEFF/, '');
} else {
  buffer += chunk;
}
```

**Step 7: Remove the manual BOM strip from the bench harness**

In `src/__tests__/comparison.bench.ts`, change the `readFile` helper from:

```typescript
return readFileSync(filename, 'utf8').replace(/^\uFEFF/, '');
```

To:

```typescript
return readFileSync(filename, 'utf8');
```

**Step 8: Run full suite**

```bash
pnpm test
```

Expected: all tests pass. The `comments` snapshot should be unchanged (BOM was
already stripped manually in the bench harness; now `parse()` handles it, same
output).

**Step 9: Run lint**

```bash
pnpm lint:ci
```

Expected: zero errors, zero warnings.

**Step 10: Commit**

```bash
git add src/index.ts src/__tests__/index.spec.ts src/__tests__/stream.spec.ts src/__tests__/comparison.bench.ts
git commit -m "fix: strip UTF-8 BOM in parse() and stream()"
```

---

### Task 2: Handle escaped quotes in tag values

**Files:**

- Modify: `src/grammar.pegjs` (`STRING` rule, ~line 97)
- Modify: `src/__tests__/index.spec.ts`

**Background:** PGN spec section 7: _"A quote inside a string is represented by
the backslash immediately followed by a quote. A backslash inside a string is
represented by two adjacent backslashes."_ The current rule `$[^"]*` rejects any
`"` so `[Site "\"Somewhere\""]` fails.

**Step 1: Write a failing test**

In `src/__tests__/index.spec.ts`, add:

```typescript
it('handles escaped quotes in tag values', () => {
  const pgn = '[Event "\\"Café\\""]\\n[Result "*"]\\n\\n*';
  const result = parse(pgn);
  expect(result).toHaveLength(1);
  expect(result[0]?.meta['Event']).toBe('"Café"');
});

it('handles escaped backslashes in tag values', () => {
  const pgn = '[Site "A\\\\B"]\\n[Result "*"]\\n\\n*';
  const result = parse(pgn);
  expect(result).toHaveLength(1);
  expect(result[0]?.meta['Site']).toBe('A\\B');
});
```

Note: in the actual TypeScript test file these are regular string literals — the
`\\` in TypeScript source becomes `\` in the string passed to `parse()`.

Write them as:

```typescript
it('handles escaped quotes in tag values', () => {
  const pgn = '[Event "\\"Café\\""]' + '\n[Result "*"]\n\n*';
  const result = parse(pgn);
  expect(result).toHaveLength(1);
  expect(result[0]?.meta['Event']).toBe('"Café"');
});

it('handles escaped backslashes in tag values', () => {
  const pgn = '[Site "A\\\\B"]' + '\n[Result "*"]\n\n*';
  const result = parse(pgn);
  expect(result).toHaveLength(1);
  expect(result[0]?.meta['Site']).toBe('A\\B');
});
```

**Step 2: Run to verify they fail**

```bash
pnpm test -- -t "handles escaped"
```

Expected: FAIL — both return `[]`.

**Step 3: Fix the `STRING` rule in `src/grammar.pegjs`**

Replace:

```pegjs
STRING
  = '"' val:$[^"]* '"'
  { return val.trim(); }
```

With:

```pegjs
STRING
  = '"' val:$([^"\\] / '\\' .)* '"'
  { return val.replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim(); }
```

**Step 4: Run the targeted tests**

```bash
pnpm test -- -t "handles escaped"
```

Expected: PASS.

**Step 5: Run full suite**

```bash
pnpm test
```

Expected: all tests pass. No snapshot changes (no existing fixture uses escape
sequences).

**Step 6: Run lint**

```bash
pnpm lint:ci
```

Expected: zero errors, zero warnings.

**Step 7: Commit**

```bash
git add src/grammar.pegjs src/__tests__/index.spec.ts
git commit -m "fix: handle escaped quotes and backslashes in PGN tag values"
```

---

### Task 3: Accept tagless games

**Files:**

- Modify: `src/grammar.pegjs` (`TAGS` rule, ~line 85)
- Modify: `src/__tests__/index.spec.ts`

**Background:** PGN spec section 8.1: _"The tag pair section is composed of a
series of zero or more tag pairs."_ The STR is mandatory only for archival
_export_; a _reader_ in import mode must accept tagless games. The current
`TAGS` rule requires `head:TAG` which demands at least one tag.

**Step 1: Write failing tests**

In `src/__tests__/index.spec.ts`, add:

```typescript
it('parses a game with no tags', () => {
  const pgn = '1. e4 e5 2. Nf3 Nc6 1-0';
  const result = parse(pgn);
  expect(result).toHaveLength(1);
  expect(result[0]?.meta).toEqual({});
  expect(result[0]?.result).toBe(1);
});

it('parses a mixed file with tagged and tagless games', () => {
  const pgn = '[Event "Tagged"]\n[Result "1-0"]\n\n1. e4 1-0\n\n1. d4 0-1';
  const result = parse(pgn);
  expect(result).toHaveLength(2);
  expect(result[0]?.meta['Event']).toBe('Tagged');
  expect(result[1]?.meta).toEqual({});
});
```

**Step 2: Run to verify they fail**

```bash
pnpm test -- -t "parses a game with no tags"
```

Expected: FAIL — returns `[]`.

**Step 3: Fix the `TAGS` rule in `src/grammar.pegjs`**

Replace:

```pegjs
TAGS
  = head:TAG tail:(_ t:TAG { return t; })*
  { return Object.assign({}, head, ...tail); }
```

With:

```pegjs
TAGS
  = head:TAG tail:(_ t:TAG { return t; })*
  { return Object.assign({}, head, ...tail); }
  / ""
  { return {}; }
```

**Step 4: Run the targeted tests**

```bash
pnpm test -- -t "parses a game with no tags"
```

Expected: PASS.

**Step 5: Run full suite**

```bash
pnpm test
```

Expected: all tests pass. No snapshot changes (no existing fixture is tagless).

**Step 6: Run lint**

```bash
pnpm lint:ci
```

Expected: zero errors, zero warnings.

**Step 7: Commit**

```bash
git add src/grammar.pegjs src/__tests__/index.spec.ts
git commit -m "fix: accept tagless games per PGN spec section 8.1"
```

---

### Task 4: Add `ParseWarning` / `onWarning` callback

**Files:**

- Modify: `src/index.ts`
- Modify: `src/__tests__/index.spec.ts`
- Modify: `src/__tests__/stream.spec.ts`

**Background:** Missing STR tags are a spec-compliance issue, not a parse error.
`onError` is for failures; `onWarning` is for valid-but-non-conformant input.
The seven STR keys are `Event`, `Site`, `Date`, `Round`, `White`, `Black`,
`Result`.

**Step 1: Write failing tests for `parse()`**

In `src/__tests__/index.spec.ts`, add:

```typescript
it('calls onWarning for each missing STR tag', () => {
  const warnings: unknown[] = [];
  // Tagless game — all 7 STR tags missing
  const result = parse('1. e4 1-0', { onWarning: (w) => warnings.push(w) });
  expect(result).toHaveLength(1);
  expect(warnings).toHaveLength(7);
  expect(warnings[0]).toMatchObject({
    column: 1,
    line: 1,
    message: expect.stringMatching(/^Missing STR tag:/),
    offset: 0,
  });
});

it('does not call onWarning when all STR tags are present', () => {
  const warnings: unknown[] = [];
  const pgn =
    '[Event "E"]\n[Site "S"]\n[Date "2000.01.01"]\n[Round "1"]\n' +
    '[White "W"]\n[Black "B"]\n[Result "1-0"]\n\n1. e4 1-0';
  parse(pgn, { onWarning: (w) => warnings.push(w) });
  expect(warnings).toHaveLength(0);
});

it('does not throw when onWarning is omitted', () => {
  expect(() => parse('1. e4 1-0')).not.toThrow();
});
```

**Step 2: Run to verify they fail**

```bash
pnpm test -- -t "calls onWarning"
```

Expected: FAIL — `onWarning` is not a recognised option yet.

**Step 3: Add `ParseWarning` type, update `ParseOptions`, add `warnMissingSTR`
helper**

In `src/index.ts`, after `ParseOptions`:

```typescript
export interface ParseWarning {
  column: number;
  line: number;
  message: string;
  offset: number;
}

export interface ParseOptions {
  onError?: (error: ParseError) => void;
  onWarning?: (warning: ParseWarning) => void;
}

const STR_TAGS = [
  'Black',
  'Date',
  'Event',
  'Result',
  'Round',
  'Site',
  'White',
] as const;

function warnMissingSTR(games: PGN[], options: ParseOptions | undefined): void {
  if (!options?.onWarning) {
    return;
  }
  for (const game of games) {
    for (const key of STR_TAGS) {
      if (!(key in game.meta)) {
        options.onWarning({
          column: 1,
          line: 1,
          message: `Missing STR tag: ${key}`,
          offset: 0,
        });
      }
    }
  }
}
```

Note: all keys in `ParseWarning` must be alphabetically ordered (`sort-keys`
ESLint rule).

**Step 4: Call `warnMissingSTR` in `parse()`**

In the `try` block of `parse()`, replace:

```typescript
return parser.parse(cleaned) as PGN[];
```

With:

```typescript
const games = parser.parse(cleaned) as PGN[];
warnMissingSTR(games, options);
return games;
```

**Step 5: Run the targeted tests**

```bash
pnpm test -- -t "calls onWarning"
```

Expected: PASS.

**Step 6: Write a failing test for `stream()`**

In `src/__tests__/stream.spec.ts`, add:

```typescript
it('forwards onWarning through stream() for games with missing STR tags', async () => {
  const warnings: unknown[] = [];
  const games = await collect(
    stream(fromArray(['1. e4 1-0\n']), { onWarning: (w) => warnings.push(w) }),
  );
  expect(games).toHaveLength(1);
  expect(warnings).toHaveLength(7);
});
```

**Step 7: Run to verify it fails**

```bash
pnpm test -- -t "forwards onWarning"
```

Expected: FAIL — `stream()` doesn't pass `onWarning` through yet.

**Step 8: Verify `stream()` already threads `options` through**

Check `src/index.ts` — the `parse(gameString, options)` call in the main
`for await` loop already passes `options`. Since `warnMissingSTR` is called
inside `parse()`, `onWarning` is automatically forwarded. The test from Step 6
should now pass without any additional changes.

Run:

```bash
pnpm test -- -t "forwards onWarning"
```

Expected: PASS (no code change needed in `stream()`).

**Step 9: Run full suite and lint**

```bash
pnpm test && pnpm lint:ci
```

Expected: all tests pass, zero lint errors/warnings.

**Step 10: Commit**

```bash
git add src/index.ts src/__tests__/index.spec.ts src/__tests__/stream.spec.ts
git commit -m "feat: add ParseWarning/onWarning callback for missing STR tags"
```

---

### Task 5: Update README, bump to v3.7.0, update CHANGELOG

**Files:**

- Modify: `README.md`
- Modify: `package.json`
- Modify: `CHANGELOG.md`

**Step 1: Bump version**

```bash
npm version minor --no-git-tag-version
```

Expected: `v3.7.0`

**Step 2: Add `onWarning` to README error handling section**

In `README.md`, extend the `### Error handling` section. After the `onError`
table, add:

````markdown
### Warnings

Pass `onWarning` to observe spec-compliance issues (e.g. missing STR tags) that
do not prevent parsing:

```typescript
import parse, { type ParseWarning } from '@echecs/pgn';

const games = parse(input, {
  onWarning(warn: ParseWarning) {
    console.warn(`${warn.message}`);
  },
});
```

`onWarning` receives a `ParseWarning` with the same fields as `ParseError`:
`message`, `offset`, `line`, `column`.

Currently fires for: missing STR tags (`Event`, `Site`, `Date`, `Round`,
`White`, `Black`, `Result`).
````

**Step 3: Add CHANGELOG entry**

Add `## [3.7.0] - 2026-03-15` immediately after `## [Unreleased]`:

```markdown
## [3.7.0] - 2026-03-15

### Added

- `onWarning` option for `parse()` and `stream()`: fires for spec-compliance
  issues that do not prevent parsing. Currently fires once per missing STR tag
  (`Event`, `Site`, `Date`, `Round`, `White`, `Black`, `Result`).
- `ParseWarning` is now an exported type.

### Fixed

- `parse()` and `stream()` now strip a UTF-8 BOM (`\uFEFF`) at the start of
  input. Chessbase and Windows editors commonly produce BOM-prefixed PGN files
  that previously failed silently.
- Tag values containing escaped quotes (`\"`) or escaped backslashes (`\\`) now
  parse correctly per PGN spec section 7.
- Games with no tag pairs (bare move list + result) now parse correctly per PGN
  spec section 8.1 ("zero or more tag pairs"). These games return `meta: {}`.
```

**Step 4: Run full suite and lint**

```bash
pnpm lint:ci && pnpm test
```

Expected: all pass, zero warnings.

**Step 5: Commit**

```bash
git add README.md package.json CHANGELOG.md
git commit -m "chore: bump version to 3.7.0 and update changelog"
```
