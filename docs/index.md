---
title: "Introduction"
description: "Likwid is an oracle-free, order-book-free protocol for spot trading, lending, and leverage — all priced on a single constant-product curve: (x + x′)(y + y′) = k."
---

<div class="docs-home-logo">
  <picture>
    <source srcset="/assets/brand-kit/logo-wordmark-white.png" media="(prefers-color-scheme: dark)">
    <img src="/assets/brand-kit/logo-wordmark-black.png" alt="likwid.fi">
  </picture>
</div>

#### One curve. Spot, lending, and leverage — all native.

Likwid is a decentralized protocol for **trading, lending, and leveraged exposure** on any ERC-20 pair. It needs **no price oracle, no order book, and no counterparty matching**. The price you trade at, the funds you borrow, and the leverage you take are all derived from one place: the liquidity pool itself.

Each pair lives in its own **unified pool** — a single pool whose one curve serves spot, lending, and leverage at the same time. Pools are **isolated by pair**: each has its own reserves and its own curve, so a loss in one market can never spill into another. This is *not* a single cross-asset money market — risk does not pool across pairs.

That entire design reduces to a single equation:

$$
(x + x')(y + y') = k
$$

Here `x` and `y` are the pool's **real reserves** of the two assets, and `x'` and `y'` are **mirror reserves** — an internal accounting layer that lets the protocol borrow against, and take leverage on, the very same pool. Price is read straight from the reserves; `k` is the invariant the pool defends.

![Leverage on the constant-product curve](/assets/v2/leverage-curve.gif)

#### Why this matters

Most leverage and derivatives venues depend on two things a fresh token doesn't have: an external **price feed** and a **book of counterparties**. Both are points of failure — an oracle can lag, go offline, or be manipulated; an order book needs makers and depth that a brand-new market simply lacks.

Likwid removes both. Because price comes from pool reserves and the only liquidity needed *is* the pool, **a token can be traded with leverage — long or short — the moment it has a pool.** That is something oracle- and order-book-based platforms structurally cannot do.

* **No oracle, ever.** Price = reserve ratio. There is nothing external to lag or spoof.
* **No order book.** Longs and shorts execute directly against pool liquidity, so depth scales with the pool.
* **No counterparty matching.** Borrowing and leverage are funded from the pool's own reserves, not bilateral deals — which means instant, capital-efficient execution.

#### How leverage works

Opening a leveraged position is a **real trade against the pool**. To take, say, a 3× long, the protocol borrows the quote asset and buys more of the target with it. That borrowed amount is tracked as a **mirror reserve** (`x'` / `y'`), which expands the pool's effective depth — so your leverage is funded by the pool's own liquidity, not by an outside lender.

As the trade executes, the **pricing point slides along the curve**: price moves exactly as any market trade would, while `k` stays constant. Your leverage taps the same liquidity that backs spot, so depth scales with the pool — no market maker, no oracle. The animation above shows it: mirror reserves expand the depth, the point slides along the curve, and the curve itself never deforms.

> Plain lending and leverage behave differently on this same curve. For the full mechanism, see [Lending vs. Leverage](/whitepaper/protocol-mechanics/lending-vs-leverage) in the whitepaper.

#### Bounded by design

Living on a single curve means risk is bounded by the curve itself, not by a third party:

* **Capped leverage and a capped mirror share** keep any single pool from being over-extended.
* **Time-smoothed reserve references** drive liquidation and fee decisions, so a one-block price spike from a flash loan cannot trigger unfair liquidations or cheap manipulation.
* **Dynamic fees** rise steeply as a trade pushes price away from that smoothed reference, pricing predatory MEV out of the market — again, with no oracle involved.

#### For liquidity providers

Liquidity providers supply capital into the same unified pool that powers spot, lending, and leverage for that pair. That capital earns from **swap fees**, from **utilization-based lending yield**, and from **dynamic fees and interest accrual** — all settled natively on-chain, with real, mirror, pair, and lend reserves accounted separately so one pool can serve many uses at once. Withdrawals are not gated by a counterparty; they are met from the pool.

#### For traders

Traders get **oracle-free price discovery**, **leverage by posting collateral**, and the ability to **go long or short directly against the pool**. Each position tracks its collateral, debt, and value over time, and can be added to, repaid, closed, or liquidated through the protocol's own native accounting — with no external execution venue anywhere in the loop.

Likwid is a concrete step toward a **fully decentralized derivatives protocol**: spot, lending, pricing, and leverage, all native to one curve.
