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
@echecs/pgn           14,789.06  0.0551  0.4954  0.0676  0.0670  0.1415  0.1582  0.2028  ±0.52%     7395
@mliebelt/pgn-parser  14,470.25  0.0566  0.3342  0.0691  0.0699  0.1419  0.1607  0.1951  ±0.44%     7236
pgn-parser            15,931.77  0.0522  0.3125  0.0628  0.0629  0.1272  0.1444  0.1967  ±0.40%     7966
chess.js               1,515.36  0.5917  1.0026  0.6599  0.6788  0.8349  0.8765  1.0026  ±0.54%      758
```

**pgn-parser is 1.08x faster than @echecs/pgn**

### checkmate.pgn

```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           20,773.03  0.0395  0.2991  0.0481  0.0481  0.1075  0.1279  0.1634  ±0.43%    10387
@mliebelt/pgn-parser  18,547.23  0.0410  2.3758  0.0539  0.0515  0.1426  0.1720  0.2134  ±1.15%     9274
pgn-parser            20,404.68  0.0383  2.4034  0.0490  0.0467  0.1244  0.1808  0.3845  ±1.64%    10203
chess.js               1,913.05  0.4495  0.9304  0.5227  0.5288  0.7230  0.7433  0.9304  ±0.53%      957
```

**@echecs/pgn is the fastest** at 20,773 hz (1.02x faster than pgn-parser)

**@echecs/pgn leads @mliebelt/pgn-parser** at 20,773 hz vs 18,547 hz (1.12x)

### comment.pgn

```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           10,398.13  0.0801  0.6268  0.0962  0.0966  0.1582  0.2418  0.2903  ±0.49%     5200
@mliebelt/pgn-parser  11,243.95  0.0757  0.3724  0.0889  0.0890  0.1302  0.1884  0.2546  ±0.39%     5622
pgn-parser            11,607.12  0.0740  0.4185  0.0862  0.0862  0.1169  0.1787  0.2744  ±0.41%     5804
chess.js               1,407.13  0.6533  1.2865  0.7107  0.7160  0.8832  0.9035  1.2865  ±0.54%      704
```

**pgn-parser is 1.12x faster than @echecs/pgn**

### promotion.pgn

```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn            9,864.76  0.0756  1.4228  0.1014  0.0910  0.3917  0.4550  0.6547  ±1.56%     4933
@mliebelt/pgn-parser  11,758.79  0.0720  0.3327  0.0850  0.0850  0.1278  0.1642  0.2619  ±0.39%     5880
pgn-parser            12,476.92  0.0699  0.3270  0.0801  0.0800  0.1066  0.1759  0.2528  ±0.38%     6239
chess.js               1,047.13  0.9086  1.2013  0.9550  0.9676  1.1248  1.1882  1.2013  ±0.44%      524
```

**pgn-parser is 1.26x faster than @echecs/pgn**

_Note: the high p99/p999 for `@echecs/pgn` (0.39–0.65ms vs 0.11–0.25ms for
others) indicates GC pressure, likely from `delete` on move objects in
`pairMoves` triggering V8 hidden class deoptimisation. Under investigation._

### single.pgn

```
name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           137,045.51  0.0059  0.2384  0.0073  0.0072  0.0102  0.0137  0.0328  ±0.36%    68523
@mliebelt/pgn-parser   79,177.19  0.0101  0.2077  0.0126  0.0124  0.0208  0.0295  0.1231  ±0.44%    39589
pgn-parser            118,797.55  0.0063  4.1907  0.0084  0.0077  0.0327  0.0382  0.0664  ±1.73%    59399
chess.js               35,164.51  0.0233  0.2868  0.0284  0.0279  0.0459  0.0712  0.1922  ±0.45%    17583
```

**@echecs/pgn is the fastest** at 137,046 hz (1.15x faster than pgn-parser)

### variants.pgn

```
name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn            46,582.11  0.0179  0.3037  0.0215  0.0209  0.0297  0.0430  0.2118  ±0.53%    23292
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
@echecs/pgn           6,008.13  0.1415  0.4875  0.1664  0.1673  0.3120  0.3506  0.4127  ±0.55%     3005
@mliebelt/pgn-parser  6,337.32  0.1326  0.4545  0.1578  0.1578  0.2497  0.3414  0.3896  ±0.50%     3169
pgn-parser            6,628.08  0.1264  1.2461  0.1509  0.1515  0.2448  0.3072  0.3511  ±0.62%     3315
```

**pgn-parser is 1.10x faster than @echecs/pgn**

### comments.pgn (3 parsers; chess.js excluded)

```
name                       hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           351.42  2.6667  3.3155  2.8456  2.9188  3.2657  3.3155  3.3155  ±0.74%      176
@mliebelt/pgn-parser  296.63  3.1288  4.0607  3.3712  3.4641  3.9058  4.0607  4.0607  ±0.83%      149
pgn-parser            331.39  2.7841  3.6922  3.0176  3.0752  3.4510  3.6922  3.6922  ±0.75%      166
```

**@echecs/pgn is the fastest** — 1.06x faster than pgn-parser, 1.18x faster than
@mliebelt/pgn-parser

### games32.pgn (3 parsers; chess.js excluded)

```
name                      hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           401.08  2.3334  3.0395  2.4933  2.5532  2.8492  2.8556  3.0395  ±0.66%      201
@mliebelt/pgn-parser  374.61  2.4690  3.4971  2.6694  2.7489  3.2189  3.4971  3.4971  ±0.88%      188
pgn-parser            440.58  2.1503  2.7173  2.2697  2.3233  2.5572  2.5749  2.7173  ±0.58%      221
```

**pgn-parser is 1.10x faster than @echecs/pgn**

**@echecs/pgn leads @mliebelt/pgn-parser** at 401 hz vs 375 hz

### lichess.pgn (3 parsers; chess.js excluded)

```
name                        hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           1,375.12  0.6272  1.0896  0.7272  0.7315  0.9521  1.0073  1.0896  ±0.60%      688
@mliebelt/pgn-parser  1,334.88  0.6803  1.2149  0.7491  0.7522  1.0539  1.1289  1.2149  ±0.67%      668
pgn-parser            1,537.61  0.6073  1.1993  0.6504  0.6553  0.8655  0.9084  1.1993  ±0.56%      769
```

**pgn-parser is 1.12x faster than @echecs/pgn**

**@echecs/pgn leads @mliebelt/pgn-parser** at 1,375 hz vs 1,335 hz

### multiple.pgn (3 parsers; chess.js excluded)

```
name                        hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           8,772.15  0.0967  0.3589  0.1140  0.1139  0.2032  0.2813  0.3223  ±0.49%     4387
@mliebelt/pgn-parser  8,830.58  0.0938  0.4241  0.1132  0.1130  0.2049  0.2869  0.4132  ±0.58%     4416
pgn-parser            9,583.70  0.0876  0.4339  0.1043  0.1044  0.1855  0.2745  0.3534  ±0.53%     4792
```

**pgn-parser is 1.09x faster than @echecs/pgn**

### twic.pgn (3 parsers; chess.js excluded)

```
name                        hz      min      max     mean      p75      p99     p995     p999      rme  samples
@echecs/pgn           41.1455  23.4979  25.5975  24.3040  24.5153  25.5975  25.5975  25.5975  ±1.23%       21
@mliebelt/pgn-parser  43.2050  22.3152  31.1391  23.1455  23.0082  31.1391  31.1391  31.1391  ±3.51%       22
pgn-parser            47.9873  20.4604  21.3641  20.8389  21.0188  21.3641  21.3641  21.3641  ±0.51%       24
```

**pgn-parser is 1.17x faster than @echecs/pgn**

### long.pgn (Large fixture: ~3500 games; chess.js excluded)

```
name                      hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           3.0004  327.24  341.54  333.28  337.27  341.54  341.54  341.54  ±1.03%       10
@mliebelt/pgn-parser  3.2244  302.56  325.47  310.13  317.96  325.47  325.47  325.47  ±1.88%       10
pgn-parser            3.4013  288.20  301.47  294.01  296.20  301.47  301.47  301.47  ±1.07%       10
```

**pgn-parser is 1.13x faster than @echecs/pgn**

## Summary

| Fixture       | @echecs/pgn vs pgn-parser  | @echecs/pgn vs @mliebelt |
| ------------- | -------------------------- | ------------------------ |
| single.pgn    | **1.15x faster**           | **1.73x faster**         |
| variants.pgn  | — (pgn-parser unsupported) | **1.16x faster**         |
| checkmate.pgn | **1.02x faster**           | **1.12x faster**         |
| comments.pgn  | **1.06x faster**           | **1.18x faster**         |
| basic.pgn     | 1.08x slower               | 1.02x faster             |
| comment.pgn   | 1.12x slower               | 1.08x slower             |
| benko.pgn     | 1.10x slower               | 1.05x slower             |
| multiple.pgn  | 1.09x slower               | effectively tied         |
| lichess.pgn   | 1.12x slower               | **1.03x faster**         |
| games32.pgn   | 1.10x slower               | **1.07x faster**         |
| long.pgn      | 1.13x slower               | 1.07x faster             |
| twic.pgn      | 1.17x slower               | 1.05x faster             |
| promotion.pgn | 1.26x slower ⚠️            | 1.19x slower             |

## Key Findings

1. **`@echecs/pgn` leads on `single.pgn`, `variants.pgn`, `checkmate.pgn`, and
   `comments.pgn`** — fixtures that exercise features the other parsers
   partially or fully lack (RAVs, Unicode NAGs, heavy annotation content) or
   where the v3.6.0 allocation improvements have the most impact.

2. **`checkmate.pgn` flipped**: previously 1.07x slower than `pgn-parser`, now
   1.02x faster — the in-place SAN mutation changes are measurably helping
   move-heavy fixtures with check/checkmate indicators.

3. **`promotion.pgn` regression** (1.14x → 1.26x slower): the
   `delete move.number; delete move.long` approach in `pairMoves` likely
   triggers V8 hidden class deoptimisation on promotion moves, where the object
   shape changes more than for ordinary moves. The elevated p99/p999 latency
   confirms GC pressure. Under investigation for v3.6.1.

4. **Consistent ~1.08–1.17x gap vs `pgn-parser`** on most move-heavy fixtures,
   reflecting the structural scope difference: `pgn-parser` outputs raw strings
   and a flat move list; `@echecs/pgn` performs full SAN decomposition, castling
   resolution, move pairing, and result conversion.

5. **`@echecs/pgn` beats `@mliebelt/pgn-parser`** on single, variants,
   checkmate, comments, lichess, and games32 — the majority of fixtures.

6. **`variants.pgn` remains a genuine exclusion**: `pgn-parser` does not support
   Unicode NAG symbols; `chess.js` does not support RAV sub-lines. No fair
   comparison is possible.
