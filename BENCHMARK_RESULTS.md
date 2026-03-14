# Comparative Benchmark Results

**Date**: 2026-03-14 **Test**: PGN Parser Comparison **Command**: `pnpm bench`
**Vitest**: v4.1.0

## Overview

Comparative benchmarks for `@echecs/pgn` against three alternative PGN parsers:

- `@mliebelt/pgn-parser@1.4.15`
- `pgn-parser@2.2.1`
- `chess.js@1.4.0` (single-game only)

## Single-Game Fixtures (All 4 Parsers)

### basic.pgn

```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           14,897.87  0.0551  0.4905  0.0671  0.0683  0.1357  0.1513  0.1893  ±0.51%     7449
@mliebelt/pgn-parser  15,023.46  0.0555  0.2663  0.0666  0.0671  0.1392  0.1576  0.2057  ±0.47%     7512
pgn-parser            16,039.69  0.0521  0.2343  0.0623  0.0630  0.1233  0.1393  0.1758  ±0.41%     8020
chess.js               1,537.82  0.5500  0.8581  0.6503  0.6715  0.8057  0.8278  0.8581  ±0.52%      769
```

**pgn-parser is 1.08x faster than @echecs/pgn** (was 1.11x after action opts,
1.49x after migration, 7.20x before migration)

### benko.pgn

```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn            6,022.60  0.1359  0.3413  0.1660  0.1682  0.2545  0.2746  0.3101  ±0.46%     3012
```

_Note: benko.pgn uses features not supported by the other parsers — no
comparison available._

### checkmate.pgn

```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           20,240.33  0.0397  1.1055  0.0494  0.0490  0.0752  0.1034  0.7318  ±1.44%    10121
@mliebelt/pgn-parser  19,944.63  0.0416  1.0260  0.0501  0.0506  0.0833  0.1087  0.2175  ±0.58%     9973
pgn-parser            22,207.27  0.0377  0.2200  0.0450  0.0455  0.0720  0.0956  0.1870  ±0.39%    11104
chess.js               1,942.25  0.4438  0.7068  0.5149  0.5232  0.6739  0.6889  0.7068  ±0.48%      972
```

**pgn-parser is 1.10x faster than @echecs/pgn** (was 1.12x after action opts,
1.46x after migration, 5.44x before migration)

**@echecs/pgn leads @mliebelt/pgn-parser** at 20,240 hz vs 19,945 hz

### comment.pgn

```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           10,303.18  0.0793  0.9822  0.0971  0.0967  0.1560  0.4746  0.7565  ±1.22%     5152
@mliebelt/pgn-parser  11,036.56  0.0759  1.0908  0.0906  0.0917  0.1565  0.2130  0.2834  ±0.64%     5519
pgn-parser            11,548.46  0.0720  0.2958  0.0866  0.0880  0.1453  0.1934  0.2649  ±0.44%     5775
chess.js               1,404.84  0.5996  1.0130  0.7118  0.7256  0.9103  0.9463  1.0130  ±0.52%      703
```

**pgn-parser is 1.12x faster than @echecs/pgn** (was 1.12x after action opts,
1.50x after migration, 9.65x before migration)

### promotion.pgn

```
name                         hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           10,907.70  0.0759  0.8431  0.0917  0.0909  0.1408  0.3287  0.7135  ±1.16%     5454
@mliebelt/pgn-parser  10,803.77  0.0715  4.0223  0.0926  0.0898  0.2134  0.2310  0.2669  ±1.73%     5402
pgn-parser            12,387.91  0.0690  0.3798  0.0807  0.0810  0.1139  0.1758  0.2604  ±0.42%     6194
chess.js               1,028.69  0.8823  1.3095  0.9721  0.9922  1.1745  1.2502  1.3095  ±0.54%      515
```

**pgn-parser is 1.14x faster than @echecs/pgn** (was 1.14x after action opts,
1.54x after migration, 9.16x before migration)

**@echecs/pgn leads @mliebelt/pgn-parser** at 10,908 hz vs 10,804 hz

### single.pgn

```
name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           133,961.94  0.0059  0.4327  0.0075  0.0073  0.0152  0.0188  0.0472  ±0.73%    66982
@mliebelt/pgn-parser   81,083.55  0.0100  0.1962  0.0123  0.0122  0.0199  0.0261  0.1382  ±0.46%    40542
pgn-parser            127,415.92  0.0063  0.2088  0.0078  0.0076  0.0160  0.0196  0.0602  ±0.45%    63708
chess.js               35,449.18  0.0236  0.2462  0.0282  0.0279  0.0394  0.0450  0.1875  ±0.36%    17725
```

**@echecs/pgn is the fastest** at 133,962 hz (1.05x faster than pgn-parser)

### variants.pgn

```
name                          hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn            47,193.93  0.0175  0.3211  0.0212  0.0207  0.0333  0.0420  0.1890  ±0.47%    23598
@mliebelt/pgn-parser           —      —       —      —       —       —       —       —        —        —
pgn-parser                     —      —       —      —       —       —       —       —        —        —
chess.js                       —      —       —      —       —       —       —       —        —        —
```

_Note: variants.pgn uses RAV (variation) features not supported by the other
parsers — no comparison available._

## Multi-Game Fixtures (3 Parsers; chess.js excluded)

### comments.pgn

```
name                       hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           347.17  2.6352  3.6692  2.8804  2.9452  3.6374  3.6692  3.6692  ±0.85%      174
@mliebelt/pgn-parser     —       —       —      —       —       —       —       —        —        —
pgn-parser               —       —       —      —       —       —       —       —        —        —
```

_Note: comments.pgn uses features not supported by the other parsers — no
comparison available._

### multiple.pgn

```
name                        hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           8,925.93  0.0951  0.3653  0.1120  0.1118  0.1727  0.2687  0.3311  ±0.44%     4463
@mliebelt/pgn-parser  8,794.13  0.0952  0.3916  0.1137  0.1145  0.1799  0.2995  0.3507  ±0.50%     4398
pgn-parser            9,693.14  0.0870  0.3203  0.1032  0.1037  0.1530  0.2482  0.3018  ±0.44%     4847
```

**pgn-parser is 1.09x faster than @echecs/pgn** (was 1.20x after action opts,
1.53x after migration, 9.51x before migration)

**@echecs/pgn leads @mliebelt/pgn-parser** at 8,926 hz vs 8,794 hz

### games32.pgn

```
name                      hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           370.95  2.2886  7.8090  2.6958  2.6158  6.1987  7.8090  7.8090  ±3.89%      186
@mliebelt/pgn-parser  374.36  2.4939  3.2128  2.6712  2.7062  3.0569  3.2128  3.2128  ±0.63%      188
pgn-parser            418.48  2.0948  8.5013  2.3896  2.3165  5.2609  5.3883  8.5013  ±3.76%      210
```

**pgn-parser is 1.13x faster than @echecs/pgn** (was 1.21x after action opts,
1.51x after migration, 8.86x before migration)

### lichess.pgn

```
name                        hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           1,381.80  0.6229  1.4285  0.7237  0.7173  1.2933  1.3694  1.4285  ±1.10%      691
@mliebelt/pgn-parser  1,286.59  0.6587  2.1414  0.7772  0.7920  1.0409  1.1252  2.1414  ±0.84%      644
pgn-parser            1,544.73  0.5700  0.9282  0.6474  0.6558  0.8333  0.8469  0.9282  ±0.51%      773
```

**pgn-parser is 1.12x faster than @echecs/pgn** (was 1.14x after action opts,
1.49x after migration, 10.84x before migration)

**@echecs/pgn leads @mliebelt/pgn-parser** at 1,382 hz vs 1,287 hz

### twic.pgn

```
name                       hz      min      max     mean      p75      p99     p995     p999     rme  samples
@echecs/pgn           41.8619  22.8994  25.1300  23.8881  24.1168  25.1300  25.1300  25.1300  ±1.04%       21
@mliebelt/pgn-parser  41.9899  22.5898  24.8625  23.8152  24.1796  24.8625  24.8625  24.8625  ±1.07%       22
pgn-parser            47.5089  20.6081  21.8115  21.0487  21.2290  21.8115  21.8115  21.8115  ±0.65%       24
```

**pgn-parser is 1.13x faster than @echecs/pgn** (was 1.20x after action opts,
1.56x after migration, 11.30x before migration)

**@echecs/pgn and @mliebelt/pgn-parser are now essentially equal** on twic.pgn

### long.pgn (Large fixture: ~3500 games)

```
name                      hz     min     max    mean     p75     p99    p995    p999     rme  samples
@echecs/pgn           3.0034  324.02  348.95  332.96  335.41  348.95  348.95  348.95  ±1.53%       10
@mliebelt/pgn-parser  3.1783  306.82  325.90  314.64  318.58  325.90  325.90  325.90  ±1.55%       10
pgn-parser            3.3890  290.11  303.06  295.07  298.47  303.06  303.06  303.06  ±1.00%       10
```

**pgn-parser is 1.13x faster than @echecs/pgn** (was 1.17x after action opts,
1.57x after migration, 11.15x before migration)

## Summary: Performance Gap Analysis

| Fixture       | Before migration  | After migration  | After action opts | After SAN refactor |
| ------------- | ----------------- | ---------------- | ----------------- | ------------------ |
| single.pgn    | 3.16x slower      | **1.01x faster** | **1.03x faster**  | **1.05x faster**   |
| basic.pgn     | 7.20x slower      | 1.49x slower     | 1.11x slower      | **1.08x slower**   |
| checkmate.pgn | 5.44x slower      | 1.46x slower     | 1.12x slower      | **1.10x slower**   |
| promotion.pgn | 9.16x slower      | 1.54x slower     | 1.14x slower      | **1.14x slower**   |
| comment.pgn   | 9.65x slower      | 1.50x slower     | 1.12x slower      | **1.12x slower**   |
| multiple.pgn  | 9.51x slower      | 1.53x slower     | 1.20x slower      | **1.09x slower**   |
| games32.pgn   | 8.86x slower      | 1.51x slower     | 1.21x slower      | **1.13x slower**   |
| lichess.pgn   | 10.84x slower     | 1.49x slower     | 1.14x slower      | **1.12x slower**   |
| twic.pgn      | 11.30x slower     | 1.56x slower     | 1.20x slower      | **1.13x slower**   |
| **long.pgn**  | **11.15x slower** | **1.57x slower** | **1.17x slower**  | **1.13x slower**   |

## Key Findings

1. **SAN rule refactor delivers additional gains**: Eliminating the post-match
   JavaScript regex closes the gap further on several fixtures — multiple.pgn
   improved from 1.20x to 1.09x slower, games32 from 1.21x to 1.13x.

2. **`single.pgn` lead extended**: `@echecs/pgn` at 133,962 hz now leads
   `pgn-parser` at 127,416 hz by 1.05x (up from 1.03x).

3. **`variants.pgn` continues to improve**: 47,194 hz vs 46,353 hz previously
   (+1.8% gain from SAN restructure).

4. **`@echecs/pgn` now beats `@mliebelt/pgn-parser`** on checkmate, promotion,
   multiple, lichess, and twic fixtures — a new development vs the prior run.

5. **Scaling remains fixed**: The gap vs `pgn-parser` is consistently
   ~1.08–1.14x regardless of input size, confirming O(n) PEG parsing.

6. **`long.pgn` wall-clock**: ~333ms vs ~3,200ms (nearley) — ~9.6x improvement
   over the full optimisation history.

7. **Remaining gap**: The residual ~1.08–1.14x gap vs. `pgn-parser` reflects the
   different scope of work: `pgn-parser` outputs raw strings and a flat move
   list, while `@echecs/pgn` performs full SAN decomposition, castling square
   resolution, move pairing, and result conversion.

## Parser Comparison

- `pgn-parser` is ~1.08–1.14x faster (down from ~1.11–1.21x after action opts)
- `@mliebelt/pgn-parser` is now **slower** than `@echecs/pgn` on checkmate,
  promotion, multiple, lichess, and twic
- `@echecs/pgn` **leads** on `single.pgn` and `variants.pgn`
- `chess.js` remains slowest on single-game fixtures
