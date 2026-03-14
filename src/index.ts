import parser from './grammar.cjs';

type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
type Piece = 'B' | 'K' | 'N' | 'P' | 'Q' | 'R';
type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
type Result = '1-0' | '0-1' | '1/2-1/2' | '?';
type Square = `${File}${Rank}`;
type Disambiguation = Square | File | Rank;

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

type MovePair = [number, Move | undefined, Move?];
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

/**
 * Stream-parse a PGN AsyncIterable, yielding one PGN object per game.
 * Memory usage stays proportional to one game at a time.
 *
 * @param input - Any AsyncIterable<string> (Node.js readable stream, fetch body, etc.)
 */
export async function* stream(
  input: AsyncIterable<string>,
): AsyncGenerator<PGN> {
  let buffer = '';
  let depth = 0; // brace depth — tracks {…} comment nesting
  let inString = false; // whether we're inside a "…" tag value string
  let scanOffset = 0; // first index in buffer not yet scanned for state changes

  function* extractGames(final: boolean): Generator<string> {
    // Single-pass scan: update depth/inString state from scanOffset onward,
    // and check for RESULT tokens at depth 0 across the full unscanned region.
    // Token detection starts from lastIndex (always 0 on entry) so that tokens
    // whose first character precedes scanOffset are still found.
    const re = /(?:1-0|0-1|1\/2-1\/2|\*)(?=[ \t\n\r]|$)/g;
    let lastIndex = 0;

    for (let index = 0; index < buffer.length; index++) {
      const ch = buffer[index];

      // Update state only for newly-seen characters
      if (index >= scanOffset) {
        if (inString) {
          if (ch === '"') {
            inString = false;
          }
          continue;
        }
        if (ch === '{') {
          depth++;
          continue;
        }
        if (ch === '}') {
          depth = Math.max(0, depth - 1);
          continue;
        }
        if (ch === '"' && depth === 0) {
          inString = true;
          continue;
        }
      }

      // Token detection: only at depth 0, outside strings, in unscanned content
      if (!inString && depth === 0 && index >= lastIndex) {
        re.lastIndex = index;
        const m = re.exec(buffer);
        if (m && m.index === index) {
          const end = index + m[0].length;
          yield buffer.slice(lastIndex, end);
          lastIndex = end;
          index = end - 1; // outer loop will increment
        }
      }
    }

    if (final && lastIndex < buffer.length) {
      const remainder = buffer.slice(lastIndex).trim();
      if (remainder.length > 0) {
        yield remainder;
      }
      buffer = '';
      scanOffset = 0;
    } else {
      buffer = buffer.slice(lastIndex);
      // After trimming lastIndex chars from the front, adjust scanOffset.
      // We scanned the full old buffer, so new scanOffset = old buffer.length - lastIndex
      // = new buffer.length.
      scanOffset = buffer.length;
    }
  }

  for await (const chunk of input) {
    buffer += chunk;
    for (const gameString of extractGames(false)) {
      const games = parse(gameString);
      if (games.length > 0) {
        yield games[0] as PGN;
      }
    }
  }

  for (const gameString of extractGames(true)) {
    const games = parse(gameString);
    if (games.length > 0) {
      yield games[0] as PGN;
    }
  }
}
