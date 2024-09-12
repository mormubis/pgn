# PGN

**PGN** is part of the **ECHECS** project. **PGN** is a parser of the
[PGN specification](http://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm).

## Installation

```bash
npm install --save-dev @echecs/pgn
```

## Usage

`parse(input: string): PGN[]`

**PGN** format:

```
{
    meta: Meta,
    moves: Moves,
    result: 1-0 // 1-0 | 0-1 | 1/2-1/2 | ?
}
```

**Meta** format:

```
{
    // Based on the PGN specification at least the following Tags should be available
    Event: "the name of the tournament or match event"
    Site: "the location of the event"
    Date: "the starting date of the game"
    Round: "the playing round ordinal of the game"
    White: "the player of the white pieces"
    Black: "the player of the black pieces"
    Result: "the result of the game"
    // plus any other additional tags with `key` string
    [key]: "string"
}
```

**Moves** is an _array_ of:

```
// move number, white move, black move
[5, Move, Move]
```

Notice that half move are available for variations of if the last move of the
game was white.

**Move** format:

```
{
  annotations: ["!", "$126"], // (optional) all the annotations for the given move
  capture: false, // (optional) indicates if the move capture any piece
  castling: true, // (optional) indicates if the move was castling
  check: false, // (optional) indicates if the move checks the rival king
  checkmate: false, // (optional) indicates if it is checkmate
  comment: 'Some comment', // (optional) comment of the move
  from: 'e', // (optional) Disambiguation of the move
  piece: 'K', // (required) P (Pawn) | R (Rook) | N (Knight) | B (Bishop) | Q (Queen) | K (King)
  promotion: Piece; // (optional) R (Rook) | N (Knight) | B (Bishop) | Q (Queen)
  to: 'g1', // ending square of the piece
  variants: [...] // moves following Moves format
}
```

**Example**

```js
import { readFileSync } from 'fs';
import parse from '@echecs/pgn';

function readFile(path: string): string {
  const filename = require.resolve(path);

  return readFileSync(filename, 'utf8');
}

const pgn = parse(readFile('./games/file.pgn'));
// [
//   {
//     "meta": {
//       "Black": "Cordts, Ingo",
//       "BlackElo": "2222",
//       "Date": "2000.10.29",
//       "ECO": "A56",
//       "Result": "0-1",
//       "Round": "?",
//       "Site": "?",
//       "White": "Carlsen, Magnus",
//       "WhiteElo": "0",
//     },
//     "moves": [
//       [
//         1,
//         {
//           "piece": "P",
//           "to": "d4",
//         },
//         {
//           "piece": "N",
//           "to": "f6",
//         },
//       ],
//       [
//         2,
//         {
//           "piece": "P",
//           "to": "c4",
//         },
//         {
//           "piece": "P",
//           "to": "c5",
//         },
//       ],
//       [
//         3,
//         {
//           "piece": "N",
//           "to": "f3",
//         },
//         {
//           "capture": true,
//           "from": "c",
//           "piece": "P",
//           "to": "d4",
//         },
//       ],
//       ...
//       [
//         6,
//         {
//           "capture": true,
//           "from": "c",
//           "piece": "P",
//           "to": "d5",
//         },
//         {
//           "piece": "B",
//           "to": "c5",
//         },
//       ],
//       [
//         7,
//         {
//           "from": "5",
//           "piece": "N",
//           "to": "c3",
//         },
//         {
//           "castling": true,
//           "piece": "K",
//           "to": "g8",
//         },
//       ],
//       ...
//       [
//         21,
//         {
//           "capture": true,
//           "piece": "N",
//           "to": "e4",
//         },
//         {
//           "piece": "B",
//           "to": "b7",
//         },
//       ],
//       [
//         22,
//         {
//           "capture": true,
//           "piece": "Q",
//           "to": "d7",
//         },
//         {
//           "capture": true,
//           "piece": "B",
//           "to": "e4",
//         },
//       ],
//       [
//         23,
//         {
//           "piece": "R",
//           "to": "h2",
//         },
//         {
//           "capture": true,
//           "piece": "B",
//           "to": "d6",
//         },
//       ],
//       ...
//       [
//         29,
//         {
//           "capture": true,
//           "check": true,
//           "piece": "Q",
//           "to": "e6",
//         },
//         {
//           "piece": "K",
//           "to": "h8",
//         },
//       ],
//       [
//         30,
//         {
//           "piece": "Q",
//           "to": "e7",
//         },
//         {
//           "piece": "B",
//           "to": "c7",
//         },
//       ],
//     ],
//     "result": 0,
//   },
// ];
```

## Warning

**PGN** does not guarantee PGN games are valid. It does only parse the content.
As part of the **ECHECS** project, it is responsability of **@echecs/game** to
verify the validity of the game.
