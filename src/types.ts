type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
type PieceChar = 'B' | 'K' | 'N' | 'P' | 'Q' | 'R';
type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
type Result = '1-0' | '0-1' | '1/2-1/2' | '?';
type Square = `${File}${Rank}`;
type Disambiguation = Square | File | Rank;

type AnnotationColor = 'B' | 'C' | 'G' | 'O' | 'R' | 'Y';

interface Arrow {
  color: AnnotationColor;
  from: Square;
  to: Square;
}

interface SquareAnnotation {
  color: AnnotationColor;
  square: Square;
}

type Eval =
  | { depth?: number; type: 'cp'; value: number }
  | { depth?: number; type: 'mate'; value: number };

interface Meta {
  Result?: Result;
  [key: string]: string | undefined;
}

interface Move {
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
  piece: PieceChar;
  promotion?: PieceChar;
  squares?: SquareAnnotation[];
  to: Square;
  variants?: Variation;
}

type MovePair = [number, Move | undefined, Move?];
type MoveList = MovePair[];

interface PGN {
  meta: Meta;
  moves: MoveList;
  result: 1 | 0 | 0.5 | '?';
}

type Variation = MoveList[];

interface ParseError {
  column: number;
  line: number;
  message: string;
  offset: number;
}

interface StringifyOptions {
  onWarning?: (warning: ParseWarning) => void;
}

interface ParseOptions extends StringifyOptions {
  onError?: (error: ParseError) => void;
}

interface ParseWarning {
  column: number;
  line: number;
  message: string;
  offset: number;
}

export type {
  AnnotationColor,
  Arrow,
  Disambiguation,
  Eval,
  File,
  Meta,
  Move,
  MoveList,
  MovePair,
  ParseError,
  ParseOptions,
  ParseWarning,
  PGN,
  PieceChar,
  Rank,
  Result,
  Square,
  SquareAnnotation,
  StringifyOptions,
  Variation,
};
