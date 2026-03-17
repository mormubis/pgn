# Design: Replace `tsc` Build with `tsdown`

Date: 2026-03-17 Status: Approved

## Problem

The published package is ~250KB, of which ~188KB is `dist/grammar.cjs` (104KB)
and `dist/grammar.cjs.map` (84KB). The generated Peggy parser dominates the
package size and its source map provides no value to consumers.

## Goal

Reduce published package size significantly by replacing `tsc` as the build tool
with `tsdown`, which bundles all source into a single `dist/index.js`, inlines
and minifies `grammar.cjs`, and generates a single source map covering only the
hand-written TypeScript code.

## Approach

Replace `pnpm run build:entry` (`tsc --project tsconfig.build.json`) with
`tsdown`. The grammar compilation step (`peggy`) is unchanged — it still runs
first and produces `src/grammar.cjs`. tsdown then bundles everything starting
from `src/index.ts`.

## tsdown Configuration (`tsdown.config.ts`)

```typescript
import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: true, // generate dist/index.d.ts (replaces tsc declaration output)
  entry: ['src/index.ts'],
  format: 'esm', // ESM-only, matching current package
  minify: true, // shrinks inlined grammar significantly
  platform: 'neutral', // works in Node.js and browsers
  sourcemap: true, // generates dist/index.js.map for hand-written code only
  // grammar is inlined — no separate grammar.cjs.map
});
```

## Changes to `package.json`

- Add `tsdown` to `devDependencies`
- Replace `"build:entry": "tsc --project tsconfig.build.json"` with
  `"build:entry": "tsdown"`
- `exports`, `main`, `types` fields stay unchanged — `dist/index.js` and
  `dist/index.d.ts` paths are the same

## Files to Remove

- `tsconfig.build.json` — no longer needed (tsdown reads `tsconfig.json`
  directly for type information)

## Expected Output

| File                   | Before     | After                                 |
| ---------------------- | ---------- | ------------------------------------- |
| `dist/grammar.cjs`     | 104KB      | gone (inlined)                        |
| `dist/grammar.cjs.map` | 84KB       | gone                                  |
| `dist/index.js`        | ~4KB       | ~35-45KB (inlined + minified grammar) |
| `dist/index.js.map`    | ~4KB       | ~15-20KB                              |
| `dist/index.d.ts`      | ~4KB       | ~4KB (unchanged)                      |
| **Total**              | **~250KB** | **~55-70KB**                          |

## What Stays the Same

- Public API — `import parse, { stringify, stream } from '@echecs/pgn'`
- `exports` field in `package.json`
- Grammar compilation — `pnpm grammar:compile` still runs first
- Tests — `pnpm test` unchanged (vitest imports from `src/`, not `dist/`)
- `prepare` script — still `pnpm run build`
- `tsconfig.json` — still used for `lint:types` and type checking

## Testing the Build

After implementation, verify:

1. `pnpm build` succeeds
2. `dist/index.js` exists and is minified
3. `dist/index.d.ts` exists with correct type exports
4. `dist/grammar.cjs.map` does not exist
5. Published size: `npm pack --dry-run` shows significant reduction
6. All 179 tests still pass (`pnpm test` uses `src/` directly, unaffected)
7. Smoke test: the built `dist/index.js` can be imported and `parse()` works
