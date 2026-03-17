/**
 * Explicit unit tests for SAN move parsing.
 *
 * These complement the snapshot tests by asserting the exact output shape for
 * each grammar alternative. Snapshots catch regressions but silently bake in
 * bugs present at generation time — these tests pin the correct behaviour from
 * first principles.
 *
 * Each test parses a minimal single-game PGN and inspects the first white move
 * (moves[0][1]) or first black move (moves[0][2]).
 */

import { describe, expect, it } from 'vitest';

import parse from '../index.js';

/** Parse a move string as white's first move and return the Move object. */
function white(san: string) {
  const games = parse(`[Event "T"]\n[Result "1-0"]\n\n1. ${san} 1-0`);
  return games[0]?.moves[0]?.[1];
}

/** Parse a move string as black's first move and return the Move object. */
function black(san: string) {
  const games = parse(`[Event "T"]\n[Result "1-0"]\n\n1. e4 ${san} 1-0`);
  return games[0]?.moves[0]?.[2];
}

// ─── CASTLING ────────────────────────────────────────────────────────────────

describe('CASTLING', () => {
  it('O-O (white) → kingside, to g1', () => {
    expect(white('O-O')).toMatchObject({
      castling: true,
      piece: 'K',
      to: 'g1',
    });
    expect(white('O-O')).not.toHaveProperty('check');
    expect(white('O-O')).not.toHaveProperty('checkmate');
  });

  it('O-O-O (white) → queenside, to c1', () => {
    expect(white('O-O-O')).toMatchObject({
      castling: true,
      piece: 'K',
      to: 'c1',
    });
  });

  it('O-O (black) → kingside, to g8', () => {
    expect(black('O-O')).toMatchObject({
      castling: true,
      piece: 'K',
      to: 'g8',
    });
  });

  it('O-O-O (black) → queenside, to c8', () => {
    expect(black('O-O-O')).toMatchObject({
      castling: true,
      piece: 'K',
      to: 'c8',
    });
  });

  it('O-O+ → check: true', () => {
    expect(white('O-O+')).toMatchObject({
      castling: true,
      check: true,
      to: 'g1',
    });
    expect(white('O-O+')).not.toHaveProperty('checkmate');
  });

  it('O-O# → checkmate: true', () => {
    expect(white('O-O#')).toMatchObject({
      castling: true,
      checkmate: true,
      to: 'g1',
    });
    expect(white('O-O#')).not.toHaveProperty('check');
  });

  it('O-O-O+ → check: true', () => {
    expect(white('O-O-O+')).toMatchObject({
      castling: true,
      check: true,
      to: 'c1',
    });
  });

  it('O-O-O# → checkmate: true', () => {
    expect(white('O-O-O#')).toMatchObject({
      castling: true,
      checkmate: true,
      to: 'c1',
    });
  });
});

// ─── PIECE_MOVE ──────────────────────────────────────────────────────────────

describe('PIECE_MOVE', () => {
  it('simple: Nf3', () => {
    expect(white('Nf3')).toEqual({ piece: 'N', to: 'f3' });
  });

  it('simple + check: Qh5+', () => {
    expect(white('Qh5+')).toMatchObject({ check: true, piece: 'Q', to: 'h5' });
  });

  it('simple + checkmate: Qf8#', () => {
    expect(white('Qf8#')).toMatchObject({
      checkmate: true,
      piece: 'Q',
      to: 'f8',
    });
  });

  it('simple capture: Nxe4', () => {
    expect(white('Nxe4')).toEqual({ capture: true, piece: 'N', to: 'e4' });
  });

  it('simple capture + check: Bxf7+', () => {
    expect(white('Bxf7+')).toMatchObject({
      capture: true,
      check: true,
      piece: 'B',
      to: 'f7',
    });
  });

  it('simple capture + checkmate: Qxf7#', () => {
    expect(white('Qxf7#')).toMatchObject({
      capture: true,
      checkmate: true,
      piece: 'Q',
      to: 'f7',
    });
  });

  it('file disambig, no capture: Nbd7', () => {
    expect(white('Nbd7')).toEqual({ from: 'b', piece: 'N', to: 'd7' });
  });

  it('file disambig, no capture + check: Rag7+', () => {
    expect(white('Rag7+')).toMatchObject({
      check: true,
      from: 'a',
      piece: 'R',
      to: 'g7',
    });
  });

  it('file disambig, no capture + checkmate: Rag2#', () => {
    expect(white('Rag2#')).toMatchObject({
      checkmate: true,
      from: 'a',
      piece: 'R',
      to: 'g2',
    });
  });

  it('file disambig + capture: Nbxd4', () => {
    expect(white('Nbxd4')).toEqual({
      capture: true,
      from: 'b',
      piece: 'N',
      to: 'd4',
    });
  });

  it('file disambig + capture + check: Rexf2+', () => {
    expect(white('Rexf2+')).toMatchObject({
      capture: true,
      check: true,
      from: 'e',
      piece: 'R',
      to: 'f2',
    });
  });

  it('file disambig + capture + checkmate: Qexg6#', () => {
    expect(white('Qexg6#')).toMatchObject({
      capture: true,
      checkmate: true,
      from: 'e',
      piece: 'Q',
      to: 'g6',
    });
  });

  it('rank disambig, no capture: N5c3', () => {
    expect(white('N5c3')).toEqual({ from: '5', piece: 'N', to: 'c3' });
  });

  it('rank disambig, no capture + check: R2f3+', () => {
    expect(white('R2f3+')).toMatchObject({
      check: true,
      from: '2',
      piece: 'R',
      to: 'f3',
    });
  });

  it('rank disambig + capture: R8xa4', () => {
    expect(white('R8xa4')).toEqual({
      capture: true,
      from: '8',
      piece: 'R',
      to: 'a4',
    });
  });

  it('rank disambig + capture + check: R8xf2+', () => {
    expect(white('R8xf2+')).toMatchObject({
      capture: true,
      check: true,
      from: '8',
      piece: 'R',
      to: 'f2',
    });
  });

  it('full-square disambig, no capture: Rd1d2', () => {
    expect(white('Rd1d2')).toEqual({ from: 'd1', piece: 'R', to: 'd2' });
  });

  it('full-square disambig, no capture + check: Rd1f1+', () => {
    expect(white('Rd1f1+')).toMatchObject({
      check: true,
      from: 'd1',
      piece: 'R',
      to: 'f1',
    });
  });

  it('full-square disambig + capture: Qd1xe4', () => {
    expect(white('Qd1xe4')).toEqual({
      capture: true,
      from: 'd1',
      piece: 'Q',
      to: 'e4',
    });
  });

  it('full-square disambig + capture + check: Qd1xf3+', () => {
    expect(white('Qd1xf3+')).toMatchObject({
      capture: true,
      check: true,
      from: 'd1',
      piece: 'Q',
      to: 'f3',
    });
  });
});

it('rejects promotion on a non-pawn piece: Nf3=Q', () => {
  expect(white('Nf3=Q')).toBeUndefined();
});

it('rejects promotion on a non-pawn capture: Nxf3=Q', () => {
  expect(white('Nxf3=Q')).toBeUndefined();
});

// ─── PAWN_PUSH ───────────────────────────────────────────────────────────────

describe('PAWN_PUSH', () => {
  it('plain: e4', () => {
    expect(white('e4')).toEqual({ piece: 'P', to: 'e4' });
  });

  it('with check: h5+', () => {
    expect(white('h5+')).toMatchObject({ check: true, piece: 'P', to: 'h5' });
  });

  it('with checkmate: e6#', () => {
    expect(white('e6#')).toMatchObject({
      checkmate: true,
      piece: 'P',
      to: 'e6',
    });
  });

  it('promotion =Q: d8=Q', () => {
    expect(white('d8=Q')).toEqual({ piece: 'P', promotion: 'Q', to: 'd8' });
  });

  it('promotion =Q + check: b8=Q+', () => {
    expect(white('b8=Q+')).toMatchObject({
      check: true,
      piece: 'P',
      promotion: 'Q',
      to: 'b8',
    });
  });

  it('promotion =Q + checkmate: a1=Q#', () => {
    expect(white('a1=Q#')).toMatchObject({
      checkmate: true,
      piece: 'P',
      promotion: 'Q',
      to: 'a1',
    });
  });

  it('underpromotion =N: a8=N', () => {
    expect(white('a8=N')).toMatchObject({
      piece: 'P',
      promotion: 'N',
      to: 'a8',
    });
  });

  it('underpromotion =R: g1=R', () => {
    expect(white('g1=R')).toMatchObject({
      piece: 'P',
      promotion: 'R',
      to: 'g1',
    });
  });

  it('underpromotion =B: h8=B', () => {
    expect(white('h8=B')).toMatchObject({
      piece: 'P',
      promotion: 'B',
      to: 'h8',
    });
  });

  it('underpromotion =N + check: f1=N+', () => {
    expect(white('f1=N+')).toMatchObject({
      check: true,
      piece: 'P',
      promotion: 'N',
      to: 'f1',
    });
  });
});

// ─── NAG (nag_import) ────────────────────────────────────────────────────────

describe('NAG nag_import', () => {
  it('parses ! as annotation', () => {
    expect(white('e4!')).toMatchObject({
      annotations: ['!'],
      piece: 'P',
      to: 'e4',
    });
  });

  it('parses ?? as annotation', () => {
    expect(white('e4??')).toMatchObject({
      annotations: ['??'],
      piece: 'P',
      to: 'e4',
    });
  });

  it('parses ± (U+00B1) as annotation', () => {
    expect(white('e4\u00B1')).toMatchObject({
      annotations: ['\u00B1'],
      piece: 'P',
      to: 'e4',
    });
  });

  it('parses multiple NAGs on one move', () => {
    expect(white('e4!$14')).toMatchObject({
      annotations: ['!', '14'],
      piece: 'P',
      to: 'e4',
    });
  });
});

// ─── COMMENT ─────────────────────────────────────────────────────────────────

describe('COMMENT', () => {
  it('parses a semicolon comment_line', () => {
    const games = parse(
      '[Event "T"]\n[Result "1-0"]\n\n1. e4 ; this is a comment\n1-0',
    );
    expect(games[0]?.moves[0]?.[1]).toMatchObject({
      comment: 'this is a comment',
      piece: 'P',
      to: 'e4',
    });
  });

  it('joins multiple comment blocks on one move', () => {
    const games = parse(
      '[Event "T"]\n[Result "1-0"]\n\n1. e4 { first } { second } 1-0',
    );
    expect(games[0]?.moves[0]?.[1]).toMatchObject({
      comment: 'first second',
      piece: 'P',
      to: 'e4',
    });
  });
});

// ─── RAV ─────────────────────────────────────────────────────────────────────

describe('RAV', () => {
  it('parses a single variation on a move', () => {
    const games = parse(
      '[Event "T"]\n[Result "1-0"]\n\n1. e4 (1. d4 d5) e5 1-0',
    );
    const variants = games[0]?.moves[0]?.[1]?.variants;
    expect(variants).toHaveLength(1);
    expect(variants?.[0]?.[0]?.[1]).toMatchObject({ piece: 'P', to: 'd4' });
  });

  it('parses a nested RAV (RAV inside a RAV)', () => {
    const games = parse(
      '[Event "T"]\n[Result "1-0"]\n\n1. e4 (1. d4 (1. c4 c5) d5) e5 1-0',
    );
    const outer = games[0]?.moves[0]?.[1]?.variants?.[0];
    const inner = outer?.[0]?.[1]?.variants;
    expect(inner).toHaveLength(1);
    expect(inner?.[0]?.[0]?.[1]).toMatchObject({ piece: 'P', to: 'c4' });
  });

  it('parses a comment inside a RAV', () => {
    const games = parse(
      '[Event "T"]\n[Result "1-0"]\n\n1. e4 (1. d4 { good move } d5) e5 1-0',
    );
    const ravMove = games[0]?.moves[0]?.[1]?.variants?.[0]?.[0]?.[1];
    expect(ravMove).toMatchObject({
      comment: 'good move',
      piece: 'P',
      to: 'd4',
    });
  });
});

// ─── PAWN_CAPTURE ────────────────────────────────────────────────────────────

describe('PAWN_CAPTURE', () => {
  it('plain: cxd4', () => {
    expect(white('cxd4')).toEqual({
      capture: true,
      from: 'c',
      piece: 'P',
      to: 'd4',
    });
  });

  it('with check: fxg2+', () => {
    expect(white('fxg2+')).toMatchObject({
      capture: true,
      check: true,
      from: 'f',
      piece: 'P',
      to: 'g2',
    });
  });

  it('with checkmate: exd6#', () => {
    expect(white('exd6#')).toMatchObject({
      capture: true,
      checkmate: true,
      from: 'e',
      piece: 'P',
      to: 'd6',
    });
  });

  it('with promotion =Q: fxe8=Q', () => {
    expect(white('fxe8=Q')).toEqual({
      capture: true,
      from: 'f',
      piece: 'P',
      promotion: 'Q',
      to: 'e8',
    });
  });

  it('with promotion =Q + check: exf8=Q+', () => {
    expect(white('exf8=Q+')).toMatchObject({
      capture: true,
      check: true,
      from: 'e',
      piece: 'P',
      promotion: 'Q',
      to: 'f8',
    });
  });

  it('with promotion =Q + checkmate: exf8=Q#', () => {
    expect(white('exf8=Q#')).toMatchObject({
      capture: true,
      checkmate: true,
      from: 'e',
      piece: 'P',
      promotion: 'Q',
      to: 'f8',
    });
  });

  it('underpromotion capture + check: exf8=N+', () => {
    expect(white('exf8=N+')).toMatchObject({
      capture: true,
      check: true,
      from: 'e',
      piece: 'P',
      promotion: 'N',
      to: 'f8',
    });
  });
});
