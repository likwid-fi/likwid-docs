---
title: "Introduction"
description: "Likwid v2.2 is a vault-centric leverage and lending protocol built around LikwidVault, position-manager NFTs, native fee controls, and internal risk accounting."
---

<div class="docs-home-logo">
  <picture>
    <source srcset="/assets/brand-kit/logo-wordmark-white.png" media="(prefers-color-scheme: dark)">
    <img src="/assets/brand-kit/logo-wordmark-black.png" alt="likwid.fi">
  </picture>
</div>

#### Abstract

Likwid v2.2 is a decentralized leverage and lending protocol built around a shared pool model. Instead of matching individual counterparties, liquidity is managed inside `LikwidVault`, while position-manager contracts expose user-facing actions for paired liquidity, single-sided lending, and leveraged margin positions. This architecture keeps execution on-chain and concentrates protocol risk controls in audited pool state and manager logic.

The protocol is designed for trading, borrowing, and leveraged exposure on ERC-20 asset pairs. Liquidity providers and lenders supply capital into the same vault-managed system, while traders open positions through NFT-based managers that track ownership, debt, collateral, and accrued value over time. Fees, interest, liquidation thresholds, and price-protection mechanisms are handled natively by the protocol's own contracts and libraries.

#### Protocol Overview

The following diagram illustrates the v2.2 public architecture.

![](/assets/v2/architecture-overview.svg)

#### Role of Liquidity Providers

In Likwid v2.2, liquidity providers can participate through two different manager layers:

* **Pair liquidity providers** use `LikwidPairPosition` to mint position NFTs backed by token pairs. These positions are exposed to swap activity and the pool's native swap-fee engine.
* **Single-sided lenders** use `LikwidLendPosition` to supply one asset and earn utilization-driven lending yield through vault accounting.
* **Insurance-fund donors** can contribute directly to a pool's protection buffer through the vault-facing donate flow.

The vault keeps separate accounting for real reserves, mirror reserves, pair reserves, lend reserves, protocol-interest reserves, and insurance funds. That separation is what allows Likwid to support multiple capital uses with native reserve accounting.

#### Role of Derivatives Traders

Derivatives traders interact with `LikwidMarginPosition`, which issues an NFT for each margin position and records collateral, debt, and accrued state. The vault and manager contracts then coordinate leverage, repayment, closing, and liquidation through native pool accounting.

* **No counterparty matching**: trades and leveraged borrowing are funded from shared pool reserves instead of bilateral matches.
* **Native risk controls**: margin fees, dynamic swap fees, liquidation thresholds, and insurance-fund accounting all live inside the protocol's own contracts.
* **NFT position ownership**: every active pair, lend, or margin position is represented by an NFT rather than a third-party execution primitive.
* **Bounded price movement references**: Likwid derives internal truncated reserve references from pool state to smooth fee and liquidation calculations.

This design gives users a direct on-chain path to provide liquidity, lend capital, or take leveraged exposure while keeping execution and risk management inside the v2.2 contract system.
