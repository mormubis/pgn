@{%
  const lexer = require('./lexer.ts').default;
%}

@lexer lexer

#
# --- DATABASE ----------------------------------------------------------------
#

DATABASE -> GAME (%__ DATABASE):? {%
  (d) => {
    const games = [d[0]];

    if (d[1]) {
      games.push(...d[1][1]);
    }

    return games;
  }
%}

#
# --- PGN ---------------------------------------------------------------------
#

# TAGS contains whitespace at the end
GAME -> TAGS %__ MOVES %__ %result {%
  (d) => {
    function pair(moves, start = 0) {
      return moves.reduce((acc, move, i) => {
        const color = (start + i) % 2 === 0 ? 'white' : 'black';
        const index = Math.floor((start + i) / 2);

        if (acc[index] === undefined) {
          acc[index] = [index + 1, undefined];
        }

        if (move.number !== undefined && move.number.value !== index + 1) {
          console.warn(`Warning: Move number mismatch - ${move.number.value} at line ${move.number.line} col ${move.number.col}`);
        }
        delete move.number;

        if (move.castling) {
          move.to = color === 'white' ? move.long ? 'c1' : 'g1' : move.long ? 'c8' : 'g8';

          // Delete the temporary castling property
          delete move.long;
        }

        if (move.variants) {
          move.variants = move.variants.map((variant) => pair(variant, start + i));
        }

        acc[index][color === 'white' ? 1 : 2] = move;

        return acc;
      }, []).slice(Math.floor(start / 2));
    }

    //return ({ meta: d[0], moves, result: String(d[4]) });
    const result = d[4].value;
    let mappedResult;
    switch(result) {
      case '1-0':
        mappedResult = 1;
        break;
      case '0-1':
        mappedResult = 0;
        break;
      case '1/2-1/2':
        mappedResult = 0.5;
        break;
      default:
        mappedResult = '?';
        break;
    }

    return ({ meta: d[0], moves: pair(d[2]), result: mappedResult });
  }
%}

#
# --- TAGS --------------------------------------------------------------------
#

TAGS -> TAG (%__ TAGS):? {%
  (d) => {
    const tag = d[0];
    const rest = d[1] ? d[1][1] : {};

    return { ...tag, ...rest };
  }
%}

TAG -> "[" %identifier %__ %value "]" {%
  (d) => ({ [d[1].value]: d[3].value })
%}

#
# --- MOVES -------------------------------------------------------------------
#

MOVES -> MOVE (%__:? RAV):* (%__ MOVES):? {%
  (d) => {
    let moves = [d[0]];

    if (d[1].length > 0) {
      moves[0].variants = d[1].map(d1 => d1[1]);
    }

    if (d[2]) {
      moves.push(...d[2][1]);
    }

    return moves;
  }
%}

#
# --- Move --------------------------------------------------------------------
#

MOVE -> %number:? %__:? %san (%__:? NAG):* (%__:? COMMENT):* {%
  (d) => {
    // We keep the token for number so we can warn about mismatches. Not really
    // useful as numbers could be out of order.
    const number = d[0] ?? undefined;
    const annotations = d[3].map(d3 => d3[1]);
    const comments = d[4].map(d4 => d4[1]).filter(Boolean);
    const san = d[2].value;

    return {
      number,
      ...(annotations.length > 0 && { annotations }),
      ...(comments.length > 0 && { comment: comments.join(' ').replace(/\n/g, '') }),
      ...san,
    };
  }
%}

#
# --- RAV ---------------------------------------------------------------------
#

RAV -> "(" %__:? MOVES %__:? ")" {%
  (d) => d[2]
%}

#
# --- NAG ---------------------------------------------------------------------
#

NAG ->
  %nag_import {% (d) => d[0].value %}
  | %nag_export {% id %}

COMMENT -> %comment_line | %comment_multiline