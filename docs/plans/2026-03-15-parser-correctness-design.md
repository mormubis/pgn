# Parser Correctness Design

**Date**: 2026-03-15 **Status**: Approved **Scope**: Four independent
correctness improvements to `@echecs/pgn`

---

## Overview

Four gaps between the current parser and the PGN spec (import format):

1. **BOM** — `\uFEFF` prefix silently breaks `parse()` and `stream()`
2. **Escaped quotes in tag values** — `\"` inside a string is required by the
   spec but currently rejected
3. **Tagless games** — zero tags is valid per spec (section 8.1); the parser
   currently requires at least one
4. **`onWarning` callback** — surface spec-compliance warnings (missing STR
   tags) without conflating them with parse errors

Each is independent and tested separately. No breaking changes to the output
shape.

---

## 1. BOM Handling

### Problem

`\uFEFF` (UTF-8 byte-order mark) appears in PGN files exported by Chessbase and
saved by Windows text editors. `parse()` strips leading whitespace but `\uFEFF`
is not a whitespace character, so any BOM-prefixed input silently returns `[]`.
The bench harness currently works around this with a manual
`.replace(/^\uFEFF/, '')`.

### Change

**`src/index.ts` — `parse()`:**

```typescript
const cleaned = input.replace(/^\uFEFF/, '').replaceAll(/^\s+|\s+$/g, '');
```

**`src/index.ts` — `stream()`:**

Strip the BOM from the first chunk before appending to `buffer`:

```typescript
for await (const chunk of input) {
  if (buffer.length === 0) {
    buffer = chunk.replace(/^\uFEFF/, '');
  } else {
    buffer += chunk;
  }
  // …
}
```

**`src/__tests__/comparison.bench.ts`:**

Remove the manual BOM strip from `readFile()` — `parse()` now handles it.

### Testing

- `parse()` with BOM-prefixed `comments.pgn` content (currently returns `[]`,
  must return parsed games)
- `stream()` with a BOM as the first character of the first chunk
- Snapshot update for `comments` fixture if needed (output is identical, so no
  change expected)

---

## 2. Escaped Quotes in Tag Values

### Problem

PGN spec section 7 (Tokens):

> "A quote inside a string is represented by the backslash immediately followed
> by a quote. A backslash inside a string is represented by two adjacent
> backslashes."

The current `STRING` rule:

```pegjs
STRING
  = '"' val:$[^"]* '"'
  { return val.trim(); }
```

`[^"]*` rejects any `"` character, so `[Site "\"Somewhere\""]` terminates early
at the first `\"` and the game fails to parse.

### Change

**`src/grammar.pegjs` — `STRING` rule:**

```pegjs
STRING
  = '"' val:$([^"\\] / '\\' .)* '"'
  { return val.replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim(); }
```

- `[^"\\]` — any character except `"` and `\`
- `'\\' .` — backslash followed by any character (both consumed)
- Action unescapes `\"` → `"` and `\\` → `\` (the only two escape sequences in
  the spec)

### Testing

- Tag with `\"` in value: `[Event "\"Café\""]` → `meta.Event === '"Café"'`
- Tag with `\\` in value: `[Site "A\\B"]` → `meta.Site === 'A\\B'`
- Existing snapshot tests must still pass (no existing fixture uses escape
  sequences)

---

## 3. Tagless Games

### Problem

PGN spec section 8.1:

> "The tag pair section is composed of a series of **zero or more** tag pairs."

The STR (Seven Tag Roster) is mandatory only for **archival export format**
(section 8.1.1). A **reader** operating in import mode must accept games without
tags. The current `TAGS` rule requires at least one tag.

### Change

**`src/grammar.pegjs` — `TAGS` rule:**

```pegjs
TAGS
  = head:TAG tail:(_ t:TAG { return t; })*
  { return Object.assign({}, head, ...tail); }
  / ""
  { return {}; }
```

The second alternative matches the empty string and returns `{}`. `GAME` is
unchanged — `tags` is always an object, just empty for tagless games.

**Output shape:** `{ meta: {}, moves: [...], result: ... }` — identical to a
tagged game with no recognised tags. No breaking change.

### Testing

- Bare single-game move list with no tags → `meta: {}`
- Mixed file: tagged game then tagless game → both parsed, tagless has
  `meta: {}`
- No existing fixture is tagless so no snapshot changes expected

---

## 4. `onWarning` Callback

### Problem

`onError` covers parse failures. Spec-compliance warnings (missing STR tags) are
a different category — the game parsed successfully but the data is
non-conformant for archival purposes. Conflating them with errors would cause
callers to misclassify valid games as broken.

### New Types

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
```

`ParseWarning` has the same shape as `ParseError`. Position defaults to
`{ line: 1, column: 1, offset: 0 }` for warnings not tied to a specific
location.

### Warning Triggers

**Missing STR tags** — checked in `parse()` after a successful parse, once per
game. The seven roster keys are `Event`, `Site`, `Date`, `Round`, `White`,
`Black`, `Result`. For each missing key, fire:

```typescript
options.onWarning({
  column: 1,
  line: 1,
  message: `Missing STR tag: ${key}`,
  offset: 0,
});
```

**Move number mismatch** — currently `console.warn(...)` in `pairMoves` in the
grammar. Left as `console.warn` for this pass; grammar-level warning callbacks
are out of scope here.

### Implementation

```typescript
const STR_TAGS = ['Black', 'Date', 'Event', 'Result', 'Round', 'Site', 'White'];

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

Called in `parse()` after `parser.parse()` succeeds:

```typescript
const games = parser.parse(cleaned) as PGN[];
warnMissingSTR(games, options);
return games;
```

`stream()` already threads `options` through to `parse()` — no additional
changes needed.

### Backward Compatibility

`onWarning` is optional. Omitting it produces identical behaviour to today — STR
warnings are silently swallowed. No breaking change. Warrants a minor version
bump (new export).

### Testing

- Game with all seven STR tags → `onWarning` not called
- Game missing `Event` → `onWarning` called once with `"Missing STR tag: Event"`
- Tagless game → `onWarning` called seven times (one per missing STR tag)
- Omitting `onWarning` → no error thrown, game still returned

---

## Implementation Order

1. BOM — `src/index.ts` only, trivial
2. Escaped quotes — `src/grammar.pegjs` `STRING` rule
3. Tagless games — `src/grammar.pegjs` `TAGS` rule
4. `onWarning` — `src/index.ts`, new types + `warnMissingSTR` helper

Each step must pass `pnpm test` and `pnpm lint:ci` before moving to the next.
Version bump: minor (new exported types → v3.7.0).
