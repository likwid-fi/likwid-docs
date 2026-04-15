---
title: "Margin Position Mechanics"
description: "In margin trading operations, users acquire Y using X. The protocol’s pricing mechanism follows the formula："
---

In margin trading operations, users acquire Y using X. The protocol’s pricing mechanism follows the formula：

$$
(x+x')(y+y′)=k
$$

where

* x: Represents the amount of X.
* x′: A mapped derivative token  for X created by the protocol.
* y: Represents the target ERC-20 token quantity.
* y′: A mapped derivative token for Y created by the protocol.

**Fee Structure**: Dynamic fees are employed to adjust trading costs based on market volatility. For margin positions, a base fee of 0.3% is imposed, Dynamic fees are proportional to the impact magnitude of the transaction on the liquidity pool; the greater the impact, the higher the dynamic fee.（[learn more detail of Dynamic fees here](/whitepaper/risk-management-and-strategies/dynamic-fee-strategy-against-mev-and-arbitrage-attacks) ）

Likwid’s margin position capabilities enable users to leverage their X holdings, creating a speculative position against Y. Margin Position Workflow:

![](/assets/gitbook/spaces-2FdZGvDixUA5eWtjX2MfjG-2Fuploads-2FHmTMXvB4Wv0HAZGJmNHS-2Fwhiteboard_exported_image-20-2-e00460e7d5.png)

1. **Collateralization**: Users pledge X as collateral to secure a margin position.
2. **Leverage Selection**: Users select a leverage factor (0.1-10x), with a default collateral ratio of 50%, based on risk tolerance.
3. **Token Quantity Computation**:
   * Margin Token Quantity：

     $$
     num=\frac a {rm} \cdot  \frac {mul} p
     $$

     &#x20; where：

     * a: X collateral.
     * rm: Collateral ratio, set at 50%.
     * mul: User-selected leverage multiplier.
     * p: Current price of Y.
4. **Token Minting and Swap Execution**: The protocol mints the calculated quantity of mapped tokens z′and executes a swap for X, which is stored in the protocol contract.
5. **Position NFT**: The protocol issues an NFT representing the user's Margin position, recording:
   1. Collateral X.
   2. Margin token quantity.
   3. Leverage multiplier.
