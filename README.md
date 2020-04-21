# PGN

PGN is part of the project @echecs (chess). It parses a PGN File following the
specification provided in:
[Specification](http://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm)

## Use

We just need to provide with a PGN to the parser. It always return an array
because PGN files could contain several games.

```js
const parser = require('@echecs/pgn');

parser(string);

// [
//   {
//     "meta": {
//       "Site": "?",
//       "Date": "2000.10.29",
//       "Round": "?",
//       "White": "Carlsen, Magnus",
//       "Black": "Cordts, Ingo",
//       "ECO": "A56",
//       "WhiteElo": "0",
//       "BlackElo": "2222",
//       "Result": "0-1"
//     },
//     "moves": [
//       [
//         {
//           "piece": "P",
//           "to": "d4"
//         },
//         {
//           "piece": "N",
//           "to": "f6"
//         }
//       ],
//       [
//         {
//           "piece": "P",
//           "to": "c4"
//         },
//         {
//           "piece": "P",
//           "to": "c5"
//         }
//       ],
//       [
//         {
//           "piece": "N",
//           "to": "f3"
//         },
//         {
//           "from": "c",
//           "piece": "P",
//           "to": "d4"
//         }
//       ],
//       [
//         {
//           "piece": "N",
//           "to": "d4"
//         },
//         {
//           "piece": "P",
//           "to": "e5"
//         }
//       ],
//       [
//         {
//           "piece": "N",
//           "to": "b5"
//         },
//         {
//           "piece": "P",
//           "to": "d5"
//         }
//       ],
//       [
//         {
//           "from": "c",
//           "piece": "P",
//           "to": "d5"
//         },
//         {
//           "piece": "B",
//           "to": "c5"
//         }
//       ],
//       [
//         {
//           "from": "5",
//           "piece": "N",
//           "to": "c3"
//         },
//         {
//           "castling": true,
//           "piece": "K",
//           "to": "c8"
//         }
//       ],
//       [
//         {
//           "piece": "P",
//           "to": "e3"
//         },
//         {
//           "piece": "P",
//           "to": "e4"
//         }
//       ],
//       [
//         {
//           "piece": "P",
//           "to": "h3"
//         },
//         {
//           "piece": "R",
//           "to": "e8"
//         }
//       ],
//       [
//         {
//           "piece": "P",
//           "to": "g4"
//         },
//         {
//           "piece": "R",
//           "to": "e5"
//         }
//       ],
//       [
//         {
//           "piece": "B",
//           "to": "c4"
//         },
//         {
//           "from": "b",
//           "piece": "N",
//           "to": "d7"
//         }
//       ],
//       [
//         {
//           "piece": "Q",
//           "to": "b3"
//         },
//         {
//           "piece": "N",
//           "to": "e8"
//         }
//       ],
//       [
//         {
//           "piece": "N",
//           "to": "d2"
//         },
//         {
//           "piece": "N",
//           "to": "d6"
//         }
//       ],
//       [
//         {
//           "piece": "B",
//           "to": "e2"
//         },
//         {
//           "piece": "Q",
//           "to": "h4"
//         }
//       ],
//       [
//         {
//           "piece": "N",
//           "to": "c4"
//         },
//         {
//           "piece": "N",
//           "to": "c4"
//         }
//       ],
//       [
//         {
//           "piece": "Q",
//           "to": "c4"
//         },
//         {
//           "piece": "P",
//           "to": "b5"
//         }
//       ],
//       [
//         {
//           "piece": "Q",
//           "to": "b5"
//         },
//         {
//           "piece": "R",
//           "to": "b8"
//         }
//       ],
//       [
//         {
//           "piece": "Q",
//           "to": "a4"
//         },
//         {
//           "piece": "N",
//           "to": "f6"
//         }
//       ],
//       [
//         {
//           "piece": "Q",
//           "to": "c6"
//         },
//         {
//           "piece": "N",
//           "to": "d7"
//         }
//       ],
//       [
//         {
//           "piece": "P",
//           "to": "d6"
//         },
//         {
//           "piece": "R",
//           "to": "e6"
//         }
//       ],
//       [
//         {
//           "piece": "N",
//           "to": "e4"
//         },
//         {
//           "piece": "B",
//           "to": "b7"
//         }
//       ],
//       [
//         {
//           "piece": "Q",
//           "to": "d7"
//         },
//         {
//           "piece": "B",
//           "to": "e4"
//         }
//       ],
//       [
//         {
//           "piece": "R",
//           "to": "h2"
//         },
//         {
//           "piece": "B",
//           "to": "d6"
//         }
//       ],
//       [
//         {
//           "piece": "B",
//           "to": "c4"
//         },
//         {
//           "piece": "R",
//           "to": "d8"
//         }
//       ],
//       [
//         {
//           "piece": "Q",
//           "to": "a7"
//         },
//         {
//           "piece": "B",
//           "to": "h2"
//         }
//       ],
//       [
//         {
//           "piece": "B",
//           "to": "e6"
//         },
//         {
//           "from": "f",
//           "piece": "P",
//           "to": "e6"
//         }
//       ],
//       [
//         {
//           "piece": "Q",
//           "to": "a6"
//         },
//         {
//           "piece": "B",
//           "to": "f3"
//         }
//       ],
//       [
//         {
//           "piece": "B",
//           "to": "d2"
//         },
//         {
//           "piece": "Q",
//           "to": "h3"
//         }
//       ],
//       [
//         {
//           "annotations": [
//             "check"
//           ],
//           "piece": "Q",
//           "to": "e6"
//         },
//         {
//           "piece": "K",
//           "to": "h8"
//         }
//       ],
//       [
//         {
//           "piece": "Q",
//           "to": "e7"
//         },
//         {
//           "piece": "B",
//           "to": "c7"
//         }
//       ]
//     ],
//     "result": 0
//   }
// ]
```
