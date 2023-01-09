import { readFileSync } from 'fs';

import parse from '../src/index';

function readFile(path: string): string {
  const filename = require.resolve(path);

  return readFileSync(filename, 'utf8');
}

const basic = readFile('./grammar/basic.pgn');
const checkmate = readFile('./grammar/checkmate.pgn');
const comment = readFile('./grammar/comment.pgn');
const comments = readFile('./grammar/comments.pgn');
const multiple = readFile('./grammar/multiple-game.pgn');
const promotion = readFile('./grammar/promotion.pgn');
const variants = readFile('./grammar/variants.pgn');
const long = readFile('./grammar/long.pgn');
const single = readFile('./grammar/single.pgn');

const tests = { basic, checkmate, comment, comments, multiple, promotion, variants, long, single };

describe('PGN Parser', () => {
  Object.entries(tests).forEach(([label, input]) =>
    it(label, () => {
      expect(parse(input)).toMatchSnapshot();
    }),
  );
});
