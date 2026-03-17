# Design: `stringify()` — PGN Serializer

Date: 2026-03-17 Status: Approved

## Overview

Add a `stringify(input: PGN | PGN[], options?: ParseOptions): string` export
that converts one or more parsed `PGN` objects back into a valid PGN string. The
goal is semantic fidelity — `stringify(parse(pgn))` produces valid, equivalent
PGN with the same moves, tags, comments, and annotations. Exact byte-for-byte
reproduction is not a goal.

## File Structure

The implementation splits `src/index.ts` into focused modules. All modules are
internal; the public API surface remains `import ... from '@echecs/pgn'`.

| File               | Responsibility                                           |
| ------------------ | -------------------------------------------------------- |
| `src/types.ts`     | All shared TypeScript types and interfaces               |
| `src/parse.ts`     | `parse()`, `processComments()`, `parseCommentCommands()` |
| `src/stream.ts`    | `stream()`                                               |
| `src/stringify.ts` | `stringify()` and internal helpers                       |
| `src/index.ts`     | Thin re-export barrel                                    |

## API

```typescript
export function stringify(input: PGN | PGN[], options?: ParseOptions): string;
```

- Single game or array accepted
- Multiple games separated by `\n`
- Each game: `tags + "\n\n" + movetext + " " + result + "\n"`
- Reuses `ParseOptions` — `onWarning` fires for recoverable issues; `onError` is
  never called by `stringify`

## Tag Serialization — `stringifyTags(meta)`

- Seven STR tags (`Event`, `Site`, `Date`, `Round`, `White`, `Black`, `Result`)
  appear first in that order (PGN spec §8.1.1)
- Remaining tags in ASCII/alphabetical order (spec §8.1.1)
- One `[Key "Value"]` per line
- Tags with `undefined` values are omitted
- Missing STR tags are omitted (no placeholder injected)

## SAN Reconstruction — `stringifyMove(move)`

Built from `Move` fields per PGN spec §8.2.3:

**Castling:**

- `castling === true` and `to` in `{g1, g8}` → `O-O`
- `castling === true` and `to` in `{c1, c8}` → `O-O-O`
- Any other `to` with `castling === true` → emit empty string + `onWarning`

**Piece moves (`piece !== 'P'`):**

1. Piece letter (e.g. `N`)
2. `from` if present (file, rank, or full square — already correct from parse)
3. `x` if `capture === true`
4. `to`

**Pawn moves (`piece === 'P'`):**

1. If `capture === true`: `from` file + `x` + `to`
2. Otherwise: `to`
3. `=` + `promotion` if present (e.g. `=Q`)

**Suffix:**

- `+` if `check === true`
- `#` if `checkmate === true`

Note: pawn letter `P` is never emitted (spec §8.2.3.2).

## Move List Serialization — `stringifyMoveList(moves)`

Iterates `MovePair[]` and produces the movetext body.

**Move number format (spec §8.2.2.2):**

- White move always preceded by `N.` (e.g. `1.`)
- Black move preceded by `N...` only if there is intervening annotation
  (comment, NAG, or RAV) between white and black, or white move is absent
- Otherwise black move follows white's with a single space

**Per move, in order:**

1. Move number indication (if required)
2. SAN
3. NAGs — space-separated `$N` values from `move.annotations`
4. Comment block — `{ ... }` (see below)
5. RAVs — each `( <movelist> )`, recursively serialized

## Comment and Annotation Re-serialization

When any of `arrows`, `squares`, `clock`, `eval`, or `comment` are present on a
move, a single `{ }` block is emitted. Fields appear in this order:

1. `[%cal Ge2e4,Ra1h1]` — from `arrows`
2. `[%csl Rd4,Ge5]` — from `squares`
3. `[%clk H:MM:SS]` or `[%clk H:MM:SS.sss]` — from `clock` (seconds → H:MM:SS;
   sub-second precision preserved if fractional part is non-zero)
4. `[%eval 0.82]` / `[%eval -0.80]` (two decimal places) or `[%eval #3]` /
   `[%eval #-2,5]` (with optional `,depth`) — from `eval`
5. Plain `comment` text

Fields separated by single spaces. If none are present, no `{ }` block is
emitted.

## Result Serialization

`game.result` maps to the termination marker via `RESULT_TO_STR`:

| `result` | marker    |
| -------- | --------- |
| `1`      | `1-0`     |
| `0`      | `0-1`     |
| `0.5`    | `1/2-1/2` |
| `'?'`    | `*`       |

## Error Handling

`stringify` never throws. `onWarning` fires for recoverable issues:

- `castling: true` with unrecognised `to` — emits empty string for that move
- `piece === 'P'` with no `to` — emits empty string for that move
- `clock` value is negative — clamps to `0`, emits `[%clk 0:00:00]`

`onError` is never called.

## Testing

New file: `src/__tests__/stringify.spec.ts`

**Tags:**

- STR tags appear first in spec order
- Extra tags appear after STR in alphabetical order
- `undefined` tag values omitted
- Missing STR tags omitted

**SAN:**

- Piece moves: simple, with file/rank/square disambiguation, with capture
- Pawn push, pawn capture, en passant (same as capture — no special case)
- Castling kingside and queenside (both colours)
- Promotion (`e8=Q`, `e8=Q+`)
- Check (`+`), checkmate (`#`)

**Move numbers:**

- White always gets `N.`
- Black gets `N...` only after intervening annotation
- Black follows white directly when no annotation between them

**NAGs:** single, multiple

**Comments:**

- Text only
- All four commands only (no text)
- Text + commands
- Comment omitted when move has no annotation fields

**RAVs:** single variation, nested variations

**Warnings:**

- `onWarning` fires for bad castling destination
- `onWarning` fires for negative clock

**Round-trip:**

- `parse` → `stringify` → `parse` produces structurally identical output for
  each of the 13 fixture files (verified by comparing parsed objects, not
  strings)

**Multiple games:**

- `stringify([game1, game2])` produces two games separated by `\n`
