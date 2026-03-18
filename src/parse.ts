import parser from './grammar.cjs';

import type {
  AnnotationColor,
  Arrow,
  Eval,
  Move,
  MoveList,
  PGN,
  ParseError,
  ParseOptions,
  Square,
  SquareAnnotation,
} from './types.js';

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

const CAL_CSL_RE = /\[%(?:cal|csl)\s*([^[\]]*)\]/gi;

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
    for (const token of tokens.split(',').map((t) => t.trim())) {
      const color = (token[0]?.toUpperCase() ?? '') as AnnotationColor;
      if (!color || !/^[BCGORY]$/.test(color)) {
        continue;
      }
      const rest = token.slice(1);
      if (rest.length === 2) {
        squares.push({ color, square: rest as Square });
      } else if (rest.length === 4) {
        arrows.push({
          color,
          from: rest.slice(0, 2) as Square,
          to: rest.slice(2) as Square,
        });
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
function parse(input: string, options?: ParseOptions): PGN[] {
  const cleaned = input.replace(/^\uFEFF/, '').trim();

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

export { RESULT_TO_STR, STR_TAGS };
export default parse;
