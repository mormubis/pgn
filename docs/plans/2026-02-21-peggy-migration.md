# Peggy Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Replace the nearley + moo parser stack with Peggy, achieving O(n)
parsing time while preserving the public API and all 13 snapshot tests.

**Architecture:** `src/grammar.pegjs` compiles via `peggy --format commonjs` to
`src/grammar.cjs` (same gitignored output as today). `src/index.ts` is
simplified — no split, no nearley Parser/Grammar, just a direct call to the
generated Peggy parser. `src/lexer.ts` is deleted.

**Tech Stack:** [peggy v5](https://peggyjs.org), TypeScript, vitest

---

### Task 1: Update dependencies

**Files:**

- Modify: `package.json`

**Step 1: Install peggy, remove nearley/moo**

```bash
pnpm add -D peggy
pnpm remove nearley moo @types/nearley @types/moo
```

**Step 2: Verify package.json**

Check that `package.json` `dependencies` no longer contains `nearley` or `moo`,
and `devDependencies` contains `peggy`.

**Step 3: Update grammar:compile script in package.json**

Change:

```json
"grammar:compile": "nearleyc src/grammar.ne -o src/grammar.cjs",
```

To:

```json
"grammar:compile": "peggy --format commonjs -o src/grammar.cjs src/grammar.pegjs",
```

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: replace nearley/moo with peggy"
```

---

### Task 2: Write src/grammar.pegjs

**Files:**

- Create: `src/grammar.pegjs`
- Delete: `src/grammar.ne`
- Delete: `src/lexer.ts`

This is the core task. The Peggy grammar must produce output identical to the
current nearley grammar for all 13 fixtures.

**Reference — current nearley rules and their Peggy equivalents:**

The semantic helper functions from `grammar.ne` move into a `{{ }}` global
initializer. The lexer logic from `lexer.ts` is inlined as Peggy rules.

**Step 1: Create src/grammar.pegjs**

```pegjs
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

SAN
  = s:$(([KQBNPR]? [a-h]? [1-8]? "x"? [a-h] [1-8] / "O-O-O" / "O-O") ("=" [NBRQ])? [+#]?)
  {
    if (s === 'O-O' || s === 'O-O-O') {
      return { castling: true, long: s === 'O-O-O', piece: 'K', to: s };
    }
    const m = s.match(
      /^(?<piece>[KQBNPR])?(?<from>[a-h]|[1-8]|[a-h][1-8])?(?<capture>x)?(?<to>[a-h][1-8])(?:=(?<promotion>[NBRQ]))?(?<indication>[+#])?$/
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
  / "□" / "∞" / "⩲" / "⩱" / "±" / "∓"
  / "+ −" / "− +" / "⨀" / "○" / "⟳"
  / "↑" / "→" / "⯹" / "⇆" / "⨁" / "="

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
```

**Step 2: Compile the grammar**

```bash
pnpm grammar:compile
```

Expected: `src/grammar.cjs` is generated with no errors.

**Step 3: Smoke test manually**

```bash
echo '[White "A"][Black "B"][Result "1-0"] 1. e4 e5 1-0' | node --input-type=module -e "
import parse from './src/index.ts';
import {readFileSync} from 'fs';
// quick sanity — not wiring stdin, just parse inline
console.log(JSON.stringify(parse('[White \"A\"][Black \"B\"][Result \"1-0\"] 1. e4 e5 1-0')));
"
```

Do not commit yet — `src/index.ts` still uses nearley. Move to Task 3 first.

---

### Task 3: Rewrite src/index.ts

**Files:**

- Modify: `src/index.ts`

Replace the nearley `Parser`/`Grammar` wiring and per-game split with a direct
Peggy `parser.parse()` call.

**Step 1: Replace src/index.ts**

```typescript
// @ts-expect-error Generated CJS module has no types
import parser from './grammar.cjs';

type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
type Piece = 'B' | 'K' | 'N' | 'P' | 'Q' | 'R';
type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
type Result = '1-0' | '0-1' | '1/2-1/2' | '?';

type Square = `${File}${Rank}`;

interface Meta {
  Result: Result;
  [key: string]: string;
}

interface Move {
  annotations?: string[];
  capture?: boolean;
  castling?: boolean;
  check?: boolean;
  checkmate?: boolean;
  comment?: string;
  from?: File | Rank;
  piece: Piece;
  promotion?: Piece;
  to: Square;
  variants?: Variation;
}

type Moves = [number, Move] | [number, Move, Move];

interface PGN {
  meta: Meta;
  moves: Moves;
  result: Result;
}

type Variation = Moves[] | [[number, undefined, Move], ...Moves][];

/**
 * Parse a PGN string into an array of games
 *
 * @param input
 */
export default function parse(input: string): PGN[] {
  const cleaned = input.replaceAll(/^\s+|\s+$/g, '');

  try {
    return parser.parse(cleaned) as PGN[];
  } catch {
    return [];
  }
}
```

**Step 2: Verify TypeScript compiles**

```bash
pnpm lint:types
```

Expected: no errors (or only pre-existing errors unrelated to index.ts).

---

### Task 4: Delete legacy files

**Files:**

- Delete: `src/grammar.ne`
- Delete: `src/lexer.ts`

**Step 1: Delete the files**

```bash
rm src/grammar.ne src/lexer.ts
```

**Step 2: Check nothing else imports them**

```bash
grep -r "grammar\.ne\|lexer" src/ --include="*.ts"
```

Expected: no output (nothing should reference them).

---

### Task 5: Run tests and fix snapshot diffs

**Step 1: Compile grammar and run tests**

```bash
pnpm test
```

**Step 2: If tests fail with snapshot mismatches**

Inspect the diff carefully. Expected diffs:

- NAG output: the old nearley stack leaked raw token objects (with `type`,
  `text`, `offset`, `line`, `col` fields) into annotations. The new grammar
  should output clean string values. If the annotations in the snapshot contain
  those internal fields, update the snapshots — this is a bug fix.
- Any other diff is unexpected and must be investigated before updating.

**Step 3: If snapshots need updating**

```bash
pnpm test -- --update-snapshots
```

Review every changed snapshot file with `git diff` before proceeding.

**Step 4: If tests fail with parse errors (not snapshot mismatches)**

The grammar likely has a rule that doesn't match a fixture. Debug by running the
parser against the failing fixture directly:

```bash
node --input-type=module -e "
import { readFileSync } from 'fs';
import parse from './src/index.ts';
const input = readFileSync('./src/__tests__/grammar/<fixture>.pgn', 'utf8');
console.log(JSON.stringify(parse(input), null, 2));
"
```

Compare output against the corresponding `.snap` file.

**Step 5: All 13 tests must pass**

```bash
pnpm test
```

Expected output: `13 passed`.

---

### Task 6: Commit

```bash
git add src/grammar.pegjs src/index.ts package.json pnpm-lock.yaml
git add src/__tests__/__snapshots__/  # if snapshots updated
git rm src/grammar.ne src/lexer.ts
git commit -m "feat: replace nearley/moo with peggy for O(n) parsing"
```

---

### Task 7: Run benchmarks and update results

**Step 1: Run benchmarks**

```bash
pnpm bench
```

This takes several minutes — `long.pgn` alone runs for ~60s.

**Step 2: Update BENCHMARK_RESULTS.md**

Replace all numbers in `BENCHMARK_RESULTS.md` with the new results. Update the
date, summary table, and key findings section to reflect the new performance
characteristics.

**Step 3: Commit**

```bash
git add BENCHMARK_RESULTS.md
git commit -m "docs: update benchmark results after peggy migration"
```

---

### Task 8: Final lint and build check

**Step 1: Run full lint**

```bash
pnpm lint:ci
```

**Step 2: Run build**

```bash
pnpm build
```

Expected: `dist/` is generated with no errors.

**Step 3: If lint errors exist**

Fix them. Common issues after this migration:

- `@ts-expect-error` directives that are now unused (remove them)
- Import order violations in `index.ts`
- `sort-keys` violations in new grammar helper objects

---

## Notes

- `src/grammar.cjs` is gitignored — never commit it
- The `result` field in the `single.pgn` snapshot shows `1` (not `"0-1"`) —
  `mapResult` converts to numeric, this is intentional
- The `"?"` result for `*` stays as the string `"?"` — also intentional
- Castling `to` squares: white kingside=`g1`, queenside=`c1`; black
  kingside=`g8`, queenside=`c8`
- The `variants` snapshot has `undefined` as the second element of some pairs
  (e.g. `[3, undefined, { piece: 'N', ... }]`) — this is correct for black-only
  moves in variations; `pairMoves` must produce this
