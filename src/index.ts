import parser from './grammar.cjs';

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
  from?: File | Rank;
  piece: Piece;
  promotion?: Piece;
  to: Square;
  variants?: Variation;
}

type Moves = [number, Move] | [number, Move, Move];

interface PGN {
  meta: Meta;
  moves: Moves;
  result: Result;
}

type Variation = Moves[] | [[number, undefined, Move], ...Moves][];

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
