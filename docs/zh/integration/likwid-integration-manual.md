---
title: "Likwid 集成手册"
description: "Create Pair、Add Liquidity、Increase Liquidity 与 Swap 的标准对接说明。"
---

# Likwid 集成手册

本文档面向第三方开发者，说明如何标准化对接 Likwid 协议的 `Create Pair`、`Add Liquidity`、`Increase Liquidity` 和 `Swap` 能力。

本文不绑定任何特定链、测试网、项目脚本或仓库结构。合约地址、RPC、chainId、原生币 symbol、测试币地址等网络相关配置，应以实际部署网络为准。已发布网络的地址可参考 [合约地址](/zh/product/contract-address)。

本文覆盖：

- 创建交易对
- 首次注入流动性
- 对已有 LP 仓位继续加仓
- 通过 `LikwidPairPosition` 执行 Swap
- `exactInput` / `exactOutput` 的参数、授权、报价与校验
- `PoolKey` / `poolId` 的生成规则
- 原生币与 ERC20 的差异处理
- 交易回执与事件校验

本文不覆盖：

- Margin
- Lend
- Remove Liquidity

## 1. 合约配置

对接方需要按当前网络配置以下合约地址：

| Contract | 用途 |
| --- | --- |
| `LikwidVault` | 创建池子、底层池状态与事件 |
| `LikwidPairPosition` | LP NFT、加流动性、普通 Swap |
| `LikwidHelper` | 池状态查询、Swap 报价 |

`LikwidLendPosition` 和 `LikwidMarginPosition` 属于同一协议的其他业务模块，本文不直接调用。

示例代码中的合约地址请替换为目标网络上的实际部署地址：

```ts
const LIKWID_VAULT = "LIKWID_VAULT_ADDRESS";
const LIKWID_PAIR_POSITION = "LIKWID_PAIR_POSITION_ADDRESS";
const LIKWID_HELPER = "LIKWID_HELPER_ADDRESS";
const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000";
```

## 2. 核心概念

### 2.1 PoolKey

Likwid 池子由 `PoolKey` 唯一标识：

```solidity
struct PoolKey {
  address currency0;
  address currency1;
  uint24 fee;
  uint24 marginFee;
}
```

只有 `currency0`、`currency1`、`fee`、`marginFee` 四个字段完全一致，才表示同一个池子。

### 2.2 poolId

`poolId` 的计算规则为：

```text
poolId = keccak256(
  abi.encode(currency0, currency1, fee, marginFee)
)
```

因此：

- `currency0` / `currency1` 顺序变化会导致 `poolId` 变化
- `fee` 或 `marginFee` 变化也会导致 `poolId` 变化

### 2.3 LP NFT

Likwid 的 LP 仓位由 `LikwidPairPosition` 中的 NFT 表示：

- 首次加流动性时，会创建新的 LP NFT
- 后续继续加仓时，需要使用该 NFT 的 `tokenId`

对接方应在首次加流动性成功后保存 `tokenId`。

### 2.4 Swap 方向

Likwid 的普通兑换通过 `LikwidPairPosition` 完成，不需要 LP NFT 的 `tokenId`，但需要使用已存在池子的 `poolId`。

Swap 方向由 `zeroForOne` 决定：

| `zeroForOne` | 输入 | 输出 |
| --- | --- | --- |
| `true` | `currency0` | `currency1` |
| `false` | `currency1` | `currency0` |

因此，前端选择“TokenA -> TokenB”时，应先根据 `PoolKey` 排序结果判断 TokenA 是 `currency0` 还是 `currency1`，再决定 `zeroForOne`。

Likwid 支持两种 Swap 模式：

- `exactInput`：输入数量固定，用 `amountOutMin` 控制最小可接受输出
- `exactOutput`：输出数量固定，用 `amountInMax` 控制最大可接受输入

## 3. 排序规则

### 3.1 地址更小的一侧永远是 currency0

这是协议对 `PoolKey` 的硬性要求：

- 地址较小的 token 必须放在 `currency0`
- 地址较大的 token 必须放在 `currency1`

不能按前端展示顺序、symbol 或业务命名顺序决定 `currency0/currency1`。

### 3.2 原生币永远是 currency0

Likwid 对原生币使用以下地址表示：

```text
0x0000000000000000000000000000000000000000
```

因为该地址最小，所以只要交易对中包含原生币：

- 原生币一定是 `currency0`
- 另一侧 ERC20 一定是 `currency1`

这里的“原生币”指当前网络的 native token，例如 ETH、MATIC、AVAX 或其他网络原生资产。文档和代码中不要把该逻辑绑定到某一条链的 symbol。

### 3.3 正确示例

假设：

- 原生币地址为 `0x0000000000000000000000000000000000000000`
- `TokenA = 0x1111111111111111111111111111111111111111`

则正确的 `PoolKey` 为：

```json
{
  "currency0": "0x0000000000000000000000000000000000000000",
  "currency1": "0x1111111111111111111111111111111111111111",
  "fee": 3000,
  "marginFee": 3000
}
```

下面这种写法是错误的：

```json
{
  "currency0": "0x1111111111111111111111111111111111111111",
  "currency1": "0x0000000000000000000000000000000000000000",
  "fee": 3000,
  "marginFee": 3000
}
```

可能导致：

- `poolId` 计算错误
- 调用失败
- 命中类似 `CurrenciesOutOfOrderOrEqual` 的错误

## 4. 关键合约接口

### 4.1 LikwidVault.initialize

创建并初始化池子：

```solidity
function initialize(
  (
    address currency0,
    address currency1,
    uint24 fee,
    uint24 marginFee
  ) key
) external;
```

### 4.2 LikwidPairPosition.addLiquidity

首次新增流动性：

```solidity
function addLiquidity(
  (
    address currency0,
    address currency1,
    uint24 fee,
    uint24 marginFee
  ) key,
  address recipient,
  uint256 amount0,
  uint256 amount1,
  uint256 amount0Min,
  uint256 amount1Min,
  uint256 deadline
) external payable returns (uint256 tokenId, uint128 liquidity);
```

### 4.3 LikwidPairPosition.increaseLiquidity

对已有 LP NFT 继续加仓：

```solidity
function increaseLiquidity(
  uint256 tokenId,
  uint256 amount0,
  uint256 amount1,
  uint256 amount0Min,
  uint256 amount1Min,
  uint256 deadline
) external payable returns (uint128 liquidity);
```

### 4.4 LikwidHelper.getPoolStateInfo

查询池状态：

```solidity
function getPoolStateInfo(bytes32 poolId)
  external
  view
  returns (PoolStateInfo stateInfo);
```

本文主要关注以下返回字段：

- `totalSupply`
- `pairReserve0`
- `pairReserve1`
- `borrow0CumulativeLast`

判断一个池子是否已经创建或初始化，应使用：

```solidity
LikwidHelper.PoolStateInfo memory info = helper.getPoolStateInfo(poolId);
bool initialized = info.borrow0CumulativeLast != 0;
```

不要用 `totalSupply`、`pairReserve0` 或 `pairReserve1` 判断池子是否已经创建。池子可以已经完成 `Initialize`，但尚未添加流动性，此时这些流动性相关字段仍可能为 0。

### 4.5 LikwidPairPosition.getPositionState

查询 LP 仓位状态：

```solidity
function getPositionState(uint256 tokenId)
  external
  view
  returns (
    uint128 liquidity,
    uint256 totalInvestment
  );
```

### 4.6 LikwidPairPosition.exactInput

固定输入数量的 Swap：

```solidity
struct SwapInputParams {
  bytes32 poolId;
  bool zeroForOne;
  address to;
  uint256 amountIn;
  uint256 amountOutMin;
  uint256 deadline;
}

function exactInput(SwapInputParams calldata params)
  external
  payable
  returns (
    uint24 swapFee,
    uint256 feeAmount,
    uint256 amountOut
  );
```

### 4.7 LikwidPairPosition.exactOutput

固定输出数量的 Swap：

```solidity
struct SwapOutputParams {
  bytes32 poolId;
  bool zeroForOne;
  address to;
  uint256 amountInMax;
  uint256 amountOut;
  uint256 deadline;
}

function exactOutput(SwapOutputParams calldata params)
  external
  payable
  returns (
    uint24 swapFee,
    uint256 feeAmount,
    uint256 amountIn
  );
```

### 4.8 LikwidHelper.getAmountOut / getAmountIn

Swap 前建议通过 `LikwidHelper` 进行报价：

```solidity
function getAmountOut(
  bytes32 poolId,
  bool zeroForOne,
  uint256 amountIn,
  bool dynamicFee
) external view returns (
  uint256 amountOut,
  uint24 fee,
  uint256 feeAmount
);
```

```solidity
function getAmountIn(
  bytes32 poolId,
  bool zeroForOne,
  uint256 amountOut,
  bool dynamicFee
) external view returns (
  uint256 amountIn,
  uint24 fee,
  uint256 feeAmount
);
```

普通 Swap 与合约实际执行逻辑使用动态费率，生产环境报价时建议传入：

```text
dynamicFee = true
```

#### 返回值已包含动态手续费

当 `dynamicFee = true` 时，两个返回值都已计入动态手续费：

- **`fee`**（`uint24`，百万分制）—— 本次 Swap 的**有效手续费率**，即基础 LP 费率**加上**动态加价后的结果。例如 `3000` = 0.3%，`24000` = 2.4%。
- **`feeAmount`**（`uint256`）—— 本次 Swap **实际支付的总手续费**（计入输入币），同样已包含动态部分。

动态手续费会在交易把价格推离协议的截断参考价较远时急剧上升，遵循 `fee = f_base × (10·s)³`（`s` 为价格偏移幅度）：靠近参考价的交易维持基础费率，大额、扰动价格的交易则贵得多。因此 Swap 前务必用 `dynamicFee = true` 报价来获知真实成本——返回的 `fee` / `feeAmount` 与链上实际收取的完全一致。完整公式与「价格涨幅 → 费率」对照表见《[动态手续费策略](/zh/whitepaper/risk-management-and-strategies/dynamic-fee-strategy-against-mev-and-arbitrage-attacks)》。

## 5. Fee 参数说明

`fee` 和 `marginFee` 都是 `uint24`。对接时应使用协议约定的费率档位。

费率数值使用百万分制表达，示例如下：

- `3000 = 0.3%`
- `5000 = 0.5%`

本文示例默认使用：

```text
fee = 3000
marginFee = 3000
```

对接时需注意：

- `fee` 与 `marginFee` 必须与实际创建池子时保持一致
- 后续任何通过 `poolId` 定位池子的逻辑都依赖这两个参数
- 若项目方或目标网络有固定档位，应以实际配置为准

## 6. Create Pair

### 6.1 流程

`Create Pair` 的标准流程如下：

1. 准备 tokenA、tokenB、`fee`、`marginFee`
2. 按地址大小排序得到 `currency0`、`currency1`
3. 计算 `poolId`
4. 调用 `LikwidHelper.getPoolStateInfo(poolId)` 判断池子是否已创建
5. 如果 `initialized == false`，调用 `LikwidVault.initialize(poolKey)`
6. 校验交易成功与 `Initialize` 事件
7. 保存 `PoolKey` 与 `poolId`

### 6.2 调用参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `currency0` | `address` | 地址较小的一侧 |
| `currency1` | `address` | 地址较大的一侧 |
| `fee` | `uint24` | 交易费率 |
| `marginFee` | `uint24` | 杠杆费率 |

### 6.3 创建前 initialized 判断

调用 `initialize` 之前，建议先通过 `LikwidHelper.getPoolStateInfo(poolId)` 判断池子是否已经创建：

```solidity
LikwidHelper.PoolStateInfo memory info = helper.getPoolStateInfo(poolId);
bool initialized = info.borrow0CumulativeLast != 0;
```

判断规则：

- `initialized == true`：池子已经创建，不应再次调用 `LikwidVault.initialize(poolKey)`
- `initialized == false`：池子尚未创建，可以继续调用 `LikwidVault.initialize(poolKey)`

原因是 `borrow0CumulativeLast` 在池子初始化前为 0，初始化成功后会被协议设置为非 0 值。

### 6.4 成功校验

建议至少校验：

1. 交易回执 `status == success`
2. 回执中存在 `Initialize` 事件
3. 事件中的 `currency0`、`currency1`、`fee`、`marginFee` 与提交参数一致
4. 事件中的 `id` 等于本地计算的 `poolId`
5. 调用 `getPoolStateInfo(poolId)` 后，`borrow0CumulativeLast != 0`

`Initialize` 事件如下：

```solidity
event Initialize(
  bytes32 indexed id,
  address indexed currency0,
  address indexed currency1,
  uint24 fee,
  uint24 marginFee
);
```

### 6.5 常见失败原因

- 两个 token 地址相同
- `currency0` / `currency1` 排序错误
- 池子已初始化，可能命中 `PoolAlreadyInitialized`
- 费率参数错误

## 7. Add Liquidity

`Add Liquidity` 需要分成两种情况：

- 首次注入流动性
- 对已有 LP 仓位继续加仓

这两种情况调用的接口不同，不能混用。

## 8. 首次注入流动性

### 8.1 适用场景

以下场景应使用 `LikwidPairPosition.addLiquidity`：

- 新创建的池子第一次注入流动性
- 当前地址尚未持有该池子的 LP NFT
- 希望创建新的 LP 仓位

首次为某个池子注入流动性时，必须先完成：

```text
LikwidVault.initialize(poolKey)
```

然后才能调用：

```text
LikwidPairPosition.addLiquidity(...)
```

也就是说，首次注流的正确顺序是：

```text
Initialize -> addLiquidity
```

如果池子尚未完成 `Initialize`，则不能直接执行首次 `addLiquidity`。

### 8.2 参数说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `key` | `PoolKey` | 必须与创建池子时使用的参数完全一致 |
| `recipient` | `address` | LP NFT 接收地址 |
| `amount0` | `uint256` | `currency0` 实际投入数量 |
| `amount1` | `uint256` | `currency1` 实际投入数量 |
| `amount0Min` | `uint256` | `currency0` 最小可接受数量 |
| `amount1Min` | `uint256` | `currency1` 最小可接受数量 |
| `deadline` | `uint256` | 过期时间戳，秒级 |

### 8.3 首次注流的定价逻辑

首次注流时池子还没有既有储备比例，因此：

- `amount0` 和 `amount1` 由对接方自行决定
- 这两个数量共同定义池子的初始价格
- 不需要依赖 `pairReserve0 / pairReserve1` 去推导另一侧数量

### 8.4 成功后必须保存的字段

首次 `addLiquidity` 成功后，建议保存：

- `tokenId`
- `poolId`
- `PoolKey`
- `recipient`

其中 `tokenId` 是后续 `increaseLiquidity` 的必要参数。

### 8.5 回执校验

建议做以下确认：

1. 交易回执成功
2. 读取返回值中的 `tokenId`
3. 解析 `Transfer` 事件，确认 NFT 已铸造
4. 解析 `ModifyLiquidity` 事件，确认 `poolId` 与 `tokenId`
5. 调用 `getPositionState(tokenId)` 验证仓位已生成

相关事件如下：

```solidity
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
```

```solidity
event ModifyLiquidity(
  bytes32 indexed poolId,
  uint256 indexed tokenId,
  address indexed sender,
  int128 liquidity,
  uint256 amount0,
  uint256 amount1
);
```

## 9. 对已有 LP 仓位继续加仓

### 9.1 适用场景

当用户已经持有该池子的 LP NFT 时，应使用：

```solidity
increaseLiquidity(tokenId, amount0, amount1, amount0Min, amount1Min, deadline)
```

### 9.2 推荐流程

1. 准备已有 `tokenId`
2. 根据 `PoolKey` 计算 `poolId`
3. 调用 `LikwidHelper.getPoolStateInfo(poolId)`
4. 读取 `pairReserve0` 与 `pairReserve1`
5. 输入一侧金额
6. 按当前储备比例推导另一侧金额
7. 根据滑点计算 `amount0Min` 和 `amount1Min`
8. 调用 `LikwidPairPosition.increaseLiquidity(...)`

### 9.3 数量计算

如果以 `currency0` 作为输入侧：

```text
amount0 = inputAmount
amount1 = inputAmount * pairReserve1 / pairReserve0
```

如果以 `currency1` 作为输入侧：

```text
amount1 = inputAmount
amount0 = inputAmount * pairReserve0 / pairReserve1
```

### 9.4 最小数量

如采用百分比滑点控制，可按以下方式计算：

```text
amount0Min = amount0 * (100 - slippage) / 100
amount1Min = amount1 * (100 - slippage) / 100
```

例如 `slippage = 1` 表示最小接受数量为目标数量的 `99%`。

### 9.5 deadline

本文示例中建议：

```text
deadline = 当前时间 + 300 秒
```

对接方也可以根据业务场景自定义，但建议不要过短或过长。

## 10. Swap 集成

### 10.1 适用场景

普通兑换应使用 `LikwidPairPosition`：

- 已经完成 `Initialize`
- 池子已经存在可用流动性
- 对接方只需要在池子的 `currency0` 与 `currency1` 之间兑换

本文不使用 `LikwidLendPosition.exactInput` / `exactOutput`。那组接口用于 Lend 模块的 mirror swap，需要 Lend NFT 的 `tokenId`，不属于普通交易对 Swap。

### 10.2 前置条件

执行普通 Swap 前应确认：

1. 已按 `PoolKey` 规则正确计算 `poolId`
2. 池子已初始化
3. 池子已有 `pairReserve0` 与 `pairReserve1`
4. `LikwidPairPosition` 已保存该 `poolId` 对应的 `PoolKey`

第 4 点通常意味着该池子已经通过当前 `LikwidPairPosition.addLiquidity` 创建过 LP 仓位。因为普通 Swap 的参数只传 `poolId`，合约内部会通过 `poolId` 查找对应的 `PoolKey`。

### 10.3 exactInput

`exactInput` 适合用户指定“卖出多少输入币”的场景。

参数说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `poolId` | `bytes32` | 目标池子的唯一标识 |
| `zeroForOne` | `bool` | `true` 表示 `currency0 -> currency1`，`false` 表示 `currency1 -> currency0` |
| `to` | `address` | 输出 token 接收地址 |
| `amountIn` | `uint256` | 固定输入数量 |
| `amountOutMin` | `uint256` | 最小可接受输出数量 |
| `deadline` | `uint256` | 过期时间戳，秒级 |

推荐流程：

1. 根据用户选择的输入 token 与输出 token 计算 `zeroForOne`
2. 调用 `LikwidHelper.getAmountOut(poolId, zeroForOne, amountIn, true)` 获取报价
3. 根据滑点计算 `amountOutMin`
4. 如果输入币是 ERC20，先授权 `LikwidPairPosition`
5. 如果输入币是原生币，交易 `value` 设置为 `amountIn`
6. 调用 `LikwidPairPosition.exactInput(params)`

滑点示例：

```text
amountOutMin = quotedAmountOut * (10000 - slippageBps) / 10000
```

例如 `slippageBps = 100` 表示 1% 滑点。

### 10.4 exactOutput

`exactOutput` 适合用户指定“买入多少输出币”的场景。

参数说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `poolId` | `bytes32` | 目标池子的唯一标识 |
| `zeroForOne` | `bool` | `true` 表示用 `currency0` 买 `currency1`，`false` 表示用 `currency1` 买 `currency0` |
| `to` | `address` | 输出 token 接收地址 |
| `amountInMax` | `uint256` | 最大可接受输入数量 |
| `amountOut` | `uint256` | 固定输出数量 |
| `deadline` | `uint256` | 过期时间戳，秒级 |

推荐流程：

1. 根据用户选择的输入 token 与输出 token 计算 `zeroForOne`
2. 调用 `LikwidHelper.getAmountIn(poolId, zeroForOne, amountOut, true)` 获取预计输入数量
3. 根据滑点计算 `amountInMax`
4. 如果输入币是 ERC20，先授权 `LikwidPairPosition`
5. 如果输入币是原生币，交易 `value` 设置为 `amountInMax`
6. 调用 `LikwidPairPosition.exactOutput(params)`

滑点示例：

```text
amountInMax = quotedAmountIn * (10000 + slippageBps) / 10000
```

如果原生币是输入币，`exactOutput` 建议将 `tx.value` 设置为 `amountInMax`。合约实际只结算 `amountIn`，多余的原生币会退回调用者。

### 10.5 输入币、输出币与授权

输入币由 `zeroForOne` 决定：

```text
inputCurrency = zeroForOne ? currency0 : currency1
outputCurrency = zeroForOne ? currency1 : currency0
```

只有输入币需要支付或授权：

- 输入币是 ERC20：`approve(LikwidPairPosition, amountIn)` 或 `approve(LikwidPairPosition, amountInMax)`
- 输入币是原生币：通过交易 `value` 支付
- 输出币不需要 approve

### 10.6 成功返回值

`exactInput` 返回：

| 字段 | 说明 |
| --- | --- |
| `swapFee` | 本次 Swap 实际使用的动态费率 |
| `feeAmount` | 本次 Swap 支付的 LP fee 数量，计入输入币 |
| `amountOut` | 实际收到的输出币数量 |

`exactOutput` 返回：

| 字段 | 说明 |
| --- | --- |
| `swapFee` | 本次 Swap 实际使用的动态费率 |
| `feeAmount` | 本次 Swap 支付的 LP fee 数量，计入输入币 |
| `amountIn` | 实际支付的输入币数量 |

注意：链上交易发送后不能像本地函数一样直接读取返回值。前端通常可以在发送交易前使用 `staticCall` 预演返回值，交易确认后再通过事件和余额变化校验最终结果。

### 10.7 事件校验

Swap 成功后，`LikwidVault` 会发出 `Swap` 事件：

```solidity
event Swap(
  bytes32 indexed id,
  address indexed sender,
  int128 amount0,
  int128 amount1,
  uint24 fee
);
```

建议校验：

1. 交易回执成功
2. 回执中存在 `Swap` 事件
3. `Swap.id` 等于本地计算的 `poolId`
4. `fee` 记录为本次实际动态费率；如果发送前做过 `staticCall`，可与预演结果比对
5. 用户接收地址的输出币余额增加

事件中的 `sender` 是调用 `LikwidVault.swap` 的 PositionManager 地址，普通 Swap 场景下通常是 `LikwidPairPosition`。

若本次收取了 Swap 费用，还会发出 `Fees` 事件：

```solidity
event Fees(
  bytes32 indexed id,
  address indexed currency,
  address indexed sender,
  uint8 feeType,
  uint256 feeAmount,
  uint256 protocolFeeAmount
);
```

对接方可用该事件展示本次手续费。普通 Swap 中 `feeType` 为 `0`，对应 `FeeTypes.SWAP`。

## 11. 原生币与 ERC20 的差异

### 11.1 原生币

若池子包含原生币：

- 原生币地址固定为 `0x0000000000000000000000000000000000000000`
- 原生币一定是 `currency0`
- 原生币不需要 `approve`
- 原生币数量通过交易的 `msg.value` 传入

因此，注流包含原生币时：

```text
tx.value = amount0
```

Swap 包含原生币时，需要区分它是否是输入币：

| 场景 | `tx.value` |
| --- | --- |
| `exactInput`，输入币是原生币 | `amountIn` |
| `exactOutput`，输入币是原生币 | `amountInMax` |
| 输出币是原生币 | `0` |

### 11.2 ERC20

ERC20 需要先授权给 `LikwidPairPosition`：

- spender：当前网络的 `LikwidPairPosition` 地址
- amount：本次实际会消耗的 ERC20 数量，或 `exactOutput` 的 `amountInMax`

### 11.3 授权建议

为兼容非标准 ERC20，建议采用如下授权流程：

1. 读取当前 allowance
2. 若 allowance 已足够，直接跳过
3. 若 allowance 不足且当前 allowance 大于 0，先 `approve(spender, 0)`
4. 再 `approve(spender, targetAmount)`

## 12. 成功校验建议

### 12.1 Create Pair

至少校验：

- 创建前通过 `borrow0CumulativeLast != 0` 判断池子是否已经 initialized
- 交易成功
- 存在 `Initialize` 事件
- 事件中的 `id` 等于本地计算的 `poolId`
- 创建后通过 `getPoolStateInfo(poolId)` 确认 `borrow0CumulativeLast != 0`

### 12.2 首次 Add Liquidity

至少校验：

- 交易成功
- 返回值中有 `tokenId`
- 存在 `Transfer` 事件
- 存在 `ModifyLiquidity` 事件

### 12.3 Increase Liquidity

至少校验：

- 交易成功
- `ModifyLiquidity` 事件中的 `tokenId` 正确
- `getPositionState(tokenId).liquidity` 较调用前增加

### 12.4 Swap

至少校验：

- 交易成功
- 存在 `LikwidVault.Swap` 事件
- `Swap.id` 等于本地计算的 `poolId`
- `exactInput` 场景下，接收地址获得的输出数量不低于 `amountOutMin`
- `exactOutput` 场景下，实际输入数量不高于 `amountInMax`

## 13. 推荐持久化字段

建议至少保存：

| 字段 | 说明 |
| --- | --- |
| `chainId` | 当前链 ID |
| `poolId` | 池子唯一标识 |
| `currency0` | 排序后的较小地址 |
| `currency1` | 排序后的较大地址 |
| `fee` | 费率 |
| `marginFee` | 杠杆费率 |
| `tokenId` | LP NFT 编号 |
| `owner` | LP 持有人 |

尤其建议保存 `tokenId`，否则后续继续加仓会比较被动。

## 14. 推荐调用顺序

### 14.1 创建池子并首次注流

```text
1. 排序 token，得到 currency0 / currency1
2. 计算 poolId
3. 调用 LikwidHelper.getPoolStateInfo(poolId)
4. 使用 borrow0CumulativeLast != 0 判断池子是否 initialized
5. 如未 initialized，调用 LikwidVault.initialize(poolKey)
6. 确认池子已完成 Initialize
7. 如涉及 ERC20，先做 approve(LikwidPairPosition, amount)
8. 调用 LikwidPairPosition.addLiquidity(...)
9. 保存 tokenId
```

### 14.2 对已有仓位继续加仓

```text
1. 准备 tokenId
2. 计算 poolId
3. 查询 LikwidHelper.getPoolStateInfo(poolId)
4. 计算 amount0 / amount1
5. 如涉及 ERC20，先做 approve(LikwidPairPosition, amount)
6. 调用 LikwidPairPosition.increaseLiquidity(...)
7. 校验 ModifyLiquidity 事件
```

### 14.3 exactInput Swap

```text
1. 准备 poolId
2. 根据输入币和输出币计算 zeroForOne
3. 调用 LikwidHelper.getAmountOut(poolId, zeroForOne, amountIn, true)
4. 根据滑点计算 amountOutMin
5. 如输入币为 ERC20，先做 approve(LikwidPairPosition, amountIn)
6. 如输入币为原生币，设置 tx.value = amountIn
7. 调用 LikwidPairPosition.exactInput(...)
8. 校验 Swap 事件与接收地址余额变化
```

### 14.4 exactOutput Swap

```text
1. 准备 poolId
2. 根据输入币和输出币计算 zeroForOne
3. 调用 LikwidHelper.getAmountIn(poolId, zeroForOne, amountOut, true)
4. 根据滑点计算 amountInMax
5. 如输入币为 ERC20，先做 approve(LikwidPairPosition, amountInMax)
6. 如输入币为原生币，设置 tx.value = amountInMax
7. 调用 LikwidPairPosition.exactOutput(...)
8. 校验 Swap 事件与接收地址余额变化
```

## 15. Ethers.js 示例

以下示例使用 `ethers v6`，演示如何直接对接合约。

示例中的以下内容请自行替换：

- `LIKWID_VAULT_ADDRESS`
- `LIKWID_PAIR_POSITION_ADDRESS`
- `LIKWID_HELPER_ADDRESS`
- `TOKEN_A_ADDRESS`
- `TOKEN_B_ADDRESS`
- ABI、RPC、signer 与网络配置

如果一侧是原生币，请使用：

```text
0x0000000000000000000000000000000000000000
```

### 15.1 公共工具函数

```ts
import { ethers } from "ethers";

const LIKWID_VAULT = "LIKWID_VAULT_ADDRESS";
const LIKWID_PAIR_POSITION = "LIKWID_PAIR_POSITION_ADDRESS";
const LIKWID_HELPER = "LIKWID_HELPER_ADDRESS";
const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000";

function normalizeAddress(address: string) {
  return ethers.getAddress(address).toLowerCase();
}

function sortCurrencies(tokenA: string, tokenB: string) {
  const a = normalizeAddress(tokenA);
  const b = normalizeAddress(tokenB);

  if (a === b) {
    throw new Error("currency0 and currency1 cannot be the same token");
  }

  return a < b
    ? { currency0: a, currency1: b }
    : { currency0: b, currency1: a };
}

function buildPoolKey(tokenA: string, tokenB: string, fee: number, marginFee: number) {
  const { currency0, currency1 } = sortCurrencies(tokenA, tokenB);
  return { currency0, currency1, fee, marginFee };
}

function computePoolId(poolKey: {
  currency0: string;
  currency1: string;
  fee: number;
  marginFee: number;
}) {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint24", "uint24"],
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.marginFee]
    )
  );
}

function isNativeCurrency(address: string) {
  return normalizeAddress(address) === NATIVE_ADDRESS;
}

function getSwapDirection(
  poolKey: {
    currency0: string;
    currency1: string;
    fee: number;
    marginFee: number;
  },
  inputToken: string,
  outputToken: string
) {
  const input = normalizeAddress(inputToken);
  const output = normalizeAddress(outputToken);
  const currency0 = normalizeAddress(poolKey.currency0);
  const currency1 = normalizeAddress(poolKey.currency1);

  if (input === currency0 && output === currency1) return true;
  if (input === currency1 && output === currency0) return false;

  throw new Error("input/output token does not match this PoolKey");
}
```

### 15.2 Create Pair 示例

```ts
async function createPair(
  signer: ethers.Signer,
  vaultAbi: any,
  helperAbi: any,
  tokenA: string,
  tokenB: string,
  fee: number = 3000,
  marginFee: number = 3000
) {
  const likwidVault = new ethers.Contract(LIKWID_VAULT, vaultAbi, signer);
  const likwidHelper = new ethers.Contract(LIKWID_HELPER, helperAbi, signer);
  const poolKey = buildPoolKey(tokenA, tokenB, fee, marginFee);
  const poolId = computePoolId(poolKey);

  const info = await likwidHelper.getPoolStateInfo(poolId);
  const initialized = info.borrow0CumulativeLast !== 0n;

  if (initialized) {
    return { poolKey, poolId, initialized, receipt: null };
  }

  const tx = await likwidVault.initialize(poolKey);
  const receipt = await tx.wait();

  return { poolKey, poolId, initialized: true, receipt };
}
```

### 15.3 首次 Add Liquidity 示例

下面示例同时支持原生币和 ERC20。原生币永远是 `currency0`。

```ts
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

async function approveIfNeeded(
  signer: ethers.Signer,
  token: string,
  spender: string,
  amount: bigint
) {
  if (token.toLowerCase() === NATIVE_ADDRESS.toLowerCase()) return;

  const owner = await signer.getAddress();
  const erc20 = new ethers.Contract(token, ERC20_ABI, signer);
  const allowance: bigint = await erc20.allowance(owner, spender);

  if (allowance >= amount) return;

  if (allowance > 0n) {
    const tx0 = await erc20.approve(spender, 0);
    await tx0.wait();
  }

  const tx1 = await erc20.approve(spender, amount);
  await tx1.wait();
}

async function addInitialLiquidity(
  signer: ethers.Signer,
  pairPositionAbi: any,
  tokenA: string,
  tokenB: string,
  amountA: bigint,
  amountB: bigint,
  recipient: string,
  fee: number = 3000,
  marginFee: number = 3000
) {
  const likwidPairPosition = new ethers.Contract(LIKWID_PAIR_POSITION, pairPositionAbi, signer);
  const poolKey = buildPoolKey(tokenA, tokenB, fee, marginFee);

  const amount0 = normalizeAddress(tokenA) < normalizeAddress(tokenB) ? amountA : amountB;
  const amount1 = normalizeAddress(tokenA) < normalizeAddress(tokenB) ? amountB : amountA;

  const amount0Min = amount0 * 99n / 100n;
  const amount1Min = amount1 * 99n / 100n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);

  await approveIfNeeded(signer, poolKey.currency0, LIKWID_PAIR_POSITION, amount0);
  await approveIfNeeded(signer, poolKey.currency1, LIKWID_PAIR_POSITION, amount1);

  const value = poolKey.currency0 === NATIVE_ADDRESS ? amount0 : 0n;

  const tx = await likwidPairPosition.addLiquidity(
    poolKey,
    recipient,
    amount0,
    amount1,
    amount0Min,
    amount1Min,
    deadline,
    { value }
  );

  return tx.wait();
}
```

### 15.4 Increase Liquidity 示例

```ts
async function increaseLiquidityByAmount0(
  signer: ethers.Signer,
  helperAbi: any,
  pairPositionAbi: any,
  tokenId: bigint,
  poolKey: {
    currency0: string;
    currency1: string;
    fee: number;
    marginFee: number;
  },
  inputAmount0: bigint,
  slippagePercent: bigint = 1n
) {
  const likwidHelper = new ethers.Contract(LIKWID_HELPER, helperAbi, signer);
  const likwidPairPosition = new ethers.Contract(LIKWID_PAIR_POSITION, pairPositionAbi, signer);

  const poolId = computePoolId(poolKey);
  const stateInfo = await likwidHelper.getPoolStateInfo(poolId);

  const reserve0: bigint = stateInfo.pairReserve0;
  const reserve1: bigint = stateInfo.pairReserve1;

  if (reserve0 === 0n || reserve1 === 0n) {
    throw new Error("pool has zero reserve, cannot calculate ratio for increaseLiquidity");
  }

  const amount0 = inputAmount0;
  const amount1 = amount0 * reserve1 / reserve0;

  const amount0Min = amount0 * (100n - slippagePercent) / 100n;
  const amount1Min = amount1 * (100n - slippagePercent) / 100n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);

  await approveIfNeeded(signer, poolKey.currency0, LIKWID_PAIR_POSITION, amount0);
  await approveIfNeeded(signer, poolKey.currency1, LIKWID_PAIR_POSITION, amount1);

  const value = poolKey.currency0 === NATIVE_ADDRESS ? amount0 : 0n;

  const tx = await likwidPairPosition.increaseLiquidity(
    tokenId,
    amount0,
    amount1,
    amount0Min,
    amount1Min,
    deadline,
    { value }
  );

  return tx.wait();
}
```

### 15.5 exactInput Swap 示例

```ts
async function swapExactInput(
  signer: ethers.Signer,
  helperAbi: any,
  pairPositionAbi: any,
  poolKey: {
    currency0: string;
    currency1: string;
    fee: number;
    marginFee: number;
  },
  inputToken: string,
  outputToken: string,
  amountIn: bigint,
  recipient: string,
  slippageBps: bigint = 100n
) {
  const likwidHelper = new ethers.Contract(LIKWID_HELPER, helperAbi, signer);
  const likwidPairPosition = new ethers.Contract(LIKWID_PAIR_POSITION, pairPositionAbi, signer);

  const poolId = computePoolId(poolKey);
  const zeroForOne = getSwapDirection(poolKey, inputToken, outputToken);
  const inputCurrency = zeroForOne ? poolKey.currency0 : poolKey.currency1;

  const [quotedAmountOut, quotedFee, quotedFeeAmount] =
    await likwidHelper.getAmountOut(poolId, zeroForOne, amountIn, true);

  const amountOutMin = quotedAmountOut * (10_000n - slippageBps) / 10_000n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);

  await approveIfNeeded(signer, inputCurrency, LIKWID_PAIR_POSITION, amountIn);

  const value = isNativeCurrency(inputCurrency) ? amountIn : 0n;
  const params = {
    poolId,
    zeroForOne,
    to: recipient,
    amountIn,
    amountOutMin,
    deadline
  };

  const preview = await likwidPairPosition.exactInput.staticCall(params, { value });
  const tx = await likwidPairPosition.exactInput(params, { value });
  const receipt = await tx.wait();

  return {
    receipt,
    poolId,
    zeroForOne,
    amountOutMin,
    quotedFee,
    quotedFeeAmount,
    preview
  };
}
```

### 15.6 exactOutput Swap 示例

```ts
async function swapExactOutput(
  signer: ethers.Signer,
  helperAbi: any,
  pairPositionAbi: any,
  poolKey: {
    currency0: string;
    currency1: string;
    fee: number;
    marginFee: number;
  },
  inputToken: string,
  outputToken: string,
  amountOut: bigint,
  recipient: string,
  slippageBps: bigint = 100n
) {
  const likwidHelper = new ethers.Contract(LIKWID_HELPER, helperAbi, signer);
  const likwidPairPosition = new ethers.Contract(LIKWID_PAIR_POSITION, pairPositionAbi, signer);

  const poolId = computePoolId(poolKey);
  const zeroForOne = getSwapDirection(poolKey, inputToken, outputToken);
  const inputCurrency = zeroForOne ? poolKey.currency0 : poolKey.currency1;

  const [quotedAmountIn, quotedFee, quotedFeeAmount] =
    await likwidHelper.getAmountIn(poolId, zeroForOne, amountOut, true);

  const amountInMax = quotedAmountIn * (10_000n + slippageBps) / 10_000n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);

  await approveIfNeeded(signer, inputCurrency, LIKWID_PAIR_POSITION, amountInMax);

  const value = isNativeCurrency(inputCurrency) ? amountInMax : 0n;
  const params = {
    poolId,
    zeroForOne,
    to: recipient,
    amountInMax,
    amountOut,
    deadline
  };

  const preview = await likwidPairPosition.exactOutput.staticCall(params, { value });
  const tx = await likwidPairPosition.exactOutput(params, { value });
  const receipt = await tx.wait();

  return {
    receipt,
    poolId,
    zeroForOne,
    amountInMax,
    quotedFee,
    quotedFeeAmount,
    preview
  };
}
```

## 16. 通过事件提取结果

### 16.1 提取 LP tokenId

首次加流动性后，建议通过以下任一方式获取 `tokenId`：

- 函数返回值
- `Transfer` 事件
- `ModifyLiquidity` 事件

示例：

```ts
function findLpTokenId(receipt: ethers.TransactionReceipt, iface: ethers.Interface) {
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === "Transfer") {
        return parsed.args.tokenId;
      }
    } catch (_) {
      continue;
    }
  }
  return null;
}
```

### 16.2 提取 Swap 事件

普通 Swap 的 `Swap` 事件由 `LikwidVault` 发出，因此解析时应使用 `LikwidVault` ABI。

```ts
function findSwapEvent(
  receipt: ethers.TransactionReceipt,
  vaultIface: ethers.Interface,
  poolId: string
) {
  for (const log of receipt.logs) {
    try {
      const parsed = vaultIface.parseLog(log);
      if (parsed && parsed.name === "Swap" && parsed.args.id.toLowerCase() === poolId.toLowerCase()) {
        return {
          poolId: parsed.args.id,
          sender: parsed.args.sender,
          amount0: parsed.args.amount0,
          amount1: parsed.args.amount1,
          fee: parsed.args.fee
        };
      }
    } catch (_) {
      continue;
    }
  }
  return null;
}
```

`amount0` 与 `amount1` 与合约内部 `BalanceDelta` 方向一致：输入侧通常为负数，输出侧通常为正数。

## 17. 常见问题

### 17.1 为什么同一对币会算出不同的 poolId

通常原因有：

- `currency0/currency1` 顺序不一致
- 一边使用了原生币地址，另一边使用了包装币地址
- `fee` 不一致
- `marginFee` 不一致

### 17.2 如何判断池子是否已经创建

使用 `LikwidHelper.getPoolStateInfo(poolId)` 返回的 `borrow0CumulativeLast` 判断：

```solidity
LikwidHelper.PoolStateInfo memory info = helper.getPoolStateInfo(poolId);
bool initialized = info.borrow0CumulativeLast != 0;
```

`initialized == true` 表示池子已经创建，不应再次调用 `LikwidVault.initialize(poolKey)`。

不要用 `totalSupply`、`pairReserve0` 或 `pairReserve1` 判断池子是否创建，因为池子可以已经 initialized 但尚未添加流动性。

### 17.3 为什么包含原生币的池子里，原生币一定是 currency0

因为原生币地址固定为：

```text
0x0000000000000000000000000000000000000000
```

该地址永远最小，所以原生币永远是 `currency0`。

### 17.4 为什么继续加仓时需要 tokenId

因为 `increaseLiquidity` 是对已有 LP NFT 加仓，不是对池子本身直接加仓，因此必须指定目标 NFT。

### 17.5 为什么继续加仓会失败

常见原因：

- `tokenId` 不属于当前调用者
- 授权不足
- 原生币 `msg.value` 不足
- 滑点保护过严，可能触发 `PriceSlippageTooHigh`
- 传入的 `tokenId` 与目标池子不匹配

### 17.6 为什么 approve 之后仍然失败

建议检查：

- spender 是否为当前网络的 `LikwidPairPosition`
- amount 是否足够
- 当前 token 是否需要先清零再重设 allowance

### 17.7 为什么 Swap 会提示池子不存在或流动性不足

常见原因：

- `poolId` 计算时 `currency0/currency1` 顺序错误
- `fee` 或 `marginFee` 与建池时不一致
- 池子只完成了 `Initialize`，但还没有注入流动性
- `LikwidPairPosition` 尚未保存该 `poolId` 对应的 `PoolKey`
- `amountOut` 大于池子可提供的输出储备

### 17.8 exactInput 与 exactOutput 应该选哪个

- 用户输入“卖出 10 个 TokenA”时，用 `exactInput`
- 用户输入“买入 10 个 TokenB”时，用 `exactOutput`
- `exactInput` 用 `amountOutMin` 保护最小输出
- `exactOutput` 用 `amountInMax` 保护最大输入

### 17.9 为什么 Swap 事件里的 sender 不是用户地址

普通 Swap 是用户调用 `LikwidPairPosition`，再由 `LikwidPairPosition` 进入 `LikwidVault.swap`。因此 `LikwidVault.Swap` 事件里的 `sender` 通常是 `LikwidPairPosition` 地址。用户侧应结合交易 `from`、Swap 参数中的 `to`、以及接收地址余额变化判断实际业务归属。

## 18. 上线前检查清单

- 是否已按目标网络配置 `chainId`、RPC 与合约地址
- 是否已统一 `currency0/currency1` 排序逻辑
- 是否已把原生币固定映射为 `0x0000000000000000000000000000000000000000`
- 是否已明确原生币永远是 `currency0`
- 是否已正确实现 `poolId` 计算
- 是否已使用 `borrow0CumulativeLast != 0` 判断池子是否已经 initialized
- 是否已避免用 `totalSupply`、`pairReserve0`、`pairReserve1` 判断池子是否创建
- 是否已保存首次建仓得到的 `tokenId`
- 是否已处理 ERC20 allowance 不足逻辑
- 是否已区分 `addLiquidity` 与 `increaseLiquidity`
- 是否已根据输入币和输出币正确计算 `zeroForOne`
- 是否已对 Swap 使用 `getAmountOut` / `getAmountIn` 报价并加入滑点保护
- 是否已正确处理 Swap 中原生币作为输入币时的 `tx.value`
- 是否已对 `Initialize`、`Transfer`、`ModifyLiquidity` 做成功校验
- 是否已对 `Swap` 事件和接收地址余额变化做成功校验

## 19. 占位项说明

本文示例中的以下内容需要由对接方自行替换：

- `LIKWID_VAULT_ADDRESS`
- `LIKWID_PAIR_POSITION_ADDRESS`
- `LIKWID_HELPER_ADDRESS`
- `TOKEN_A_ADDRESS`
- `TOKEN_B_ADDRESS`
- `recipient`
- `amountA`
- `amountB`
- `inputToken`
- `outputToken`
- `amountIn`
- `amountOut`
- `slippageBps`
- `fee`
- `marginFee`

若后续提供具体测试币地址、symbol 和 decimals，可以继续补一版面向特定网络的可执行样例，但标准集成文档应保持链无关。
