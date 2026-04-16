---
title: "Conclusion"
description: "Likwid v2.2 combines vault-managed liquidity, NFT positions, native fee controls, and reserve-aware risk management in a single leverage and lending system."
---

Likwid v2.2 combines paired liquidity, single-sided lending, and leveraged margin positions inside a single vault-managed architecture. `LikwidVault` holds the pool core, while `LikwidPairPosition`, `LikwidLendPosition`, and `LikwidMarginPosition` expose user-facing NFT positions on top of that shared reserve system.

The protocol's distinguishing features are native: swap fees can expand dynamically as reserve movement increases, lending rates react to utilization, liquidation is enforced directly by the margin manager, and insurance-fund accounting is built into pool state. This gives Likwid a concrete on-chain structure for leverage and lending without depending on any third-party extension framework.
