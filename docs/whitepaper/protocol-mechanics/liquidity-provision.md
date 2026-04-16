---
title: "Liquidity Provision"
description: "Liquidity provision in Likwid v2.2 combines paired LP positions, single-sided lending positions, native swap fees, and utilization-driven interest."
---

Liquidity providers in Likwid v2.2 can participate through paired LP positions or single-sided lending positions. Both ultimately settle through `LikwidVault`, but they earn through different reserve paths and risk profiles.

### 1. Paired Liquidity and Swap Fees

Users who add paired liquidity through `LikwidPairPosition` receive an NFT position that participates in swap flow at the pool level.

* **Base LP fee**: each pool is initialized with a swap fee parameter.
* **Dynamic expansion under stress**: the protocol can increase the effective swap fee when current pair reserves move too far from truncated reserves.
* **Pool-level fee capture**: swap activity updates pool state and fees before any protocol-fee split is applied.

### 2. Single-Sided Lending and Interest

Users who provide one-sided capital through `LikwidLendPosition` earn utilization-driven yield rather than paired LP swap exposure.

* **Single-asset deposit**: the lender chooses one side of the pool and receives a lending position NFT.
* **Utilization-based earnings**: borrow rates are derived from `MarginState` parameters and current reserve utilization.
* **Shared vault accounting**: lend reserves, mirror reserves, and interest reserves are updated together inside the vault, allowing borrowed exposure and lending yield to coexist.

### 3. Margin Activity as a Revenue Driver

Margin activity affects pool economics in two ways:

* **Margin fees** are collected when leverage is added.
* **Margin-related swap fees** are collected when opening or closing positions requires the swap engine.

This makes margin demand relevant not only for traders, but also for the capital providers whose assets sit behind the vault's reserve system.

Learn more in [Interest Rate Mechanism Design](/whitepaper/protocol-mechanics/interest-rate-mechanism-design).
