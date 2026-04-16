---
title: "Liquidation Mechanism"
description: "Likwid v2.2 liquidates undercollateralized margin positions through native manager logic, with burn and call liquidation paths plus insurance-fund accounting."
---

The protocol triggers liquidation when a margin position falls below the configured liquidation level. In the current default v2.2 margin settings, that threshold is initialized at **1.10**.

1. ​**Margin Level Calculation**\
   Margin level is defined as the ratio of a user's collateral value to outstanding debt:

   ```markdown
   Margin Level = Asset Value / Debt
   ```

   * ​**Asset Value**: evaluated from current pool state, including reserve-aware price references
   * ​**Debt**: borrowed amount plus accrued interest
2. ​**Liquidation Threshold**
   * When margin level drops to ​**1.1**, the position becomes undercollateralized and liquidation begins
   * Example: 110collateral/100 debt = 1.1 (at liquidation threshold)

**Why 1.1 Threshold?**

* Provides a buffer against price volatility and reserve movement
* Keeps liquidation rules explicit in manager state
* Works together with truncated reserves, pair reserves, and insurance-fund accounting

This mechanism ensures the timely liquidation of undercollateralized positions, thereby reducing the risk of insolvency and helping to maintain the health and stability of the liquidity pool. By allowing anyone to participate in the liquidation process, Likwid ensures that incentives are aligned to encourage rapid and efficient liquidation, especially in volatile market scenarios.

When collateral is insufficient to cover debt cleanly, losses and any fund contribution are handled through the protocol's own liquidation math and insurance-fund accounting.

#### Methods of Liquidation

The protocol supports two liquidation methods to ensure debt repayment:

1. ​**Burn Liquidation (`liquidateBurn`)**\
   The protocol unwinds the position through its internal margin and swap accounting, burns the position token, and calculates any liquidator profit through the manager's native liquidation path.
2. ​**Call Liquidation (`liquidateCall`)**\
   The liquidator repays the debt directly and claims the corresponding collateral release path exposed by the manager.

   Example: a liquidator can provide the borrowed asset, repay the debt, and receive the released collateral if the trade is profitable.

#### Risks Associated with Liquidation

**1. Risk of Delayed Liquidation**\
Fast price movement can still change realized outcomes between health checks and execution.

* ​**Impact**:
  * Protocol may incur bad debt if collateral value < debt after liquidation.
  * Sharp moves can reduce residual collateral available to the liquidator or to the pool.
* ​**Mitigation**:
  * reserve-aware liquidation checks
  * bounded price-reference movement
  * insurance-fund accounting

**2. Liquidity-Dependent Risks**

* ​**Internal unwind sensitivity**:
  * liquidation outcomes depend on current pair reserves, truncated reserves, and debt state
  * pools under stress may produce different profit/loss outcomes than calm pools
* **External liquidator capital requirements**:
  * call liquidation requires the liquidator to bring the repayment asset

#### **The difference between the liquidation price for borrow positions and the margin level**&#x20;

* ​**Margin Level**:
  * The margin level is a health threshold checked against current reserve-aware state.
  * Liquidation execution then determines the exact realized unwind through the manager's burn or call path.

**Key Difference**:\
The health check determines *whether* liquidation is allowed, while the liquidation path determines *how* the position is unwound in practice.
