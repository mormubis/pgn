@builtin "number.ne"
@builtin "string.ne"
@builtin "whitespace.ne"

# ----- pgn ----- #
DATABASE -> GAME:+ {% id %}

# TAGS contains whitespace at the end
GAME -> TAGS MOVE_SECTION __ result __ {%
    (d) => ({ meta: d[0], moves: d[1], result: d[3] })
%}
# ----- /pgn ---- #

# ----- tags ----- #
TAGS -> (TAG __):+ {% (d) => d[0].map(d0 => d0[0]).reduce((acc, item) => ({ ...acc, ...item }), {}) %}

TAG -> "[" NAME __ VALUE "]" {% (d) => ({ [d[1]]: d[3] }) %}

NAME -> string

VALUE -> dqstring {% id %}
# ----- /tags ----- #


# ----- moves ----- #
MOVE_SECTION ->
    MOVE (_ MOVE):* (_ HM_WHITE):? {%
        (d) => {
            const moves = [d[0]];

            if (d[1].length > 0) {
                const d1 = d[1];

                moves.push(...d1.map(d => d[1]));
            }

            if (d[2]) {
                const d2 = d[2];

                moves.push(d2[1]);
            }

            return moves;
        }
    %}
    | HM_WHITE {% d => [d[0]] %}

MOVES -> (_ MOVE):* (_ HM_WHITE):? {%
    (d) => {
        const moves = [];

        if (d[0]) {
            d[0].map(d0 => d0[1]).map(d01 => moves.push(d01));
        }

        if (d[1]) {
            moves.push(d[1][1]);
        }

        return moves;
    }
%}

# Half Move White #
HM_WHITE -> NUMBER _ SAN (_ VARIANT):* {%
    (d) => {
        const move = [d[0], {...d[2], ...(d[3].length > 0 && { variants: d[3].map(d3 => d3[1]) }), }];

        if (move[1].castling) {
            move[1].to = move[1].castling === 'K' ? 'g1' : 'c1';
            move[1].castling = true;
        }

        return move;
    }
%}

HM_BLACK -> _ NUMBER continuation _ SAN (_ VARIANT):* {%
    (d) => {
        const move = [d[1], undefined, {...d[4], ...(d[5].length > 0 && { variants: d[5].map(d5 => d5[1]) }) }];

        if (move[2].castling) {
            move[2].to = move[2].castling === 'K' ? 'g8' : 'c8';
            move[2].castling = true;
        }

        return move;
    }
%}

MOVE ->
    NUMBER _ SAN __ SAN (_ VARIANT):* {%
        (d) => {
            const move = [d[0], d[2], d[4]];

            if (move[1].castling) {
                move[1].to = move[1].castling === 'K' ? 'g1' : 'c1';
                move[1].castling = true;
            }

            if (move[2].castling) {
                move[2].to = move[2].castling === 'K' ? 'g8' : 'c8';
                move[2].castling = true;
            }

            if (d[5]) {
                const variants = d[5].map(d5 => d5[1]);

                const white = variants.filter(variant => variant[0][1]);
                const black = variants.filter(variant => !variant[0][1]);

                if (white.length > 0) {
                    move[1].variants = white;
                }

                if (black.length > 0) {
                    move[2].variants = black;
                }
            }

            return move;
        }
    %}
    | HM_WHITE __ HM_BLACK {%
        d => [d[0][0], d[0][1], d[2][2]]
    %}

NUMBER -> unsigned_int ".":? {% (d) => d[0] %}

VARIANT ->
    "(" MOVES _ ")" {%
        (d) => d[1]
    %}
    | "(" HM_BLACK MOVES _ ")" {%
        (d) => [d[1], ...d[2]]
    %}

# ----- /moves ----- #

# ----- san ----- #

SAN ->
    piece:? DISAMBIGUATION:? capture:? file rank PROMOTION:? (_ SUFFIX):? (_ COMMENT):* {%
        (d) => {
            const comments = d[7].map(d7 => d7[1]).filter(Boolean);

            return  ({
               ...(d[6] && d[6][1]),
               ...(comments.length > 0 && { comment: comments.reduce((acc, item) => `${acc} ${item}`, '') }),
               ...(d[2] && { capture: true }),
               ...(d[1] && { from: d[1][0] }),
               piece: d[0] ? d[0][0] : 'P',
               ...(d[5] && { promotion: d[5] }),
               to: `${d[3]}${d[4]}`,
            });
        }
    %}
    | castling (_ SUFFIX):* (_ COMMENT):* {%
        (d) => {
            const comments = d[2].map(d2 => d2[1]).filter(Boolean);

            return ({
               ...(d[1]),
               ...(comments.length > 0 && { comment: comments.reduce((acc, item) => `${acc} ${item}`, '') }),
               castling: d[0],
               piece: 'K'
            })
        }
    %}

DISAMBIGUATION ->
    file {% id %}
    | rank {% id %}
    | SQUARE {% id %}

SQUARE -> file rank {% (d) => `${d[0]}${d[1]}` %}

PROMOTION -> "=" [QBNR] {% (d) => d[1] %}

SUFFIX ->
    (check | checkmate) annotation:? (_ NAG):* {%
        (d) => ({
            ...(d[0] && { [d[0]]: true }),
            ...((d[1] || d[2].length > 0) && { annotations: [...(d[1] ? [d[1]] : []), ...d[2].map(d2 => d2[1])] }),
        })
    %}
    | (check | checkmate):? annotation (_ NAG):* {%
        (d) => ({
            ...(d[0] && { [d[0]]: true }),
            ...((d[1] || d[2].length > 0) && { annotations: [...(d[1] ? [d[1]] : []), ...d[2].map(d2 => d2[1])] }),
        })
    %}
    | (check | checkmate):? annotation:? (_ NAG):+ {%
        (d) => ({
            ...(d[0] && { [d[0]]: true }),
            ...((d[1] || d[2].length > 0) && { annotations: [...(d[1] ? [d[1]] : []), ...d[2].map(d2 => d2[1])] }),
        })
    %}

# Numeric Annotation Glyph
NAG -> "$" ("25" [0-5] | "2" [0-4] [0-9] | "1" [0-9] [0-9] | [1-9] [0-9] | [0-9]) {%
    (d) => d[1]
%}

COMMENT -> bstring | ";" [^\n]:*

# ----- /san ----- #

# types
annotation ->
    "!!" {% id %}
    | "!" {% id %}
    | "!?" {% id %}
    | "?!" {% id %}
    | "?" {% id %}
    | "??" {% id %}
    | "+-" {% id %}
    | "-+" {% id %}
    | "=" {% id %}
    | "?!" {% id %}
    | "?" {% id %}
    | "??" {% id %}
    | "±" {% id %}
    | "∓" {% id %}
    | "∞" {% id %}
    | "⨀" {% id %}
    | "⩱" {% id %}
    | "⩲" {% id %}
check -> "+" {% () => 'check' %}
checkmate -> "#" {% () => 'checkmate' %}
bstring -> "{" [^}]:* "}" {% (d) => d[1].join('') %}
capture -> "x"
castling ->
    "O-O" {% () => 'K' %}
    | "O-O-O" {% () => 'Q' %}
continuation -> "..."
file -> [a-h]
piece -> [KQBNR]
rank -> [1-8]
result ->
    "1-0" {% () => 1 %}
    | "0-1" {% () => 0 %}
    | "1/2-1/2" {% () => 0.5 %}
    | "*" {% () => '?' %}
string -> [^\s]:+ {% (d) => d[0].join('') %}
