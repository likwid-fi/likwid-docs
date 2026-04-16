---
title: "Margin Position Mechanics"
description: "Margin positions in Likwid v2.2 are opened through LikwidMarginPosition and settled against LikwidVault using native fee, mirror-reserve, and liquidation controls."
---

In margin trading operations, users open leveraged exposure through `LikwidMarginPosition` and settle against reserves held by `LikwidVault`. Conceptually, the protocol still reasons about mirrored reserve expansion with the formula:

$$
(x+x')(y+y′)=k
$$

where:

* x: Represents the amount of X.
* x′: The mirrored accounting side for X used inside protocol state.
* y: Represents the target ERC-20 token quantity.
* y′: The mirrored accounting side for Y used inside protocol state.

#### Fee Structure

Margin positions in v2.2 are charged through a combination of native pool parameters and swap execution logic:

* **Swap fee (`PoolKey.fee`)**: the pool's base LP fee, which can expand dynamically when price movement against truncated reserves becomes large.
* **Margin fee (`PoolKey.marginFee`)**: an additional fee collected specifically when leverage is added.
* **Margin swap fee accounting**: margin open and margin close flows can route through the swap engine, so the final cost depends on both the pool fee model and the size of the requested state change.
* **Low-fee-pool restriction**: the current manager rejects margin creation on pools whose base LP fee is below the configured threshold for margin usage.

See [Dynamic Fee Strategy Against MEV and Arbitrage Attacks](/whitepaper/risk-management-and-strategies/dynamic-fee-strategy-against-mev-and-arbitrage-attacks) for the fee engine details.

#### Margin Position Workflow

Likwid's margin capabilities let users post collateral, borrow against pool liquidity, and receive an NFT that represents the resulting position state.

![](/assets/v2/margin-position-flow.svg)

1. **Collateralization**: Users pledge X as collateral to secure a margin position.
2. **Leverage Selection**: The manager accepts leverage up to the protocol's configured maximum and checks that the requested pool is eligible for margin usage.
3. **Borrow and Fee Computation**: `LikwidMarginPosition` computes the borrow amount, deducts any margin fee, and applies swap-fee logic against the current pair and truncated reserves.
4. **Vault Settlement**: `LikwidVault` updates real, mirror, pair, lend, and protocol-interest reserves through the margin balance flow.
5. **Position NFT**: The protocol issues or updates a margin position NFT that records ownership and the evolving collateral/debt state.

#### Ongoing Risk Controls

Once opened, the position is monitored using the protocol's native margin levels and reserve state:

* **Minimum margin / borrow levels** guard position health after each update.
* **Liquidation levels** define when a position can be unwound by the protocol or by an external liquidator.
* **Insurance-fund accounting** can absorb part of stressed outcomes during liquidation flows.

This is all implemented directly in the v2.2 margin manager and vault.
