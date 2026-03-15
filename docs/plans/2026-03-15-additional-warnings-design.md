# Additional Warnings Design

**Date**: 2026-03-15 **Status**: Approved **Scope**: Three new `onWarning`
triggers — move number mismatch, Result tag mismatch, duplicate tag names

---

## Overview

Three additional conditions that can be surfaced via the existing `onWarning`
callback introduced in v3.7.0:

1. **Move number mismatch** — move number in the PGN text doesn't match the
   move's actual position
2. **Result tag mismatch** — `[Result "..."]` tag value doesn't match the game
   termination marker
3. **Duplicate tag names** — the same tag name appears more than once in the tag
   pair section

All three are optional (fire only when `onWarning` is provided),
backward-compatible, and produce no output-shape changes.

---

## 1. Move Number Mismatch

### Current state

`pairMoves` in `grammar.pegjs:34` calls
`console.warn('Warning: Move number mismatch - N')` unconditionally. Callers
cannot observe or suppress it.

### Mechanism

Pass `onWarning` through Peggy's options object. Peggy forwards all keys from
the options argument into the `peg$parse` closure. A per-parse initializer block
(single-brace `{ }` in Peggy grammar syntax, runs once per parse call) captures
it into `_warn`, which is then accessible from all action blocks including
`pairMoves`.

### Changes

**`grammar.pegjs` — per-parse initializer (add before `DATABASE` rule):**

```pegjs
{
  // options is Peggy's options object; user-supplied keys pass through unchanged.
  // _warn is captured once per parse() call and used throughout action blocks.
  // @ts-expect-error — Peggy interop: options type is narrower than actual object
  const _warn = typeof options?.onWarning === 'function' ? options.onWarning : null;
}
```

**`grammar.pegjs` — `pairMoves`, replace `console.warn`:**

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

The `console.warn` fallback is kept — behaviour is unchanged when `onWarning` is
not provided.

**`src/index.ts` — pass `onWarning` to grammar:**

```typescript
const games = parser.parse(cleaned, {
  onWarning: options?.onWarning,
}) as PGN[];
```

Position fields are nominal placeholders — move number mismatches have no
recoverable source location in the output.

---

## 2. Result Tag Mismatch

### Problem

`[Result "1/2-1/2"]` with a `1-0` termination marker parses successfully but
carries contradictory data. No signal is currently emitted.

### Change

Post-parse check in `parse()`, after `warnMissingSTR`. A reverse-map from the
numeric `game.result` back to the PGN string form enables a direct comparison
against `game.meta.Result`:

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

Called in `parse()` alongside `warnMissingSTR`:

```typescript
const games = parser.parse(cleaned, { onWarning: options?.onWarning }) as PGN[];
warnMissingSTR(games, options);
warnResultMismatch(games, options);
return games;
```

No warning fires when the `Result` tag is absent — that is already covered by
`warnMissingSTR`.

Position fields are nominal placeholders.

---

## 3. Duplicate Tag Names

### Problem

The PGN spec states _"the same tag name should not appear more than once in a
tag pair section."_ `Object.assign({}, head, ...tail)` silently last-write-wins,
producing no signal.

### Zero-overhead approach

When `_warn` is null (the common case), `TAG` returns a plain `{ [id]: val }`
object and `TAGS` runs the same `Object.assign` as today — zero overhead, no
allocation change.

When `_warn` is non-null, `TAG` embeds `_key` and `_loc` as internal fields.
`TAGS` iterates to detect duplicates, fires `_warn` for each, then strips the
internal fields before returning.

### Changes

**`grammar.pegjs` — `TAG` rule:**

```pegjs
TAG
  = "[" _ id:IDENTIFIER _ val:STRING _ "]"
  { return _warn ? { _key: id, _loc: location().start, [id]: val } : { [id]: val }; }
```

**`grammar.pegjs` — `TAGS` action block:**

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

**Key properties:**

- Normal path: identical to today
- Warning path: one extra object per tag while processing, stripped before
  returning
- Duplicate positions are exact — `location().start` inside `TAG` points to the
  opening `[` of the duplicate tag
- `meta` output shape is unchanged in both paths — `_key` and `_loc` never
  appear on the result

---

## Implementation Order

1. Per-parse initializer + move number mismatch (`grammar.pegjs` only,
   `src/index.ts` for options pass-through)
2. Result tag mismatch (`src/index.ts` only — `RESULT_TO_STR` map +
   `warnResultMismatch` helper)
3. Duplicate tag names (`grammar.pegjs` only — `TAG` and `TAGS` rule changes)
4. README + CHANGELOG + version bump (minor → v3.8.0)

Each step must pass `pnpm test` and `pnpm lint:ci` before the next.
