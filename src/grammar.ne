@{%
  const moo = require("moo");

  const lexer = moo.states({
    main: {
      __: { lineBreaks: true, match: /\s+/ },
      comment_line: { match: /;.*$/, value: (s) => s.slice(1).trim() },
      comment_multiline: {
        lineBreaks: true,
        match: /{[^}]*}/,
        value: (s) =>
          s
            .slice(1, -1)
            .replace(/[\n\t]/g, ' ')
            .trim(),
      },
      escape: /^%.*$/,

      // --- TAG ---
      lbracket: { match: '[', push: 'tag' },
      rbracket: { match: ']', pop: 1 },

      // --- RESULT ---
      result: ['1-0', '0-1', '1/2-1/2', '*'],

      // --- MOVE ---
      number: { match: /\d+[.]*/, value: (s) => Number(s.replace(/[.]/g, '')) },
      piece: { match: /[KQBNR]/, push: 'san' },
      castling: ['O-O', 'O-O-O'],
      capture: 'x',
      promotion: { match: /=[NBRQ]/, value: (s) => s.slice(1) },
      check: '+',
      checkmate: '#',

      // --- SQUARE ---
      // These three must go in order to avoid conflicts
      square: /[a-h][1-8]/,
      file: /[a-h]/,
      rank: /[1-8]/,

      // --- NAG ---
      nag_import: ['!', '?', '!!', '??', '!?', '?!', '□', '=', '∞', '⩲', '⩱', '±', '∓', '+ −', '− +', '⨀', '○', '⟳', '↑', '→', '⯹', '⇆', '⨁'],
      nag_export: {
        match: /\$25[0-5]|\$2[0-4][0-9]|\$1[0-9][0-9]|\$[1-9][0-9]|\$[0-9]/,
        value: (s) => s.slice(1),
      },

      // --- RAV ---
      lparen: '(',
      rparen: ')',
    },
    tag: {
      __: { lineBreaks: true, match: /\s+/ },
      identifier: /[a-zA-Z0-9_]+/,
      rbracket: { match: ']', pop: 1 },
      value: {
        match: /"[^"]*?"/,
        value: (s) => s.slice(1, -1).trim(),
      },
    },
    san: {
      capture: 'x',
      // --- SQUARE ---
      // These three must go in order to avoid conflicts
      square: { match: /[a-h][1-8]/, pop: 1 },
      file: /[a-h]/,
      rank: /[1-8]/,
    },
  });
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
  | %__:* {%
    () => []
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
          acc[index] = [index + 1];
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
          move.variants = move.variants.map((variant) => pair(variant, start + i).filter(Boolean));
        }

        acc[index].push(move);

        return acc;
      }, []);
    }

    //return ({ meta: d[0], moves, result: String(d[4]) });
    const result = String(d[4]);
    return ({ meta: d[0], moves: pair(d[2]), result: result === '1-0' ? 1 : result === '0-1' ? 0 : result === '1/2-1/2' ? 0.5 : result });
  }
%}

#
# --- TAGS --------------------------------------------------------------------
#

TAGS -> TAG (%__ TAGS):? {%
  (d) => {
    let tags = d[0];

    if (d[1]) {
      tags = { ...tags, ...d[1][1] };
    }

    return tags;
  }
%}

TAG -> "[" %identifier %__ %value "]" {%
  (d) => ({ [d[1]]: String(d[3]) })
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

MOVE -> %number:? %__:? SAN (%__:? NAG):* (%__:? COMMENT):* {%
  (d) => {
    const annotations = d[3].map(d3 => d3[1]);
    const comments = d[4].map(d4 => d4[1]).filter(Boolean);

    return {
      number: d[0] ?? undefined,
      ...(annotations.length > 0 && { annotations }),
      ...(comments.length > 0 && { comment: comments.join(' ').replace(/\n/g, '') }),
      ...d[2],
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
# --- SAN ---------------------------------------------------------------------
#

SAN -> NOTATION ("+" | "#"):? {%
  (d) => {
    const check = d[1] && (d[1][0].value === '+' ? 'check' : 'checkmate');

    const move = d[0];

    if (move.castling) {
      move.long = move.castling === 'O-O-O';
    }

    return {
      ...(check && { [check]: true }),
      ...d[0],
    };
  }
%}

NOTATION ->
  %piece (%file | %rank | %square):? %capture:? %square {%
    (d) => {
      return {
        ...(d[2] && { capture: true }),
        ...(d[1] && { from: String(d[1][0]) }),
        piece: String(d[0]),
        to: String(d[3]),
      };
    }
  %}
  | %file:? %capture:? %square %promotion:? {%
    (d) => {
      return {
        ...(d[1] && { capture: true }),
        ...(d[0] && { from: String(d[0]) }),
        ...(d[3] && { promotion: String(d[3]) }),
        piece: 'P',
        to: String(d[2]),
      };
    }
  %}
  | %castling {%
    (d) => {
      return {
        castling: true,
        piece: 'K',
      };
    }
  %}

NAG ->
  %nag_import {% (d) => d[0].value %}
  | %nag_export {% id %}

COMMENT -> %comment_line | %comment_multiline