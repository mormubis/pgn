@{%
  const moo = require("moo");

  const lexer = moo.states({
    main: {
      __: { lineBreaks: true, match: /[ \t\n\v\f]+/ },
      comment_line: { match: /;.*$/, value: (s) => s.slice(1).trim() },
      comment_multiline: {
        lineBreaks: true,
        match: /{[^}]*}/,
        value: (s) => s.slice(1, -1).trim(),
      },
      escape: /^%.*$/,

      // --- TAG ---
      lbracket: { match: '[', push: 'tag' },
      rbracket: { match: ']', pop: 1 },

      // --- MOVE ---
      number: /\d+[.]*/,
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
      nag_import: ['!', '?', '!!', '??', '!?', '?!'],
      nag_export: {
        match: /\$25[0-5]|\$2[0-4][0-9]|\$1[0-9][0-9]|\$[1-9][0-9]|\$[0-9]/,
        value: (s) => s.slice(1),
      },

      // --- RAV ---
      lparen: '(',
      rparen: ')',

      // --- RESULT ---
      result: ['1-0', '0-1', '1/2-1/2', '*'],
    },
    tag: {
      __: { lineBreaks: true, match: /[ \t\n\v\f]+/ },
      identifier: /[a-zA-Z0-9_]+/,
      rbracket: { match: ']', pop: 1 },
      value: {
        match: /"[^\\"\n]*"/,
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

  lexer.reset('1. d4 Nf6 2. c4 c5 3. Nf3 cxd4 4. Nxd4 e5 5. Nb5 d5 6. cxd5 Bc5 7. N5c3 O-O 8. e3 e4 9. h3 Re8 10. g4 Re5 11. Bc4 Nbd7 12. Qb3 Ne8 13. Nd2 Nd6 14. Be2 Qh4 15. Nc4 Nxc4 16. Qxc4 b5 17. Qxb5 Rb8 18. Qa4 Nf6 19. Qc6 Nd7 20. d6 Re6 21. Nxe4 Bb7 22. Qxd7 Bxe4 23. Rh2 Bxd6 24. Bc4 Rd8 25. Qxa7 Bxh2 26. Bxe6 fxe6 27. Qa6 Bf3 28. Bd2 Qxh3 29. Qxe6+ Kh8 30. Qe7 Bc7')
  let token;
  while (token = lexer.next()) {
    console.log(token)
  }
%}

@lexer lexer

#
# --- DATABASE ----------------------------------------------------------------
#

DATABASE -> GAME (%__ DATABASE):? %__:? {%
  (d) => {
    const games = [d[0]];

    if (d[1]) {
      games.concat(d[1][1]);
    }

    return games;
  }
%}

#
# --- PGN ---------------------------------------------------------------------
#

# TAGS contains whitespace at the end
GAME -> TAGS %__ MOVES %__ %result {%
  (d) => ({ meta: d[0], moves: d[1], result: d[3] })
%}

#
# --- TAGS --------------------------------------------------------------------
#

TAGS -> TAG (%__ TAGS):? {%
  (d) => {
    let tags = [d[0]];


    if (d[1]) {
        tags = [...tags, ...d[1][1]];
    }

    return tags;
  }
%}

TAG -> "[" %identifier %__ %value "]" {% (d) => ({ [d[1]]: String(d[3]) }) %}

#
# --- MOVES -------------------------------------------------------------------
#

MOVES ->
    MOVE (%__ MOVES):? {%
        (d) => {
            let moves = [d[0]];

            if (d[1]) {
                moves = [...moves, ...d[1][1]];
            }

            return moves;
        }
    %}
    | RAV (%__ MOVES):? {%
        (d) => {
            const moves = [d[0]];

            if (d[1]) {
                moves.concat(d[1][1]);
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
            ...(annotations.length > 0 && { annotations }),
            ...(comments.length > 0 && { comment: comments.join(' ').replace(/\n/g, '') }),
            ...d[2],
        };
    }
%}

#
# --- RAV ---------------------------------------------------------------------
#

RAV -> "(" MOVES ")" {%
    (d) => d[1]
%}

#
# --- SAN ---------------------------------------------------------------------
#

SAN -> NOTATION ("+" | "#"):? {%
    (d) => {
        const check = d[1] && (d[1][0].value === '+' ? 'check' : 'checkmate');

        const move = d[0];

        if (move.castling) {
            // Where is coming from (depending on the color)
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
    | %file:? %capture:? %square {%
        (d) => {
            return {
                ...(d[1] && { capture: true }),
                ...(d[0] && { from: String(d[0]) }),
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

NAG -> %nag_import | %nag_export {% id %}

COMMENT -> %comment_line | %comment_multiline