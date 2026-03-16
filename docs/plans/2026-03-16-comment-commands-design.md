# Design: Structured Comment Command Parsing (`[%cal]`, `[%csl]`, `[%clk]`, `[%eval]`)

Date: 2026-03-16 Status: Approved

## Overview

Parse structured embedded commands from PGN comment strings and expose them as
typed fields on the `Move` object. Commands follow the 2001 PGN supplement's
`[%command param,...]` syntax. The four commands in scope are `[%cal]`,
`[%csl]`, `[%clk]`, and `[%eval]`, which are universally supported by Lichess,
ChessBase, python-chess, and pgn-parser (mliebelt).

## References

- [PGN spec (1994)](http://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm)
- [PGN supplement (2001)](https://github.com/fsmosca/PGN-Standard) — defines the
  `[%command ...]` embedded command syntax and `[%clk]`
- [python-chess](https://python-chess.readthedocs.io/en/latest/pgn.html) — de
  facto reference implementation for `[%cal]`, `[%csl]`, `[%clk]`, `[%eval]`

## Approach

Post-process comment strings in `src/index.ts` using targeted regex extraction.
The grammar continues to produce raw comment strings as today. A new
`parseCommentCommands()` function runs after grammar parsing, extracts
structured data, strips matched command strings from the text, and returns clean
fields. This keeps the Peggy grammar focused on structure and avoids embedding
command-level parsing in the grammar rules.

## Type Definitions

```typescript
type AnnotationColor = 'B' | 'G' | 'R' | 'Y';

interface Arrow {
  color: AnnotationColor;
  from: string; // source square, e.g. 'e2'
  to: string; // destination square, e.g. 'e4'
}

interface Square {
  color: AnnotationColor;
  square: string; // e.g. 'd4'
}

type Eval =
  | { depth?: number; type: 'cp'; value: number } // centipawns, e.g. -0.80
  | { depth?: number; type: 'mate'; value: number }; // mate in N
```

New optional fields on `Move`:

```typescript
interface Move {
  // ... existing fields ...
  arrows?: Arrow[]; // from [%cal]
  clock?: number; // from [%clk], seconds remaining as float
  eval?: Eval; // from [%eval]
  squares?: Square[]; // from [%csl]
}
```

`clock` is stored in seconds as a `number` (consistent with python-chess).

## `parseCommentCommands()` Function

```typescript
function parseCommentCommands(raw: string): {
  arrows?: Arrow[];
  clock?: number;
  comment?: string;
  eval?: Eval;
  squares?: Square[];
};
```

Called wherever `move.comment` is currently assigned. Returns the cleaned
comment text alongside any parsed fields. Fields are omitted from the result
when absent (no empty arrays, no `undefined` values on the move object).

### Per-command logic

**`[%cal]` and `[%csl]`** — one regex handles both since they share the token
format `COLOUR + from-square (+ to-square)`. Tokens with a destination square
become `Arrow` entries (`arrows`); tokens with only one square become `Square`
entries (`squares`). Multiple commands of the same type in one comment are
merged into a single array.

**`[%clk]`** — regex captures `H:MM:SS` or `H:MM:SS.sss`. Converted to seconds:
`H * 3600 + MM * 60 + SS`. Sub-second precision is preserved as a float. Only
the first `[%clk]` in a comment is used (consistent with python-chess).

**`[%eval]`** — regex captures either `#±N` (mate) or `±N.NN` (centipawns), plus
an optional `,depth` suffix. Centipawn value stored as a float (e.g. `-0.80`).
Only the first `[%eval]` is used.

**Comment cleanup** — after all known commands are stripped, the remaining text
is trimmed. If the result is empty, `comment` is omitted from the returned
object (no empty string on the move).

**Unknown commands** — `[%anything ...]` that matches no known command is left
in the comment string unchanged, per the 2001 supplement spec.

## Error Handling

Malformed command tokens are silently ignored and left in the comment string
unchanged. No warnings are emitted. This matches python-chess and mliebelt's
behaviour — lenient parsing suits annotations that originate from third-party
tools with minor formatting variations.

## Test Cases

Unit tests in `src/__tests__/index.spec.ts`:

- `[%cal]` — single arrow, multiple arrows, all four colours
- `[%csl]` — single square, multiple squares
- `[%cal]` and `[%csl]` in the same comment
- `[%clk]` — hours/minutes/seconds; fractional seconds (`[%clk 0:00:01.234]` →
  `1.234`); large value (`[%clk 3:25:45]` → `12345`)
- `[%eval]` — centipawn positive, negative, zero; near-boundary values 199–219
  (lossless round-trip); mate positive and negative; depth suffix
- Multiple commands in one comment — all parsed, text preserved
- Malformed token — left in comment, rest parsed normally
- Unknown command — left in comment untouched
- Comment with only commands — `comment` field absent on the move
- Comment with commands and text — text trimmed correctly

The `comments.pgn` snapshot will be updated after implementation to reflect
structured fields instead of raw command strings.

Concrete values ported from python-chess test suite (`test.py`):

| Input                          | Expected                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `[%clk 3:25:45]`               | `clock: 12345`                                                                                                      |
| `[%clk 0:00:01.234]`           | `clock: 1.234`                                                                                                      |
| `[%eval -0.80]`                | `{ type: 'cp', value: -0.80 }`                                                                                      |
| `[%eval #1,5]`                 | `{ type: 'mate', value: 1, depth: 5 }`                                                                              |
| `[%csl Ga1][%cal Ra1h1,Gb1b8]` | `squares: [{color:'G', square:'a1'}]`, `arrows: [{color:'R', from:'a1', to:'h1'}, {color:'G', from:'b1', to:'b8'}]` |
