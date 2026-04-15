---
title: "Likwid Integration Manual"
description: "1. Create Pool\n2. Manage Liquidity\n3. Swap\n4. Margin Position\n5. Security Best Practices"
---

### Table of Contents

1. Create Pool
2. Manage Liquidity
3. Swap
4. Margin Position
5. Security Best Practices

### 1. Create Pool by LikwidVault

#### Process Flow

1. Configure PoolKey with token pair parameters
2. Call initialize() on LikwidVault
3. Verify pool initialization status

#### ABI Interface

**Contract**: `LikwidVault`\
**Function**:

```solidity
function initialize(PoolKey memory key) external;
```

**Parameters**:

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

### 2. Manage Liquidity by LikwidPairPosition

#### Process Flow

1. Approve token transfers
2. Add liquidity with addLiquidity()
3. Remove liquidity with removeLiquidity()

#### ABI Interface

**Contract**: `LikwidPairPosition`\
**Functions**:

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

**Parameter Structs**:

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

### 3. Swap by LikwidPairPosition

#### Process Flow

1. Configure swap direction (zeroForOne)
2. Set slippage tolerance
3. Execute exactInput() swap

#### ABI Interface

**Contract**: `LikwidPairPosition`\
**Function**:

```solidity
function exactInput(SwapInputParams calldata params)
    external
    payable
    ensure(params.deadline)
    returns (uint24 swapFee, uint256 feeAmount, uint256 amountOut)
```

**Parameter Struct**:

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

#### Code Example

```typescript
// Method for obtaining poolId 

/* 
src/types/PoolId.sol
src/types/PoolKey.sol
*/
PoolKey key = PoolKey({currency0: currency0, currency1: currency1, fee: fee, marginFee: marginFee});
PoolId id = key.toId();
```

### 4. Margin Position by LikwidMarginPosition

#### Process Flow

1. Calculate margin requirements with getAmountIn()
2. Open position with margin()
3. Manage position via repay(), close()

#### ABI Interface

**Contract**: `LikwidMarginPosition`\
**Key Functions**:

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

**Parameter Struct**:

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

### 5.Security Best Practices

1. **Slippage Control**: Always use amountOutMin/borrowMaxAmount with 0.5% tolerance
2. **Liquidation Monitoring**: Track position status regularly
3. **Gas Management**: Set reasonable deadlines (≥5 minutes)
4. **Error Handling**: Wrap calls in try/catch blocks for revert handling
