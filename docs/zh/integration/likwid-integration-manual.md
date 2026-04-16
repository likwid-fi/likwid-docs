---
title: "Likwid 集成手册"
description: "1. 创建池子\n2. 管理流动性\n3. Swap\n4. 保证金仓位\n5. 安全最佳实践"
---

### 目录

1. 创建池子
2. 管理流动性
3. Swap
4. 保证金仓位
5. 安全最佳实践

### 1. 通过 LikwidVault 创建池子

#### 流程

1. 用代币对参数配置 `PoolKey`
2. 调用 `LikwidVault` 上的 `initialize()`
3. 校验池子初始化状态

#### ABI 接口

**合约**：`LikwidVault`\
**函数**：

```solidity
function initialize(PoolKey memory key) external;
```

**参数**：

```solidity
struct PoolKey {
    /// @notice The lower currency of the pool, sorted numerically
    Currency currency0;
    /// @notice The higher currency of the pool, sorted numerically
    Currency currency1;
    /// @notice The pool LP fee, capped at 1_000_000. E.g., 0.3% = 3_000
    uint24 fee;
    /// @notice The pool LP margin fee, capped at 1_000_000. E.g., 0.3% = 3_000
    uint24 marginFee;
}
```

### 2. 通过 LikwidPairPosition 管理流动性

#### 流程

1. 先授权代币转账
2. 调用 `addLiquidity()` 添加流动性
3. 调用 `removeLiquidity()` 移除流动性

#### ABI 接口

**合约**：`LikwidPairPosition`\
**函数**：

```solidity
// Add liquidity
function addLiquidity(
    PoolKey memory key,
    address recipient,
    uint256 amount0,
    uint256 amount1,
    uint256 amount0Min,
    uint256 amount1Min,
    uint256 deadline
) external;

// Remove liquidity
function removeLiquidity(
    uint256 tokenId,
    uint128 liquidity,
    uint256 amount0Min,
    uint256 amount1Min,
    uint256 deadline
) external
```

**参数结构体**：

```solidity
struct PoolKey {
    /// @notice The lower currency of the pool, sorted numerically
    Currency currency0;
    /// @notice The higher currency of the pool, sorted numerically
    Currency currency1;
    /// @notice The pool LP fee, capped at 1_000_000. E.g., 0.3% = 3_000
    uint24 fee;
    /// @notice The pool LP margin fee, capped at 1_000_000. E.g., 0.3% = 3_000
    uint24 marginFee;
}
```

### 3. 通过 LikwidPairPosition 执行 Swap

#### 流程

1. 配置 swap 方向（`zeroForOne`）
2. 设置滑点容忍度
3. 调用 `exactInput()` 执行 swap

#### ABI 接口

**合约**：`LikwidPairPosition`\
**函数**：

```solidity
function exactInput(SwapInputParams calldata params)
    external
    payable
    ensure(params.deadline)
    returns (uint24 swapFee, uint256 feeAmount, uint256 amountOut)
```

**参数结构体**：

```solidity
struct SwapInputParams {
    PoolId poolId;
    bool zeroForOne;
    address to;
    uint256 amountIn;
    uint256 amountOutMin;
    uint256 deadline;
}
```

#### 代码示例

```typescript
// Method for obtaining poolId 

/* 
src/types/PoolId.sol
src/types/PoolKey.sol
*/
PoolKey key = PoolKey({currency0: currency0, currency1: currency1, fee: fee, marginFee: marginFee});
PoolId id = key.toId();
```

### 4. 通过 LikwidMarginPosition 管理保证金仓位

#### 流程

1. 先用 `getAmountIn()` 估算保证金需求
2. 用 `margin()` 或对应建仓入口开仓
3. 通过 `repay()`、`close()` 管理仓位

#### ABI 接口

**合约**：`LikwidMarginPosition`\
**关键函数**：

```solidity
// Open position
function addMargin(PoolKey memory key, IMarginPositionManager.CreateParams calldata params)
    external
    payable
    ensure(params.deadline)
    returns (uint256 tokenId, uint256 borrowAmount, uint256 swapFeeAmount);

// Repay position
function repay(uint256 tokenId, uint256 repayAmount, uint256 deadline) external payable ensure(deadline);

// Close position
function close(uint256 tokenId, uint24 closeMillionth, uint256 closeAmountMin, uint256 deadline)
        external
        ensure(deadline);
```

**参数结构体**：

```solidity
struct CreateParams {
    /// @notice true: currency1 is marginToken, false: currency0 is marginToken
    bool marginForOne;
    /// @notice Leverage factor of the margin position.
    uint24 leverage;
    /// @notice The amount of margin
    uint256 marginAmount;
    /// @notice The borrow amount of the margin position.When the parameter is passed in, it is 0.
    uint256 borrowAmount;
    /// @notice The maximum borrow amount of the margin position.
    uint256 borrowAmountMax;
    /// @notice The address of recipient
    address recipient;
    /// @notice Deadline for the transaction
    uint256 deadline;
}
```

### 5. 安全最佳实践

1. **滑点控制**：始终为 `amountOutMin` / `borrowAmountMax` 预留合理容忍区间，例如 0.5%
2. **清算监控**：定期跟踪仓位健康度
3. **Gas 管理**：设置合理的 deadline（建议不少于 5 分钟）
4. **错误处理**：将合约调用包裹在 `try/catch` 中，并妥善处理 revert
