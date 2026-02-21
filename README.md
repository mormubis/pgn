# PGN

[![npm](https://img.shields.io/npm/v/@echecs/pgn)](https://www.npmjs.com/package/@echecs/pgn)
[![Test](https://github.com/mormubis/pgn/actions/workflows/test.yml/badge.svg)](https://github.com/mormubis/pgn/actions/workflows/test.yml)
[![Coverage](https://codecov.io/gh/mormubis/pgn/branch/main/graph/badge.svg)](https://codecov.io/gh/mormubis/pgn)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**PGN** is a fast TypeScript parser for
[Portable Game Notation](http://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm)
— the standard format for recording chess games.

It parses PGN input into structured move objects with decomposed SAN, paired
white/black moves, and full support for annotations and variations. Zero runtime
dependencies.

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

`parse()` takes a PGN string and returns an array of game objects — one per game
in the file.

```typescript
parse(input: string): PGN[]
```

### PGN object

```typescript
{
  meta:   Meta,   // tag pairs (Event, Site, Date, White, Black, …)
  moves:  Moves,  // paired move list
  result: 1 | 0 | 0.5 | '?'
}
```

### Move object

```typescript
{
  piece:       'P' | 'R' | 'N' | 'B' | 'Q' | 'K', // always present
  to:          string,       // destination square, e.g. "e4"
  from?:       string,       // disambiguation, e.g. "e" or "e2"
  capture?:    true,
  castling?:   true,
  check?:      true,
  checkmate?:  true,
  promotion?:  'R' | 'N' | 'B' | 'Q',
  annotations?: string[],   // e.g. ["!", "$14"]
  comment?:    string,
  variants?:   Moves[],     // recursive annotation variations
}
```

Moves are grouped into tuples: `[moveNumber, whiteMove, blackMove]`. If the last
move of a game or variation was made by white, `blackMove` is `undefined`.

### Annotations and comments

```pgn
12. Nf3! $14 { White has a slight advantage }
```

```typescript
{
  piece: 'N', to: 'f3',
  annotations: ['!', '$14'],
  comment: 'White has a slight advantage'
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

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for
guidelines on how to submit issues and pull requests.
