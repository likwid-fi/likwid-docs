---
title: "FAQ - Innovation Behind Likwid"
description: "* ​Borrow Liquidation:\n  * The liquidation price ensures that the collateral, when sold in the pool, covers the debt ​after accounting for slippage.\n  * Collateral value is calcula"
---

### **What is the difference between the liquidation price for borrow positions and the margin level in traditional margin trading?** **A**:

* ​**Borrow Liquidation**:
  * The liquidation price ensures that the collateral, when sold in the pool, covers the debt ​**after accounting for slippage**.
  * Collateral value is calculated based on the ​**average execution price**when liquidating the position in the pool (impacted by liquidity depth).
  * Designed to guarantee that pool liquidity can absorb the sale without protocol losses.
* ​**Margin Level**:
  * Margin requirements typically use the ​**real-time market price** (e.g., oracle price) to calculate collateral value, ​**ignoring slippage**.
  * Focuses on maintaining a threshold (e.g., 150%) without considering liquidity depth.

**Key Difference**:\
Borrow liquidation prices are ​**liquidity-dependent** (slippage-adjusted), while margin levels of margin buy/sell rely on ​**instantaneous pricing** (slippage-ignored).

### **Borrow liquidation prices are liquidity-dependent (slippage-adjusted), while margin levels for margin buy/sell rely on instantaneous pricing (slippage-ignored). What is the purpose of this design?**

The reason borrow liquidation prices are liquidity-dependent (slippage-adjusted) is to prevent arbitrage in pools with relatively shallow liquidity, where borrowing could yield more tokens compared to selling. The `liquidateBurn` function essentially repays the debt by performing a swap through our own pool, which is entirely dependent on the pool's liquidity.
