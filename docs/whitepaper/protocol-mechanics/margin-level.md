---
title: "Margin Level"
description: "Margin level measures the health of a leveraged position — the ratio of collateral value to debt. This article covers its meaning, the reserve-aware (truncatedReserves) calculation, and the red/yellow/green thresholds the UI uses to color position health."
---

Margin level is the core measure of how healthy a leveraged position is, defined as the ratio of a user's collateral value to outstanding debt. A higher value means a larger buffer and more safety; a lower value means the position is closer to liquidation and carries more risk.

## What It Means

Margin level compresses a position's collateral-to-debt relationship into a single comparable number. It runs through the entire lifecycle of a leveraged position and is the same scale shared by three stages:

1. **Open / add-margin check**: after opening or adding to a position, its margin level must stay at or above the minimum threshold `minMarginLevel` (default **1.17**), or the transaction is rejected.
2. **Ongoing monitoring**: users and front-ends use it to gauge in real time how much buffer remains before liquidation.
3. **Liquidation trigger**: when margin level drops to the liquidation level `liquidateLevel` (default **1.1**), the position is considered undercollateralized and enters liquidation.

## How It Is Calculated

The basic definition matches the [Liquidation Mechanism](/whitepaper/protocol-mechanics/liquidation-mechanism):

```markdown
Margin Level = Asset Value / Debt
```

* **Asset Value**: the position's collateral converted into the debt currency at the current reserve state
* **Debt**: borrowed principal plus accrued interest

Expanded into the form the protocol actually uses, asset value is a **pure spot linear conversion** based on reserve ratios:

```
positionValue = marginAmount + marginTotal          // position size (margin + leveraged part)
repayAmount   = positionValue × reserveBorrow / reserveMargin   // converted to the debt currency
marginLevel   = repayAmount / debtAmount
```

This conversion uses only the reserve ratio — it does not call AMM quotes, does not deduct LP fees, and does not account for price impact. That keeps the measure stable and easy to verify on-chain. (Internally the contract stores this ratio as a millionths fixed-point value; at the whitepaper level the ratio form is sufficient.)

The key detail is which reserves the conversion uses: the protocol uses **`truncatedReserves`** (anti-manipulation truncated reserves; see [Truncated Price](/whitepaper/risk-management-and-strategies/truncated-price)) rather than instantaneous pair reserves. This prevents an attacker from inflating reserves within a single transaction to dodge liquidation, and it keeps the margin level shown by front-ends aligned with the on-chain liquidation check by using the same data.

::: warning
`Asset Value` is the result of a reserve-based linear conversion and excludes LP fees and price impact; `Debt` is borrowed principal plus settled accrued interest. Both are measured in the debt currency.
:::

**Worked example (1000 LIKWID margin, 1× leverage, Long LIKWID):**

```
positionValue = 1000 + 997 = 1997 LIKWID
repayAmount   = 1997 × truncatedReserve0 / truncatedReserve1
              ≈ 1997 × 0.000000015
              ≈ 0.00003 ETH
debtAmount    ≈ 0.00001541 ETH

marginLevel   ≈ 0.00003 / 0.00001541 ≈ 1.94
```

This position's margin level is about **1.94**, which falls in the yellow "warning" range described below.

## Health Thresholds (Red / Yellow / Green)

The front-end uses three color bands to indicate position health at a glance:

| Color | Range | Meaning |
| --- | --- | --- |
| 🔴 Red / Danger | `marginLevel < 1.17` | At or near the minimum to open a position, very close to the liquidation level 1.1 — extremely risky |
| 🟡 Yellow / Warning | `1.17 ≤ marginLevel < 1.97` | Still holdable, but buffer is limited — consider adding margin or reducing leverage |
| 🟢 Green / Healthy | `marginLevel ≥ 1.97` | Ample buffer, relatively safe |

::: warning
These two thresholds (**1.17** and **1.97**) are **front-end display** constants hardcoded to color the margin level — they are **not on-chain contract constants**.

The values that actually take effect on-chain are two others:
- `minMarginLevel = 1.17` — the minimum margin level required after opening or adding to a position (the red line aligns exactly with it).
- `liquidateLevel = 1.1` — the liquidation trigger (see [Liquidation Mechanism](/whitepaper/protocol-mechanics/liquidation-mechanism)).

The contract owner can adjust the on-chain `liquidateLevel` via `setMarginLevel`; if the on-chain parameters change, the front-end's red/yellow/green thresholds should be reviewed accordingly.
:::

## Relationship to the Liquidation Threshold

The three front-end color bands are a **display-layer early warning** that helps users sense risk in advance; they do not trigger any on-chain action. What actually decides whether a position is liquidated is the on-chain comparison of the margin level (computed from `truncatedReserves`) against `liquidateLevel` (default **1.1**) — only when it drops to that line does the position enter liquidation. In other words, red does not mean "already liquidated," but "very close to the liquidation line — please act soon." For how liquidation is executed, see the [Liquidation Mechanism](/whitepaper/protocol-mechanics/liquidation-mechanism).
