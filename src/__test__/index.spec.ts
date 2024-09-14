import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

// @ts-expect-error - Required file extension ?
import parse from '../index';

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

const tests = {
  basic,
  checkmate,
  comment,
  comments,
  long,
  multiple,
  promotion,
  single,
  variants,
};

describe('PGN Parser', () => {
  Object.entries(tests).forEach(([label, input]) =>
    it(label, () => {
      expect(parse(input)).toMatchSnapshot();
    }),
  );
});
