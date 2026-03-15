import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import parse from '../index.js';

function readFile(path: string): string {
  const filename = require.resolve(path);

  return readFileSync(filename, 'utf8');
}

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

const tests = {
  basic,
  benko,
  checkmate,
  comment,
  comments,
  games32,
  lichess,
  long,
  multiple,
  promotion,
  single,
  twic,
  variants,
};

describe('PGN Parser', () => {
  for (const [label, input] of Object.entries(tests)) {
    it(label, { timeout: 15_000 }, async () => {
      await expect(parse(input)).toMatchFileSnapshot(
        `./__snapshots__/${label}.snap`,
      );
    });
  }

  it('returns [] for malformed input', () => {
    expect(parse('not valid pgn !!!')).toEqual([]);
  });

  it('calls onError with parse error information', () => {
    const errors: unknown[] = [];
    const result = parse('this is not valid pgn', {
      onError: (error) => errors.push(error),
    });
    expect(result).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      message: expect.any(String),
      offset: expect.any(Number),
      line: expect.any(Number),
      column: expect.any(Number),
    });
  });

  it('returns [] with no error when onError option is omitted', () => {
    const result = parse('this is not valid pgn');
    expect(result).toEqual([]);
  });
});
