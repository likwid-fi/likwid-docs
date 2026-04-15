---
title: "Synthetic Token"
description: "The derivatives mechanism in Likwid Protocol relies on a special synthetic token y′ or x', which is minted by the Hooks contract when a user opens a short position. we use y'to exp"
---

The derivatives mechanism in Likwid Protocol relies on a special synthetic token y′ or x', which is minted by the Hooks contract when a user opens a short position. we use y'to explain, y′ is a synthetic token representing the target token Y, with the following characteristics:

* **Minting Mechanism**: When a user collateralizes the base token X to open a short position, the Hooks contract mints y′ tokens, which serve as the user's short position record within the protocol. These synthetic tokens do not enter the market directly but are instead used as proof of the user's debt obligation.
* **Debt Record**: The existence of y′ tokens essentially tracks the user’s short debt. Each short position corresponds to a specific amount of y′ tokens, which serves as a record of the user's obligation to the protocol. When a user closes a position, they must return the equivalent amount of Y tokens to burn the corresponding y′ tokens.
* **Impact on Liquidity Pools**: Although y′ tokens do not circulate in the market, they have a tangible impact on the liquidity pool. When y′ is minted and the short-selling operation is executed, the amount of target tokens Y in the liquidity pool changes, which in turn affects the supply-demand balance. Specifically, the user borrows and sells the target token Y, increasing  the number of (Y + Y′ ) tokens  in the liquidity pool, leading to a price of X increase due to the shift in supply-demand dynamics. Therefore, the short-selling operation not only affects the user's balance sheet but also impacts the pricing in the liquidity pool.

This derivatives mechanism, achieved through the use of the synthetic token y′, allows users to conduct short positions without requiring a counterparty, while also ensuring transparency and traceability of the entire operation. Moreover, the design of y′ provides a clear record of the short seller's debt within the protocol, offering double-layered security for both users and the protocol.
