---
title: "Synthetic Token"
description: "In Likwid v2.2, y′ and x′ are best understood as internal accounting notation for mirrored exposure and debt state, not as standalone external tokens."
---

Earlier Likwid drafts used `y′` or `x′` to describe the mirrored side of a leveraged position. In the current v2.2 implementation, that notation does **not** correspond to a separate user-facing ERC-20 token. Instead, the protocol tracks synthetic exposure through internal vault and position-manager state.

When this page refers to `y′` or `x′`, it should be read as shorthand for the following v2.2 mechanisms:

* **Mirror reserves**: the vault maintains mirror-side accounting that represents borrowed or mirrored exposure alongside real reserves and lend reserves.
* **Margin position state**: `LikwidMarginPosition` stores each position's collateral, debt, and cumulative accounting values.
* **Position NFT ownership**: the user's claim over an open margin position is represented by an NFT rather than by a freely circulating synthetic token.
* **Balance-delta settlement**: opening, repaying, closing, and liquidating a position updates pool state through explicit balance deltas instead of by minting an external accounting token.

This keeps the conceptual value of `y′` useful for explaining protocol math, but it avoids suggesting that Likwid v2.2 depends on a separate external execution module or an externally circulating synthetic token contract.

From a user perspective, the important consequence is simple: the protocol still records leveraged debt and mirrored exposure, but that record lives inside the vault and manager contracts rather than in a standalone token.
