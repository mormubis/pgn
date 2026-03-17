# Specification: Portable Game Notation (PGN)

Implements the PGN standard as defined in the
[PGN Standard (1994)](http://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm).

---

## Seven Tag Roster (STR)

Every PGN game must contain these seven tags in this order:

| Tag | Description | Default |
|-----|-------------|---------|
| `Event` | Tournament or match name | `?` |
| `Site` | Location | `?` |
| `Date` | Game date (`YYYY.MM.DD`) | `????.??.??` |
| `Round` | Round number | `?` |
| `White` | White player name | `?` |
| `Black` | Black player name | `?` |
| `Result` | Game result | `*` |

---

## Result Tokens

| Token | Meaning |
|-------|---------|
| `1-0` | White wins |
| `0-1` | Black wins |
| `1/2-1/2` | Draw |
| `*` | In progress / unknown |

---

## Move Notation

Moves use Standard Algebraic Notation (SAN). See `@echecs/san` SPEC.md.

Move numbers follow the pattern:
- White move: `1. e4`
- Black move only: `1... e5` (after a variation)
- Both: `1. e4 e5`

---

## Annotations

### NAG (Numeric Annotation Glyph)

| NAG | Symbol | Meaning |
|-----|--------|---------|
| `$1` | `!` | Good move |
| `$2` | `?` | Mistake |
| `$3` | `!!` | Brilliant move |
| `$4` | `??` | Blunder |
| `$5` | `!?` | Interesting move |
| `$6` | `?!` | Dubious move |
| `$10` | `=` | Equal position |
| `$14` | `⩲` | Slight advantage White |
| `$15` | `⩱` | Slight advantage Black |
| `$16` | `±` | Advantage White |
| `$17` | `∓` | Advantage Black |
| `$18` | `+−` | Decisive advantage White |
| `$19` | `−+` | Decisive advantage Black |

### Comments

Enclosed in `{ }`. May span multiple lines.

### Variations

Enclosed in `( )`. May be nested.

---

## Implementation Notes

- `parse(input, options?)` — default export, returns `PGN[]` (empty array on failure, never throws)
- `stringify(pgn)` — named export, serialises `PGN[]` back to PGN string
- Uses a Peggy PEG grammar (`src/grammar.pegjs`) — regenerated via `pnpm grammar:compile`
- `noImplicitAny` is disabled for Peggy action block interop

## Sources

- [PGN Standard (1994)](http://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm)
