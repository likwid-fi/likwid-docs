---
title: "Repayment"
description: "Partial Repayment: Users may partially settle their debt by returning Y, which the protocol exchanges for Synthetic Token（for example y'）, gradually unlocking collateralized X,the "
---

**Partial Repayment**: Users may partially settle their debt by returning Y, which the protocol exchanges for Synthetic Token（for example y'）, gradually unlocking collateralized X,the extra Y will be attributed to the LPs.**Full Repayment**: Full repayment involves returning the entire quantity of Y in the position, closing the position and reclaiming the NFT.

In the Likwid Protocol, users can close their margin positions through two primary methods: **Close Position** and **Direct Repayment**. Each method offers distinct mechanisms for debt settlement and collateral release. users can close their borrowing positions through **Direct Repayment.**

**Close Position**

This method allows users to repay their debt by converting their collateral into the borrowed asset within the protocol's liquidity pool.

* **Process**:
  1. The user initiates a close position request.
  2. The protocol verifies that the liquidity pool has sufficient depth to handle the collateral-to-debt token swap.
  3. Upon confirmation, the protocol executes the swap, converting the user's collateral into the borrowed asset.
  4. The obtained tokens are used to repay the outstanding debt.
  5. Any surplus collateral, after debt settlement, is returned to the user.
* **Considerations**:
  * This method is contingent on the availability of adequate liquidity in the pool.
  * In volatile market conditions, slippage may affect the swap rate, potentially impacting the amount of collateral returned.

#### Direct Repayment

In this method, the user or a third party repays the debt directly using the borrowed asset, facilitating the release of the collateral.

* **Process**:
  1. The user or a liquidator provides the exact amount of the borrowed asset to the protocol.
  2. The protocol applies this payment to the outstanding debt.
  3. Upon full repayment, the user's collateral is unlocked and made available for withdrawal.
* **Considerations**:

  * This method requires the user or third party to have access to the borrowed asset.

By offering these two repayment methods, the Likwid Protocol provides flexibility for users to manage their positions effectively, catering to varying preferences and market conditions.
