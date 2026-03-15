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

  it('strips a UTF-8 BOM from the start of input', () => {
    const withBom = '\uFEFF[Event "Test"]\n[Result "1-0"]\n\n1. e4 1-0';
    const result = parse(withBom);
    expect(result).toHaveLength(1);
    expect(result[0]?.meta['Event']).toBe('Test');
  });

  it('handles escaped quotes in tag values', () => {
    const pgn = String.raw`[Event "\"Café\""]` + '\n[Result "1-0"]\n\n1. e4 1-0';
    const result = parse(pgn);
    expect(result).toHaveLength(1);
    expect(result[0]?.meta['Event']).toBe('"Café"');
  });

  it('handles escaped backslashes in tag values', () => {
    const pgn = String.raw`[Site "A\\B"]` + '\n[Result "1-0"]\n\n1. e4 1-0';
    const result = parse(pgn);
    expect(result).toHaveLength(1);
    expect(result[0]?.meta['Site']).toBe(String.raw`A\B`);
  });

  it('calls onError with parse error information', () => {
    const errors: unknown[] = [];
    // "XBAD" starts at offset 0, line 1, column 1 — gives a concrete anchor
    const result = parse('XBAD', {
      onError: (error) => errors.push(error),
    });
    expect(result).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      column: 1,
      line: 1,
      message: expect.stringMatching(/Expected|expected/i),
      offset: 0,
    });
  });
});
