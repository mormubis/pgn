/* eslint-disable sort-keys */
import moo from 'moo';

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

export default lexer;
