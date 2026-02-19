import { readFileSync } from 'fs';
import { bench, describe } from 'vitest';
import { Chess } from 'chess.js';
import { parse as pgnParserParse } from 'pgn-parser';
import { parseGame, parseGames } from '@mliebelt/pgn-parser';

import parse from '../index.js';

function readFile(path: string): string {
  const filename = require.resolve(path);
  return readFileSync(filename, 'utf8');
}

// Load all fixture files
const basic = readFile('./grammar/basic.pgn');
const benko = readFile('./grammar/benko.pgn');
const checkmate = readFile('./grammar/checkmate.pgn');
const comment = readFile('./grammar/comment.pgn');
const comments = readFile('./grammar/comments.pgn');
const games32 = readFile('./grammar/games32.pgn');
const lichess = readFile('./grammar/lichess.pgn');
const long = readFile('./grammar/long.pgn');
const multiple = readFile('./grammar/multiple-game.pgn');
const promotion = readFile('./grammar/promotion.pgn');
const single = readFile('./grammar/single.pgn');
const twic = readFile('./grammar/twic.pgn');
const variants = readFile('./grammar/variants.pgn');

// Single-game fixtures (all 4 parsers)
const singleGameFixtures = { basic, benko, checkmate, comment, promotion, single, variants };

// Multi-game fixtures (exclude chess.js, which only handles one game at a time)
const multiGameFixtures = { multiple, comments, games32, lichess, twic, long };

// ============================================================================
// Single-game fixtures: compare all 4 parsers
// ============================================================================

Object.entries(singleGameFixtures).forEach(([label, input]) => {
  describe(`single-game: ${label}`, () => {
    bench('@echecs/pgn', () => {
      parse(input);
    });

    bench('@mliebelt/pgn-parser', () => {
      parseGame(input);
    });

    bench('pgn-parser', () => {
      pgnParserParse(input);
    });

    bench('chess.js', () => {
      new Chess().loadPgn(input);
    });
  });
});

// ============================================================================
// Multi-game fixtures: exclude chess.js (only handles single game)
// ============================================================================

Object.entries(multiGameFixtures).forEach(([label, input]) => {
  describe(`multi-game: ${label}`, () => {
    bench('@echecs/pgn', () => {
      parse(input);
    });

    bench('@mliebelt/pgn-parser', () => {
      parseGames(input);
    });

    bench('pgn-parser', () => {
      pgnParserParse(input);
    });
  });
});
