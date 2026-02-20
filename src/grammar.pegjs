{{
  function pickBy(obj, pred) {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => pred(v))
    );
  }

  function pairMoves(moves, start) {
    start = start ?? 0;
    return moves.reduce((acc, move, i) => {
      const color = (start + i) % 2 === 0 ? 'white' : 'black';
      const index = Math.floor((start + i) / 2);

      if (acc[index] === undefined) {
        acc[index] = [index + 1, undefined];
      }

      if (move.number !== undefined && move.number !== index + 1) {
        console.warn(
          `Warning: Move number mismatch - ${move.number}`
        );
      }
      delete move.number;

      if (move.castling) {
        move.to =
          color === 'white'
            ? move.long ? 'c1' : 'g1'
            : move.long ? 'c8' : 'g8';
        delete move.long;
      }

      if (move.variants) {
        move.variants = move.variants.map((variant) =>
          pairMoves(variant, start + i)
        );
      }

      acc[index][color === 'white' ? 1 : 2] = move;

      return acc;
    }, []).slice(Math.floor(start / 2));
  }

  function mapResult(result) {
    switch (result) {
      case '1-0':   return 1;
      case '0-1':   return 0;
      case '1/2-1/2': return 0.5;
      default:      return '?';
    }
  }
}}

// ─── DATABASE ────────────────────────────────────────────────────────────────

DATABASE
  = _ first:GAME rest:(_ g:GAME { return g; })* _
  { return [first, ...rest]; }

// ─── GAME ────────────────────────────────────────────────────────────────────

GAME
  = tags:TAGS _ moves:MOVES _ result:RESULT
  { return { meta: tags, moves: pairMoves(moves), result: mapResult(result) }; }

// ─── TAGS ────────────────────────────────────────────────────────────────────

TAGS
  = head:TAG tail:(_ t:TAG { return t; })*
  { return Object.assign({}, head, ...tail); }

TAG
  = "[" _ id:IDENTIFIER _ val:STRING _ "]"
  { return { [id]: val }; }

IDENTIFIER
  = $[a-zA-Z0-9_]+

STRING
  = '"' val:$[^"]* '"'
  { return val.trim(); }

// ─── RESULT ──────────────────────────────────────────────────────────────────

RESULT
  = "1/2-1/2" / "1-0" / "0-1" / "*"

// ─── MOVES ───────────────────────────────────────────────────────────────────

MOVES
  = head:MOVE variants:(_ r:RAV { return r; })* tail:(_ m:MOVES { return m; })?
  {
    if (variants.length > 0) {
      head.variants = variants;
    }
    return tail ? [head, ...tail] : [head];
  }

// ─── MOVE ────────────────────────────────────────────────────────────────────

MOVE
  = num:NUMBER? _ san:SAN nags:(_ n:NAG { return n; })* comments:(_ c:COMMENT { return c; })*
  {
    const annotations = nags.filter(Boolean);
    const commentText = comments.filter(Boolean).join(' ').replace(/\n/g, '');
    return {
      ...(num !== null && { number: num }),
      ...(annotations.length > 0 && { annotations }),
      ...(commentText.length > 0 && { comment: commentText }),
      ...san,
    };
  }

NUMBER
  = n:$([0-9]+ "."*)
  { return parseInt(n.replace(/\./g, ''), 10); }

// ─── SAN ─────────────────────────────────────────────────────────────────────

// SAN alternatives ordered most-specific to least-specific so PEG ordered
// choice does not consume prefix characters that belong to a later, shorter
// alternative.
//
// Fully-disambiguated:  Qd1xe4+   → piece + file + rank + capture + to
// File-disambiguated:   exd5      → file + capture + to   (or just from_file + to)
// Rank-disambiguated:   N1f3      → piece + rank + to
// Simple:               Nf3 / e4  → piece + to  /  to

SAN
  = s:$(
      "O-O-O" [+#]? / "O-O" [+#]?
      / [KQBNPR] [a-h] [1-8] "x" [a-h] [1-8] ("=" [NBRQ])? [+#]?   // Qd1xe4 (full disambig capture)
      / [KQBNPR] [a-h] [1-8] [a-h] [1-8] ("=" [NBRQ])? [+#]?        // Qd1e4  (full disambig)
      / [KQBNPR] [a-h] "x" [a-h] [1-8] ("=" [NBRQ])? [+#]?          // Naxb4  (file disambig capture)
      / [KQBNPR] [1-8] "x" [a-h] [1-8] ("=" [NBRQ])? [+#]?          // N1xf3  (rank disambig capture)
      / [KQBNPR] [a-h] [a-h] [1-8] ("=" [NBRQ])? [+#]?              // Nbd7   (file disambig, no capture)
      / [KQBNPR] [1-8] [a-h] [1-8] ("=" [NBRQ])? [+#]?               // N1f3   (rank disambig)
      / [KQBNPR] "x" [a-h] [1-8] ("=" [NBRQ])? [+#]?                 // Nxf3   (piece capture, no disambig)
      / [KQBNPR] [a-h] [1-8] ("=" [NBRQ])? [+#]?                     // Nf3    (piece + to)
      / [a-h] "x" [a-h] [1-8] ("=" [NBRQ])? [+#]?                    // exd5   (pawn capture)
      / [a-h] [1-8] ("=" [NBRQ])? [+#]?                               // e4     (pawn push)
    )
  {
    if (s.startsWith('O-O')) {
      const isLong = s.startsWith('O-O-O');
      return { castling: true, long: isLong, piece: 'K', to: isLong ? 'O-O-O' : 'O-O' };
    }
    const m = s.match(
      /^(?<piece>[KQBNPR])?(?<from>[a-h][1-8]|[a-h]|[1-8])?(?<capture>x)?(?<to>[a-h][1-8])(?:=(?<promotion>[NBRQ]))?(?<indication>[+#])?$/
    );
    const g = (m && m.groups) ? m.groups : {};
    return pickBy(
      {
        piece:     g.piece || 'P',
        from:      g.from,
        capture:   Boolean(g.capture),
        to:        g.to,
        promotion: g.promotion,
        check:     Boolean(g.indication && g.indication.includes('+')),
        checkmate: Boolean(g.indication && g.indication.includes('#')),
      },
      Boolean
    );
  }

// ─── RAV ─────────────────────────────────────────────────────────────────────

RAV
  = "(" _ moves:MOVES _ ")"
  { return moves; }

// ─── NAG ─────────────────────────────────────────────────────────────────────

NAG
  = nag_export
  / nag_import

nag_export
  = "$" n:$([0-9]+)
  { return n; }

nag_import
  = "!!" / "??" / "!?" / "?!" / "!" / "?"
  / "\u25A1" / "\u221E" / "\u2A72" / "\u2A71" / "\u00B1" / "\u2213"
  / "+ \u2212" / "\u2212 +" / "\u2A00" / "\u25CB" / "\u27F3"
  / "\u2191" / "\u2192" / "\u2BF9" / "\u21C6" / "\u2981" / "="

// ─── COMMENT ─────────────────────────────────────────────────────────────────

COMMENT
  = comment_multiline
  / comment_line

comment_multiline
  = "{" text:$[^}]* "}"
  { return text.replace(/[\n\t]/g, ' ').trim(); }

comment_line
  = ";" text:$(![\n] .)*
  { return text.trim(); }

// ─── WHITESPACE ──────────────────────────────────────────────────────────────

_
  = ([ \t\n\r] / ESCAPE)*

ESCAPE
  = "%" (![\n] .)* [\n]?
