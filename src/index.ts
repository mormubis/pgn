import parser from './grammar.cjs';

type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
type Piece = 'B' | 'K' | 'N' | 'P' | 'Q' | 'R';
type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
type Result = '1-0' | '0-1' | '1/2-1/2' | '?';
type Square = `${File}${Rank}`;
type Disambiguation = Square | File | Rank;

export type AnnotationColor = 'B' | 'G' | 'R' | 'Y';

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
  piece: Piece;
  promotion?: Piece;
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

// Fires onWarning for each STR key absent from a game's meta. Warnings are
// emitted in alphabetical key order (the order of STR_TAGS above). Position
// fields are nominal placeholders — a missing tag has no source location.
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

const RESULT_TO_STR: Readonly<Record<string, string>> = {
  '0': '0-1',
  '0.5': '1/2-1/2',
  '1': '1-0',
  '?': '*',
};

function warnResultMismatch(
  games: PGN[],
  options: ParseOptions | undefined,
): void {
  if (!options?.onWarning) {
    return;
  }
  for (const game of games) {
    const tagResult = game.meta['Result'];
    const tokenResult = RESULT_TO_STR[String(game.result)];
    if (tagResult !== undefined && tagResult !== tokenResult) {
      options.onWarning({
        column: 1,
        line: 1,
        message: `Result tag "${tagResult}" does not match game termination marker "${tokenResult ?? String(game.result)}"`,
        offset: 0,
      });
    }
  }
}

const CAL_CSL_RE = /\[%(?:cal|csl)\s+([^[\]]+)\]/gi;

const CLK_RE = /\[%clk\s+(\d+):(\d{2}):(\d{2}(?:\.\d+)?)\]/i;

const EVAL_RE =
  /\[%eval\s+(?:#([+-]?\d+)|([+-]?(?:\d+\.?\d*|\.\d+)))(?:,(\d+))?\]/i;

interface CommentFields {
  arrows?: Arrow[];
  clock?: number;
  comment?: string;
  eval?: Eval;
  squares?: SquareAnnotation[];
}

function parseCommentCommands(raw: string): CommentFields {
  const result: CommentFields = {};
  let text = raw;

  // [%cal] and [%csl]
  const arrows: Arrow[] = [];
  const squares: SquareAnnotation[] = [];
  text = text.replaceAll(CAL_CSL_RE, (_match, tokens: string) => {
    for (const token of tokens.split(',')) {
      const color = token[0] as AnnotationColor;
      if (!color || !/^[BGRY]$/i.test(color)) {
        continue;
      }
      const rest = token.slice(1);
      if (rest.length === 2) {
        squares.push({ color, square: rest });
      } else if (rest.length === 4) {
        arrows.push({ color, from: rest.slice(0, 2), to: rest.slice(2) });
      }
      // malformed token — skip silently
    }
    return '';
  });
  if (arrows.length > 0) {
    result.arrows = arrows;
  }
  if (squares.length > 0) {
    result.squares = squares;
  }

  // [%clk]
  const clkMatch = CLK_RE.exec(text);
  if (clkMatch) {
    const hString = clkMatch[1] ?? '0';
    const mString = clkMatch[2] ?? '0';
    const sString = clkMatch[3] ?? '0';
    const h = Number.parseInt(hString, 10);
    const m = Number.parseInt(mString, 10);
    const s = Number.parseFloat(sString);
    result.clock = h * 3600 + m * 60 + s;
    text = text.replace(CLK_RE, '');
  }

  // [%eval]
  const evalMatch = EVAL_RE.exec(text);
  if (evalMatch) {
    const depth =
      evalMatch[3] === undefined
        ? undefined
        : Number.parseInt(evalMatch[3], 10);
    if (evalMatch[1] !== undefined) {
      result.eval = {
        ...(depth !== undefined && { depth }),
        type: 'mate',
        value: Number.parseInt(evalMatch[1], 10),
      };
    } else if (evalMatch[2] !== undefined) {
      result.eval = {
        ...(depth !== undefined && { depth }),
        type: 'cp',
        value: Number.parseFloat(evalMatch[2]),
      };
    }
    text = text.replace(EVAL_RE, '');
  }

  // Clean up remaining text
  const trimmed = text.replaceAll(/\s+/g, ' ').trim();
  if (trimmed.length > 0) {
    result.comment = trimmed;
  }

  return result;
}

function processMoveList(moves: MoveList): void {
  for (const pair of moves) {
    for (let index = 1; index <= 2; index++) {
      const move = pair[index] as Move | undefined;
      if (move !== undefined) {
        if (move.comment !== undefined) {
          const fields = parseCommentCommands(move.comment);
          delete (move as Partial<Move>).comment;
          if (fields.arrows !== undefined) {
            move.arrows = fields.arrows;
          }
          if (fields.clock !== undefined) {
            move.clock = fields.clock;
          }
          if (fields.eval !== undefined) {
            move.eval = fields.eval;
          }
          if (fields.squares !== undefined) {
            move.squares = fields.squares;
          }
          if (fields.comment !== undefined) {
            move.comment = fields.comment;
          }
        }
        if (move.variants !== undefined) {
          for (const variation of move.variants) {
            processMoveList(variation);
          }
        }
      }
    }
  }
}

function processComments(games: PGN[]): void {
  for (const game of games) {
    processMoveList(game.moves);
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
    const games = parser.parse(cleaned, {
      onWarning: options?.onWarning,
    }) as PGN[];
    processComments(games);
    warnMissingSTR(games, options);
    warnResultMismatch(games, options);
    return games;
  } catch (error) {
    options?.onError?.(toParseError(error));
    return [];
  }
}

// Minimal structural type for the Web Streams ReadableStream<string>.
// Avoids pulling in the full DOM lib while still accepting any conforming
// ReadableStream implementation (browser, Node.js 18+, edge runtimes).
interface StringReadableStream {
  getReader(): {
    read(): Promise<{ done: boolean; value: string | undefined }>;
    releaseLock(): void;
  };
}

async function* readableStreamToIterable(
  rs: StringReadableStream,
): AsyncGenerator<string> {
  const reader = rs.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value !== undefined) {
        yield value;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Stream-parse a PGN AsyncIterable or Web Streams ReadableStream, yielding
 * one PGN object per game. Memory usage stays proportional to one game at a time.
 *
 * @param input - Any AsyncIterable<string> or ReadableStream<string>
 *   (Node.js readable stream, fetch body piped through TextDecoderStream, etc.)
 * @param options - Optional. Pass `onError` to observe parse failures instead of
 *   silently skipping malformed games. Not called for truncated streams (input
 *   ending without a result token).
 */
export async function* stream(
  input: AsyncIterable<string> | StringReadableStream,
  options?: ParseOptions,
): AsyncGenerator<PGN> {
  if ('getReader' in input) {
    yield* stream(readableStreamToIterable(input), options);
    return;
  }
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
          if (ch === '\\') {
            // Skip the next character — it is escaped (handles \" and \\).
            index++;
          } else if (ch === '"') {
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
  // token — the grammar requires one, so parse() will always return [] for it,
  // meaning onError is never reached for truncated input. options is passed in
  // full so that onWarning still fires for any valid games that happen to land
  // in the remainder (e.g. result token at the exact end of the last chunk).
  for (const gameString of extractGames(true)) {
    const games = parse(gameString, options);
    for (const game of games) {
      yield game;
    }
  }
}
