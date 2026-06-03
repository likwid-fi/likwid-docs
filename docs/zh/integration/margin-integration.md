---
title: "Margin 三方集成说明"
description: "面向第三方前端、聚合器和机器人，说明 Likwid 保证金仓位发现、报价、合并加仓和交易提交。"
---

# Likwid Margin 三方集成说明

> 面向三方前端 / 聚合器 / 机器人。读完此文应该能：
> 1. 决定一次开仓走 `addMargin`（新开）还是 `margin`（合并加仓）
> 2. 拼出 Review 面板的所有字段（Before / After Merged 两种视图）
> 3. 正确解析 ABI 返回值与事件、避开 7 个最容易踩的坑

---

## 0. 三句话理解

- **杠杆头寸 = 一张 ERC721 NFT**（`LikwidMarginPosition`），存的是 `(poolId, marginForOne, marginAmount, marginTotal, debtAmount)`。
- **开仓有两条路径**：第一次开 → `addMargin` 铸新 NFT；同方向加仓 → `margin` 更新原 NFT。
- **清算判定不走 swap 报价**，是合约用 `truncatedReserves` 做的纯 spot 线性换算 —— UI 显示要与之对齐。

---

## 1. 术语 / 方向规则速查

下面三个 `bool` 贯穿所有公式：

| 仓位方向 | `marginForOne` | `zeroForOne_open` | `zeroForOne_close` | `borrowForOne` |
| --- | --- | --- | --- | --- |
| Long `currency1` (Long LIKWID) | `true`  | `true`  | `false` | `false` |
| Long `currency0` (Long ETH)    | `false` | `false` | `true`  | `true`  |

参数化规则：

```
zeroForOne_open  =  marginForOne     // 开仓 swap 方向（borrow 换 margin）
zeroForOne_close = !marginForOne     // 平仓 swap 方向（margin 换 borrow）
borrowForOne     = !marginForOne     // 借入侧标志
```

`ETH / LIKWID` 交易对里 ETH 是 `currency0`，LIKWID 是 `currency1`。

---

## 2. 准备数据 / 索引

三方需要在离链维护两张索引表，所有后续判断都依赖它们。

### 2.1 池子表 `pools`

数据来源：监听 `LikwidVault.Initialize` 事件
（`src/LikwidVault.sol:75`，定义见 `src/interfaces/IVault.sol:51`）。

```solidity
event Initialize(
    PoolId indexed id,
    Currency indexed currency0,
    Currency indexed currency1,
    uint24 fee,
    uint24 marginFee
);
```

每条记录字段：

| 字段 | 来源 |
| --- | --- |
| `poolId` | 事件 `id` |
| `currency0` / `currency1` | 事件参数 |
| `fee` | LP fee（百万分制） |
| `marginFee` | 开仓时协议留存费率（百万分制） |
| 创建时间 | 事件 block 时间戳 |

> ⚠️ **`fee < 3000`（即 < 0.3%）的池子不支持杠杆多空**。该限制在 `addMargin` 入口校验：
> ```solidity
> // src/LikwidMarginPosition.sol:123
> if (poolState.lpFee < 3000) revert LowFeePoolMarginBanned();
> ```

### 2.2 用户头寸索引 `user → tokenIds[]`

数据来源：`LikwidMarginPosition.Transfer` 事件（ERC721 标准）。

```
Transfer(from=0x0,    to=user,  tokenId)  → user 列表加入 tokenId
Transfer(from=user,   to=other, tokenId)  → user 列表移除
Transfer(from=other,  to=user,  tokenId)  → user 列表加入
```

每个 `tokenId` 同时缓存两个**永久不变**字段，避免每次都打 RPC：

| 字段 | 取法 | 不变性 |
| --- | --- | --- |
| `poolId` | `LikwidMarginPosition.poolIds(tokenId)` | 创建时写入，永不变（`src/base/BasePositionManager.sol:107`）|
| `marginForOne` | `LikwidMarginPosition.getPositionState(tokenId).marginForOne` | 创建时写入，永不变（`src/LikwidMarginPosition.sol:98`）|

`Owner` 会随 transfer 变，所以 `(poolId, marginForOne)` 才是仓位的"身份证"。

---

## 3. 头寸发现：合并 vs 新开

下单前必须先判断 `(user, 目标 poolId, 目标 marginForOne)` 三元组下是否已有活头寸。

### 3.1 算法（4 步）

```
输入: user 地址、目标 poolId、目标 marginForOne
输出: tokenId（→ 加仓） 或 "无活头寸"（→ 新开）

Step 1  从离链索引取 user → tokenIds[]
Step 2  按缓存的 (poolId, marginForOne) 过滤
        条件: poolId == 目标 && marginForOne == 目标方向
Step 3  对命中的 tokenId 调
        state = LikwidMarginPosition.getPositionState(tokenId)
        ⚠️ 这是 live view，已结息 —— 不要再叠加利息
Step 4  state.marginAmount + state.marginTotal > 0
        → true : 活头寸 → margin(tokenId, ...)
        → false: 无活头寸 → addMargin(key, ...)
```

### 3.2 关键事实

- 头寸存储是 **tokenId-keyed**，不是 `(user, pool, direction)`-keyed。
- 链上**没有** `getPositionsByUserAndPool` 这样的查询，必须靠离链索引枚举。
- `marginForOne` 不可变 → 同池子的 Long / Short 是两张独立 NFT，不能搬运、不能转方向。

---

## 4. 报价 / Review 面板

### 4.1 UI mockup（Margin 页 / Before Merged 视图）

```
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

切到 **After Merged** 视图时，明细区差异：

- `Max Slippage` 行 → 替换为 `Estimated PNL`
- `Borrow Max Amount` 行 → 隐藏
- 其余字段同公式，输入参数换成"合并后"的值

### 4.2 字段映射表（Before Merged）

reserves 默认取自 `LikwidHelper.getPoolStateInfo(poolId)`。方向按 §1 规则推导。

| UI 标签 | 公式 | 示例值 |
| --- | --- | --- |
| Entry Price | `pairReserve_borrow / pairReserve_margin`（用 `pairReserves`） | `0.000000015 ETH` |
| Margin | 输入框 | `1000 LIKWID` |
| Leverage | UI 选择 | `1×` |
| Size | `Margin × Leverage × (1 - PoolKey.marginFee)` | `997 LIKWID` |
| Borrow Amount | `LikwidHelper.getAmountIn(poolId, zeroForOne_open, Margin × Leverage, true).amountIn` | `0.000015406 ETH` |
| **Margin Level** | `((Margin + Size) × reserveBorrow / reserveMargin) / Borrow Amount` <br/>reserves 用 **`truncatedReserves`**（与合约 `_checkLiquidate` 同口径） | **`≈ 1.94`** |
| Liquidation Margin Level | `marginLevels().liquidateLevel() / 1_000_000` | `1.1`（合约常量）|
| Borrow APY | `LikwidHelper.getBorrowAPR(poolId, borrowForOne)` | `2%` |
| Liq.Price | `(Borrow Amount × liquidateLevel) / (Margin + Size)` | `0.000000008 ETH` |
| Max Slippage | UI 设置 | `0.5%` |
| Borrow Max Amount | `Borrow Amount × (1 + Max Slippage)` | `0.000015483 ETH` |

### 4.3 Margin Level 的合约口径

合约里有两处用到 `MarginPosition.marginLevel(...)`：

| 场景 | reserves | 出处 |
| --- | --- | --- |
| 开仓 / 加仓 `min level` 校验 | `min(marginLevel(pairReserves), marginLevel(truncatedReserves))` | `_checkMinLevelAfterUnlock` (`src/LikwidMarginPosition.sol:709-721`) |
| **清算判定** | `marginLevel(truncatedReserves) ≤ liquidateLevel()` | `_checkLiquidate` (`src/LikwidMarginPosition.sol:679-694`) |

`truncatedReserves` 是 Likwid 的反操纵 reserves —— 取一段时间窗内最不利的 reserves 快照，让攻击者没法在一笔 tx 里推高 reserves 来逃清算。三方 UI 显示 Margin Level 时应当用同一份 `truncatedReserves`，让预警线与链上清算触发线对齐。

底层函数 `MarginPosition.marginLevel(...)`（`src/libraries/MarginPosition.sol:71-78`，杠杆分支 `marginTotal > 0`）：

```solidity
repayAmount = reserveBorrow × positionValue / reserveMargin;   // 纯 spot 线性换算
level       = repayAmount × 1e6 / debtAmount;
```

公式是纯 spot 线性换算（用 `truncatedReserves` 的 reserve 比例直接乘 `positionValue`），不调 `getAmountIn` / `getAmountOut`，不扣 LP fee、不算价格冲击。

### 4.4 Before Merged 算例（1000 LIKWID + 1×）

对应 `marginForOne = true`（Long LIKWID）。`marginForOne = false` 时按 §1 规则取反并交换 reserves 侧。

```
Entry Price = pairReserve0 / pairReserve1 = 0.000000015 ETH

Margin   = 1000 LIKWID                  (输入框)
Leverage = 1×

Size = 1000 × 1 × (1 - 0.3%) = 997 LIKWID

Borrow Amount = getAmountIn(poolId, zeroForOne_open=true,
                            amountOut=1000, dynamicFee=true).amountIn
              = 0.000015406 ETH

Margin Level = ((1000 + 997) × truncatedReserve0 / truncatedReserve1)
               / 0.000015406
             ≈ (1997 × 0.000000015) / 0.000015406
             ≈ 1.94

Liq.Price = (0.000015406 × 1.1) / 1997 ≈ 0.000000008 ETH

Borrow APY        = getBorrowAPR(poolId, borrowForOne=false) = 2%
Liquidation Level = marginLevels().liquidateLevel() / 1e6   = 1.1

Max Slippage      = 0.5%
Borrow Max Amount = 0.000015406 × (1 + 0.5%) = 0.000015483 ETH
```

### 4.5 After Merged 算例（合并加仓）

假设 §3 拿到 `tokenId` 后读到：

```
state.marginAmount = 500   LIKWID
state.marginTotal  = 498   LIKWID
state.debtAmount   = 0.00000770 ETH
```

叠加新的 `1000 LIKWID + 1×`：

```
Margin = 输入框 + state.marginAmount = 1000 + 500 = 1500 LIKWID

Size   = 输入框 × Leverage × (1 - marginFee) + state.marginTotal
       = 997 + 498 = 1495 LIKWID

Borrow Amount = getAmountIn(...).amountIn + state.debtAmount
              ≈ 0.000015406 + 0.00000770
              ≈ 0.000023106 ETH

Margin Level ≈ (2995 × 0.000000015) / 0.000023106 ≈ 1.94

Liq.Price    ≈ (0.000023106 × 1.1) / 2995 ≈ 0.000000008 ETH

Estimated PNL = Size(合并后)
              − getAmountIn(poolId, zeroForOne_close=false,
                            amountOut=Borrow Amount(合并后), true).amountIn
              ≈ 1495 − getAmountIn(..., amountOut=0.000023106).amountIn
              ≈ 1495 - 1500.0
              ≈ −5 LIKWID
              （负数 = 合并仓位未实现亏损 ≈ 5 LIKWID）
```

After 视图：`Max Slippage` 行 → `Estimated PNL`；`Borrow Max Amount` 行隐藏。

---

## 5. 提交交易

### 5.1 决策表

| 头寸发现结果 | 调用 |
| --- | --- |
| 无活头寸 | `addMargin(PoolKey key, CreateParams params)` —— 铸新 NFT |
| 有活头寸 | `margin(MarginParams params)` —— 在原 `tokenId` 上加仓 |

### 5.2 `addMargin(...)`

位置：`src/LikwidMarginPosition.sol:91`

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

`CreateParams` 字段（定义见 `src/interfaces/IMarginPositionManager.sol`）：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `marginForOne` | `bool` | 仓位方向，写入后永久不变 |
| `leverage` | `uint24` | 杠杆倍数（1–5；0 表示纯借贷，不开杠杆）|
| `marginAmount` | `uint256` | 用户出的 margin 数量（按 `marginForOne` 计的 token1 或 token0） |
| `borrowAmount` | `uint256` | 借入数量；杠杆开仓时合约会按成交路径计算实际借入量，纯借贷模式下作为目标借入数量 |
| `borrowAmountMax` | `uint256` | 允许借入的最大数量（滑点保护，对应 UI 的 Borrow Max Amount） |
| `recipient` | `address` | NFT 接收地址（通常 `= msg.sender`） |
| `deadline` | `uint256` | tx 失效时间（Unix 秒） |

### 5.3 `margin(...)`

位置：`src/LikwidMarginPosition.sol:166`

```solidity
function margin(IMarginPositionManager.MarginParams memory params)
    external returns (...);
```

`MarginParams` 字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `tokenId` | `uint256` | 要加仓的已有 NFT id |
| `leverage` | `uint24` | 这次加仓的杠杆（可与原仓不同） |
| `marginAmount` | `uint256` | 追加的 margin 数量 |
| `borrowAmount` | `uint256` | 借入数量；杠杆加仓时合约会按成交路径计算实际借入量，纯借贷模式下作为目标借入数量 |
| `borrowAmountMax` | `uint256` | 滑点保护 |
| `deadline` | `uint256` | tx 失效时间 |

> ⚠️ 调 `margin()` 前必须确认 `ownerOf(tokenId) == msg.sender`，且缓存的 `(poolId, marginForOne)` 与目标一致。

### 5.4 回执 / 事件

| 事件 | 何时 emit | 用途 |
| --- | --- | --- |
| `Transfer(from=0x0, to=recipient, tokenId)` | `addMargin` 铸新 NFT | 离链索引新增 tokenId |
| `Margin(poolId, owner, tokenId, marginAmount, ...)` | 头寸变化 | 拉取最新仓位 |
| `Liquidate(poolId, owner, tokenId, ...)` | `_checkLiquidate` 命中 | 通知用户被清算 |

完整事件列表见 `src/interfaces/IMarginPositionManager.sol` 与 `src/interfaces/IBasePositionManager.sol`。

---

## 6. 常见坑 (Gotchas)

### G1 `getAmountIn` / `getAmountOut` / `getBorrowAPR` 返回元组

```solidity
function getAmountIn(...)  returns (uint256 amountIn,  uint24 fee, uint256 feeAmount);
function getAmountOut(...) returns (uint256 amountOut, uint24 fee, uint256 feeAmount);
```

文档里写 `Borrow Amount = LikwidHelper.getAmountIn(...).amountIn`，**取第一项**。ABI 解码时别把 `fee` 误当作 `amount`。

### G2 `PoolKey.marginFee` ≠ pool `lpFee`

| 字段 | 作用 | 体现在哪 |
| --- | --- | --- |
| `PoolKey.marginFee` | 开仓时协议留存 | 扣在 `Size` 上 |
| pool `lpFee`（动态） | swap 时 AMM 收取 | 扣在 `Borrow Amount` 内（由 `getAmountIn` 处理） |

两笔都来自 `PoolKey`，但路径不同，文档/代码里要区分。

### G3 Margin Level 用 `truncatedReserves`

清算判定 `_checkLiquidate`（`src/LikwidMarginPosition.sol:687`）传入的就是 `truncatedReserves`。UI 算 Margin Level 时取同一份 `truncatedReserves`（从 `LikwidHelper.getPoolStateInfo(poolId).truncatedReserves` 读），预警线才能与链上清算触发线对齐。

### G4 别硬编码 `1.1`

```
Liquidation Margin Level = marginLevels().liquidateLevel() / 1_000_000
```

合约 owner 可以通过 `setMarginLevel`（`src/LikwidMarginPosition.sol:724`）调整这个值。

### G5 `getPositionState` 是 live view，已结息

返回的 `state.marginAmount / marginTotal / debtAmount` 已按当前 cumulative 累计利息（`src/LikwidMarginPosition.sol:72-80`）。三方拿到后**不要**再次叠加 `borrowCumulative` / `depositCumulative`。

### G6 `addMargin` 永远铸新 NFT

合并仓位**只能**调 `margin(tokenId, ...)`。`marginForOne` 创建时写入、永远不变 —— 同池子的 Long / Short 是两张独立 NFT，不能搬运、不能转方向。

### G7 Entry Price 是 spot，不是加权均价

合并仓位后 UI 显示的 `Entry Price` 是新增成交的当前 pair spot；实际持仓均价 = `(老仓 size × 老均价 + 新仓 size × 新均价) / 总 size`。这是产品上的显示选择，文档明确说明避免误解。

---

## 附录 A. ABI 速查

### `LikwidHelper`（`test/utils/LikwidHelper.sol`）

三方对接主要用到的视图函数：

| 函数 | 用途 | 出处 |
| --- | --- | --- |
| `getPoolStateInfo(poolId)` | 完整池子状态（含 `pairReserves` / `truncatedReserves` / cumulatives / fees） | `:71` |
| `getAmountIn(poolId, zeroForOne, amountOut, dynamicFee)` | 反向 swap 报价；取 `.amountIn` | `:122` |
| `getAmountOut(poolId, zeroForOne, amountIn, dynamicFee)` | 正向 swap 报价；取 `.amountOut` | `:107` |
| `getBorrowAPR(poolId, borrowForOne)` | 当前借款 APR | `:241` |
| `checkMarginPositionLiquidate(tokenId)` | 直接问"这个仓位是否已可清算" | — |

### `LikwidMarginPosition`

| 函数 | 用途 | 出处 |
| --- | --- | --- |
| `addMargin(key, params)` | 新开仓 → 铸 NFT | `:91` |
| `margin(params)` | 加仓 | `:166` |
| `getPositionState(tokenId)` | 取 live 仓位状态（已结息） | `:72` |
| `poolIds(tokenId)` | tokenId → poolId 映射 | `src/base/BasePositionManager.sol:27` |
| `marginLevels()` | 取 `(initLevel, liquidateLevel)` 等常量 | `:54-59` |
| `liquidateCall(tokenId, deadline)` | 主动触发清算 | `:411` |

### `LikwidVault`

| 内容 | 出处 |
| --- | --- |
| `Initialize` 事件 | `src/LikwidVault.sol:75` / `src/interfaces/IVault.sol:51` |
| `initialize(PoolKey)` | `src/LikwidVault.sol:67` |

---

## 附录 B. 端到端伪代码

```ts
// 0. 离链索引：监听 Initialize + Transfer，缓存 (poolId, marginForOne)
const userPositions = await indexer.getUserTokenIds(user)

// 1. 头寸发现
const matches = userPositions.filter(p =>
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

// 2. 拼 Review 面板
const pool = await helper.read.getPoolStateInfo([targetPoolId])
const inputAmount = parseUnits('1000', 18)        // 1000 LIKWID
const leverage = 1n
const PER_MILLION = 1_000_000n

const size = inputAmount * leverage
           * (PER_MILLION - BigInt(pool.marginFee)) / PER_MILLION

const [borrowAmount] = await helper.read.getAmountIn([
  targetPoolId,
  targetMarginForOne,            // zeroForOne_open
  inputAmount * leverage,
  true,                          // dynamicFee
])

// Margin Level 用 truncatedReserves（与 _checkLiquidate 同口径）
const [reserveBorrow, reserveMargin] = targetMarginForOne
  ? [pool.truncatedReserves.reserve0, pool.truncatedReserves.reserve1]
  : [pool.truncatedReserves.reserve1, pool.truncatedReserves.reserve0]

const positionValue = inputAmount + size
const marginLevel   = (positionValue * reserveBorrow / reserveMargin)
                    * PER_MILLION / borrowAmount   // ratio in millionths

const { liquidateLevel } = await position.read.marginLevels()
const liqPrice = borrowAmount * liquidateLevel / (positionValue * PER_MILLION)

const borrowAPR = await helper.read.getBorrowAPR([
  targetPoolId, !targetMarginForOne,
])

// 3. 提交
const slippageBps = 50n   // 0.5%
const borrowMax = borrowAmount * (10_000n + slippageBps) / 10_000n
const deadline  = BigInt(Math.floor(Date.now() / 1000) + 600)

if (activeTokenId === null) {
  // 新开 → addMargin
  const { tokenId } = await position.write.addMargin([
    poolKey,
    {
      marginForOne:    targetMarginForOne,
      leverage:        Number(leverage),
      marginAmount:    inputAmount,
      borrowAmount,
      borrowAmountMax: borrowMax,
      deadline,
      recipient:       user,
    },
  ])
} else {
  // 加仓 → margin
  await position.write.margin([{
    tokenId:         activeTokenId,
    marginAmount:    inputAmount,
    leverage:        Number(leverage),
    borrowAmount,
    borrowAmountMax: borrowMax,
    deadline,
  }])
}
```

---

## 附录 C. 版本与依据

- 主体校对依据：`src/libraries/MarginPosition.sol`、`src/LikwidMarginPosition.sol`、`src/LikwidVault.sol`、`test/utils/LikwidHelper.sol`、`src/interfaces/IMarginPositionManager.sol`、`src/interfaces/IVault.sol`
- 视觉源稿（已弃用，留作参考）：`docs/intergration.excalidraw`
- 协议许可：BUSL-1.1（同仓库根目录 `LICENSE`）
