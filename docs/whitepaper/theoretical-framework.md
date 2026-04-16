---
title: "Theoretical Framework"
description: "Likwid v2.2 combines AMM liquidity, utilization-based lending, vault-centric execution, internal mirror accounting, and native fee and liquidation controls."
---

Likwid v2.2 combines automated market making, utilization-driven lending, internal debt accounting, and vault-level risk controls in a single pool architecture. The main design choices are implemented directly in `LikwidVault` and the position-manager contracts that sit on top of it.

**Automated Market Maker (AMM) Foundations**

At the core of Likwid is an AMM-like reserve system that allows users to trade against pooled liquidity rather than against individual counterparties. This provides several benefits:

* **Continuous Liquidity**: Liquidity is always available for trading, as it is pooled and shared by all participants. Users can trade at any time without waiting for a counterparty to appear.
* **No Counterparty Dependency**: Unlike traditional markets that require buyer-seller matches, Likwid leverages liquidity pools, reducing dependency on specific market participants. This enhances both the efficiency and reliability of the trading system.

The AMM mechanism is especially useful for facilitating derivatives activities, as it ensures that traders can always find liquidity to execute short positions, even in volatile markets.

**Pooling Mechanism and Liquidity Management**

Likwid adopts a pooled funding mechanism where liquidity provided by users is consolidated into shared pool state inside `LikwidVault`. This allows:

* **Decentralized Borrowing**: Users seeking leveraged or borrow-like exposure can draw from pool reserves without requiring direct counterparties.
* **Optimized Utilization**: By combining liquidity into one vault-managed system, the protocol maximizes capital efficiency. Loans are not individually matched; they are accounted for through lend reserves, mirror reserves, and cumulative state.
* **Specialized user entrypoints**: `LikwidPairPosition`, `LikwidLendPosition`, and `LikwidMarginPosition` each expose a user-facing NFT position type while settling against the same pool core.

The pooled model allows the system to determine real-time rates based on demand, mirror utilization, and available reserves, incentivizing liquidity provision through native interest-rate adjustments.

**Vault-Centric Execution and Native Controls**

Likwid v2.2 executes core state transitions directly through `LikwidVault` and its manager contracts. This means fee logic, liquidation logic, and reserve transitions are protocol-native rather than delegated to an external extension layer.

* **Dynamic Fee Calculation**: The protocol computes swap fees by comparing live pair reserves with truncated reserves and scaling fees when price movement becomes large.
* **Margin-Specific Fees**: Pools store both a swap fee and a margin fee, allowing margin activity to be charged separately from ordinary swaps.
* **Low-Fee-Pool Restrictions**: Margin creation is blocked on pools whose base LP fee is too low, preventing leverage from entering pools that are not configured for margin risk.
* **Insurance-Fund Accounting**: Donations and liquidation flows can route value into insurance funds that help absorb stress events.

These controls are part of the vault's own pool state and manager logic.

**Internal Synthetic Accounting and Mirror Reserves**

Earlier drafts of the documentation used symbols such as `y′` or `x′` to describe synthetic exposure. In v2.2, those symbols are best understood as accounting notation rather than as standalone user-facing ERC-20 tokens. The current implementation tracks leveraged exposure through:

* **Margin position state** held by `LikwidMarginPosition`
* **Mirror reserves** inside the vault
* **Balance deltas** applied during open, repay, close, and liquidation flows
* **Position NFTs** that identify the owner and state of each open exposure

This approach preserves the conceptual meaning of synthetic exposure without claiming that the protocol deploys a separate external synthetic-token contract for users.

**Dynamic Interest Rate Model**

The interest rate in Likwid is dynamically adjusted based on utilization. In v2.2, borrow-rate growth is driven by packed `MarginState` parameters such as `rateBase`, utilization thresholds, and low/middle/high rate multipliers:

* **Low Utilization**: When pool utilization is low, the interest rate remains low, encouraging borrowing and utilization of the funds available.
* **High Utilization**: As utilization increases, the interest rate rises, which disincentivizes borrowing and encourages liquidity providers to deposit more funds. This ensures that liquidity is always appropriately incentivized and aligned with market needs.

This model achieves two main goals:

1. **Optimal Capital Utilization**: Ensuring that the available liquidity is effectively used, with minimal idle funds.
2. **Stability and Liquidity Assurance**: Maintaining sufficient liquidity at all times by dynamically adjusting incentives to match supply with demand.

**Clearing Mechanism for Liquidation**

A major part of risk management in Likwid is ensuring that positions are properly collateralized. When the collateral value of a short position falls below the required liquidation threshold, the protocol initiates liquidation:

* **Open Liquidator Access**: Any external liquidator can call the liquidation entrypoints if a position has crossed the configured threshold.
* **Two Liquidation Paths**: The manager supports internal unwind (`liquidateBurn`) and external repayment (`liquidateCall`) paths.
* **Reserve-Aware Checks**: Liquidation logic references current pair reserves, truncated reserves, debt, and collateral state to decide how much can be released, repaid, or routed to the insurance fund.

By implementing liquidation directly in the manager and vault state machine, Likwid reduces insolvency risk without relying on external lifecycle triggers.
