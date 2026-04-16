---
title: "Single-Sided Lending Liquidity"
description: "Single-sided lending in Likwid v2.2 lets users deposit one asset through LikwidLendPosition, receive a lending-position NFT, and earn utilization-driven yield."
---

*Single-sided lending liquidity allows users to earn yield by depositing a single token into a pool through `LikwidLendPosition`.* In v2.2, this flow is NFT-based: the lender receives a lending position NFT, not a separate ERC-20 certificate. Yield accrues through vault accounting and utilization-driven interest.

### Introduction

Single-sided lending enables users to deposit **only one type of token** into a pool and earn yield on it. Unlike paired LP provision, this flow is designed around lending interest rather than direct swap-fee exposure. The user's contribution is tracked as a dedicated lending position, and the protocol updates its value through the pool's cumulative deposit accounting.

### Key Mechanism

**Single Asset Deposit**

Users supply *only one asset* into a pool through `addLending`. They do not need to provide the paired asset, which simplifies capital deployment for users who want yield on a single token balance.

**NFT-Based Position Tracking**

The current implementation tracks lender ownership through an ERC-721 position managed by `LikwidLendPosition`. This NFT identifies the owner and the pool side being lent, while vault-side cumulative accounting determines how much value the position has accrued.

**Utilization-Driven Yield**

Yield is driven by pool utilization. Borrow demand and mirrored exposure affect the borrow rate, and those interest flows are reflected back into lender-facing accounting through cumulative deposit state. This means lenders are paid for making capital available to traders and borrowers, but the mechanism is protocol-native rather than tokenized as a separate interest-bearing ERC-20.

**Dynamic Interest Rate**

The interest rate earned on the deposited asset is **dynamic**, adjusting algorithmically based on supply and demand in the pool. As utilization rises, lending yield increases; when utilization falls, the rate softens accordingly.

**Interest-Only Rewards**

Single-sided lenders **do not rely on paired LP fee exposure** as their primary source of return. Their earnings come from lending utilization and the vault's own accounting updates, which makes the position easier to reason about than a two-sided LP strategy.

### **Interaction Between the Lending Pool and the Swap Pool**

Single-sided lending is not isolated from the rest of the protocol. The vault tracks lend reserves, mirror reserves, pair reserves, and protocol-interest reserves together. That allows lending capital to support borrowing and margin demand while still preserving an explicit accounting boundary for each reserve type.

![](/assets/v2/lending-position-flow.svg)

Withdrawals are therefore constrained by available liquidity and current pool utilization. Users can withdraw from their lending position, but heavily utilized pools may have less immediately free liquidity than lightly utilized ones.

### Tokenization of Deposits

In v2.2, the user's claim on a single-sided deposit is represented by a **lending position NFT**:

* **Ownership**: the NFT identifies the owner, pool, and direction of the lending position.
* **Accrued Value**: the amount redeemable from the position changes over time as deposit cumulative values evolve.
* **Withdrawal Constraints**: redemptions are still limited by available pool liquidity at the time of withdrawal.

### Role of Single-Sided Lenders

Single-sided lenders play a crucial role in the Likwid ecosystem by providing liquidity in a **controlled, risk-managed way**. Their contributions have several benefits:

* **Single-asset exposure:** They remain exposed to one asset rather than a paired LP mix.
* **Yield from real protocol demand:** Borrowers and margin traders are the source of lender return.
* **Vault-level transparency:** The reserve and interest model is visible in protocol state rather than hidden behind a wrapper token.
