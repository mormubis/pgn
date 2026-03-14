{{
  function pairMoves(moves, start) {
    start = start ?? 0;
    const acc = [];
    for (let i = 0; i < moves.length; i++) {
      const si = start + i;
      const isWhite = si % 2 === 0;
      const index = (si - (isWhite ? 0 : 1)) >> 1;

      if (acc[index] === undefined) {
        acc[index] = [index + 1, undefined];
      }

      const { number, long, ...move } = moves[i];

      if (number !== undefined && number !== index + 1) {
        console.warn(`Warning: Move number mismatch - ${number}`);
      }

      if (move.castling) {
        move.to = isWhite
          ? (long ? 'c1' : 'g1')
          : (long ? 'c8' : 'g8');
      }

      if (move.variants) {
        move.variants = move.variants.map((variant) =>
          pairMoves(variant, si)
        );
      }

      acc[index][isWhite ? 1 : 2] = move;
    }
    return start === 0 ? acc : acc.slice(start >> 1);
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
    const move = { ...san };
    if (num !== null) move.number = num;
    if (nags.length > 0) {
      const annotations = nags.filter(Boolean);
      if (annotations.length > 0) move.annotations = annotations;
    }
    if (comments.length > 0) {
      const commentText = comments.filter(Boolean).join(' ').replace(/\n/g, '');
      if (commentText.length > 0) move.comment = commentText;
    }
    return move;
  }

NUMBER
  = n:$([0-9]+ "."*)
  { return parseInt(n.replace(/\./g, ''), 10); }

// ─── SAN ─────────────────────────────────────────────────────────────────────

SAN
  = CASTLING
  / PIECE_MOVE
  / PAWN_CAPTURE
  / PAWN_PUSH

CASTLING
  = "O-O-O" $[+#]?
  { return { castling: true, long: true, piece: 'K', to: 'O-O-O' }; }
  / "O-O" $[+#]?
  { return { castling: true, long: false, piece: 'K', to: 'O-O' }; }

PIECE_MOVE
  // Full-square disambig + capture: Qd1xe4
  = piece:$[KQBNPR] df:$[a-h] dr:$[1-8] "x" file:$[a-h] rank:$[1-8] promo:PROMO? ind:$[+#]?
  {
    const to = file + rank;
    const result = { capture: true, from: df + dr, piece, to };
    if (promo)       result.promotion = promo;
    if (ind === '+') result.check     = true;
    if (ind === '#') result.checkmate = true;
    return result;
  }
  // Full-square disambig, no capture: Qd1e4
  / piece:$[KQBNPR] df:$[a-h] dr:$[1-8] file:$[a-h] rank:$[1-8] promo:PROMO? ind:$[+#]?
  {
    const to = file + rank;
    const result = { from: df + dr, piece, to };
    if (promo)       result.promotion = promo;
    if (ind === '+') result.check     = true;
    if (ind === '#') result.checkmate = true;
    return result;
  }
  // File disambig + capture: Naxb4
  / piece:$[KQBNPR] df:$[a-h] "x" file:$[a-h] rank:$[1-8] promo:PROMO? ind:$[+#]?
  {
    const to = file + rank;
    const result = { capture: true, from: df, piece, to };
    if (promo)       result.promotion = promo;
    if (ind === '+') result.check     = true;
    if (ind === '#') result.checkmate = true;
    return result;
  }
  // Rank disambig + capture: N1xf3
  / piece:$[KQBNPR] dr:$[1-8] "x" file:$[a-h] rank:$[1-8] promo:PROMO? ind:$[+#]?
  {
    const to = file + rank;
    const result = { capture: true, from: dr, piece, to };
    if (promo)       result.promotion = promo;
    if (ind === '+') result.check     = true;
    if (ind === '#') result.checkmate = true;
    return result;
  }
  // File disambig, no capture: Nbd7
  / piece:$[KQBNPR] df:$[a-h] file:$[a-h] rank:$[1-8] promo:PROMO? ind:$[+#]?
  {
    const to = file + rank;
    const result = { from: df, piece, to };
    if (promo)       result.promotion = promo;
    if (ind === '+') result.check     = true;
    if (ind === '#') result.checkmate = true;
    return result;
  }
  // Rank disambig, no capture: N1f3
  / piece:$[KQBNPR] dr:$[1-8] file:$[a-h] rank:$[1-8] promo:PROMO? ind:$[+#]?
  {
    const to = file + rank;
    const result = { from: dr, piece, to };
    if (promo)       result.promotion = promo;
    if (ind === '+') result.check     = true;
    if (ind === '#') result.checkmate = true;
    return result;
  }
  // Capture, no disambig: Nxf3
  / piece:$[KQBNPR] "x" file:$[a-h] rank:$[1-8] promo:PROMO? ind:$[+#]?
  {
    const to = file + rank;
    const result = { capture: true, piece, to };
    if (promo)       result.promotion = promo;
    if (ind === '+') result.check     = true;
    if (ind === '#') result.checkmate = true;
    return result;
  }
  // Simple: Nf3
  / piece:$[KQBNPR] file:$[a-h] rank:$[1-8] promo:PROMO? ind:$[+#]?
  {
    const to = file + rank;
    const result = { piece, to };
    if (promo)       result.promotion = promo;
    if (ind === '+') result.check     = true;
    if (ind === '#') result.checkmate = true;
    return result;
  }

PAWN_CAPTURE
  = from:$[a-h] "x" file:$[a-h] rank:$[1-8] promo:PROMO? ind:$[+#]?
  {
    const to = file + rank;
    const result = { capture: true, from, piece: 'P', to };
    if (promo)       result.promotion = promo;
    if (ind === '+') result.check     = true;
    if (ind === '#') result.checkmate = true;
    return result;
  }

PAWN_PUSH
  = file:$[a-h] rank:$[1-8] promo:PROMO? ind:$[+#]?
  {
    const to = file + rank;
    const result = { piece: 'P', to };
    if (promo)       result.promotion = promo;
    if (ind === '+') result.check     = true;
    if (ind === '#') result.checkmate = true;
    return result;
  }

PROMO
  = "=" p:$[NBRQ] { return p; }

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
