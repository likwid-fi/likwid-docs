---
title: "Dynamic Fee Strategy Against MEV and Arbitrage Attacks"
description: "Likwid v2.2 uses a native dynamic-fee engine based on pair reserves, truncated reserves, and bounded price-reference movement."
---

### 1. Why Dynamic Fees Exist

Large, fast state changes can extract value from liquidity providers when pool prices move materially before the system has time to absorb new information. Likwid v2.2 addresses that problem with a native dynamic-fee engine. The design goal is not to eliminate all MEV or arbitrage, but to make disruptive price movement more expensive when a trade pushes pool state far away from the protocol's bounded price reference.

### 2. Current v2.2 Design

The fee engine is implemented directly in the protocol's own libraries:

* **`SwapMath.getPriceDegree`** compares live pair reserves against truncated reserves to measure the magnitude of price change implied by the requested trade.
* **`SwapMath.dynamicFee`** starts from the pool's base LP fee and increases it when the measured degree becomes large enough.
* **`PriceMath.transferReserves`** updates truncated reserves gradually over time instead of snapping instantly to the new pair state.
* **`MarginState.priceMoveSpeedPPM`** configures how quickly the truncated reference is allowed to catch up.

This gives Likwid an internal reference price band that can react to market movement without claiming reliance on any external extension provider.

### 3. How the Fee Escalates

At a high level, the flow is:

1. Start from the pool's configured base swap fee.
2. Estimate how far the requested swap would move the pair away from truncated reserves.
3. If the move is small, keep the base fee.
4. If the move is large, increase the effective fee nonlinearly before computing the final output or input amount.

The practical effect is that trades which create larger reserve dislocations pay a higher marginal fee than trades that stay close to the protocol's bounded price reference.

### 4. Why Truncated Reserves Matter

The dynamic fee system depends on the protocol maintaining two views of price:

* **Pair reserves** reflect the pool's current executable state.
* **Truncated reserves** reflect a bounded reference that can only move toward the pair at a configured speed.

By charging more when the live state diverges sharply from the bounded reference, the pool can make abrupt price-displacing swaps less attractive than they would be under a flat fee schedule.

### 5. Operational Implications

This design has several consequences for users and integrators:

* **Large reserve-moving trades pay more** than small, low-impact trades.
* **Margin open/close flows inherit the swap engine** when they need to trade through pool reserves.
* **Fee behavior is pool-native** and can be reasoned about directly from the vault and math libraries.

### 6. Conclusion

Likwid's dynamic-fee strategy is a native part of the v2.2 protocol. It is driven by reserve state, truncated price references, and protocol-controlled movement limits.
