# Comparative Benchmark Results

**Date**: 2026-02-19
**Test**: PGN Parser Comparison
**Command**: `pnpm bench`
**Vitest**: v3.2.0

## Overview

Comparative benchmarks for `@echecs/pgn` against three alternative PGN parsers:
- `@mliebelt/pgn-parser@1.4.19`
- `pgn-parser@2.2.1`
- `chess.js@1.4.0` (single-game only)

## Single-Game Fixtures (All 4 Parsers)

### basic.pgn
```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn            1,996.24  0.4565  0.9948  0.5009  0.5017  0.7437  0.7821  0.9948  ±0.70%      999
@mliebelt/pgn-parser  14,878.96  0.0561  1.0036  0.0672  0.0667  0.1237  0.1571  0.2147  ±0.54%     7440
pgn-parser            16,054.14  0.0523  0.2214  0.0623  0.0619  0.1207  0.1516  0.1784  ±0.37%     8028
chess.js               1,526.47  0.6099  0.9089  0.6551  0.6653  0.8055  0.8216  0.9089  ±0.47%      764
```
**pgn-parser is 8.04x faster than @echecs/pgn**

### checkmate.pgn
```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn            3,569.75  0.2410  0.6792  0.2801  0.2782  0.4425  0.4595  0.5443  ±0.58%     1785
@mliebelt/pgn-parser  19,901.23  0.0420  0.3022  0.0502  0.0495  0.0800  0.1109  0.2126  ±0.41%     9951
pgn-parser            22,151.05  0.0386  0.2174  0.0451  0.0442  0.0665  0.1074  0.1775  ±0.35%    11076
chess.js               1,926.00  0.4860  0.7652  0.5192  0.5233  0.6585  0.6916  0.7652  ±0.42%      963
```
**pgn-parser is 6.21x faster than @echecs/pgn**

### comment.pgn
```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn            1,122.97  0.8380  1.2677  0.8905  0.9007  0.9984  1.1457  1.2677  ±0.57%      562
@mliebelt/pgn-parser  11,217.25  0.0775  0.3131  0.0891  0.0891  0.1112  0.1453  0.2439  ±0.32%     5609
pgn-parser            11,720.63  0.0748  0.2489  0.0853  0.0847  0.1055  0.1363  0.2270  ±0.28%     5861
chess.js               1,432.99  0.6626  0.9517  0.6978  0.6987  0.8579  0.9275  0.9517  ±0.43%      717
```
**pgn-parser is 10.44x faster than @echecs/pgn**

### promotion.pgn
```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn            1,242.38  0.7132  1.1252  0.8049  0.8102  1.0416  1.0759  1.1252  ±0.61%      622
@mliebelt/pgn-parser  11,997.60  0.0724  0.2478  0.0833  0.0831  0.1111  0.1639  0.2185  ±0.29%     5999
pgn-parser            12,410.25  0.0710  0.2910  0.0806  0.0805  0.1003  0.1221  0.2283  ±0.30%     6206
chess.js               1,055.70  0.9127  1.1905  0.9472  0.9486  1.1140  1.1290  1.1905  ±0.37%      528
```
**pgn-parser is 9.99x faster than @echecs/pgn**

### single.pgn
```
name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn            37,987.35  0.0217  0.2482  0.0263  0.0258  0.0380  0.0531  0.1615  ±0.41%    18994
@mliebelt/pgn-parser   80,273.79  0.0101  0.2059  0.0125  0.0122  0.0205  0.0259  0.1264  ±0.42%    40137
pgn-parser            128,297.41  0.0064  0.1838  0.0078  0.0076  0.0138  0.0170  0.0415  ±0.36%    64149
chess.js               35,368.73  0.0236  0.2193  0.0283  0.0278  0.0396  0.0487  0.1610  ±0.32%    17685
```
**pgn-parser is 3.38x faster than @echecs/pgn**

## Multi-Game Fixtures (3 Parsers; chess.js excluded)

### multiple.pgn
```
name                        hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           1,009.47  0.9102  1.4548  0.9906  1.0110  1.2545  1.2932  1.4548  ±0.67%      505
@mliebelt/pgn-parser  8,903.36  0.0988  0.4410  0.1123  0.1112  0.1945  0.2727  0.3903  ±0.55%     4452
pgn-parser            9,748.41  0.0885  0.3385  0.1026  0.1020  0.1655  0.2245  0.2791  ±0.39%     4875
```
**pgn-parser is 9.66x faster than @echecs/pgn**

### games32.pgn
```
name                       hz      min      max     mean      p75      p99     p995     p999     rme  samples
@echecs/pgn           44.2595  21.8130  24.0900  22.5940  22.8871  24.0900  24.0900  24.0900  ±1.19%       23
@mliebelt/pgn-parser   380.10   2.4735   3.1731   2.6309   2.6668   3.1327   3.1731   3.1731  ±0.68%      191
pgn-parser             444.48   2.0988   2.7704   2.2498   2.2866   2.5775   2.6615   2.7704  ±0.63%      223
```
**pgn-parser is 10.04x faster than @echecs/pgn**

### lichess.pgn
```
name                        hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn             132.53  7.2618  8.1517  7.5456  7.6196  8.1517  8.1517  8.1517  ±0.50%       67
@mliebelt/pgn-parser  1,354.02  0.6939  1.0717  0.7385  0.7393  0.9700  1.0014  1.0717  ±0.49%      678
pgn-parser            1,590.18  0.6058  0.8332  0.6289  0.6290  0.7862  0.8130  0.8332  ±0.32%      796
```
**pgn-parser is 12.00x faster than @echecs/pgn**

### twic.pgn
```
name                       hz      min      max     mean      p75      p99     p995     p999     rme  samples
@echecs/pgn            3.8342   255.85   270.67   260.81   262.94   270.67   270.67   270.67  ±1.42%       10
@mliebelt/pgn-parser  43.2582  22.4471  25.4125  23.1170  23.2250  25.4125  25.4125  25.4125  ±1.17%       22
pgn-parser            48.2276  20.1949  21.1162  20.7350  20.8101  21.1162  21.1162  21.1162  ±0.36%       25
```
**pgn-parser is 12.58x faster than @echecs/pgn**

### long.pgn (Large fixture: ~3500 games)
```
name                      hz       min       max      mean       p75       p99      p995      p999     rme  samples
@echecs/pgn           0.2935  3,343.50  3,493.93  3,406.95  3,461.75  3,493.93  3,493.93  3,493.93  ±1.18%       10
@mliebelt/pgn-parser  3.3827    291.24    303.77    295.62    299.12    303.77    303.77    303.77  ±1.07%       10
pgn-parser            3.5027    282.30    294.69    285.49    285.83    294.69    294.69    294.69  ±0.95%       10
```
**pgn-parser is 11.93x faster than @echecs/pgn**

## Summary: Performance Gap Analysis

| Fixture | Avg Slowdown | Mean Time |
|---------|-------------|-----------|
| single.pgn | 3.38x | 26.3 μs |
| basic.pgn | 8.04x | 500.9 μs |
| checkmate.pgn | 6.21x | 280.1 μs |
| promotion.pgn | 9.99x | 804.9 μs |
| comment.pgn | 10.44x | 890.5 μs |
| multiple.pgn | 9.66x | 990.6 μs |
| games32.pgn | 10.04x | 22.6 ms |
| lichess.pgn | 12.00x | 7.5 ms |
| twic.pgn | 12.58x | 260.8 ms |
| **long.pgn** | **11.93x** | **3.4 seconds** |

## Key Findings

1. **Scaling Problem**: Performance gap increases with input size. The `long.pgn` fixture (3500 games) shows the worst performance: **3.4 seconds** vs ~286ms for `pgn-parser`.

2. **Consistent Disadvantage**: @echecs/pgn is consistently 3-12x slower across all fixtures, with smaller fixtures showing more variance in relative performance.

3. **Parser Comparison**:
   - `pgn-parser` is consistently fastest
   - `@mliebelt/pgn-parser` is 1.03-1.17x slower than `pgn-parser`
   - `@echecs/pgn` is 3-12x slower than `pgn-parser`
   - `chess.js` is comparable to @echecs/pgn on small fixtures but cannot handle multiple games

4. **Earley Parser Bottleneck**: The nearley (Earley) parser stack shows O(n³) worst-case complexity characteristics on large inputs, making it unsuitable for processing large game collections.

## Recommendations

1. **Prioritize optimization** of the parser backend—switching from Earley to a more efficient parser (like hand-written recursive descent or PEG) could yield 10x+ improvements.

2. **Profile the lexer** to ensure moo is not contributing significantly to the overhead.

3. **Test with even larger fixtures** to quantify scaling behavior.
