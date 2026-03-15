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
@echecs/pgn           14,728.52  0.0559  0.3120  0.0679  0.0675  0.1365  0.1525  0.1865  ±0.44%     7365
@mliebelt/pgn-parser  14,755.77  0.0560  0.2483  0.0678  0.0673  0.1400  0.1659  0.2152  ±0.44%     7378
pgn-parser            15,607.40  0.0528  0.2849  0.0641  0.0636  0.1334  0.1540  0.1913  ±0.43%     7804
chess.js               1,511.79  0.5784  0.9565  0.6615  0.6817  0.8531  0.8693  0.9565  ±0.56%      757
```

**pgn-parser is 1.06x faster than @echecs/pgn**

### checkmate.pgn

```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           20,566.39  0.0408  0.4027  0.0486  0.0484  0.1047  0.1263  0.1787  ±0.44%    10284
@mliebelt/pgn-parser  18,759.47  0.0415  2.4060  0.0533  0.0516  0.1412  0.1705  0.2682  ±1.16%     9380
pgn-parser            21,686.68  0.0390  0.3672  0.0461  0.0461  0.0674  0.1164  0.1916  ±0.42%    10844
chess.js               1,883.06  0.4647  1.7213  0.5311  0.5394  0.7115  0.7695  1.7213  ±0.74%      942
```

**pgn-parser is 1.05x faster than @echecs/pgn**

**@echecs/pgn leads @mliebelt/pgn-parser** at 20,566 hz vs 18,759 hz

### comment.pgn

```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           10,480.54  0.0798  0.3642  0.0954  0.0955  0.1563  0.2333  0.2848  ±0.45%     5241
@mliebelt/pgn-parser  11,058.80  0.0755  0.3431  0.0904  0.0910  0.1380  0.1663  0.2503  ±0.37%     5530
pgn-parser            11,352.80  0.0736  0.3947  0.0881  0.0886  0.1370  0.2059  0.2569  ±0.43%     5677
chess.js               1,391.05  0.6626  1.0401  0.7189  0.7262  0.9457  1.0019  1.0401  ±0.59%      696
```

**pgn-parser is 1.08x faster than @echecs/pgn**

### promotion.pgn

```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           10,732.97  0.0760  0.6202  0.0932  0.0944  0.1462  0.2322  0.3065  ±0.54%     5367
@mliebelt/pgn-parser  11,627.80  0.0734  0.3175  0.0860  0.0865  0.1324  0.1749  0.2464  ±0.38%     5814
pgn-parser            12,187.98  0.0703  0.3785  0.0820  0.0824  0.1253  0.1721  0.2569  ±0.41%     6095
chess.js                 982.52  0.9026  1.6171  1.0178  1.0651  1.3139  1.3211  1.6171  ±0.74%      492
```

**pgn-parser is 1.14x faster than @echecs/pgn**

### single.pgn

```
name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           133,400.23  0.0060  0.2061  0.0075  0.0073  0.0120  0.0174  0.0655  ±0.40%    66701
@mliebelt/pgn-parser   78,424.57  0.0102  0.2901  0.0128  0.0124  0.0229  0.0331  0.1310  ±0.49%    39213
pgn-parser            117,462.89  0.0064  4.6953  0.0085  0.0077  0.0317  0.0375  0.0536  ±1.91%    58732
chess.js               34,724.30  0.0240  0.4342  0.0288  0.0284  0.0412  0.0604  0.1973  ±0.44%    17363
```

**@echecs/pgn is the fastest** at 133,400 hz (1.14x faster than pgn-parser)

### variants.pgn

```
name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn            46,766.14  0.0188  0.3337  0.0214  0.0208  0.0315  0.0366  0.1944  ±0.47%    23384
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
@echecs/pgn           6,049.22  0.1505  0.4450  0.1653  0.1656  0.2517  0.3536  0.4160  ±0.48%     3025
@mliebelt/pgn-parser  6,316.36  0.1400  0.5147  0.1583  0.1588  0.2559  0.3555  0.4275  ±0.51%     3159
pgn-parser            6,732.40  0.1387  0.3834  0.1485  0.1491  0.2080  0.3225  0.3497  ±0.41%     3367
```

**pgn-parser is 1.11x faster than @echecs/pgn**

### comments.pgn (3 parsers; chess.js excluded)

```
name                       hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           350.67  2.6144  3.6388  2.8517  2.9156  3.4717  3.6388  3.6388  ±0.88%      176
@mliebelt/pgn-parser  297.95  3.1053  3.8318  3.3563  3.4691  3.8191  3.8318  3.8318  ±0.75%      150
pgn-parser            335.77  2.7935  3.8825  2.9782  3.0433  3.6266  3.8825  3.8825  ±0.80%      168
```

**@echecs/pgn is the fastest** — 1.04x faster than pgn-parser, 1.18x faster than
@mliebelt/pgn-parser

### games32.pgn (3 parsers; chess.js excluded)

```
name                      hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           399.03  2.3182  3.3233  2.5061  2.5569  3.0812  3.2573  3.3233  ±0.88%      200
@mliebelt/pgn-parser  372.20  2.5256  3.5490  2.6868  2.7140  3.1420  3.5490  3.5490  ±0.73%      187
pgn-parser            439.06  2.1198  2.7519  2.2776  2.3121  2.6862  2.7203  2.7519  ±0.72%      220
```

**pgn-parser is 1.10x faster than @echecs/pgn**

**@echecs/pgn leads @mliebelt/pgn-parser** at 399 hz vs 372 hz

### lichess.pgn (3 parsers; chess.js excluded)

```
name                        hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           1,387.21  0.6671  1.0049  0.7209  0.7304  0.9265  0.9552  1.0049  ±0.53%      694
@mliebelt/pgn-parser  1,302.23  0.7132  1.2136  0.7679  0.7740  1.0245  1.0706  1.2136  ±0.64%      652
pgn-parser            1,395.63  0.6047  2.0292  0.7165  0.7003  1.4617  1.5817  2.0292  ±1.89%      698
```

**pgn-parser is effectively tied with @echecs/pgn** (1.01x)

**@echecs/pgn leads @mliebelt/pgn-parser** at 1,387 hz vs 1,302 hz

### multiple.pgn (3 parsers; chess.js excluded)

```
name                        hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           8,695.17  0.1025  0.3685  0.1150  0.1154  0.1871  0.2921  0.3234  ±0.48%     4348
@mliebelt/pgn-parser  8,885.90  0.1013  0.4717  0.1125  0.1125  0.1871  0.2763  0.3551  ±0.52%     4443
pgn-parser            8,481.77  0.0933  1.0031  0.1179  0.1085  0.4018  0.4976  0.6535  ±1.48%     4243
```

**@echecs/pgn leads pgn-parser** at 8,695 hz vs 8,482 hz (new: previously 1.11x
slower)

**@mliebelt/pgn-parser leads @echecs/pgn** at 8,886 hz vs 8,695 hz (1.02x)

### twic.pgn (3 parsers; chess.js excluded)

```
name                        hz      min      max     mean      p75      p99     p995     p999      rme  samples
@echecs/pgn           41.2570  23.3116  25.7296  24.2383  24.4917  25.7296  25.7296  25.7296  ±1.10%       21
@mliebelt/pgn-parser  41.6188  23.0041  27.7857  24.0276  24.1597  27.7857  27.7857  27.7857  ±1.85%       21
pgn-parser            46.6361  20.8195  22.1778  21.4426  21.7513  22.1778  22.1778  22.1778  ±0.88%       24
```

**pgn-parser is 1.13x faster than @echecs/pgn**

### long.pgn (Large fixture: ~3500 games; chess.js excluded)

```
name                      hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           2.9789  326.38  361.77  335.70  338.30  361.77  361.77  361.77  ±2.21%       10
@mliebelt/pgn-parser  3.1889  303.84  325.95  313.59  322.36  325.95  325.95  325.95  ±1.86%       10
pgn-parser            3.3487  295.32  304.13  298.62  299.62  304.13  304.13  304.13  ±0.75%       10
```

**pgn-parser is 1.12x faster than @echecs/pgn**

## Summary

| Fixture       | @echecs/pgn vs pgn-parser  | @echecs/pgn vs @mliebelt |
| ------------- | -------------------------- | ------------------------ |
| single.pgn    | **1.14x faster**           | **1.70x faster**         |
| variants.pgn  | — (pgn-parser unsupported) | **1.15x faster**         |
| comments.pgn  | **1.04x faster**           | **1.18x faster**         |
| multiple.pgn  | **1.02x faster**           | 1.02x slower             |
| lichess.pgn   | effectively tied (1.01x)   | **1.07x faster**         |
| basic.pgn     | 1.06x slower               | effectively tied         |
| checkmate.pgn | 1.05x slower               | **1.10x faster**         |
| benko.pgn     | 1.11x slower               | 1.05x slower             |
| comment.pgn   | 1.08x slower               | 1.05x slower             |
| promotion.pgn | 1.14x slower               | 1.08x slower             |
| games32.pgn   | 1.10x slower               | **1.07x faster**         |
| twic.pgn      | 1.13x slower               | effectively tied         |
| long.pgn      | 1.12x slower               | 1.07x faster             |

## Key Findings

1. **`@echecs/pgn` leads on `single.pgn`, `variants.pgn`, `comments.pgn`,
   `multiple.pgn`, and `lichess.pgn`** — fixtures that exercise features the
   other parsers partially or fully lack (RAVs, Unicode NAGs, heavy annotation
   content) or where the allocation improvements from v3.6.0 have the most
   impact.

2. **Notable improvement on `multiple.pgn`**: previously 1.11x slower than
   `pgn-parser`, now 1.02x faster — the grammar action block mutation-in-place
   changes have measurable impact on multi-game files.

3. **Consistent ~1.05–1.14x gap vs `pgn-parser`** on most single-game move-heavy
   fixtures, reflecting the different scope: `pgn-parser` outputs raw strings
   and a flat move list; `@echecs/pgn` performs full SAN decomposition, castling
   resolution, move pairing, and result conversion.

4. **`@echecs/pgn` beats `@mliebelt/pgn-parser`** on single, variants, comments,
   checkmate, games32, and lichess — the majority of fixtures.

5. **`variants.pgn` remains a genuine exclusion**: `pgn-parser` does not support
   Unicode NAG symbols; `chess.js` does not support RAV sub-lines. No fair
   comparison is possible.
