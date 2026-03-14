import parser from './grammar.cjs';

type Disambiguation = Square | File | Rank;
type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
type Piece = 'B' | 'K' | 'N' | 'P' | 'Q' | 'R';
type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
type Result = '1-0' | '0-1' | '1/2-1/2' | '?';
type Square = `${File}${Rank}`;

interface Meta {
  Result: Result;
  [key: string]: string;
}

interface Move {
  annotations?: string[];
  capture?: boolean;
  castling?: boolean;
  check?: boolean;
  checkmate?: boolean;
  comment?: string;
  from?: Disambiguation;
  piece: Piece;
  promotion?: Piece;
  to: Square;
  variants?: Variation;
}

type MovePair = [number, Move, Move?];
type MoveList = MovePair[];

interface PGN {
  meta: Meta;
  moves: MoveList;
  result: 1 | 0 | 0.5 | '?';
}

type Variation = MoveList[];

/**
 * Parse a PGN string into an array of games
 *
 * @param input
 */
export default function parse(input: string): PGN[] {
  const cleaned = input.replaceAll(/^\s+|\s+$/g, '');

  try {
    return parser.parse(cleaned) as PGN[];
  } catch {
    return [];
  }
}
