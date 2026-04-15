---
title: "Theoretical Framework"
description: "Likwid Protocol is built upon a combination of cutting-edge decentralized finance (DeFi) technologies and economic models, utilizing a theoretical framework that draws upon automat"
---

Likwid Protocol is built upon a combination of cutting-edge decentralized finance (DeFi) technologies and economic models, utilizing a theoretical framework that draws upon automated market makers (AMMs), algorithmic lending and borrowing, and liquidity-driven risk management. This section will discuss the theoretical basis that underpins Likwid's design, including the mechanics behind its decentralized short-selling, dynamic interest rates, liquidity provisioning, and innovative use of hooks.

**Automated Market Maker (AMM) Foundations**

At the core of Likwid is an Automated Market Maker (AMM) framework, which forms the backbone of its liquidity pools. ,Likwid allows users to trade against pooled liquidity rather than relying on an order book with individual counterparties. This provides several benefits:

* **Continuous Liquidity**: Liquidity is always available for trading, as it is pooled and shared by all participants. Users can trade at any time without waiting for a counterparty to appear.
* **No Counterparty Dependency**: Unlike traditional markets that require buyer-seller matches, Likwid leverages liquidity pools, reducing dependency on specific market participants. This enhances both the efficiency and reliability of the trading system.

The AMM mechanism is especially useful for facilitating derivatives activities, as it ensures that traders can always find liquidity to execute short positions, even in volatile markets.

**Pooling Mechanism and Liquidity Management**

Likwid Protocol adopts a pooled funding mechanism where liquidity provided by users is consolidated into shared liquidity pools. This allows:

* **Decentralized Borrowing**: Users seeking to open short positions can borrow target tokens from these pools without requiring direct counterparties.
* **Optimized Utilization**: By combining liquidity into one pool, the protocol maximizes capital efficiency. Loans are not individually matched but are dynamically drawn from the pool, ensuring efficient use of liquidity and minimizing idle funds.

The **pooled model** allows the system to determine real-time rates based on the demand and supply dynamics of the liquidity pool, optimizing utilization and incentivizing liquidity provision through dynamic interest rate adjustments.

**Custom Hooks for Flexible Transaction Logic**

Hooks are a powerful tool in Likwid Protocol that enables developers to add custom logic to the trading lifecycle. Hooks can be utilized to execute logic before or after key actions such as swaps, liquidity additions or removals, and pool creation. The **flexibility of hooks** is essential to Likwid’s decentralized derivatives framework:

* **Dynamic Fee Calculation**: Hooks allow the protocol to implement custom fee calculations, including dynamic adjustments based on market conditions or pool utilization.
* **Automated Risk Management**: Hooks can trigger automated risk management protocols, such as modifying collateral requirements or fees, based on real-time market metrics.

Hooks give Likwid the ability to execute complex logic at multiple stages of a transaction, thus enabling features like custom fees, limit orders, and automated liquidity management—all of which add to the sophistication of the protocol.

**The Role of the Synthetic Token y′(or x')**

In Likwid, the synthetic token y′is created whenever a user opens a short position. y′serves as:

* **A Record of Debt**: When users collateralize assets to borrow target tokens for short-selling, the synthetic token y′ is minted as an internal record of the debt. This ensures that the short seller must eventually settle their position by returning the equivalent amount of Y tokens.
* **Non-Circulating Utility**: Unlike typical tokens, y′ is not meant for external circulation. It represents the obligations of a short seller within the protocol. This design ensures that the short seller’s debt is transparent and verifiable, while the impact on liquidity pools influences price discovery.
* **Impact on Liquidity Pools**: Despite being a non-circulating token, y′affects the y By creating y′, the protocol allows derivatives traders to effectively increase the supply in the pool, which impacts the dynamics of price discovery without requiring immediate collateral from an external source.

**Dynamic Interest Rate Model**

The interest rate in Likwid is dynamically adjusted based on pool utilization, similar to the model used by Curve Finance:

* **Low Utilization**: When pool utilization is low, the interest rate remains low, encouraging borrowing and utilization of the funds available.
* **High Utilization**: As utilization increases, the interest rate rises, which disincentivizes borrowing and encourages liquidity providers to deposit more funds. This ensures that liquidity is always appropriately incentivized and aligned with market needs.

This model achieves two main goals:

1. **Optimal Capital Utilization**: Ensuring that the available liquidity is effectively used, with minimal idle funds.
2. **Stability and Liquidity Assurance**: Maintaining sufficient liquidity at all times by dynamically adjusting incentives to match supply with demand.

**Clearing Mechanism for Liquidation**

A major part of risk management in Likwid is ensuring that positions are properly collateralized. When the collateral value of a short position falls below the required liquidation threshold, the protocol initiates liquidation:

* **Automated Liquidation Bots**: Liquidation bots are employed to monitor the health of all open positions. If a position becomes undercollateralized, the bot will initiate the liquidation process, selling the collateral and buying back the shorted assets.
* **Impact on derivatives traders**: The synthetic token y′ plays a role during liquidation, as it ensures that the debt is recorded and transparent, allowing the protocol to correctly balance the pool’s liabilities and assets after liquidation.

By implementing automated liquidation processes and ensuring transparency with synthetic debt tokens, Likwid reduces the risk of insolvency within its liquidity pools.
