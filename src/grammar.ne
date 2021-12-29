@builtin "number.ne"
@builtin "string.ne"
@builtin "whitespace.ne"

# ----- pgn ----- #
GAME -> TAGS MOVES __ result __ {%
    (d) => ({ meta: d[0], moves: d[1], result: d[3] })
%}
# ----- /pgn ---- #

# ----- tags ----- #
TAGS -> (TAG __):+ {% (d) => d[0].map(d0 => d0[0]).reduce((acc, item) => ({ ...acc, ...item }), {}) %}

TAG -> "[" NAME __ VALUE "]" {% (d) => ({ [d[1]]: d[3] }) %}

NAME -> string

VALUE -> dqstring {% id %}
# ----- /tags ---- #


# ----- moves ----- #
MOVES -> (MOVE (_ MOVE):*):? HALFMOVE:? {%
    (d) => {
        const moves = [];
        const assign = (number, ...move) => {
            moves[number - 1] = move;
        };

        if(d[0]) {
            console.log('hello', d[0][0], d[0][1].map(d0 => d0[1]));
            assign(d[0][0]);

            d[0][1].map(d0 => d0[1]).map(d0 => assign(...d0));
        }

        if (d[1]) {
            assign(...d[1]);
        }

        return moves;
    }
%}

HALFMOVE -> NUMBER _ SAN (_ VARIATION):? {%
    (d) => {
        const move = [d[0], {...d[2], ...(d[3] && { variation: d[3][1] }), }];

        if (move[1].castling) {
            move[1].to = move[1].castling === 'K' ? 'g1' : 'c1';
            move[1].castling = true;
        }

        return move;
    }
%}

MOVE -> NUMBER _ SAN __ SAN (_ VARIATION):? {%
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
            const variant = d[5][1];
            const isWhite = variant[0][0] !== undefined;

            move[isWhite ? 1 : 2].variation = d[5][1];
        }

        return move;
    }
%}

VARIATION ->
    "(" MOVES ")" {%
        (d) => [...d[1].values()].filter(Boolean)
    %}
    | "(" MOVES_BLACK ")" {%
        (d) => [...d[1].values()].filter(Boolean)
    %}

MOVES_BLACK -> HALFMOVE_BLACK MOVES:? {%
    (d) => {
        const moves = d[1] || [];

        const assign = (number, ...move) => {
            moves[number - 1] = move;
        };

        if (d[0]) {
            assign(...d[0]);
        }

        return moves;
    }
%}

HALFMOVE_BLACK -> NUMBER continuation _ SAN (_ VARIATION):? {%
    (d) => {
        const move = [
            d[0],
            undefined,
            {...d[3], ...(d[4] && { variation: d[4][1] }), }
        ];

        if (move[2].castling) {
            move[2].to = move[2].castling === 'K' ? 'g8' : 'c8';
            move[2].castling = true;
        }

        return move;
    }
%}

NUMBER -> unsigned_int ".":* {% (d) => d[0] %}

SAN ->
    piece:? DISAMBIGUATION:? capture:? file rank promotion:? (_ annotation):* (_ COMMENT):? {%
        (d) => ({
            ...(d[6].length > 0 && { annotations: d[6].map(([_, a]) => a) }),
            ...(d[7] && { comment: d[7][1] }),
            ...(d[1] && { from: d[1][0] }),
            piece: d[0] ? d[0][0] : 'P',
            ...(d[5] && { promotion: d[5] }),
            to: `${d[3]}${d[4]}`,
        })
    %}
    | castling (_ annotation):* (_ COMMENT):? {%
        (d) => ({
            ...(d[1].length > 0 && { annotations: d[1].map(([_, a]) => a) }),
            ...(d[2] && { comment: d[2][1] }),
            castling: d[0],
            piece: 'K'
        })
    %}

DISAMBIGUATION ->
    file {% id %}
    | rank {% id %}

COMMENT -> bstring

# ----- /moves ---- #

# types
annotation ->
    "!!" {% id %}
    | "!" {% id %}
    | "!?" {% id %}
    | "#" {% () => 'checkmate' %}
    | "$1" {% () => '!' %}
    | "$2" {% () => '?' %}
    | "$3" {% () => '!!' %}
    | "$4" {% () => '!?' %}
    | "$5" {% () => '?!' %}
    | "$6" {% () => '??' %}
    | "+" {% () => 'check' %}
    | "+-" {% id %}
    | "-+" {% id %}
    | "=" {% id %}
    | "?!" {% id %}
    | "?" {% id %}
    | "??" {% id %}
    | "N" {% id %}
    | "±" {% id %}
    | "∓" {% id %}
    | "∞" {% id %}
    | "⨀" {% id %}
    | "⩱" {% id %}
    | "⩲" {% id %}
bstring -> "{" [^}]:* "}" {% (d) => d[1].join('') %}
capture -> "x"
castling ->
    "O-O" {% () => 'K' %}
    | "O-O-O" {% () => 'Q' %}
continuation -> "..."
file -> [a-h]
piece -> [KQBNR]
promotion -> "=" [QBNR] {% (d) => d[1] %}
rank -> [1-8]
result ->
    "1-0" {% () => 1 %}
    | "0-1" {% () => 0 %}
    | "1/2-1/2" {% () => 0.5 %}
    | "*" {% () => '?' %}
string -> [^\s]:+ {% (d) => d[0].join('') %}
