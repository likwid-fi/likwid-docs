---
title: "Single-Sided Lending Liquidity"
description: "*Single-sided lending liquidity (also known as indirect liquidity providing) allows DeFi users to earn yield by depositing a single token into a lending pool.* This mechanism focus"
---

*Single-sided lending liquidity (also known as **indirect liquidity providing**) allows DeFi users to earn yield by depositing a single token into a lending pool.* This mechanism focuses on interest income from lending, without the complexity of providing two assets or exposure to impermanent loss that traditional liquidity providers face. By separating lending from trading, single-sided liquidity offers a streamlined way to participate in DeFi lending: users supply one asset, and in return earn interest from borrowers, rather than a share of trading fees.

### Introduction

Single-sided lending liquidity enables users to deposit **only one type of token** into a liquidity pool and earn yield on it. This deposit serves as one side of liquidity that leveraged traders can borrow against, effectively replacing what would otherwise be a “debt” token in the pool. Unlike standard two-sided liquidity provision (which earns trading fees but incurs impermanent loss risk), single-sided lending focuses solely on lending interest as the source of income. This approach provides an **isolated, lower-risk yield** opportunity for lenders, who are not directly exposed to the price fluctuations between two assets or the impermanent loss that comes with providing a token pair.

### Key Mechanism

**Single Asset Deposit**

Users supply *only one asset* (e.g. Token A) into a dedicated lending pool. They do not need to provide a pairing token, simplifying the process. This one-sided deposit effectively fills the role of the missing counter-asset in a leveraged liquidity position, allowing borrowers to take that asset and trade or leverage it.

**Replacement of Debt Tokens**

**I**n these pools, the user’s deposit replaces pre-minted debt tokens that would otherwise represent the borrowed half of a liquidity pair. In other words, the liquidity pool is initially funded with “placeholder” debt for one side; when a single-sided lender deposits actual Token A, it takes the place of that debt, providing real liquidity for borrowers to use.

**Liquidity Certificate (Interest-Bearing Token)**

In return for the deposit, the lender receives a **liquidity certificate token** (for example, *lTokenA* if Token A was deposited). This interest-bearing token represents the lender’s stake in the pool and entitles them to their deposited asset plus accrued interest  It functions similarly to Compound’s cTokens or Aave’s aTokens, accruing value as borrowers pay interest.

**Dynamic Interest Rate**

The interest rate earned on the deposited asset is **dynamic**, adjusting algorithmically based on supply and demand (utilization) in the pool. This part is same to V1.As more of Token A is borrowed, the borrow rate rises, which in turn increases the lender’s APY; if borrowing demand falls, the rate lowers accordingly .&#x20;

**Interest-Only Rewards**

Single-sided lenders **do not receive trading fees** from the AMM pool. Their sole source of earnings is the interest paid by borrowers who take their Token A to trade .Lenders avoid the volatility and impermanent loss associated with it, earning a more predictable interest income.

### **Interaction Between the Lending Pool and the Swap Pool**

By injecting liquidity into the lending pool, priority will be given to ensuring sufficient liquidity in the trading pool. The debt tokens will be swapped out from the trading pool, and once the liquidity in the lending pool is exhausted, available liquidity from the liquidity pool will be consumed. However, when calculating earnings, the borrowable liquidity in the trading pool will also be considered as liquidity in the lending pool. In other words, some liquidity is shared between the trading pool and the lending pool.

&#x20;An example is provided below.

![](/assets/gitbook/spaces-2FdZGvDixUA5eWtjX2MfjG-2Fuploads-2FAfwfocW4Lv11GW9txG4H-2Ffile.excalidraw-ced276a8d6.svg)

The same principle applies when users withdraw liquidity. Whether it's the shared portion or the separate portion in the lending pool, they will be treated with the same priority for withdrawal. In the contract implementation, liquidity will be withdrawn primarily from the lending pool.

### Tokenization of Deposits

When users deposit into the single-sided pool, they receive a **tokenized claim** on their contribution:

* **Liquidity Certificate Token:** The deposited asset is immediately tokenized into an interest-bearing token (e.g., *lTokenA*). This token is pegged 1:1 to the underlying asset and automatically accrues interest over time . It serves as a receipt for the deposit; for instance, depositing 100 Token A might yield 100 lTokenA initially, and as interest accrues, those 100 lTokenA will be redeemable for >100 Token A.
* **Accrued Interest and Redemption:** The value of the certificate token grows as borrowers pay interest. Holders of lTokenA can redeem it at any time for their share of the underlying Token A plus any earned interest, **provided there is sufficient liquidity in the pool** to withdraw ([Lending Pools | Tarot](https://docs.tarot.to/tarot-protocol/lending-pools#lending)). The requirement for available liquidity means if nearly all Token A is lent out (high utilization), a lender may need to wait or withdraw partially until some loans are repaid or new Token A liquidity is added. This safeguard ensures the pool remains solvent.
* **Transferability:** In many implementations, the liquidity certificate tokens are ERC-20 tokens, meaning lenders could potentially transfer or trade their interest-bearing tokens. However, their primary function is to be **redeemed on-demand** for the underlying asset. The dynamic exchange rate (underlying per lToken) increases over time in favor of the lToken holder, reflecting accumulated interest.

### Role of Single-Sided Lenders

Single-sided lenders play a crucial role in the Likwid ecosystem by providing liquidity in a **controlled, risk-managed way**. Their contributions have several benefits:

* **Isolated, No-IL Liquidity Provision:** They supply liquidity without taking on impermanent loss. By lending one asset instead of providing two, lenders remain exposed only to the asset they deposit (similar to holding it, but now earning yield). This isolation makes the strategy attractive for those who want yield on an asset without the complexity of managing LP token volatility.
* **Fuel for Leveraged Trading/Yield Farming:** Single-sided deposits provide the **borrowable inventory** that leveraged traders and yield farmers draw upon In essence, lenders are enabling others to take leveraged positions (e.g. borrow Token A to add to an AMM pool or margin trade). This support boosts the overall liquidity and volume in the ecosystem: borrowers can amplify positions, and in return they pay interest to lenders. The relationship is symbiotic — lenders earn passive income, while borrowers gain access to liquidity to execute their strategies.
* **Predictable Interest-Based Returns:** Lenders earn yield through a straightforward interest mechanism, which can be more predictable than the volatile returns from direct LP positions. Their ROI comes from a **transparent borrowing rate** curve, rather than relying on trading fees which depend on market volume and can fluctuate. While the interest rate itself varies with utilization, the factors affecting it (borrow demand and supply) are observable and governed by the protocol’s rate model — giving lenders a clearer expectation of how their yield will respond to market conditions. This setup can particularly appeal to more conservative DeFi participants seeking stable returns in the same asset they deposit.
* **Dynamic Stabilization of Liquidity:** By participating in single-sided lending, lenders help **stabilize the broader lending and AMM ecosystem**. As interest rates rise and fall with utilization, lenders adding or removing capital will naturally shift to where returns are highest, distributing liquidity efficiently across markets. This dynamic allocation means that liquidity gets directed to where it’s most needed (higher demand), improving capital efficiency. In Likwid, single-sided pools act as shock absorbers for volatility in borrow demand — high demand pulls in more lenders (drawn by higher APR), while low demand releases liquidity to other opportunities, keeping the system balanced.

###
