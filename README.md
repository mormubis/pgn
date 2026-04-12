# PGN

[![npm](https://img.shields.io/npm/v/@echecs/pgn)](https://www.npmjs.com/package/@echecs/pgn)
[![Coverage](https://codecov.io/gh/echecsjs/pgn/branch/main/graph/badge.svg)](https://codecov.io/gh/echecsjs/pgn)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**PGN** is a fast, lightweight TypeScript parser for
[Portable Game Notation](http://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm)
— the standard format for recording chess games.

It parses PGN input into structured move objects with decomposed SAN, paired
white/black moves, and full support for annotations and variations. Zero runtime
dependencies. The smallest PGN parser on npm.

| Package                | Pack size | Unpacked   |
| ---------------------- | --------- | ---------- |
| **`@echecs/pgn`**      | **42 KB** | **195 KB** |
| `pgn-parser`           | 99 KB     | 606 KB     |
| `@mliebelt/pgn-parser` | 148 KB    | 595 KB     |
| `chess.js`             | 150 KB    | 724 KB     |

## Why this library?

Most PGN parsers on npm either give you raw strings with no structure, or fail
on anything beyond a plain game record. If you're building a chess engine,
opening book, or game viewer, you need more:

- **Decomposed SAN** — every move is parsed into `piece`, `from`, `to`,
  `capture`, `promotion`, `check`, and `checkmate` fields. No regex on your
  side.
- **Paired move structure** — moves are returned as
  `[moveNumber, whiteMove, blackMove]` tuples, ready to render or process
  without further work.
- **RAV support** — recursive annotation variations (`(...)` sub-lines) are
  parsed into a `variants` tree on each move. Essential for opening books and
  annotated games.
- **NAG support** — symbolic (`!`, `?`, `!!`, `??`, `!?`, `?!`) and numeric
  (`$1`–`$255`) annotations are surfaced as an `annotations` array. Essential
  for Lichess and ChessBase exports.
- **Multi-game files** — parse entire PGN databases in one call. Tested on files
  with 3 500+ games.
- **Fast** — built on a [Peggy](https://peggyjs.org/) PEG parser. Throughput is
  within 1.1–1.2x of the fastest parsers on npm, which do far less work per move
  (see [BENCHMARK_RESULTS.md](./BENCHMARK_RESULTS.md)).

If you only need raw SAN strings and a flat move list, any PGN parser will do.
If you need structured, engine-ready output with annotations and variations,
this is the one.

## Installation

```bash
npm install @echecs/pgn
```

## Quick Start

```typescript
import parse from '@echecs/pgn';

const games = parse(`
  [Event "Example"]
  [White "Player1"]
  [Black "Player2"]
  [Result "1-0"]

  1. e4 e5 2. Nf3 Nc6 3. Bb5 1-0
`);

console.log(games[0].moves[0]);
// [1, { piece: 'P', to: 'e4' }, { piece: 'P', to: 'e5' }]
```

## Usage

### `parse()`

Takes a PGN string and returns an array of game objects — one per game in the
file.

```typescript
parse(input: string, options?: ParseOptions): PGN[]
```

### ~~`stream()`~~ (deprecated)

> **Deprecated.** Use `parse()` instead — it already handles multi-game input.
> `stream()` will be removed in the next major version. It emits a
> `console.warn` on first call.

### `stringify()`

Converts one or more parsed `PGN` objects back into a valid PGN string,
providing semantic round-trip fidelity.

```typescript
stringify(input: PGN | PGN[], options?: StringifyOptions): string
```

Reconstructs SAN from `Move` fields, re-serializes annotation commands
(`[%cal]`, `[%csl]`, `[%clk]`, `[%eval]`) back into comment blocks, and
preserves RAVs and NAGs. Pass `onWarning` to observe recoverable issues (e.g.
invalid castling destination, negative clock). `StringifyOptions` is a subset of
`ParseOptions` — `onError` is not accepted since `stringify` never fails hard.

```typescript
import parse, { stringify } from '@echecs/pgn';

const games = parse(pgnString);
const output = stringify(games); // valid PGN string
```

### Error handling

By default, `parse()` silently returns `[]` on parse failure. Pass an `onError`
callback to observe failures:

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
| `offset`  | `number` | Character offset in the input (0-based)    |
| `line`    | `number` | 1-based line number                        |
| `column`  | `number` | 1-based column number                      |

### Warnings

Pass `onWarning` to observe spec-compliance issues that do not prevent parsing:

```typescript
import parse, { type ParseWarning } from '@echecs/pgn';

const games = parse(input, {
  onWarning(warn: ParseWarning) {
    console.warn(warn.message);
  },
});
```

`onWarning` receives a `ParseWarning` with the same fields as `ParseError`:
`message`, `offset`, `line`, `column`.

Currently fires for:

- Missing STR tags (`Black`, `Date`, `Event`, `Result`, `Round`, `Site`,
  `White`) — emitted in alphabetical key order; position fields are nominal
  placeholders
- Move number mismatch (declared move number in the PGN text doesn't match the
  move's actual position) — position fields are nominal placeholders
- Result tag mismatch (`[Result "..."]` tag value differs from the game
  termination marker) — position fields are nominal placeholders
- Duplicate tag names — `line` and `column` point to the opening `[` of the
  duplicate tag

The same option is accepted by `stringify()`.

### PGN object

```typescript
{
  meta:   Meta,      // tag pairs (Event, Site, Date, White, Black, …)
  moves:  MoveList,  // paired move list
  result: 1 | 0 | 0.5 | '?'
}
```

`meta` is an index of all tag pairs from the PGN header. The `Result` key is
optional — games with no tag pairs return `meta: {}`. Use `game.result` (always
present) as the authoritative game outcome.

### Move object

```typescript
{
  piece:       PieceChar,    // always present; 'P' | 'R' | 'N' | 'B' | 'Q' | 'K'
  to:          Square,       // destination square, e.g. "e4"
  from?:       Disambiguation, // file "e", rank "2", or square "e2"
  capture?:    boolean,
  castling?:   boolean,
  check?:      boolean,
  checkmate?:  boolean,
  promotion?:  PieceChar,
  annotations?: string[],   // e.g. ["!", "$14"]
  comment?:    string,
  arrows?:     Arrow[],              // from [%cal ...] command
  squares?:    SquareAnnotation[],   // from [%csl ...] command
  clock?:      number,               // from [%clk ...] — seconds remaining
  eval?:       Eval,                 // from [%eval ...] — engine evaluation
  variants?:   MoveList[],  // recursive annotation variations
}
```

Moves are grouped into tuples: `[moveNumber, whiteMove, blackMove]`. Both move
slots can be `undefined` — `whiteMove` when a variation begins on black's turn,
`blackMove` when the game or variation ends on white's move.

### Annotations and comments

```pgn
12. Nf3! $14 { White has a slight advantage }
```

```typescript
{
  piece: 'N', to: 'f3',
  annotations: ['!', '14'],  // numeric NAGs stored without '$' prefix
  comment: 'White has a slight advantage'
}
```

### Comment annotations

PGN files produced by GUIs and engines embed structured commands inside move
comments using the `[%cmd ...]` syntax. This library parses the four most common
commands and exposes them as dedicated fields on `Move`:

| Field     | Type                 | PGN command   | Description                                      |
| --------- | -------------------- | ------------- | ------------------------------------------------ |
| `arrows`  | `Arrow[]`            | `[%cal ...]`  | Coloured arrows drawn on the board               |
| `squares` | `SquareAnnotation[]` | `[%csl ...]`  | Coloured square highlights                       |
| `clock`   | `number`             | `[%clk ...]`  | Remaining time in seconds (sub-second preserved) |
| `eval`    | `Eval`               | `[%eval ...]` | Engine evaluation (centipawns or mate-in-N)      |

Command strings are stripped from `move.comment`. Unknown `[%...]` commands are
left in the comment string unchanged.

#### Types

```typescript
type AnnotationColor = 'B' | 'C' | 'G' | 'O' | 'R' | 'Y'; // Blue, Cyan, Green, Orange, Red, Yellow

interface Arrow {
  color: AnnotationColor;
  from: Square; // e.g. "e2"
  to: Square; // e.g. "e4"
}

interface SquareAnnotation {
  color: AnnotationColor;
  square: Square; // e.g. "e4"
}

type Eval =
  | { type: 'cp'; value: number; depth?: number } // centipawn score
  | { type: 'mate'; value: number; depth?: number }; // mate in N
```

#### Example

```pgn
1. e4 { [%cal Ge2e4,Re4e5] [%clk 0:05:00] } e5
```

```typescript
{
  piece: 'P', to: 'e4',
  // comment is absent — no free text remains after stripping commands
  arrows: [
    { color: 'G', from: 'e2', to: 'e4' },
    { color: 'R', from: 'e4', to: 'e5' },
  ],
  clock: 300,    // 5 minutes in seconds
}
```

### Variations

```pgn
5... Ba5 (5... Be7 6. d4) 6. Qb3
```

The alternative line appears as a `variants` array on the move where it
branches:

```typescript
{
  piece: 'B', to: 'a5',
  variants: [
    [ [5, undefined, { piece: 'B', to: 'e7' }], [6, { piece: 'P', to: 'd4' }] ]
  ]
}
```

## Exported types

All public types are exported as named type exports:

```typescript
import type {
  AnnotationColor, // 'B' | 'C' | 'G' | 'O' | 'R' | 'Y'
  Arrow, // { color, from, to }
  Disambiguation, // Square | File | Rank
  Eval, // { type: 'cp' | 'mate', value, depth? }
  File, // 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'
  Meta, // { [key: string]: string | undefined }
  Move, // single parsed move object
  MoveList, // MovePair[]
  MovePair, // [number, Move | undefined, Move?]
  ParseError, // { message, offset, line, column }
  ParseOptions, // { onError?, onWarning? }
  ParseWarning, // { message, offset, line, column }
  PGN, // { meta, moves, result }
  PieceChar, // 'P' | 'R' | 'N' | 'B' | 'Q' | 'K'
  Rank, // '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'
  Result, // '1-0' | '0-1' | '1/2-1/2' | '?'
  Square, // `${File}${Rank}`, e.g. "e4"
  SquareAnnotation, // { color, square }
  StringifyOptions, // { onWarning? }
  Variation, // MoveList[]
} from '@echecs/pgn';
```

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for
guidelines on how to submit issues and pull requests.
