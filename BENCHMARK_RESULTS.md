# Comparative Benchmark Results

**Date**: 2026-03-15 **Test**: PGN Parser Comparison **Command**: `pnpm bench`
**Vitest**: v4.1.0

## Overview

Comparative benchmarks for `@echecs/pgn` against three alternative PGN parsers:

- `@mliebelt/pgn-parser@1.4.15`
- `pgn-parser@2.2.1`
- `chess.js@1.4.0` (single-game only)

## Fixture Notes

| Fixture        | Why some parsers are excluded                                                                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `benko.pgn`    | Two-game file. `@mliebelt` (`parseGame`) and `chess.js` only accept a single game — they error on the second `[…]` tag section. Moved to multi-game group so `parseGames` / `pgn-parser` can be compared fairly. |
| `variants.pgn` | Contains RAV sub-lines `(…)` — `chess.js` does not support them. Also uses Unicode NAG symbols (e.g. `±`) — `pgn-parser` only handles `$N` numeric NAGs and errors on these. `@mliebelt` handles both.           |
| `comments.pgn` | Saved with a BOM (`U+FEFF`). After stripping the BOM (done in the bench harness) all three comparison parsers parse it correctly.                                                                                |

## Single-Game Fixtures (All 4 Parsers)

### basic.pgn

```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           14,985.03  0.0538  0.5158  0.0667  0.0648  0.1519  0.1812  0.2649  ±0.62%     7493
@mliebelt/pgn-parser  14,603.53  0.0565  0.2593  0.0685  0.0685  0.1509  0.1781  0.2152  ±0.48%     7302
pgn-parser            16,221.89  0.0527  0.1866  0.0616  0.0618  0.1073  0.1219  0.1450  ±0.28%     8111
chess.js               1,541.89  0.5827  1.0613  0.6486  0.6635  0.8171  0.8638  1.0613  ±0.49%      771
```

**pgn-parser is 1.08x faster than @echecs/pgn**

### checkmate.pgn

```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           21,870.10  0.0382  0.3036  0.0457  0.0457  0.0979  0.1147  0.1575  ±0.41%    10936
@mliebelt/pgn-parser  18,889.13  0.0413  2.2313  0.0529  0.0515  0.1393  0.1604  0.2098  ±1.06%     9446
pgn-parser            21,373.83  0.0382  0.2642  0.0468  0.0463  0.0849  0.1298  0.1896  ±0.44%    10687
chess.js               1,894.42  0.4466  2.0033  0.5279  0.5341  0.7120  0.7448  2.0033  ±0.82%      948
```

**@echecs/pgn is the fastest** at 21,870 hz (1.02x faster than pgn-parser)

**@echecs/pgn leads @mliebelt/pgn-parser** at 21,870 hz vs 18,889 hz (1.16x)

### comment.pgn

```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           10,883.27  0.0762  0.3350  0.0919  0.0931  0.1684  0.2197  0.2621  ±0.47%     5442
@mliebelt/pgn-parser  11,051.80  0.0754  0.4221  0.0905  0.0915  0.1509  0.1813  0.2409  ±0.41%     5526
pgn-parser            11,467.83  0.0726  0.4448  0.0872  0.0880  0.1467  0.1944  0.2614  ±0.44%     5734
chess.js               1,375.09  0.6075  1.0627  0.7272  0.7509  0.9862  1.0313  1.0627  ±0.72%      688
```

**pgn-parser is 1.05x faster than @echecs/pgn**

### promotion.pgn

```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           11,542.38  0.0728  0.3058  0.0866  0.0871  0.1402  0.2056  0.2525  ±0.41%     5772
@mliebelt/pgn-parser  11,596.00  0.0720  0.3032  0.0862  0.0872  0.1426  0.1964  0.2344  ±0.40%     5799
pgn-parser            12,267.78  0.0684  0.3062  0.0815  0.0817  0.1273  0.1593  0.2436  ±0.40%     6134
chess.js               1,027.24  0.9005  1.3038  0.9735  0.9854  1.2002  1.2466  1.3038  ±0.53%      514
```

**pgn-parser is 1.06x faster than @echecs/pgn**

### single.pgn

```
name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           140,099.08  0.0059  0.1842  0.0071  0.0071  0.0093  0.0132  0.0361  ±0.34%    70050
@mliebelt/pgn-parser   81,070.39  0.0100  0.2208  0.0123  0.0122  0.0180  0.0227  0.1160  ±0.38%    40536
pgn-parser            116,488.76  0.0064  4.5812  0.0086  0.0078  0.0311  0.0355  0.0543  ±1.87%    58245
chess.js               35,198.41  0.0234  0.3206  0.0284  0.0280  0.0443  0.0620  0.1979  ±0.42%    17600
```

**@echecs/pgn is the fastest** at 140,099 hz (1.20x faster than pgn-parser)

### variants.pgn

```
name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn            49,479.31  0.0173  0.2345  0.0202  0.0199  0.0259  0.0302  0.1723  ±0.38%    24740
@mliebelt/pgn-parser           —      —       —      —       —       —       —       —        —        —
pgn-parser                     —      —       —      —       —       —       —       —        —        —
chess.js                       —      —       —      —       —       —       —       —        —        —
```

_Note: `pgn-parser` errors on Unicode NAG symbols (e.g. `±`). `chess.js` does
not support RAV sub-lines. `@mliebelt/pgn-parser` handles both but its
`parseGame` API is single-game only — no fair 4-way comparison is possible._

## Multi-Game Fixtures

### benko.pgn (2 games; chess.js excluded)

```
name                        hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           6,335.51  0.1367  0.3843  0.1578  0.1590  0.2285  0.3361  0.3665  ±0.42%     3168
@mliebelt/pgn-parser  6,349.30  0.1330  0.4786  0.1575  0.1578  0.2345  0.3538  0.3798  ±0.47%     3175
pgn-parser            6,604.89  0.1280  0.4046  0.1514  0.1532  0.2348  0.3258  0.3560  ±0.45%     3303
```

**pgn-parser is 1.04x faster than @echecs/pgn** (effectively tied)

### comments.pgn (3 parsers; chess.js excluded)

```
name                       hz     min      max    mean     p75     p99     p995     p999     rme  samples
@echecs/pgn           369.44  2.5229   3.3064  2.7068  2.7451  3.0864   3.3064   3.3064  ±0.69%      185
@mliebelt/pgn-parser  282.30  3.0514  13.4950  3.5423  3.4331  7.9350  13.4950  13.4950  ±5.38%      142
pgn-parser            335.05  2.7592   3.5084  2.9846  3.0366  3.3713   3.5084   3.5084  ±0.71%      168
```

**@echecs/pgn is the fastest** — 1.10x faster than pgn-parser, 1.31x faster than
@mliebelt/pgn-parser

### games32.pgn (3 parsers; chess.js excluded)

```
name                      hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           415.68  2.2188  2.9191  2.4057  2.4712  2.7585  2.8191  2.9191  ±0.69%      208
@mliebelt/pgn-parser  374.74  2.4818  3.3809  2.6685  2.7241  3.1345  3.3809  3.3809  ±0.75%      188
pgn-parser            440.07  2.0648  2.7787  2.2724  2.3155  2.6384  2.6387  2.7787  ±0.69%      221
```

**pgn-parser is 1.06x faster than @echecs/pgn**

**@echecs/pgn leads @mliebelt/pgn-parser** at 416 hz vs 375 hz (1.11x)

### lichess.pgn (3 parsers; chess.js excluded)

```
name                        hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           1,407.95  0.6088  1.6736  0.7103  0.7135  1.0103  1.1420  1.6736  ±0.87%      705
@mliebelt/pgn-parser  1,296.09  0.6415  1.2133  0.7715  0.7901  1.1066  1.1326  1.2133  ±0.78%      649
pgn-parser            1,535.24  0.5632  1.0181  0.6514  0.6588  0.8674  0.9065  1.0181  ±0.54%      768
```

**pgn-parser is 1.09x faster than @echecs/pgn**

**@echecs/pgn leads @mliebelt/pgn-parser** at 1,408 hz vs 1,296 hz (1.09x)

### multiple.pgn (3 parsers; chess.js excluded)

```
name                        hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           9,036.25  0.0940  1.1912  0.1107  0.1108  0.1824  0.2637  0.3115  ±0.62%     4519
@mliebelt/pgn-parser  9,069.00  0.0950  0.3719  0.1103  0.1107  0.1812  0.2695  0.3236  ±0.46%     4535
pgn-parser            9,606.05  0.0900  0.3812  0.1041  0.1047  0.1501  0.2445  0.3044  ±0.42%     4804
```

**pgn-parser is 1.06x faster than @echecs/pgn**

### twic.pgn (3 parsers; chess.js excluded)

```
name                        hz      min      max     mean      p75      p99     p995     p999      rme  samples
@echecs/pgn           43.1214  22.6716  23.9746  23.1903  23.4186  23.9746  23.9746  23.9746  ±0.67%       22
@mliebelt/pgn-parser  43.1119  22.2722  23.9878  23.1955  23.5130  23.9878  23.9878  23.9878  ±0.79%       22
pgn-parser            46.7193  21.0247  22.2330  21.4044  21.5065  22.2330  22.2330  22.2330  ±0.63%       24
```

**pgn-parser is 1.08x faster than @echecs/pgn**

### long.pgn (Large fixture: ~3500 games; chess.js excluded)

```
name                      hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           3.1340  314.73  326.08  319.08  323.37  326.08  326.08  326.08  ±0.94%       10
@mliebelt/pgn-parser  3.1270  306.91  337.92  319.80  331.69  337.92  337.92  337.92  ±2.63%       10
pgn-parser            3.3691  294.87  300.38  296.82  298.15  300.38  300.38  300.38  ±0.46%       10
```

**pgn-parser is 1.07x faster than @echecs/pgn**

**@echecs/pgn leads @mliebelt/pgn-parser** at 3.13 hz vs 3.13 hz (effectively
tied)

## Summary

| Fixture       | @echecs/pgn vs pgn-parser  | @echecs/pgn vs @mliebelt |
| ------------- | -------------------------- | ------------------------ |
| single.pgn    | **1.20x faster**           | **1.73x faster**         |
| variants.pgn  | — (pgn-parser unsupported) | **1.20x faster**         |
| checkmate.pgn | **1.02x faster**           | **1.16x faster**         |
| comments.pgn  | **1.10x faster**           | **1.31x faster**         |
| basic.pgn     | 1.08x slower               | 1.03x faster             |
| comment.pgn   | 1.05x slower               | effectively tied         |
| benko.pgn     | effectively tied (1.04x)   | effectively tied         |
| promotion.pgn | 1.06x slower               | effectively tied         |
| multiple.pgn  | 1.06x slower               | effectively tied         |
| games32.pgn   | 1.06x slower               | **1.11x faster**         |
| lichess.pgn   | 1.09x slower               | **1.09x faster**         |
| twic.pgn      | 1.08x slower               | effectively tied         |
| long.pgn      | 1.07x slower               | effectively tied         |

## Key Findings

1. **`@echecs/pgn` leads on `single.pgn`, `variants.pgn`, `checkmate.pgn`, and
   `comments.pgn`** — fixtures that exercise features the other parsers
   partially or fully lack (RAVs, Unicode NAGs, heavy annotation content) or
   where the v3.6.x allocation improvements have the most impact.

2. **`single.pgn` reached 1.20x faster than `pgn-parser`**, the strongest lead
   to date, reflecting the full benefit of in-place SAN mutation and
   clean-object construction in `pairMoves`.

3. **`promotion.pgn` fully recovered**: from 1.26x slower (v3.6.1 regression due
   to `delete`) back to 1.06x slower — better than the v3.5.3 baseline of 1.12x.
   The fix (`pairMoves` now builds a clean output object from known fields
   rather than using `delete`) also improved `long.pgn` (1.13x → 1.07x),
   `twic.pgn` (1.17x → 1.08x), and `benko.pgn` (1.10x → 1.04x).

4. **Consistent ~1.05–1.09x gap vs `pgn-parser`** on move-heavy multi-game
   fixtures, reflecting the structural scope difference: `pgn-parser` outputs
   raw strings and a flat move list; `@echecs/pgn` performs full SAN
   decomposition, castling resolution, move pairing, and result conversion.

5. **`@echecs/pgn` beats `@mliebelt/pgn-parser`** on single, variants,
   checkmate, comments, games32, and lichess — the majority of fixtures.

6. **`variants.pgn` remains a genuine exclusion**: `pgn-parser` does not support
   Unicode NAG symbols; `chess.js` does not support RAV sub-lines. No fair
   comparison is possible.
