---
title: "Margin Integration Guide"
description: "A third-party integration guide for Likwid margin position discovery, quoting, merge review, and transaction submission."
---

# Likwid Margin Third-Party Integration Guide

This guide is for third-party frontends, aggregators, and bots integrating with Likwid margin positions. After reading it, an integrator should be able to:

- Decide whether an order should call `addMargin` or `margin`
- Build the Review panel for both Before Merged and After Merged views
- Decode ABI return values and events correctly, while avoiding common integration mistakes

## 1. Quick Model

- A leveraged position is an ERC721 NFT managed by `LikwidMarginPosition`. Its core state includes `(poolId, marginForOne, marginAmount, marginTotal, debtAmount)`.
- A new position calls `addMargin` and mints a new NFT. Adding to an existing same-pool, same-direction position calls `margin` and updates the existing NFT.
- Liquidation checks do not use swap quotes. The contract uses a linear spot conversion from `truncatedReserves`, so UI Margin Level displays should use the same reserve basis.

## 2. Terms and Direction Rules

The following booleans are used throughout the formulas:

| Position direction | `marginForOne` | `zeroForOne_open` | `zeroForOne_close` | `borrowForOne` |
| --- | --- | --- | --- | --- |
| Long `currency1` | `true` | `true` | `false` | `false` |
| Long `currency0` | `false` | `false` | `true` | `true` |

Parameterized rules:

```text
zeroForOne_open  =  marginForOne
zeroForOne_close = !marginForOne
borrowForOne     = !marginForOne
```

In an ETH / LIKWID pair, ETH is `currency0` and LIKWID is `currency1`.

## 3. Data and Indexing

Third parties should maintain two off-chain indexes. Position discovery and merge decisions depend on them.

### 3.1 Pool Index

Listen to the `LikwidVault.Initialize` event:

```solidity
event Initialize(
  PoolId indexed id,
  Currency indexed currency0,
  Currency indexed currency1,
  uint24 fee,
  uint24 marginFee
);
```

Each pool record should include at least:

| Field | Source |
| --- | --- |
| `poolId` | Event `id` |
| `currency0` / `currency1` | Event parameters |
| `fee` | LP fee, in millionths |
| `marginFee` | Protocol margin fee on position creation, in millionths |
| Created time | Event block timestamp |

::: warning
Pools with `fee < 3000`, meaning below 0.3%, do not support margin long or short positions. The `addMargin` entry point validates this and reverts with `LowFeePoolMarginBanned()`.
:::

### 3.2 User Position Index

Use the `LikwidMarginPosition.Transfer` event, the standard ERC721 transfer event.

```text
Transfer(from=0x0,   to=user,  tokenId) -> add tokenId to user's list
Transfer(from=user,  to=other, tokenId) -> remove tokenId from user's list
Transfer(from=other, to=user,  tokenId) -> add tokenId to user's list
```

For each `tokenId`, also cache two immutable fields to avoid repeated RPC calls:

| Field | How to read | Immutability |
| --- | --- | --- |
| `poolId` | `LikwidMarginPosition.poolIds(tokenId)` | Written at creation and never changes |
| `marginForOne` | `LikwidMarginPosition.getPositionState(tokenId).marginForOne` | Written at creation and never changes |

`owner` changes when the NFT is transferred, so `(poolId, marginForOne)` is the stable identity for pool and direction.

## 4. Position Discovery: Merge or Create

Before submitting an order, determine whether `(user, targetPoolId, targetMarginForOne)` already has an active position.

```text
Input: user address, target poolId, target marginForOne
Output: tokenId, or "no active position"

1. Read user -> tokenIds[] from the off-chain index.
2. Filter cached metadata:
   poolId == targetPoolId && marginForOne == targetMarginForOne
3. For each matched tokenId, call getPositionState(tokenId).
4. If state.marginAmount + state.marginTotal > 0:
   active position -> call margin(tokenId, ...)
   otherwise -> call addMargin(key, ...)
```

Important facts:

- Position storage is keyed by `tokenId`, not by `(user, pool, direction)`.
- There is no on-chain `getPositionsByUserAndPool` query. Integrators need an off-chain index.
- `marginForOne` is immutable after creation. Long and short positions in the same pool are separate NFTs and cannot be moved or direction-switched.
- `getPositionState` is a live view with interest already applied. Do not apply cumulative interest a second time.

## 5. Review Panel Fields

By default, reserves come from `LikwidHelper.getPoolStateInfo(poolId)`. Derive directions using the rules in section 2.

### 5.1 UI Mockup: Margin Page / Before Merged

```text
┌────────────────────────────────────────────┐
│  [Margin]  Swap   Borrow   Supply      ⚙  │
├────────────────────────────────────────────┤
│  ◉  ETH / LIKWID ▾            TVL: $51.8K  │
│  ────────────────────────────────────────  │
│  Entry Price                                │
│  ⇄  0.000000015 ETH  ($0)                   │
├────────────────────────────────────────────┤
│  ▌Long LIKWID ▐    │    Short LIKWID       │
├────────────────────────────────────────────┤
│  1000                          [ LIKWID ]   │
│           5735767.872435707 LIKWID   MAX    │
├────────────────────────────────────────────┤
│  Leverage                                   │
│  ▌1x ▐   2x    3x    4x    5x               │
├────────────────────────────────────────────┤
│  ▌▌▌▌▌▌▌▌▌▌▌▌  Review  ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌   │
├────────────────────────────────────────────┤
│  ▌Before Merged ▐    │    After Merged     │
│                                              │
│  Margin Level                       ● 1.94  │
│  Liquidation Margin Level              1.1  │
│  Size                            997 LIKWID │
│  Borrow Amount (Fee: 0.3%) ⓘ                │
│                              0.000015406 ETH│
│  Borrow APY                            2%   │
│  Liq.Price                  0.000000008 ETH │
│  Max Slippage                  Auto  0.5%   │
│  Borrow Max Amount          0.000015483 ETH │
└────────────────────────────────────────────┘
```

When the user switches to the **After Merged** view, the detail area changes as follows:

- Replace the `Max Slippage` row with `Estimated PNL`
- Hide the `Borrow Max Amount` row
- Keep the other fields, but calculate them from the merged values

### 5.2 Field Mapping: Before Merged

| UI label | Formula |
| --- | --- |
| Entry Price | `pairReserve_borrow / pairReserve_margin`, using `pairReserves` |
| Margin | User input |
| Leverage | UI selection |
| Size | `Margin * Leverage * (1 - PoolKey.marginFee)` |
| Borrow Amount | `LikwidHelper.getAmountIn(poolId, zeroForOne_open, Margin * Leverage, true).amountIn` |
| **Margin Level** | `((Margin + Size) * reserveBorrow / reserveMargin) / Borrow Amount`, using **`truncatedReserves`** |
| Liquidation Margin Level | `marginLevels().liquidateLevel() / 1_000_000` |
| Borrow APY | `LikwidHelper.getBorrowAPR(poolId, borrowForOne)` |
| Liq. Price | `(Borrow Amount * liquidateLevel) / (Margin + Size)` |
| Max Slippage | UI setting |
| Borrow Max Amount | `Borrow Amount * (1 + Max Slippage)` |

### 5.3 After Merged

The After Merged view shows the combined state of the existing position plus the new increment:

- `Margin = input margin + state.marginAmount`
- `Size = input margin * leverage * (1 - marginFee) + state.marginTotal`
- `Borrow Amount = new borrow amount + state.debtAmount`
- `Margin Level` and `Liq. Price` use the merged `Margin`, `Size`, and `Borrow Amount`
- Replace the `Max Slippage` row with `Estimated PNL`
- Hide the `Borrow Max Amount` row

Unrealized PNL can be estimated as:

```text
Estimated PNL =
  state.marginTotal
  - getAmountIn(poolId, zeroForOne_close, state.debtAmount, true).amountIn
```

A negative value means the existing position has an unrealized loss.

## 6. Contract Basis for Margin Level

The contract uses `MarginPosition.marginLevel(...)` in two relevant places:

| Scenario | Reserves | Meaning |
| --- | --- | --- |
| Open / add min-level check | `min(marginLevel(pairReserves), marginLevel(truncatedReserves))` | Prevents the resulting position from starting below the initial requirement |
| Liquidation check | `marginLevel(truncatedReserves) <= liquidateLevel()` | Determines whether the position is liquidatable |

`truncatedReserves` is Likwid's manipulation-resistant reserve basis. It uses the less favorable reserve snapshot over a time window. Third-party UIs should display Margin Level from `LikwidHelper.getPoolStateInfo(poolId).truncatedReserves` so warnings align with on-chain liquidation behavior.

The underlying formula is a linear spot conversion:

```text
repayAmount = reserveBorrow * positionValue / reserveMargin
level       = repayAmount * 1_000_000 / debtAmount
```

This calculation does not call `getAmountIn` or `getAmountOut`, does not subtract LP fee, and does not model price impact.

## 7. Examples

The following example assumes `marginForOne = true`, meaning Long `currency1`. If `marginForOne = false`, invert directions and swap reserve sides using section 2.

```text
Entry Price = pairReserve0 / pairReserve1 = 0.000000015 ETH

Margin   = 1000 LIKWID
Leverage = 1x
marginFee = 0.3%

Size = 1000 * 1 * (1 - 0.3%) = 997 LIKWID

Borrow Amount =
  getAmountIn(poolId, zeroForOne_open=true, amountOut=1000, dynamicFee=true).amountIn
  = 0.000015406 ETH

Margin Level =
  ((1000 + 997) * truncatedReserve0 / truncatedReserve1) / 0.000015406
  ~= 1.94

Liq. Price =
  (0.000015406 * 1.1) / 1997
  ~= 0.000000008 ETH

Borrow APY = getBorrowAPR(poolId, borrowForOne=false) = 2%
Borrow Max Amount = 0.000015406 * (1 + 0.5%) = 0.000015483 ETH
```

Merged-position example. Assume the existing position state is:

```text
state.marginAmount = 500 LIKWID
state.marginTotal  = 498 LIKWID
state.debtAmount   = 0.00000770 ETH
```

Add a new `1000 LIKWID + 1x` order:

```text
Margin = 1000 + 500 = 1500 LIKWID
Size   = 997 + 498 = 1495 LIKWID

Borrow Amount =
  0.000015406 + 0.00000770
  = 0.000023106 ETH

Margin Level =
  (2995 * 0.000000015) / 0.000023106
  ~= 1.94

Liq. Price =
  (0.000023106 * 1.1) / 2995
  ~= 0.000000008 ETH

Estimated PNL =
  498 - getAmountIn(poolId, zeroForOne_close=false, amountOut=0.00000770 ETH, true).amountIn
  ~= -2 LIKWID
```

## 8. Transaction Submission

### 8.1 Decision Table

| Position discovery result | Call |
| --- | --- |
| No active position | `addMargin(PoolKey key, CreateParams params)`, minting a new NFT |
| Active position exists | `margin(MarginParams params)`, adding to the existing `tokenId` |

### 8.2 `addMargin`

```solidity
function addMargin(
  PoolKey memory key,
  IMarginPositionManager.CreateParams calldata params
) external returns (
  uint256 tokenId,
  uint256 borrowAmount,
  uint256 swapFeeAmount
);
```

`CreateParams` fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `marginForOne` | `bool` | Position direction, immutable after creation |
| `leverage` | `uint24` | Leverage, commonly 1-5; 0 indicates non-leveraged borrowing |
| `marginAmount` | `uint128` | User-supplied margin amount |
| `borrowAmountMax` | `uint128` | Maximum borrow amount allowed by slippage protection |
| `deadline` | `uint256` | Transaction expiry time, Unix seconds |
| `recipient` | `address` | NFT recipient, usually the current user |

### 8.3 `margin`

```solidity
function margin(IMarginPositionManager.MarginParams memory params)
  external returns (...);
```

`MarginParams` fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `tokenId` | `uint256` | Existing NFT id to add margin to |
| `marginAmount` | `uint128` | Additional margin amount |
| `leverage` | `uint24` | Leverage for this increment, which may differ from the existing position |
| `borrowAmountMax` | `uint128` | Slippage protection |
| `deadline` | `uint256` | Transaction expiry time |

Before calling `margin()`, confirm `ownerOf(tokenId) == msg.sender` and that cached `(poolId, marginForOne)` matches the target.

### 8.4 Receipts and Events

| Event | Emitted when | Usage |
| --- | --- | --- |
| `Transfer(from=0x0, to=recipient, tokenId)` | `addMargin` mints a new NFT | Add `tokenId` to the off-chain index |
| `Margin(poolId, owner, tokenId, marginAmount, ...)` | Position changes | Refetch current position state |
| `Liquidate(poolId, owner, tokenId, ...)` | Liquidation occurs | Notify user that the position was liquidated |

Use the `IMarginPositionManager` and `IBasePositionManager` interfaces as the source of truth for the full event definitions.

## 9. Common Gotchas

### 9.1 Tuple Return Values

`getAmountIn` and `getAmountOut` return tuples:

```solidity
function getAmountIn(...) returns (uint256 amountIn, uint24 fee, uint256 feeAmount);
function getAmountOut(...) returns (uint256 amountOut, uint24 fee, uint256 feeAmount);
```

`Borrow Amount = getAmountIn(...).amountIn` means the first returned value. Do not decode `fee` as the amount.

### 9.2 `PoolKey.marginFee` Is Not pool `lpFee`

| Field | Purpose | Where it appears |
| --- | --- | --- |
| `PoolKey.marginFee` | Protocol fee retained when opening margin | Deducted from `Size` |
| pool `lpFee` | AMM fee charged during swap | Included in `Borrow Amount` through `getAmountIn` |

### 9.3 Margin Level Must Use `truncatedReserves`

Liquidation checks use `truncatedReserves`. UI Margin Level should also use `LikwidHelper.getPoolStateInfo(poolId).truncatedReserves`.

### 9.4 Do Not Hardcode 1.1

```text
Liquidation Margin Level = marginLevels().liquidateLevel() / 1_000_000
```

Protocol parameters may change, so frontends and bots should read the value from the contract.

### 9.5 `getPositionState` Already Applies Interest

`getPositionState(tokenId)` returns `marginAmount`, `marginTotal`, and `debtAmount` with current cumulative interest applied. Do not apply `borrowCumulative` or `depositCumulative` again.

### 9.6 `addMargin` Always Mints a New NFT

Merged positions must use `margin(tokenId, ...)`. Long and short positions in the same pool are separate NFTs and cannot be direction-switched by adding margin.

### 9.7 Entry Price Is Spot, Not Weighted Average Entry

After merging, the Review `Entry Price` is the current spot used for the new increment. A true position average entry requires a separate weighted calculation using old and new sizes.

## 10. ABI Quick Reference

### 10.1 `LikwidHelper`

| Function | Usage |
| --- | --- |
| `getPoolStateInfo(poolId)` | Full pool state, including `pairReserves`, `truncatedReserves`, cumulatives, and fees |
| `getAmountIn(poolId, zeroForOne, amountOut, dynamicFee)` | Reverse swap quote; use `.amountIn` |
| `getAmountOut(poolId, zeroForOne, amountIn, dynamicFee)` | Forward swap quote; use `.amountOut` |
| `getBorrowAPR(poolId, borrowForOne)` | Current borrow APR |
| `checkMarginPositionLiquidate(tokenId)` | Query whether a position is liquidatable |

### 10.2 `LikwidMarginPosition`

| Function | Usage |
| --- | --- |
| `addMargin(key, params)` | Open a new margin position and mint an NFT |
| `margin(params)` | Add margin to an existing NFT |
| `getPositionState(tokenId)` | Read live position state |
| `poolIds(tokenId)` | Read the poolId for a tokenId |
| `marginLevels()` | Read `initLevel`, `liquidateLevel`, and related protocol parameters |
| `liquidateCall(tokenId, deadline)` | Trigger repayment liquidation |

## 11. End-to-End Pseudocode

```ts
const userPositions = await indexer.getUserTokenIds(user)

const matches = userPositions.filter((p) =>
  p.poolId === targetPoolId && p.marginForOne === targetMarginForOne
)

let activeTokenId: bigint | null = null
for (const p of matches) {
  const state = await position.read.getPositionState([p.tokenId])
  if (state.marginAmount + state.marginTotal > 0n) {
    activeTokenId = p.tokenId
    break
  }
}

const pool = await helper.read.getPoolStateInfo([targetPoolId])
const inputAmount = parseUnits("1000", 18)
const leverage = 1n
const PER_MILLION = 1_000_000n

const size =
  (inputAmount * leverage * (PER_MILLION - BigInt(pool.marginFee))) /
  PER_MILLION

const [borrowAmount] = await helper.read.getAmountIn([
  targetPoolId,
  targetMarginForOne,
  inputAmount * leverage,
  true
])

const [reserveBorrow, reserveMargin] = targetMarginForOne
  ? [pool.truncatedReserves.reserve0, pool.truncatedReserves.reserve1]
  : [pool.truncatedReserves.reserve1, pool.truncatedReserves.reserve0]

const positionValue = inputAmount + size
const marginLevel =
  ((positionValue * reserveBorrow) / reserveMargin) *
  PER_MILLION /
  borrowAmount

const { liquidateLevel } = await position.read.marginLevels()
const liqPrice =
  (borrowAmount * liquidateLevel) / (positionValue * PER_MILLION)

const borrowAPR = await helper.read.getBorrowAPR([
  targetPoolId,
  !targetMarginForOne
])

const slippageBps = 50n
const borrowMax = (borrowAmount * (10_000n + slippageBps)) / 10_000n
const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)

if (activeTokenId === null) {
  await position.write.addMargin([
    poolKey,
    {
      marginForOne: targetMarginForOne,
      leverage: Number(leverage),
      marginAmount: inputAmount,
      borrowAmountMax: borrowMax,
      deadline,
      recipient: user
    }
  ])
} else {
  await position.write.margin([
    {
      tokenId: activeTokenId,
      marginAmount: inputAmount,
      leverage: Number(leverage),
      borrowAmountMax: borrowMax,
      deadline
    }
  ])
}
```
