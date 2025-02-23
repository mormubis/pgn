/* eslint-disable sort-keys */
import moo from 'moo';

function pickBy<T extends Record<string | number | symbol, unknown>>(
  object: T,
  predicate: <K extends keyof T>(value: T[K], key: K) => boolean,
) {
  return Object.fromEntries(
    Object.entries(object).filter(([key, value]) =>
      predicate(value as T[keyof T], key),
    ),
  );
}

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
    // https://regex101.com/r/zwTzNe/1
    san: {
      match:
        /(?:[KQBNPR]?[a-h]?[1-8]?x?[a-h][1-8]|O-O-O|O-O)(?:=[a-h][1-8])?[+#]?/,
      value: (s) => {
        if (['O-O', 'O-O-O'].includes(s)) {
          return { castling: true, long: s === 'O-O-O', piece: 'K', to: s };
        }

        const extractor =
          /(?<piece>[KQBNPR])?(?<from>[a-h]|[1-8]|[a-h][1-8])?(?<capture>x)?(?<to>[a-h][1-8])(?<promotion>=[NBRQ])?(?<indication>[+#])?/;
        const { groups = {} } = s.match(extractor) || {};

        return pickBy(
          {
            piece: groups.piece || 'P',
            from: groups.from,
            capture: Boolean(groups.capture),
            to: groups.to,
            promotion: groups.promotion?.slice(1),
            check: Boolean(groups.indication?.includes('+')),
            checkmate: Boolean(groups.indication?.includes('#')),
          },
          Boolean,
        );
      },
    },
    number: { match: /\d+[.]*/, value: (s) => Number(s.replace(/[.]/g, '')) },

    // --- NAG ---
    nag_import: [
      '!',
      '?',
      '!!',
      '??',
      '!?',
      '?!',
      '□',
      '=',
      '∞',
      '⩲',
      '⩱',
      '±',
      '∓',
      '+ −',
      '− +',
      '⨀',
      '○',
      '⟳',
      '↑',
      '→',
      '⯹',
      '⇆',
      '⨁',
    ],
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
});

export default lexer;
