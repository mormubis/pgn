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
    const pgn =
      String.raw`[Event "\"Café\""]` + '\n[Result "1-0"]\n\n1. e4 1-0';
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

  it('handles a backslash immediately followed by an escaped quote', () => {
    // PGN tag value "A\\\"B" should produce A\"B (backslash then quote)
    const pgn = String.raw`[Event "A\\\"B"]` + '\n[Result "1-0"]\n\n1. e4 1-0';
    const result = parse(pgn);
    expect(result).toHaveLength(1);
    expect(result[0]?.meta['Event']).toBe(String.raw`A\"B`);
  });

  it('parses a game with no tags', () => {
    const pgn = '1. e4 e5 2. Nf3 Nc6 1-0';
    const result = parse(pgn);
    expect(result).toHaveLength(1);
    expect(result[0]?.meta).toEqual({});
    expect(result[0]?.result).toBe(1);
  });

  it('parses a mixed file with tagged and tagless games', () => {
    const pgn = '[Event "Tagged"]\n[Result "1-0"]\n\n1. e4 1-0\n\n1. d4 0-1';
    const result = parse(pgn);
    expect(result).toHaveLength(2);
    expect(result[0]?.meta['Event']).toBe('Tagged');
    expect(result[1]?.meta).toEqual({});
    expect(result[1]?.result).toBe(0);
  });

  it('calls onWarning for each missing STR tag', () => {
    const warnings: unknown[] = [];
    // Tagless game — all 7 STR tags missing
    const result = parse('1. e4 1-0', { onWarning: (w) => warnings.push(w) });
    expect(result).toHaveLength(1);
    expect(warnings).toHaveLength(7);
    expect(warnings[0]).toMatchObject({
      column: 1,
      line: 1,
      message: expect.stringMatching(/^Missing STR tag:/),
      offset: 0,
    });
  });

  it('does not call onWarning when all STR tags are present', () => {
    const warnings: unknown[] = [];
    const pgn =
      '[Event "E"]\n[Site "S"]\n[Date "2000.01.01"]\n[Round "1"]\n' +
      '[White "W"]\n[Black "B"]\n[Result "1-0"]\n\n1. e4 1-0';
    parse(pgn, { onWarning: (w) => warnings.push(w) });
    expect(warnings).toHaveLength(0);
  });

  it('does not throw when onWarning is omitted', () => {
    expect(() => parse('1. e4 1-0')).not.toThrow();
  });

  it('calls onWarning for a move number mismatch', () => {
    const warnings: unknown[] = [];
    // Move numbers are wrong — 1. e4 is labelled as move 5
    const pgn =
      '[Event "E"]\n[Site "S"]\n[Date "2000.01.01"]\n[Round "1"]\n' +
      '[White "W"]\n[Black "B"]\n[Result "1-0"]\n\n5. e4 e5 1-0';
    const result = parse(pgn, { onWarning: (w) => warnings.push(w) });
    expect(result).toHaveLength(1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      column: 1,
      line: 1,
      message: 'Move number mismatch: expected 1, got 5',
      offset: 0,
    });
  });

  it('calls onWarning when Result tag does not match termination marker', () => {
    const warnings: unknown[] = [];
    // Tag says 1/2-1/2 but game ends with 1-0
    const pgn =
      '[Event "E"]\n[Site "S"]\n[Date "2000.01.01"]\n[Round "1"]\n' +
      '[White "W"]\n[Black "B"]\n[Result "1/2-1/2"]\n\n1. e4 1-0';
    const result = parse(pgn, { onWarning: (w) => warnings.push(w) });
    expect(result).toHaveLength(1);
    // Only the result mismatch warning — no missing STR warnings (all present)
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      column: 1,
      line: 1,
      message:
        'Result tag "1/2-1/2" does not match game termination marker "1-0"',
      offset: 0,
    });
  });

  it('does not call onWarning when Result tag matches termination marker', () => {
    const warnings: unknown[] = [];
    const pgn =
      '[Event "E"]\n[Site "S"]\n[Date "2000.01.01"]\n[Round "1"]\n' +
      '[White "W"]\n[Black "B"]\n[Result "1-0"]\n\n1. e4 1-0';
    parse(pgn, { onWarning: (w) => warnings.push(w) });
    expect(
      warnings.some(
        (w) =>
          typeof w === 'object' &&
          w !== null &&
          /Result tag/.test((w as { message: string }).message),
      ),
    ).toBe(false);
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
