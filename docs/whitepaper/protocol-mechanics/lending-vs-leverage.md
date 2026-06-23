---
title: "Lending vs. Leverage"
description: "On Likwid's single constant-product curve, plain borrowing and leverage use mirror reserves differently: borrowing never moves the quoted price, while opening leverage is a real swap that does."
---

Likwid runs spot, lending, and leverage on one curve:

$$
(x + x')(y + y') = k
$$

where `x`, `y` are the pool's **real reserves** and `x'`, `y'` are **mirror reserves** — the internal "IOU" side that lets the pool be borrowed against and levered on without an external counterparty. Two user actions touch this curve very differently, and the difference explains why borrowing on Likwid cannot distort the price while leverage moves it on purpose.

#### Price comes from the expanded reserves

The quoted price is always read from the **expanded** reserves, not the raw ones:

$$
\text{price} = \frac{x + x'}{y + y'}
$$

When something is borrowed, the borrowed amount does not simply disappear from the books — it is recorded as a mirror reserve. So `x + x'` can stay constant even as real reserves move. That single fact is what separates lending from leverage.

#### Lending / borrowing — no swap, price unchanged

A pure loan is when a user posts collateral and borrows the other asset to take it away.

* No trade is executed against the curve.
* The borrowed amount leaves **real** reserves, but the same amount is added back as a **mirror** reserve.
* Because `x + x'` and `y + y'` are unchanged, **the quoted price does not move.**

This is the key safety property: borrowing on Likwid cannot be used to pump or dump the quote. A naive "lend straight out of an AMM" design would let a borrower drain real reserves and shift the price artificially; mirror reserves prevent that. Borrowing changes only *who holds the assets*, not *what the pool quotes*.

#### Leverage — a real swap, price moves

Opening a leveraged position is the opposite — a genuine trade against the pool.

* To build, say, a 3× long, the protocol borrows the quote asset and **swaps it through the curve** to buy the target.
* That swap moves the pricing point along the curve — `x + x'` and `y + y'` change — so **price moves**, exactly as any market buy or sell would.
* The borrowed leg is still tracked as a mirror reserve (it is the debt the position owes), and the position size is `collateral × leverage`.

![Leverage on the constant-product curve](/assets/v2/leverage-curve.gif)

So leverage is *meant* to move the price: it is a directional bet executed against real depth. The mirror bookkeeping here does not freeze the price — it records the borrowed obligation and bounds how far the pool can be extended.

#### Side by side

| | Lending / borrowing | Leverage |
|---|---|---|
| Swap against the curve | No | Yes |
| Effect on quoted price | None — price is frozen | Moves along the curve |
| What the position holds | collateral + debt | a `collateral × leverage` directional position |
| Role of mirror reserves | offset the outflow → keep price still | record the borrowed leg (debt) and bound expansion |

#### Bounded the same way

Both actions are limited so a single pool can never be over-extended: a cap on leverage, a cap on the mirror share of reserves, and **time-smoothed reserve references** for liquidation so a one-block price spike from a flash loan cannot force unfair liquidations or enable cheap manipulation. See [Truncated Price](/whitepaper/risk-management-and-strategies/truncated-price) and [Margin Position Mechanics](/whitepaper/protocol-mechanics/margin-position-mechanics) for the details.
