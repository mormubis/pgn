import type { Move, StringifyOptions } from './types.js';

const KINGSIDE_SQUARES = new Set(['g1', 'g8']);
const QUEENSIDE_SQUARES = new Set(['c1', 'c8']);

function applyIndicators(san: string, move: Move): string {
  if (move.checkmate) {
    return san + '#';
  }
  if (move.check) {
    return san + '+';
  }
  return san;
}

function stringifySAN(move: Move, options?: StringifyOptions): string {
  if (move.castling) {
    if (KINGSIDE_SQUARES.has(move.to)) {
      return applyIndicators('O-O', move);
    }
    if (QUEENSIDE_SQUARES.has(move.to)) {
      return applyIndicators('O-O-O', move);
    }
    options?.onWarning?.({
      column: 1,
      line: 1,
      message: `Invalid castling destination: ${move.to}`,
      offset: 0,
    });
    return '';
  }

  let san = '';

  if (move.piece === 'P') {
    san += move.capture ? (move.from ?? '') + 'x' + move.to : move.to;
    if (move.promotion !== undefined) {
      san += '=' + move.promotion;
    }
  } else {
    san += move.piece;
    if (move.from !== undefined) {
      san += move.from;
    }
    if (move.capture) {
      san += 'x';
    }
    san += move.to;
  }

  return applyIndicators(san, move);
}

export { stringifySAN };
