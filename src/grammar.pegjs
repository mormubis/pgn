{{
  // Module-level variable set once per parse() call via the per-parse initializer.
  // Holds the user-supplied onWarning callback (or null when not provided).
  let _warn = null;

  function applyIndicators(result, promo, ind) {
    if (promo)       result.promotion = promo;
    if (ind === '+') result.check     = true;
    if (ind === '#') result.checkmate = true;
    return result;
  }

  function pairMoves(moves, start) {
    start = start ?? 0;
    if (moves.length === 0) { return []; }
    // half = first pair index in the full game; pairIdx below is relative to it
    const half = start >> 1;
    const acc = new Array(Math.ceil((moves.length + (start & 1)) / 2));
    for (let i = 0; i < moves.length; i++) {
      const si = start + i;
      const isWhite = (si & 1) === 0;
      const pairIdx = (si >> 1) - half;

      const moveNum = (si >> 1) + 1;
      if (acc[pairIdx] === undefined) {
        acc[pairIdx] = [moveNum, undefined];
      }

      // Read internal bookkeeping fields off the raw grammar object.
      // We never put them on the output — building an explicit clean object
      // keeps V8 hidden classes consistent across all moves in the array,
      // avoiding megamorphic deoptimisation from `delete`.
      const raw = moves[i];
      const number = raw.number;
      const long   = raw.long;

      if (_warn && number !== undefined && number !== moveNum) {
        _warn({
          column: 1,
          line: 1,
          message: `Move number mismatch: expected ${moveNum}, got ${number}`,
          offset: 0,
        });
      }

      // Build the clean output object — only public Move fields.
      const move = { piece: raw.piece, to: raw.to };
      if (raw.from      !== undefined) { move.from      = raw.from; }
      if (raw.capture   !== undefined) { move.capture   = raw.capture; }
      if (raw.castling  !== undefined) {
        move.castling = raw.castling;
        move.to = isWhite ? (long ? 'c1' : 'g1') : (long ? 'c8' : 'g8');
      }
      if (raw.check     !== undefined) { move.check     = raw.check; }
      if (raw.checkmate !== undefined) { move.checkmate = raw.checkmate; }
      if (raw.promotion !== undefined) { move.promotion = raw.promotion; }
      if (raw.annotations !== undefined) { move.annotations = raw.annotations; }
      if (raw.comment   !== undefined) { move.comment   = raw.comment; }
      if (raw.variants  !== undefined) {
        move.variants = raw.variants.map((variant) =>
          pairMoves(variant, si)
        );
      }

      acc[pairIdx][isWhite ? 1 : 2] = move;
    }
    return acc;
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

{
  // options is Peggy's options object; user-supplied keys pass through unchanged.
  // _warn is set once per parse() call so pairMoves (global scope) can access it.
  // @ts-expect-error — Peggy interop: options type is narrower than actual object
  _warn = typeof options?.onWarning === 'function' ? options.onWarning : null;
}

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
  {
    const all = [head, ...tail];
    if (_warn) {
      const seen = Object.create(null);
      for (const tag of all) {
        const key = tag._key;
        if (seen[key]) {
          _warn({
            column: tag._loc.column,
            line: tag._loc.line,
            message: `Duplicate tag: "${key}"`,
            offset: tag._loc.offset,
          });
        }
        seen[key] = true;
      }
      return Object.assign({}, ...all.map(({ _key: _, _loc: __, ...rest }) => rest));
    }
    return Object.assign({}, ...all);
  }
  / ""
  { return {}; }

TAG
  = "[" _ id:IDENTIFIER _ val:STRING _ "]"
  { return _warn ? { _key: id, _loc: location().start, [id]: val } : { [id]: val }; }

IDENTIFIER
  = $[a-zA-Z0-9_]+

STRING
  = '"' val:$([^"\\] / '\\' .)* '"'
  { return val.replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim(); }

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
    if (num !== null) san.number = num;
    if (nags.length > 0) {
      const out = [];
      for (let i = 0; i < nags.length; i++) {
        if (nags[i]) { out.push(nags[i]); }
      }
      if (out.length > 0) san.annotations = out;
    }
    if (comments.length > 0) {
      let text = '';
      for (let i = 0; i < comments.length; i++) {
        if (comments[i]) text += (text ? ' ' : '') + comments[i];
      }
      if (text.length > 0) san.comment = text.replace(/\n/g, '');
    }
    return san;
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
  = "O-O-O" ind:$[+#]?
  { return applyIndicators({ castling: true, long: true, piece: 'K', to: 'O-O-O' }, undefined, ind); }
  / "O-O" ind:$[+#]?
  { return applyIndicators({ castling: true, long: false, piece: 'K', to: 'O-O' }, undefined, ind); }

PIECE_MOVE
  // Full-square disambig + capture: Qd1xe4
  = piece:$[KQBNPR] df:$[a-h] dr:$[1-8] "x" file:$[a-h] rank:$[1-8] ind:$[+#]?
  { return applyIndicators({ capture: true, from: df + dr, piece, to: file + rank }, undefined, ind); }
  // Full-square disambig, no capture: Qd1e4
  / piece:$[KQBNPR] df:$[a-h] dr:$[1-8] file:$[a-h] rank:$[1-8] ind:$[+#]?
  { return applyIndicators({ from: df + dr, piece, to: file + rank }, undefined, ind); }
  // File disambig + capture: Naxb4
  / piece:$[KQBNPR] df:$[a-h] "x" file:$[a-h] rank:$[1-8] ind:$[+#]?
  { return applyIndicators({ capture: true, from: df, piece, to: file + rank }, undefined, ind); }
  // Rank disambig + capture: N1xf3
  / piece:$[KQBNPR] dr:$[1-8] "x" file:$[a-h] rank:$[1-8] ind:$[+#]?
  { return applyIndicators({ capture: true, from: dr, piece, to: file + rank }, undefined, ind); }
  // File disambig, no capture: Nbd7
  / piece:$[KQBNPR] df:$[a-h] file:$[a-h] rank:$[1-8] ind:$[+#]?
  { return applyIndicators({ from: df, piece, to: file + rank }, undefined, ind); }
  // Rank disambig, no capture: N1f3
  / piece:$[KQBNPR] dr:$[1-8] file:$[a-h] rank:$[1-8] ind:$[+#]?
  { return applyIndicators({ from: dr, piece, to: file + rank }, undefined, ind); }
  // Capture, no disambig: Nxf3
  / piece:$[KQBNPR] "x" file:$[a-h] rank:$[1-8] ind:$[+#]?
  { return applyIndicators({ capture: true, piece, to: file + rank }, undefined, ind); }
  // Simple: Nf3
  / piece:$[KQBNPR] file:$[a-h] rank:$[1-8] ind:$[+#]?
  { return applyIndicators({ piece, to: file + rank }, undefined, ind); }

PAWN_CAPTURE
  = from:$[a-h] "x" file:$[a-h] rank:$[1-8] promo:PROMO? ind:$[+#]?
  { return applyIndicators({ capture: true, from, piece: 'P', to: file + rank }, promo, ind); }

PAWN_PUSH
  = file:$[a-h] rank:$[1-8] promo:PROMO? ind:$[+#]?
  { return applyIndicators({ piece: 'P', to: file + rank }, promo, ind); }

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
