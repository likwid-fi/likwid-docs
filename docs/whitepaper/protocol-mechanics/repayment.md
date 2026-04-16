---
title: "Repayment"
description: "Repayment in Likwid v2.2 is handled through manager-native repay and close flows, without any separate synthetic-token redemption step."
---

Repayment in Likwid v2.2 happens through the margin manager's own state transitions. Users do **not** redeem an external synthetic token when they reduce debt. Instead, debt, collateral, and mirrored exposure are updated directly in the vault and margin-position state.

The protocol exposes two primary ways to reduce or exit a position: **Repay** and **Close Position**.

**Close Position**

This method allows users to unwind part or all of a position by routing the close through the pool's own reserve engine.

* **Process**:
  1. The user initiates a close position request.
  2. The manager calculates the requested close ratio and checks the resulting unwind against current pool state.
  3. Upon confirmation, the protocol executes the required reserve updates and swap path.
  4. The obtained tokens are used to repay the outstanding debt.
  5. Any surplus collateral, after debt settlement, is returned to the user.
* **Considerations**:
  * This method is sensitive to current reserve depth and fee conditions.
  * Dynamic fees can increase the cost of large close operations in stressed conditions.

#### Direct Repayment

In this method, the user repays some or all of the debt directly using the borrowed asset, reducing the position without requiring a full internal unwind.

* **Process**:
  1. The user provides the borrowed asset to the protocol through the repay flow.
  2. The protocol applies this payment to the outstanding debt.
  3. Depending on the remaining debt, collateral can be partially released or the position can later be fully closed.
* **Considerations**:
  * This method requires access to the borrowed asset.
  * It is useful when the user wants to deleverage without forcing the protocol to unwind the entire position at once.

Together, these flows give users flexibility to deleverage gradually, exit completely, or prepare a position for full closure through native manager logic.
