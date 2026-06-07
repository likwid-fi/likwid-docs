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
  Size (merged)
  - getAmountIn(poolId, zeroForOne_close, Borrow Amount (merged), true).amountIn
```

Use the merged `Size` and `Borrow Amount` (not the existing position's `state.marginTotal` / `state.debtAmount`). A negative value means the merged position has an unrealized loss.

### 5.4 Max Margin (Input Cap)

The `MAX` button next to the Margin input should not just be the wallet balance. The contract caps how large a position can be, and that cap **shrinks as leverage rises**. A good `MAX` is the largest margin that comfortably passes on-chain without sitting on the edge.

Let the margin currency be the side the user deposits (`currency0` when `marginForOne = false`, `currency1` when `marginForOne = true`). Two on-chain constraints bound the position size, both in `LikwidMarginPosition._margin` / `_executeAddLeverage`:

| # | Constraint | Source |
| --- | --- | --- |
| (a) Reserve cap | `marginAmount * leverage <= realReserve[margin]`, else `ReservesNotEnough()` | `_executeAddLeverage` (`src/LikwidMarginPosition.sol:183`) |
| (b) Initial margin level | `min(marginLevel(pairReserves), marginLevel(truncatedReserves)) >= minMarginLevel()`, else `InvalidLevel()` | `_checkMinLevelAfterUnlock` (`src/LikwidMarginPosition.sol:709-721`) |

Constraint (b) is what makes the cap leverage-dependent. `marginLevel` is the linear spot formula from section 6, but `Borrow Amount = getAmountIn(...)` carries AMM price impact. So as `Size = marginAmount * leverage` grows relative to the reserve, the borrow grows faster than the position value and the level falls below `minMarginLevel()` (default `1_170_000`, i.e. 1.17). Binary-searching straight to that boundary easily lands a `MAX` order on the critical point and reverts, so the off-chain `MAX` uses a **conservative per-leverage table** with built-in headroom:

```text
sizeMax   = min( R_m * leveragePercent(leverage),  realReserve[margin] )   // (b) ∧ (a)
marginMax = min( sizeMax / leverage,  walletBalance(marginCurrency) )
```

where `R_m` is the margin-side pair reserve and `leveragePercent(leverage)` is an off-chain approximation of constraint (b), in thousandths of the reserve:

```solidity
// index by leverage 1x..5x
uint24[5] leverageThousandths = [370, 200, 110, 55, 22]; // 37%, 20%, 11%, 5.5%, 2.2%
```

::: warning
`leverageThousandths` is **not** a contract constant — there is no such table on-chain. It is derived from the closed-form ceiling of constraint (b), `1 - minMarginLevel * L/(1+L)` (using pair reserves and `minMarginLevel = 1.17`, giving `≈[41.5%, 22%, 12.25%, 6.4%, 2.5%]`), scaled by ~0.9 for safety. The headroom absorbs `marginFee`, the `lpFee` inside `getAmountIn`, and the fact that the chain actually takes `min(pairReserves, truncatedReserves)` (the latter being less favorable). Recompute the table if `minMarginLevel()` ever changes on-chain.
:::

Worked example — a 2x position with margin in `currency0`:

```text
PoolStateInfo = LikwidHelper.getPoolStateInfo(poolId)

sizeMax   = min(PoolStateInfo.pairReserve0 * 20%, PoolStateInfo.realReserve0)
marginMax = min(sizeMax / 2, walletBalance(currency0))
```

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
  Size(merged) - getAmountIn(poolId, zeroForOne_close=false, amountOut=Borrow Amount(merged), true).amountIn
  = 1495 - getAmountIn(poolId, zeroForOne_close=false, amountOut=0.000023106 ETH, true).amountIn
  ~= 1495 - 1500
  ~= -5 LIKWID
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
| `marginAmount` | `uint256` | User-supplied margin amount |
| `borrowAmount` | `uint256` | Borrow amount; for leveraged margin, the contract calculates the actual borrow amount from the execution path; for non-leveraged borrowing, it is the target borrow amount |
| `borrowAmountMax` | `uint256` | Maximum borrow amount allowed by slippage protection |
| `recipient` | `address` | NFT recipient, usually the current user |
| `deadline` | `uint256` | Transaction expiry time, Unix seconds |

### 8.3 `margin`

```solidity
function margin(IMarginPositionManager.MarginParams memory params)
  external returns (...);
```

`MarginParams` fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `tokenId` | `uint256` | Existing NFT id to add margin to |
| `leverage` | `uint24` | Leverage for this increment, which may differ from the existing position |
| `marginAmount` | `uint256` | Additional margin amount |
| `borrowAmount` | `uint256` | Borrow amount; for leveraged margin, the contract calculates the actual borrow amount from the execution path; for non-leveraged borrowing, it is the target borrow amount |
| `borrowAmountMax` | `uint256` | Slippage protection |
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

## 10. K-Line Price Feed (Reserve-Diff)

To render a price chart, a third party needs a price point for every operation that moves the pool. This section gives a **single uniform recipe** that covers spot swaps and the entire margin family, and that **only requires subscribing to one contract — the Vault (`LikwidVault`)**. You do not need the `Margin` / `Close` / `LiquidateBurn` business events from `LikwidMarginPosition` for this.

### 10.1 Core Idea

The pool price is the `pairReserves` ratio `reserve1 / reserve0`. Every price-moving operation changes `pairReserves`. Instead of decoding each business event's fields, compare `pairReserves` **before vs after** the operation:

```text
delta price = |Δr0 / Δr1|,  where (Δr0, Δr1) = pairReserves(after) − pairReserves(before)
```

The before/after price points are each `reserve1 / reserve0` of the respective snapshot.

- All values are raw; the human-readable price = `raw × 10^(decimals0 − decimals1)`.
- `pairReserves` is a packed `uint256`: high 128 bits = `reserve0`, low 128 bits = `reserve1`.
- The "before" snapshot is taken **after interest accrual**, so the diff is the **pure operation impact** — interest is excluded automatically.

### 10.2 Events Used (all emitted by `LikwidVault`)

| Event | topic0 | Role |
| --- | --- | --- |
| `PoolUpdated` | `0x9f3985fdc4058ca90c3568565aba60632c864d79ac8f29a339bc19e8c2acae1f` | **Before** snapshot (emitted at the start of every operation) |
| `MarginBalance` | `0xbef2c8944f28e751677e4c2753da54cf97cbba2a249d50ce31a12cb1a2801666` | **After** snapshot for the margin family |
| `Swap` | `0x9cabf96bbc00f3f126d1b309884416fe322227e57a50b1da86a5e142c78bb696` | The spot-swap delta (`amount0` / `amount1`) |
| `Fees` | `0x094cd6963c390f036fd04ed00bf2527fc04b980da518b076d245b1218e940c47` | (optional) swap protocol fee, to reconstruct exact post-swap reserves |

`PoolUpdated` is emitted unconditionally at the start of every Vault operation (`_getAndUpdatePool`, `src/LikwidVault.sol:382`). It carries the reserve state after interest accrual and before the operation — the universal "before" basis.

### 10.3 Pairing Rule

1. Filter by `poolId` (event topic1).
2. Within one tx, sort `PoolUpdated` / `Swap` / `MarginBalance` by `logIndex` ascending.
3. For each "after" marker (`Swap` or `MarginBalance`), take the **immediately preceding `PoolUpdated`** as the "before" basis.
4. Always take the immediately preceding one. A single tx (especially via a router) may contain multiple Vault operations — for example a swap followed by a margin — producing several `PoolUpdated` / `Swap` / `MarginBalance` groups. Taking the wrong `PoolUpdated` yields a Δ that is not this operation's.

### 10.4 Swap Use Case

Event order inside `LikwidVault.swap`:

```text
PoolUpdated   ← before reserves (_getAndUpdatePool)
Fees          ← if a fee was charged (feeType = SWAP)
Swap          ← this swap's delta
```

- **before** `pairReserves` = the immediately preceding `PoolUpdated.pairReserves`.
- **delta** = `Swap` event `(amount0, amount1)` (caller perspective: paid = negative, received = positive).
- **delta price** = `|amount0 / amount1|`.
- **after** `pairReserves` (if you also want the "close" point), reconstruct from the delta:
  - `zeroForOne` (token0 in, `amount0 < 0`, `amount1 > 0`): `after_r0 = before_r0 + |amount0| − protocolFee0`, `after_r1 = before_r1 − amount1`
  - `!zeroForOne` (token1 in, `amount0 > 0`, `amount1 < 0`): `after_r0 = before_r0 − amount0`, `after_r1 = before_r1 + |amount1| − protocolFee1`
  - `protocolFee` = `Fees.protocolFeeAmount` for `feeType = SWAP`, on the input side. Ignoring it gives a negligible charting error.

### 10.5 Margin Use Case

Every margin-family operation (`margin` / `addMargin` / `close` / `repay` / `modify` / `liquidateBurn` / `liquidateCall`) ends up in `LikwidVault.marginBalance`. Event order:

```text
PoolUpdated     ← before reserves (_getAndUpdatePool)
Fees            ← margin fee / swap fee / interest fee, if any
MarginBalance   ← after reserves (operation complete)
```

- **before** `pairReserves` = the immediately preceding `PoolUpdated.pairReserves`.
- **after** `pairReserves` = `MarginBalance.pairReserves`.
- **delta** = `(after_r0 − before_r0, after_r1 − before_r1)`; **delta price** = `|Δr0 / Δr1|`.

Notes:

- One rule covers the whole family — no need to distinguish margin / close / liquidate, and **no need to know `marginForOne`** (the diff carries direction).
- **Zero-impact operations self-identify**: leverage-0 collateral borrow, plus `repay` / `modify` that do not touch `pairReserves`, produce `Δr0 = Δr1 = 0`. Skip those (no K-line point).
- `MarginBalance.marginType` (`uint8`) labels the operation, matching the `MarginActions` enum: `0=MARGIN, 1=REPAY, 2=CLOSE, 3=MODIFY, 4=LIQUIDATE_BURN, 5=LIQUIDATE_CALL`.

### 10.6 Event Data Layout

`pairReserves` is a packed `uint256` (high 128 bits = reserve0, low 128 bits = reserve1). Non-indexed field order, where each field occupies one 32-byte word:

- `PoolUpdated(bytes32 indexed id, uint256 realReserves, uint256 mirrorReserves, uint256 pairReserves, uint256 lendReserves, uint256 protocolInterestReserves, int256 insuranceFunds)` → `pairReserves` = word index **2**.
- `MarginBalance(bytes32 indexed id, uint8 marginType, uint256 realReserves, uint256 mirrorReserves, uint256 pairReserves, uint256 lendReserves, uint256 protocolInterestReserves, int256 insuranceFunds)` → `marginType` = word 0, `pairReserves` = word index **3**.
- `Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint24 fee)` → `id` = topic1, `sender` = topic2; data: `amount0` = word 0 (int128, sign-extended), `amount1` = word 1, `fee` = word 2.
- `Fees(bytes32 indexed id, address indexed currency, address indexed sender, uint8 feeType, uint256 feeAmount, uint256 protocolFeeAmount)` → data: `feeType` = word 0, `feeAmount` = word 1, `protocolFeeAmount` = word 2.

Unpack: `reserve0 = pairReserves >> 128`, `reserve1 = pairReserves & ((1 << 128) − 1)`.

::: warning
Use the same-tx `PoolUpdated` as the "before" basis — never diff against the previous tx's reserves, since interest accrued between txs would be miscounted as price impact.
:::

## 11. ABI Quick Reference

### 11.1 `LikwidHelper`

| Function | Usage |
| --- | --- |
| `getPoolStateInfo(poolId)` | Full pool state, including `pairReserves`, `truncatedReserves`, cumulatives, and fees |
| `getAmountIn(poolId, zeroForOne, amountOut, dynamicFee)` | Reverse swap quote; use `.amountIn` |
| `getAmountOut(poolId, zeroForOne, amountIn, dynamicFee)` | Forward swap quote; use `.amountOut` |
| `getBorrowAPR(poolId, borrowForOne)` | Current borrow APR |
| `checkMarginPositionLiquidate(tokenId)` | Query whether a position is liquidatable |

### 11.2 `LikwidMarginPosition`

| Function | Usage |
| --- | --- |
| `addMargin(key, params)` | Open a new margin position and mint an NFT |
| `margin(params)` | Add margin to an existing NFT |
| `getPositionState(tokenId)` | Read live position state |
| `poolIds(tokenId)` | Read the poolId for a tokenId |
| `marginLevels()` | Read `initLevel`, `liquidateLevel`, and related protocol parameters |
| `liquidateCall(tokenId, deadline)` | Trigger repayment liquidation |

## 12. End-to-End Pseudocode

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
      borrowAmount,
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
      borrowAmount,
      borrowAmountMax: borrowMax,
      deadline
    }
  ])
}
```
