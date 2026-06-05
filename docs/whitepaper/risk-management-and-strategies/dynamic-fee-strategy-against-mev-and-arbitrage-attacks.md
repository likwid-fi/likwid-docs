---
title: "Dynamic Fee Strategy Against MEV and Arbitrage Attacks"
description: "Likwid v2.2 amplifies the swap fee cubically as fee = f_base × (10·s)³: the farther a trade pushes price away from the truncated reference, the higher the fee. This article gives the exact formula, threshold constants, and a price-move → fee table."
---

## 1. Why Dynamic Fees Exist

When a pool's price is pushed sharply within a very short window, arbitrageurs and MEV bots can extract value from liquidity providers before the system absorbs the new information. Likwid v2.2 answers this with a **native dynamic-fee engine**. The goal is not to eliminate all arbitrage, but to make trades that push the pool price far from the protocol's bounded reference pay a **substantially higher** fee — the harder a trade pushes, the higher its marginal cost, which compresses an attacker's profit margin.

## 2. The Formula in One Line

The core of the dynamic fee is a single cubic-amplification formula:

$$
\text{fee} = f_{base} \times (10 \cdot s)^3
$$

* $f_{base}$: the pool's base LP fee (e.g. the default 0.3%)
* $s$: the **price deviation** — how far the post-swap pair price moves relative to the "truncated reference price" (truncated reserves), expressed as a fraction (e.g. $s = 0.2$ means a 20% deviation)

This matches Likwid's published design formula `fee = f_base × (10·s)³` exactly, and it is precisely what the contract's `SwapMath.dynamicFee` implements. Below we unpack where $s$ comes from and how the fee rises with it.

## 3. How the Deviation $s$ Is Measured

The contract measures the deviation in `SwapMath.getPriceDegree`: it first simulates the **post-swap** price from current pair reserves, then compares it against the "truncated reference price" and takes the relative difference:

```
s = |post-swap price − truncated reference price| / truncated reference price
```

Internally this fraction is stored as a **parts-per-million (PPM)** integer `degree` (i.e. `degree = s × 1,000,000`; for example `degree = 200000` means a 20% deviation), computed for both token0 and token1 directions, taking the larger of the two.

**Why compare against the "truncated reference price" rather than the live price?** Truncated reserves form a bounded reference line: they can only move toward the live price over time, at the rate `priceMoved = priceMoveSpeedPPM × timeElapsed²` (default `priceMoveSpeedPPM = 3000`, i.e. about 0.3% per step). An attacker cannot instantly drag the reference up within a block or two, so the "deviation" is always measured against this anti-manipulation baseline — which is exactly what lets the dynamic fee block flash-style price displacement. See [Truncated Oracles](/whitepaper/risk-management-and-strategies/truncated-oracles) for more background.

## 4. How the Fee Escalates with Deviation

Splitting the formula by $s$ gives three regimes:

1. **$s \le 10\%$ (`degree ≤ 100000`) → keep the base fee**: for small deviations the fee is simply $f_{base}$, with no surcharge.
2. **$10\% < s \le 100\%$ → cubic amplification**: the fee rises steeply as $f_{base} \times (10s)^3$.
3. **$s > 100\%$, or whenever the computed fee reaches 100% → capped at 99%**.

These three regimes connect **smoothly**: at $s = 10\%$, $(10 \times 0.1)^3 = 1$, so the cubic term equals exactly $f_{base}$. That makes 10% both the point where the surcharge begins and a seam with no jump; below 10% the cubic term would fall under the base fee, so the base fee is kept instead.

The cube means **very fast amplification**: doubling the deviation raises the fee by roughly $2^3 = 8\times$.

::: warning
* All fees are represented internally in **parts-per-million (PPM)**: `1,000,000 = 100%`, so a 0.3% base fee is `3000`.
* The trigger threshold (`degree > 100000`, i.e. 10%), the cap (`990000`, i.e. 99%), and related constants all come from the contract `SwapMath.dynamicFee` (`MAX_SWAP_FEE = 1e6`).
* The cap is `MAX_SWAP_FEE − 10000 = 990000` (99%) — the dynamic fee tops out at 99%, leaving a 1% margin.
* These parameters are set on the protocol side; if they change on-chain, the numbers in this article should be reviewed accordingly.
:::

## 5. Price Move → Dynamic Fee Table

Using a pool with the **default 0.3% base fee** (fees scale proportionally with the base fee):

| Price deviation $s$ | Regime | Dynamic fee |
| --- | --- | --- |
| 5% | ≤10%, keep base fee | 0.30% |
| 10% | seam, keep base fee | 0.30% |
| 11% | cubic | ≈ 0.40% |
| 15% | cubic | ≈ 1.01% |
| 20% | cubic | 2.40% |
| 25% | cubic | ≈ 4.69% |
| 30% | cubic | 8.10% |
| 40% | cubic | 19.2% |
| 50% | cubic | 37.5% |
| 60% | cubic | 64.8% |
| ≈ 69.3% | cubic hits cap | ≈ 99% (capped) |
| ≥ 70% | capped | 99% |
| > 100% | capped | 99% |

> Values are computed with $f_{base} = 0.3\%$. Other base fees scale proportionally — e.g. for a 0.6% pool every fee in the table doubles. The 99% cap begins to apply at roughly a 69.3% deviation.

## 6. Worked Examples

Two rows from the table, computed by hand so you can reproduce them ($f_{base} = 0.3\%$):

```
s = 15%:  fee = 0.3% × (10 × 0.15)³ = 0.3% × 1.5³ = 0.3% × 3.375 ≈ 1.01%
s = 20%:  fee = 0.3% × (10 × 0.20)³ = 0.3% × 2³     = 0.3% × 8     = 2.40%
```

So a trade that pushes the price 20% away from the reference pays about a 2.4% fee — 8× the usual 0.3%.

## 7. Implications for Users and Integrators

* **Large reserve-moving trades cost more**: the farther a trade pushes price, the higher the marginal fee; small trades near the reference keep the base fee.
* **Margin open/close flows inherit this engine**: when a margin flow has to swap through pool reserves, it is charged the same dynamic fee (the truncated-reserve overloads of `getAmountIn` / `getAmountOut` compute `degree` first, then the fee).
* **Fee behavior is fully pool-native**: no external oracle or extension provider is required, and it can be derived and verified directly from the protocol's math libraries.

## 8. Conclusion

Likwid's dynamic-fee strategy is a native part of the v2.2 protocol, driven by the simple cubic formula `fee = f_base × (10·s)³` and backed by the truncated reference price, a bounded movement speed, and a 99% cap. Together these make abrupt, price-displacing trades far more expensive than they would be under a flat fee schedule — protecting LPs and deterring MEV and arbitrage attacks.
