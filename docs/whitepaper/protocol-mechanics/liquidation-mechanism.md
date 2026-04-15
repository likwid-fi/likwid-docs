---
title: "Liquidation Mechanism"
description: "The protocol triggers liquidation when a user's ​margin level falls below the ​liquidation threshold of ​1.1."
---

The protocol triggers liquidation when a user's ​**margin level** falls below the ​**liquidation threshold** of ​**1.1**.

1. ​**Margin Level Calculation**\
   Margin level is defined as the ratio of a user's collateral asset value to their outstanding debt:

   ```markdown
   Margin Level = Asset Value / Debt
   ```

   * ​**Asset Value**: Real-time value of collateral, calculated using Truncated oracle prices
   * ​**Debt**: Total borrowed amount + accrued interest
2. ​**Liquidation Threshold**
   * When margin level drops to ​**1.1**, the position becomes undercollateralized and liquidation begins
   * Example: 110collateral/100 debt = 1.1 (at liquidation threshold)

**Why 1.1 Threshold?**

* Provides 10% buffer against price volatility and truncated oracle latency
* Ensures protocol solvency while allowing reasonable market movements
* Unlike borrow positions, uses real-time prices without slippage adjustments

This mechanism ensures the timely liquidation of undercollateralized positions, thereby reducing the risk of insolvency and helping to maintain the health and stability of the liquidity pool. By allowing anyone to participate in the liquidation process, Likwid ensures that incentives are aligned to encourage rapid and efficient liquidation, especially in volatile market scenarios.

When the collateral is insufficient to cover the debt, the liquidator only needs to repay debt equivalent to 95% of the collateral's value in exchange for the entire collateral.

#### Methods of Liquidation

The protocol supports two liquidation methods to ensure debt repayment:

1. ​**Self-Swap Liquidation**\
   When triggered, the protocol automatically swaps the user's collateral into the debt token ​**within its own liquidity pool** to repay the debt.\
   Only available if the pool has ​**sufficient liquidity** to absorb the collateral sale.
2. ​**Direct Repayment**\
   The liquidator (or user) repays the debt ​**directly with the borrowed token** to unlock the collateral.

   Example: A liquidator provides USDT to repay the debt and claims the borrower's ETH collateral.

#### Risks Associated with Liquidation

**1. Risk of Delayed Liquidation**\
Price volatility  latency may delay liquidation triggers, allowing debt to exceed collateral value.

* ​**Impact**:
  * Protocol may incur bad debt if collateral value < debt after liquidation.
  * Example: If ETH price drops 20% before liquidation, but the threshold only allows a 10% buffer.
* ​**Mitigation**:
  * Dynamic monitoring with high-frequency price updates.

**2. Liquidity-Dependent Risks**

* ​**Self-Swap Failure**:
  * If the pool lacks liquidity to absorb collateral sales:
    * Self-swap liquidation ​**fails automatically**.
    * Debt ​**must** be repaid via direct repayment.
* ​**lToken Redemption Risk**:

  * In illiquid markets, liquidated collateral may be returned as ​**lToken**
  * ​**lToken** Represents a claim on the original collateral.
  * **lToken** Redeemable 1:1 for the original token ​**only when pool liquidity is restored**.

#### **The difference between the liquidation price for borrow positions and the margin level**&#x20;

* ​**Borrow Liquidation**:
  * The liquidation price ensures that the collateral, when sold in the pool, covers the debt ​**after accounting for slippage**.
  * Collateral value is calculated based on the ​**average execution price**when liquidating the position in the pool (impacted by liquidity depth).
  * Designed to guarantee that pool liquidity can absorb the sale without protocol losses.
* ​**Margin Level**:
  * Margin requirements typically use the ​**real-time market price** (e.g., oracle price) to calculate collateral value, ​**ignoring slippage**.
  * Focuses on maintaining a threshold (e.g., 150%) without considering liquidity depth.

**Key Difference**:\
Borrow liquidation prices are ​**liquidity-dependent** (slippage-adjusted), while margin levels of margin buy/sell rely on ​**instantaneous pricing** (slippage-ignored).Borrow liquidation prices are liquidity-dependent (slippage-adjusted) is to prevent arbitrage in pools with relatively shallow liquidity, where borrowing could yield more tokens compared to selling.&#x20;
