export type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
export type Piece = 'B' | 'K' | 'N' | 'P' | 'Q' | 'R';
export type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
export type Result = '1-0' | '0-1' | '1/2-1/2' | '?';
export type Square = `${File}${Rank}`;
export type Disambiguation = Square | File | Rank;

export type AnnotationColor = 'B' | 'C' | 'G' | 'O' | 'R' | 'Y';

export interface Arrow {
  color: AnnotationColor;
  from: string;
  to: string;
}

export interface SquareAnnotation {
  color: AnnotationColor;
  square: string;
}

export type Eval =
  | { depth?: number; type: 'cp'; value: number }
  | { depth?: number; type: 'mate'; value: number };

export interface Meta {
  Result?: Result;
  [key: string]: string | undefined;
}

export interface Move {
  annotations?: string[];
  arrows?: Arrow[];
  capture?: boolean;
  castling?: boolean;
  check?: boolean;
  checkmate?: boolean;
  clock?: number;
  comment?: string;
  eval?: Eval;
  from?: Disambiguation;
  piece: Piece;
  promotion?: Piece;
  squares?: SquareAnnotation[];
  to: Square;
  variants?: Variation;
}

export type MovePair = [number, Move | undefined, Move?];
export type MoveList = MovePair[];

export interface PGN {
  meta: Meta;
  moves: MoveList;
  result: 1 | 0 | 0.5 | '?';
}

export type Variation = MoveList[];

export interface ParseError {
  column: number;
  line: number;
  message: string;
  offset: number;
}

export interface ParseOptions {
  onError?: (error: ParseError) => void;
  onWarning?: (warning: ParseWarning) => void;
}

export interface ParseWarning {
  column: number;
  line: number;
  message: string;
  offset: number;
}
