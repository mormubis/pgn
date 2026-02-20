import nearley from 'nearley';

import grammar from './grammar.cjs';

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

// It's a CJS module and cannot compile with that
// eslint-disable-next-line import-x/no-named-as-default-member
const { Grammar, Parser } = nearley;

// Cache the compiled grammar so it is only processed once per module load
// rather than being re-built on every call to parse() / _().
// @ts-expect-error Mismatching types
const compiledGrammar = Grammar.fromCompiled(grammar);

function _(input: string): PGN[] {
  const parser = new Parser(compiledGrammar);

  try {
    parser.feed(input);

    if (parser.results.length > 1) {
      throw new Error(
        `@echecs/parser: Ambiguous syntax. Found ${parser.results.length} results`,
      );
    }

    return parser.results[0] as PGN[];
  } catch {
    return [];
  }
}

/**
 * Parse a PGN string into an array of games
 *
 * @param input
 */
export default function parse(input: string): PGN[] {
  /**
   * Syntax does not allow empty lines at the beginning or end of the PGN string.
   */
  const cleaned = input.replaceAll(/^\s+|\s+$/g, '');

  /**
   * Split the PGN because nearly/moo has a problem with big files. Beyond the
   * buffer size, the lexer will not work properly because is not feed with entire
   * tokens.
   */
  const games = cleaned.split(/(?<=1-0|0-1|1\/2-1\/2|\*(?!"))(\s+)\n/g);

  // Parse each game independently
  return games.flatMap((game) => _(game));
}
