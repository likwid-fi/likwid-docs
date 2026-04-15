---
title: "Truncated Oracles"
description: "The truncated oracle is another major theoretical innovation by Uniswap. It uses a geometric mean formula to record the prices of assets within Uniswap liquidity pools and then app"
---

The truncated oracle is another major theoretical innovation by Uniswap. It uses a geometric mean formula to record the prices of assets within Uniswap liquidity pools and then applies a truncation mechanism to the oracle feed. This means that **within a single block**, **the recorded price can only move up or down to a predefined maximum limit.**

![](/assets/gitbook/spaces-2FdZGvDixUA5eWtjX2MfjG-2Fuploads-2FBoTDnVCjZj9Kr5zDstWX-2Fimage-8c2205b66e.png)

For instance, in an ETH/USDC trading pair with a 2% block price cap:

* If the price jumps from 4000 USDC to 4500 USDC within one block due to manipulation, the oracle price would be truncated at 4080 USDC, preventing margin liquidations for leveraged long positions.
* In contrast, using TWAP or VWAP, the manipulated price could average to 4200 USDC, unfairly triggering liquidations.
* If the spike to 4500 USDC is genuine and sustained (oh, how I wish this would happen), the oracle price would catch up within six blocks, allowing fair liquidation for positions below 4200 USDC. Even in this scenario, using off-chain oracles wouldn’t avoid losses. CEXs, oracles, and platforms alike would incur similar impacts during genuine price surges.

#### Cross-Section Oracle Catch-Up Algorithm

To model how the oracle price catches up with real market prices over time, we uses the following **Cross-Section Price Tracking Algorithm**:

1. **Relative Price Difference**\
   The percentage deviation between the oracle and actual market price:

   $$
   R_p = \frac{|P_o - P_a|}{P_o}
   $$

   * ( P\_o ): Oracle-reported price
   * ( P\_a ): Actual (external or on-chain) price
2. **Catch-Up Time Relation**\
   The relation between time and price deviation follows a quadratic form:

   $$
   K \cdot T^2 = R_p
   $$

   * ( T ): Time (in seconds or blocks, depending on implementation)
   * ( K ): A configurable constant (currently set at **0.3%**)
   * As ( T ) increases, the oracle price gradually **converges** with actual price

***

<br>
