---
title: "Truncated Oracles"
description: "In Likwid v2.2, truncated reserves act as a bounded internal price reference that moves toward pair reserves at a protocol-defined speed."
---

In Likwid v2.2, the term "truncated oracle" is best understood as an internal bounded price reference derived from pool reserves. The protocol keeps both live pair reserves and truncated reserves. Over time, truncated reserves move toward the live pair state at a speed limited by `priceMoveSpeedPPM`, preventing the reference from instantly snapping to every short-term reserve shock.

![](/assets/gitbook/spaces-2FdZGvDixUA5eWtjX2MfjG-2Fuploads-2FBoTDnVCjZj9Kr5zDstWX-2Fimage-8c2205b66e.png)

For example, if an ETH/USDC pool experiences an abrupt one-block jump, truncated reserves can lag that move intentionally. This means:

* liquidation and fee logic can reference a bounded reserve view instead of the most abrupt possible price print
* short-lived reserve shocks do not immediately dominate every downstream calculation
* sustained market moves still propagate into the truncated reference over time

This mechanism is internal to the vault's price-protection logic; it is not a third-party oracle service.

#### Cross-Section Catch-Up Model

To describe how the bounded reference catches up with live market state over time, we use the following conceptual model:

1. **Relative Price Difference**\
   The percentage deviation between the oracle and actual market price:

   $$
   R_p = \frac{|P_o - P_a|}{P_o}
   $$

   * ( P\_o ): Truncated reference price
   * ( P\_a ): Current pair-reserve-implied price
2. **Catch-Up Time Relation**\
   The relation between time and price deviation follows a quadratic form:

   $$
   K \cdot T^2 = R_p
   $$

   * ( T ): Time (in seconds or blocks, depending on implementation)
   * ( K ): A configurable speed constant
   * As ( T ) increases, the truncated reference gradually **converges** with current pair state

***

<br>
