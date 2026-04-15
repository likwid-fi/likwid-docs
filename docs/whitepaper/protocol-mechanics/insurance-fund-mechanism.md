---
title: "Insurance Fund Mechanism"
description: "The Insurance Fund serves as the primary protective mechanism within the Likwid leveraged trading protocol. It acts as a buffer to absorb losses that exceed the value of liquidated"
---

### 1. Overview

The Insurance Fund serves as the primary protective mechanism within the Likwid leveraged trading protocol. It acts as a buffer to absorb losses that exceed the value of liquidated positions, thereby protecting the protocol and its users from systemic risk and ensuring the protocol's long-term solvency.

Instead of a single, monolithic fund, Likwid implements a more granular and robust architecture: a dedicated Insurance Fund is established for each individual liquidity pair.

This compartmentalized structure is a cornerstone of Likwid's risk management philosophy. It ensures that any losses from a liquidation are contained strictly within the pair where they occurred. The bad debt from one trading pair can never affect the solvency or the liquidity providers of another.

This design creates a robust firewall against systemic risk, preventing cross-pair contagion. It means that conservative LPs in stable pairs (e.g., ETH/USDC) are completely shielded from the risks associated with more volatile or exotic pairs. By isolating risk at the pair level, Likwid ensures not just the protocol's long-term solvency, but the independent financial integrity of each market within its ecosystem.

### 2. Core Mechanism

#### 2.1 Loss Absorption Priority

During liquidation events where the collateral value is insufficient to cover the outstanding debt, losses are prioritized in the following sequence:

Primary Absorption: Losses are first absorbed by the Insurance Fund

Protocol Debt Recording: If Insurance Fund reserves are insufficient to cover the entire loss, the remaining deficit is recorded as debt against the Insurance Fund. This debt represents a liability that must be repaid from future Insurance Fund revenues before new reserves can accumulate.

#### 2.2 Revenue Generation

During liquidation events where the collateral value exceeds the outstanding debt, the surplus (profit) is allocated as revenue to the Insurance Fund. This creates a sustainable economic model where profitable liquidations directly contribute to the protocol's safety mechanism.

### 3. Dynamic Capacity Mechanism

#### 3.1 Maximum Capacity Definition

The Insurance Fund has a maximum capacity that is determined as a fixed percentage of the protocol's historical peak Total Value Locked (TVL). This percentage is adjustable through governance mechanisms.

#### 3.2 One-Way Capacity Adjustment

\
The maximum capacity follows a unidirectional adjustment rule:

* Monotonically Increasing: The maximum capacity can only increase over time
* TVL Peak Tracking: When protocol TVL reaches new all-time highs, the maximum capacity is recalculated upward based on the new peak
* No Reduction: The maximum capacity never decreases, even if current TVL falls below historical peaks
