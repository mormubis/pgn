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

## Important Notes

- `PGN` is a parser and does not verify the validity of the PGN games. It only
  parses the provided content.
- For game validation, use **@echecs/game** as it is responsible for verifying
  game correctness as part of the **ECHECS** project.
