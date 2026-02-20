# Design: Replace nearley + moo with Peggy

**Date**: 2026-02-21 **Status**: Approved

## Problem

`@echecs/pgn` is 3–11x slower than comparable PGN parsers (`pgn-parser`,
`@mliebelt/pgn-parser`). The gap widens with input size — a characteristic of
the Earley parsing algorithm used by nearley, which has O(n³) worst-case
complexity. The moo lexer adds an additional layer of overhead.

## Decision

Replace the nearley + moo parser stack with [Peggy](https://peggyjs.org) (v5), a
PEG parser generator. Peggy uses packrat memoization giving O(n) parsing time. A
declarative grammar file is preserved (`src/grammar.pegjs`), satisfying the
requirement to keep the grammar human-readable and not hand-write a parser.

## Architecture

### Before

```
src/grammar.ne   →[nearleyc]→  src/grammar.cjs
src/lexer.ts     (moo stateful lexer, imported by grammar.ne)
src/index.ts     (nearley Parser/Grammar, per-game split, post-processing)
```

### After

```
src/grammar.pegjs  →[peggy]→  src/grammar.cjs
src/index.ts       (peggy parser, direct parse, post-processing)
```

- `src/lexer.ts` and `moo` are removed — Peggy tokenizes inline in the grammar
- `src/grammar.ne` is replaced by `src/grammar.pegjs`
- `src/grammar.cjs` remains gitignored and generated, same as today
- The `grammar:compile` script changes to:
  `peggy --format commonjs -o src/grammar.cjs src/grammar.pegjs`

## Grammar

PEG rules map 1:1 to the current nearley rules in structure. Semantic action
functions (`pairMoves`, `pickBy`, `mapResult`) move from inline `{% ... %}`
blocks into a `{{ ... }}` global initializer at the top of the grammar. The
logic is unchanged.

Key rules:

```pegjs
{{
  function pickBy(obj, pred) { ... }
  function pairMoves(moves, start) { ... }
  function mapResult(result) { ... }
}}

Database = _ first:Game rest:(_ Game)* _
  { return [first, ...rest.map(r => r[1])] }

Game = tags:Tags _ moves:Moves _ result:Result
  { return { meta: tags, moves: pairMoves(moves), result: mapResult(result) } }

Tags = head:Tag tail:(_ Tag)*
  { return Object.assign({}, head, ...tail.map(t => t[1])) }

Tag = "[" _ id:Identifier _ val:Value _ "]"
  { return { [id]: val } }

Moves = head:Move variants:(_ RAV)* tail:(_ Moves)?
  { /* attach variants to head, concat tail */ }

Move = num:Number? _ san:SAN nags:(_ NAG)* comments:(_ Comment)*
  { return { ...san, ...(num && { number: num }), ... } }

RAV = "(" _ moves:Moves _ ")" { return moves }
```

## Data Flow

```
parse(input)
  → trim whitespace
  → peggyParser.parse(input) → PGN[]
  → on failure: catch → return []
```

The per-game split logic is removed. Peggy receives the full trimmed input. The
ambiguity check (`parser.results.length > 1`) is also removed — PEG grammars are
unambiguous by construction.

The per-game split will be reintroduced only if benchmarks or tests demonstrate
it is necessary.

## Error Handling

Peggy throws a `peg$SyntaxError` on parse failure. The existing `try/catch` in
`parse()` silences all errors and returns `[]` — no change in behaviour.

## Dependencies

| Package          | Change                                                                         |
| ---------------- | ------------------------------------------------------------------------------ |
| `nearley`        | Remove from `dependencies`                                                     |
| `moo`            | Remove from `dependencies`                                                     |
| `@types/nearley` | Remove from `devDependencies`                                                  |
| `@types/moo`     | Remove from `devDependencies`                                                  |
| `peggy`          | Add to `devDependencies` (no runtime dep — generated parser is self-contained) |

## Testing & Migration Order

1. Add `peggy` to `devDependencies`; remove `nearley`, `moo`, `@types/nearley`,
   `@types/moo`
2. Write `src/grammar.pegjs` — translate rules and semantic actions from
   `grammar.ne` + `lexer.ts`
3. Update `grammar:compile` script to use `peggy`
4. Simplify `src/index.ts` — remove split, remove nearley `Parser`/`Grammar`,
   wire up Peggy parser
5. Delete `src/lexer.ts`
6. Run `pnpm test` — fix any snapshot diffs
7. Run `pnpm bench` — update `BENCHMARK_RESULTS.md`

The 13 snapshot tests in `index.spec.ts` are the correctness gate. The public
API (`parse(input: string): PGN[]`) and all TypeScript types are unchanged —
this is a drop-in replacement from a consumer's perspective.
