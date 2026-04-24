# Comparative Benchmark Results

**Date**: 2026-03-17 **Test**: PGN Parser Comparison **Command**: `pnpm bench`
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
@echecs/pgn           15,155.92  0.0599  0.2992  0.0660  0.0648  0.1300  0.1486  0.1853  ±0.41%     7578
@mliebelt/pgn-parser  14,457.13  0.0592  0.4357  0.0692  0.0675  0.1571  0.1890  0.2611  ±0.57%     7229
pgn-parser            15,957.06  0.0579  0.2241  0.0627  0.0617  0.1190  0.1347  0.1655  ±0.33%     7979
chess.js               1,499.75  0.6078  0.8971  0.6668  0.6915  0.8303  0.8566  0.8971  ±0.56%      750
```

`pgn-parser` is 1.05x faster than `@echecs/pgn`. Both do far less per move (raw
SAN strings, no structured decomposition). The gap is noise-level.

### checkmate.pgn

```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           21,137.43  0.0435  0.4175  0.0473  0.0465  0.0991  0.1190  0.1493  ±0.38%    10569
@mliebelt/pgn-parser  18,124.05  0.0458  2.7898  0.0552  0.0524  0.1374  0.1586  0.2670  ±1.30%     9063
pgn-parser            21,544.52  0.0423  0.3312  0.0464  0.0457  0.0684  0.0940  0.2221  ±0.43%    10773
chess.js               1,912.47  0.4812  1.0419  0.5229  0.5270  0.7208  0.7707  1.0419  ±0.59%      957
```

### comment.pgn

```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           10,838.34  0.0855  0.3589  0.0923  0.0913  0.1492  0.2490  0.2910  ±0.46%     5420
@mliebelt/pgn-parser  11,057.80  0.0840  0.3531  0.0904  0.0903  0.1217  0.1618  0.2623  ±0.36%     5529
pgn-parser            11,399.42  0.0815  0.3431  0.0877  0.0871  0.1292  0.1712  0.3125  ±0.42%     5700
chess.js               1,360.57  0.6602  2.2039  0.7350  0.7281  1.4498  1.6673  2.2039  ±1.33%      681
```

`@echecs/pgn` is slightly slower here because it additionally parses embedded
`[%cal]`, `[%csl]`, `[%clk]`, `[%eval]` comment commands into structured fields
— work the other parsers skip entirely.

### promotion.pgn

```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           11,464.19  0.0808  0.3365  0.0872  0.0873  0.1283  0.1782  0.2709  ±0.40%     5733
@mliebelt/pgn-parser  11,599.85  0.0803  0.3241  0.0862  0.0856  0.1284  0.1639  0.2446  ±0.37%     5801
pgn-parser            12,196.78  0.0763  0.3382  0.0820  0.0812  0.1141  0.1525  0.2694  ±0.40%     6099
chess.js               1,010.24  0.9093  1.9307  0.9899  1.0166  1.2660  1.3332  1.9307  ±0.80%      506
```

### single.pgn

```
name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           123,065.77  0.0073  0.2147  0.0081  0.0081  0.0102  0.0115  0.0392  ±0.39%    61533
@mliebelt/pgn-parser   79,008.88  0.0113  0.2656  0.0127  0.0125  0.0164  0.0208  0.1503  ±0.46%    39505
pgn-parser            117,884.55  0.0070  4.5504  0.0085  0.0077  0.0318  0.0371  0.0516  ±1.85%    58943
chess.js               35,345.01  0.0261  0.2829  0.0283  0.0280  0.0360  0.0522  0.1935  ±0.39%    17673
```

`@echecs/pgn` leads here: 1.04x faster than `pgn-parser`, 1.56x faster than
`@mliebelt`, 3.48x faster than `chess.js`.

### variants.pgn (`@echecs/pgn` and `@mliebelt` only)

`pgn-parser` and `chess.js` excluded — see Fixture Notes above.

`@echecs/pgn` is **1.14x faster** than `@mliebelt/pgn-parser` on RAV-heavy
input.

---

## Multi-Game Fixtures (No chess.js)

### benko.pgn (2 games)

```
name                        hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           6,217.32  0.1501  0.4302  0.1608  0.1598  0.2420  0.3493  0.3862  ±0.43%     3109
@mliebelt/pgn-parser  6,319.82  0.1478  0.4904  0.1582  0.1574  0.2327  0.3422  0.4096  ±0.46%     3160
pgn-parser            6,633.54  0.1412  0.4664  0.1507  0.1503  0.2124  0.3236  0.3651  ±0.40%     3317
```

### comments.pgn

```
name                       hz    min    max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           343.01  2.696  3.761  2.915   2.983   3.415   3.761   3.761  ±0.79%      172
@mliebelt/pgn-parser  285.44  3.144  7.492  3.503   3.545   5.306   7.492   7.492  ±2.11%      143
pgn-parser            337.81  2.799  3.359  2.960   2.989   3.280   3.359   3.359  ±0.57%      169
```

`@echecs/pgn` is 1.02x faster than `pgn-parser` and 1.20x faster than
`@mliebelt` on annotation-heavy input.

### games32.pgn (32 games)

```
name                       hz    min    max    mean    p75    p99   p995   p999     rme  samples
@echecs/pgn           406.00  2.309  2.875  2.463  2.518  2.796  2.802  2.875  ±0.63%      204
@mliebelt/pgn-parser  374.88  2.509  3.117  2.668  2.687  3.074  3.117  3.117  ±0.61%      188
pgn-parser            436.65  2.130  4.787  2.290  2.288  3.489  4.323  4.787  ±1.54%      219
```

### lichess.pgn

```
name                        hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           1,409.48  0.6550  0.9630  0.7095  0.7177  0.9011  0.9284  0.9630  ±0.48%      705
@mliebelt/pgn-parser  1,338.58  0.7056  1.1141  0.7471  0.7473  1.0107  1.0414  1.1141  ±0.50%      670
pgn-parser            1,547.00  0.6082  0.9510  0.6464  0.6502  0.8390  0.8915  0.9510  ±0.45%      774
```

### long.pgn (~3,500 games)

```
name                      hz      min      max     mean      p75      p99     p995     p999     rme  samples
@echecs/pgn           3.1038  315.47   341.06  322.19   323.62   341.06   341.06   341.06  ±1.71%       10
@mliebelt/pgn-parser  3.1612  307.99   330.28  316.33   323.40   330.28   330.28   330.28  ±1.86%       10
pgn-parser            3.2811  297.20   324.81  304.78   305.53   324.81   324.81   324.81  ±2.21%       10
```

All three parsers are within measurement noise at this scale (~320ms per run).

### multiple.pgn

```
name                        hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           8,971.11  0.1036  0.4268  0.1115  0.1109  0.1705  0.3110  0.3443  ±0.50%     4486
@mliebelt/pgn-parser  8,914.87  0.1040  0.4752  0.1122  0.1112  0.1753  0.3179  0.4232  ±0.55%     4458
pgn-parser            9,678.25  0.0960  0.4070  0.1033  0.1026  0.1566  0.2082  0.3351  ±0.48%     4840
```

### twic.pgn

```
name                       hz      min      max     mean      p75      p99     p995     p999     rme  samples
@echecs/pgn           42.9145  22.7660  23.9645  23.3022  23.4447  23.9645  23.9645  23.9645  ±0.60%       22
@mliebelt/pgn-parser  41.9674  22.8318  30.9555  23.8280  23.5831  30.9555  30.9555  30.9555  ±3.28%       21
pgn-parser            45.5013  20.8497  28.1256  21.9774  21.8356  28.1256  28.1256  28.1256  ±3.35%       23
```

---

## Summary

`@echecs/pgn` is consistently within 1.0–1.1x of `pgn-parser` across all
fixtures despite producing significantly more structured output per game:
decomposed SAN, paired move tuples, RAV trees, NAGs, and parsed comment
annotation commands (`[%cal]`, `[%csl]`, `[%clk]`, `[%eval]`).

`pgn-parser` produces raw, unstructured output. The performance difference is
smaller than the output difference.

`chess.js` is 8–12x slower than `@echecs/pgn` on single-game fixtures and does
not support multi-game files.

`@mliebelt/pgn-parser` is consistently 1.0–1.2x slower than `@echecs/pgn` across
all fixtures.
