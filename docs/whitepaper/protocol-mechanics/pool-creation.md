---
title: "Pool Creation"
description: "Pools in Likwid v2.2 are initialized in LikwidVault with swap-fee and margin-fee parameters, then accessed through pair, lend, and margin position managers."
---

Pool creation in Likwid v2.2 starts from `LikwidVault`. A pool is initialized once for an ordered currency pair, and every later liquidity, lending, and margin action settles against that same pool state.

The pool core is intentionally minimal: it stores pricing, fee, reserve, and insurance-fund state, while user-facing interactions are exposed through the position-manager contracts.

The essential pool parameters are:

* **Asset Pairing**: `currency0` and `currency1`, sorted by address in the vault.
* **Swap Fee (`fee`)**: the base LP fee used by the swap engine.
* **Margin Fee (`marginFee`)**: the fee collected on margin expansion.

Once initialized, the same pool can be used by:

* `LikwidPairPosition` for paired LP NFTs
* `LikwidLendPosition` for single-sided lending NFTs
* `LikwidMarginPosition` for leveraged margin NFTs

Additional capital can also be donated to the pool's insurance fund to strengthen stress-event handling.
