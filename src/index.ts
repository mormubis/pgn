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

const STR_TAGS = [
  'Black',
  'Date',
  'Event',
  'Result',
  'Round',
  'Site',
  'White',
] as const;

function warnMissingSTR(games: PGN[], options: ParseOptions | undefined): void {
  if (!options?.onWarning) {
    return;
  }
  for (const game of games) {
    for (const key of STR_TAGS) {
      if (!(key in game.meta)) {
        options.onWarning({
          column: 1,
          line: 1,
          message: `Missing STR tag: ${key}`,
          offset: 0,
        });
      }
    }
  }
}

function toParseError(thrown: unknown): ParseError {
  if (thrown !== null && typeof thrown === 'object' && 'message' in thrown) {
    const error = thrown as Record<string, unknown>;
    const location = error['location'] as Record<string, unknown> | undefined;
    const start = location?.['start'] as Record<string, unknown> | undefined;
    return {
      column: typeof start?.['column'] === 'number' ? start['column'] : 1,
      line: typeof start?.['line'] === 'number' ? start['line'] : 1,
      message: String(error['message']),
      offset: typeof start?.['offset'] === 'number' ? start['offset'] : 0,
    };
  }
  return { column: 1, line: 1, message: String(thrown), offset: 0 };
}

/**
 * Parse a PGN string into an array of games
 *
 * @param input
 */
export default function parse(input: string, options?: ParseOptions): PGN[] {
  const cleaned = input.replace(/^\uFEFF/, '').replaceAll(/^\s+|\s+$/g, '');

  try {
    const games = parser.parse(cleaned) as PGN[];
    warnMissingSTR(games, options);
    return games;
  } catch (error) {
    options?.onError?.(toParseError(error));
    return [];
  }
}

/**
 * Stream-parse a PGN AsyncIterable, yielding one PGN object per game.
 * Memory usage stays proportional to one game at a time.
 *
 * @param input - Any AsyncIterable<string> (Node.js readable stream, fetch body, etc.)
 * @param options - Optional. Pass `onError` to observe parse failures instead of
 *   silently skipping malformed games. Not called for truncated streams (input
 *   ending without a result token).
 */
export async function* stream(
  input: AsyncIterable<string>,
  options?: ParseOptions,
): AsyncGenerator<PGN> {
  let buffer = '';
  let depth = 0; // brace depth — tracks {…} comment nesting
  let inString = false; // whether we're inside a "…" tag value string
  let scanOffset = 0; // first index in buffer not yet scanned for state changes

  function* extractGames(final: boolean): Generator<string> {
    // Combined state-update and token-detection pass.
    //
    // State updates (depth/inString) only run for newly-seen characters
    // (index >= scanOffset). Token detection also covers a lookback window of
    // MAX_TOKEN_LEN-1 = 6 positions before scanOffset so that result tokens
    // that straddle a chunk boundary (e.g. '1' at end of chunk N, '-0' at
    // start of chunk N+1) are not missed. The depth/inString state at those
    // positions is already correct from the previous call.
    //
    // Result tokens (1-0, 0-1, 1/2-1/2, *) are only attempted at characters
    // '1', '0', '*' when depth === 0 and !inString — O(n) regex work.
    const MAX_TOKEN_LEN = 7; // len("1/2-1/2")
    const re = /(?:1-0|0-1|1\/2-1\/2|\*)(?=[ \t\n\r]|$)/g;
    let lastIndex = 0;
    const tokenStart = Math.max(0, scanOffset - (MAX_TOKEN_LEN - 1));

    for (let index = tokenStart; index < buffer.length; index++) {
      const ch = buffer[index];

      // State updates only for newly-seen characters
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
        // Quotes inside braces are not string delimiters (PGN tag values only
        // appear at depth 0).
        if (ch === '"' && depth === 0) {
          inString = true;
          continue;
        }
      }

      // Token detection at depth 0, only at characters that can start a
      // result token ('1', '0', '*'). Regex is called at most once per candidate.
      if (
        !inString &&
        depth === 0 &&
        (ch === '1' || ch === '0' || ch === '*')
      ) {
        re.lastIndex = index;
        const m = re.exec(buffer);
        if (m && m.index === index) {
          const end = index + m[0].length;
          yield buffer.slice(lastIndex, end);
          lastIndex = end;
          index = end - 1; // outer loop will increment past the consumed token
        }
      }
    }

    scanOffset = buffer.length;

    if (final && lastIndex < buffer.length) {
      const remainder = buffer.slice(lastIndex).trim();
      if (remainder.length > 0) {
        yield remainder;
      }
      buffer = '';
      scanOffset = 0;
    } else {
      // Trim consumed games from the buffer. depth/inString already account for
      // the full old buffer, so scanOffset = new buffer.length marks it as
      // fully state-scanned.
      buffer = buffer.slice(lastIndex);
      scanOffset = buffer.length;
    }
  }

  for await (const chunk of input) {
    // Strip BOM when the buffer is empty (i.e. before any content has been
    // accumulated). This covers both the first chunk and the degenerate case
    // where the BOM arrives as its own chunk followed by the rest of the input.
    if (buffer.length === 0) {
      buffer = chunk.replace(/^\uFEFF/, '');
    } else {
      buffer += chunk;
    }
    for (const gameString of extractGames(false)) {
      const games = parse(gameString, options);
      if (games.length > 0) {
        yield games[0] as PGN;
      }
    }
  }

  // Any remainder in the buffer after all chunks are consumed has no result
  // token — the grammar requires one, so parse() will always return [] for it.
  // Drain the generator to reset buffer/scanOffset state cleanly.
  // Note: parse() is called without options here so that onError is NOT fired
  // for a truncated stream — incomplete input at end-of-stream is expected
  // behaviour, not a parse error.
  for (const gameString of extractGames(true)) {
    const games = parse(gameString);
    for (const game of games) {
      yield game;
    }
  }
}
