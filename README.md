# PGN

`PGN` is a parser that is part of the **ECHECS** project, designed to interpret
the
[PGN (Portable Game Notation) specification](http://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm).

## Installation

```bash
npm install --save-dev @echecs/pgn
```

## Usage

The `parse` function takes a PGN formatted string as input and returns an array
of parsed PGN objects.

```typescript
parse(input: string): PGN[]
```

### PGN Object Format

Here’s the structure of the `PGN` object:

#### PGN Object

```typescript
{
    "meta": Meta,
    "moves": Moves,
    "result": "1-0" // possible values: "1-0", "0-1", "1/2-1/2", "?"
}
```

#### Meta Object

The `meta` object contains metadata about the chess game.

```typescript
{
    "Event": "name of the tournament or match event",
    "Site": "location of the event",
    "Date": "starting date of the game",
    "Round": "playing round ordinal of the game",
    "White": "player of the white pieces",
    "Black": "player of the black pieces",
    "Result": "result of the game",
    // Any other additional tags
    [key]: "string"
}
```

#### Moves Array

`Moves` is an array representing the sequence of moves in the game. Each element
is an array containing the move number, the white move, and the black move.

```typescript
[moveNumber, Move, Move];
```

Note: Half moves are included for variations or in cases where the last move was
made by white.

#### Move Object

Each move is represented by the following structure:

```typescript
{
  "annotations": ["!", "$126"], // optional, annotations for the move
  "capture": false, // optional, indicates if any piece was captured
  "castling": true, // optional, indicates if the move was castling
  "check": false, // optional, indicates if the move put the rival king in check
  "checkmate": false, // optional, indicates if it is a checkmate
  "comment": "Some comment", // optional, comment about the move
  "from": "e", // optional, disambiguation of the move
  "piece": "K", // required, type of piece (P, R, N, B, Q, K)
  "promotion": "Piece", // optional, promotion piece (R, N, B, Q)
  "to": "g1", // required, ending square of the move
  "variants": [...] // optional, array of moves for variations following Moves format
}
```

### Example

Here's a sample usage of the `PGN` parser:

```typescript
import { readFileSync } from 'fs';
import parse from '@echecs/pgn';

function readFile(path) {
  const filename = require.resolve(path);
  return readFileSync(filename, 'utf8');
}

const pgn = parse(readFile('./games/file.pgn'));

// Output example of parsed `PGN`
console.log(pgn);
/*
[
   {
     "meta": {
       "Event": "Some Tournament",
       "Site": "Some Location",
       "Date": "2023.10.04",
       "Round": "1",
       "White": "Player1",
       "Black": "Player2",
       "Result": "1-0",
       // additional tags...
     },
     "moves": [
       [
         1,
         { "piece": "P", "to": "e4" },
         { "piece": "P", "to": "e5" }
       ],
       [
         2,
         { "piece": "N", "to": "f3" },
         { "piece": "N", "to": "c6" }
       ],
       // more moves...
     ],
     "result": "1-0"
   }
];
*/
```

## Performance

`@echecs/pgn` uses a [Peggy](https://peggyjs.org/) PEG parser for O(n) parsing
and is competitive with the fastest PGN parsers available.

Benchmarked against `pgn-parser@2.2.1`, `@mliebelt/pgn-parser@1.4.19`, and
`chess.js@1.4.0` on a representative set of real-world PGN fixtures:

| Fixture                 | `@echecs/pgn` | `pgn-parser` | vs `pgn-parser`  |
| ----------------------- | ------------- | ------------ | ---------------- |
| single.pgn (1 move)     | 134,397 hz    | 130,834 hz   | **1.03x faster** |
| checkmate.pgn           | 19,842 hz     | 22,195 hz    | 1.12x slower     |
| basic.pgn               | 14,515 hz     | 16,095 hz    | 1.11x slower     |
| multiple.pgn (4 games)  | 7,912 hz      | 9,490 hz     | 1.20x slower     |
| lichess.pgn (100 games) | 1,348 hz      | 1,537 hz     | 1.14x slower     |
| long.pgn (~3500 games)  | 2.92 hz       | 3.41 hz      | 1.17x slower     |

The small remaining gap (~1.1–1.2x) reflects the additional work `@echecs/pgn`
performs per move: full SAN decomposition, castling square resolution, move
pairing, and numeric result conversion. `pgn-parser` outputs raw strings with a
flat move list.

See [`BENCHMARK_RESULTS.md`](./BENCHMARK_RESULTS.md) for full results and
historical comparisons.

## Important Notes

- `PGN` is a parser and does not verify the validity of the PGN games. It only
  parses the provided content.
- For game validation, use **@echecs/game** as it is responsible for verifying
  game correctness as part of the **ECHECS** project.
