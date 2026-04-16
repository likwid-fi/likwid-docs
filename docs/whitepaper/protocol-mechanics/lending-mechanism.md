---
title: "Lending Mechanism"
description: "The lending mechanism in Likwid v2.2 is built around LikwidLendPosition, vault-managed lend reserves, utilization-driven rates, and mirror-aware settlement."
---

#### **1. Introduction**

The **Lending Mechanism** in Likwid v2.2 allows users to supply one asset through `LikwidLendPosition` and earn yield from protocol utilization. Borrow and margin demand are reflected back into the pool's reserve system, so lending is tightly connected to the rest of the vault rather than being a separate isolated module.

This mechanism improves capital efficiency by allowing the same vault-managed pool to support lending, paired liquidity, and margin activity with explicit reserve accounting.

#### **2. Mechanism**

![](/assets/v2/lending-position-flow.svg)

* **Single-Sided Deposit**: Users add one asset to a pool through `addLending`, and the manager issues a lending position NFT.
* **Lend Reserve Accounting**: The vault records that liquidity inside lend reserves, alongside pair reserves, mirror reserves, and protocol-interest reserves.
* **Utilization-Based Rate Updates**: Borrow rates are derived from `MarginState` and current reserve utilization, then fed back into deposit cumulative values for lenders.
* **Mirror-Aware Swaps**: The lending manager can route swaps using mirror-side liquidity where appropriate, but the accounting remains internal to the vault.

#### **3. Impact on Margin Positions**

In the current implementation, lending demand and margin demand are linked through shared reserve accounting rather than through a separate legacy product layer. Margin positions can increase mirror-reserve usage, and that utilization contributes to the borrow-rate environment that affects lenders.

The important point for users is:

* lenders supply inventory that supports the broader leverage system
* lenders earn from protocol utilization, not from an external lending receipt token
* all of this is coordinated inside `LikwidVault`
