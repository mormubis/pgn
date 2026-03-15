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
    // Pass 1: advance persistent depth/inString state over newly-seen characters
    for (let i = scanOffset; i < buffer.length; i++) {
      const ch = buffer[i];
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
    scanOffset = buffer.length;

    // Pass 2: single forward scan to find result tokens at depth 0.
    // Local state re-derived from scratch so the regex advances monotonically.
    const re = /(?:1-0|0-1|1\/2-1\/2|\*)(?=[ \t\n\r]|$)/g;
    let scanDepth = 0;
    let scanInString = false;
    let lastIndex = 0;

    for (let i = 0; i < buffer.length; i++) {
      const ch = buffer[i];
      if (scanInString) {
        if (ch === '"') {
          scanInString = false;
        }
        continue;
      }
      if (ch === '{') {
        scanDepth++;
        continue;
      }
      if (ch === '}') {
        scanDepth = Math.max(0, scanDepth - 1);
        continue;
      }
      if (ch === '"' && scanDepth === 0) {
        scanInString = true;
        continue;
      }

      if (scanDepth === 0) {
        re.lastIndex = i;
        const m = re.exec(buffer);
        if (m && m.index === i) {
          const end = i + m[0].length;
          yield buffer.slice(lastIndex, end);
          lastIndex = end;
          i = end - 1;
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

  // Any remainder in the buffer after all chunks are consumed has no result
  // token — the grammar requires one, so parse() will always return [] for it.
  // Drain the generator to reset buffer/scanOffset state cleanly.
  for (const gameString of extractGames(true)) {
    const games = parse(gameString);
    for (const game of games) {
      yield game;
    }
  }
}
