---
title: "Likwid Integration Manual"
description: "Standard integration guide for Create Pair, Add Liquidity, Increase Liquidity, and Swap."
---

# Likwid Integration Manual

This guide is for third-party developers integrating with Likwid protocol features including `Create Pair`, `Add Liquidity`, `Increase Liquidity`, and `Swap`.

This document is not bound to any specific chain, testnet, project script, or repository structure. Contract addresses, RPC endpoints, chain IDs, native token symbols, and test token addresses must be configured for the target deployment network. Published deployment addresses are listed in [Contract Address](/product/contract-address).

This guide covers:

- Creating a pair
- Adding initial liquidity
- Increasing liquidity on an existing LP position
- Executing swaps through `LikwidPairPosition`
- Parameters, approvals, quotes, and validation for `exactInput` / `exactOutput`
- `PoolKey` / `poolId` generation rules
- Native currency and ERC20 handling differences
- Transaction receipt and event validation

This guide does not cover:

- Margin
- Lend
- Remove Liquidity

## 1. Contract Configuration

Integrators need to configure the following contract addresses for the target network:

| Contract | Purpose |
| --- | --- |
| `LikwidVault` | Pool creation, underlying pool state, and events |
| `LikwidPairPosition` | LP NFTs, liquidity operations, and regular swaps |
| `LikwidHelper` | Pool state queries and swap quotes |

`LikwidLendPosition` and `LikwidMarginPosition` are other protocol modules and are not called directly in this guide.

Replace the contract addresses in the examples with the actual deployment addresses for the target network:

```ts
const LIKWID_VAULT = "LIKWID_VAULT_ADDRESS";
const LIKWID_PAIR_POSITION = "LIKWID_PAIR_POSITION_ADDRESS";
const LIKWID_HELPER = "LIKWID_HELPER_ADDRESS";
const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000";
```

## 2. Core Concepts

### 2.1 PoolKey

A Likwid pool is uniquely identified by a `PoolKey`:

```solidity
struct PoolKey {
  address currency0;
  address currency1;
  uint24 fee;
  uint24 marginFee;
}
```

Only a `PoolKey` with exactly the same `currency0`, `currency1`, `fee`, and `marginFee` identifies the same pool.

### 2.2 poolId

`poolId` is computed as:

```text
poolId = keccak256(
  abi.encode(currency0, currency1, fee, marginFee)
)
```

Therefore:

- Changing the `currency0` / `currency1` order changes the `poolId`
- Changing `fee` or `marginFee` also changes the `poolId`

### 2.3 LP NFT

Likwid LP positions are represented by NFTs in `LikwidPairPosition`:

- Initial liquidity creates a new LP NFT
- Increasing liquidity on an existing position requires that NFT's `tokenId`

Integrators should persist the `tokenId` after the first successful liquidity add.

### 2.4 Swap Direction

Regular swaps are executed through `LikwidPairPosition`. They do not require an LP NFT `tokenId`, but they do require the `poolId` of an existing pool.

Swap direction is controlled by `zeroForOne`:

| `zeroForOne` | Input | Output |
| --- | --- | --- |
| `true` | `currency0` | `currency1` |
| `false` | `currency1` | `currency0` |

When a frontend displays "TokenA -> TokenB", it should first determine whether TokenA is `currency0` or `currency1` based on the sorted `PoolKey`, then derive `zeroForOne`.

Likwid supports two swap modes:

- `exactInput`: fixed input amount, protected by `amountOutMin`
- `exactOutput`: fixed output amount, protected by `amountInMax`

## 3. Sorting Rules

### 3.1 The Smaller Address Is Always currency0

The protocol requires `PoolKey` currencies to be sorted:

- The token with the smaller address must be `currency0`
- The token with the larger address must be `currency1`

Do not use frontend display order, token symbol, or business naming to decide `currency0/currency1`.

### 3.2 Native Currency Is Always currency0

Likwid represents the native currency with:

```text
0x0000000000000000000000000000000000000000
```

Because this address is the smallest possible address, whenever a pair includes the native currency:

- The native currency is always `currency0`
- The other ERC20 token is always `currency1`

"Native currency" means the target network's native token, such as ETH, MATIC, AVAX, or another chain-native asset. Documentation and code should not bind this logic to a single chain symbol.

### 3.3 Example

Assume:

- Native currency address is `0x0000000000000000000000000000000000000000`
- `TokenA = 0x1111111111111111111111111111111111111111`

The correct `PoolKey` is:

```json
{
  "currency0": "0x0000000000000000000000000000000000000000",
  "currency1": "0x1111111111111111111111111111111111111111",
  "fee": 3000,
  "marginFee": 3000
}
```

This is incorrect:

```json
{
  "currency0": "0x1111111111111111111111111111111111111111",
  "currency1": "0x0000000000000000000000000000000000000000",
  "fee": 3000,
  "marginFee": 3000
}
```

It can cause:

- Incorrect `poolId` calculation
- Failed calls
- Errors similar to `CurrenciesOutOfOrderOrEqual`

## 4. Key Contract Interfaces

### 4.1 LikwidVault.initialize

Creates and initializes a pool:

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

Adds initial liquidity:

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

Increases liquidity on an existing LP NFT:

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

Queries pool state:

```solidity
function getPoolStateInfo(bytes32 poolId)
  external
  view
  returns (PoolStateInfo stateInfo);
```

The most relevant returned fields for this guide are:

- `totalSupply`
- `pairReserve0`
- `pairReserve1`
- `borrow0CumulativeLast`

To check whether a pool has been created or initialized, use:

```solidity
LikwidHelper.PoolStateInfo memory info = helper.getPoolStateInfo(poolId);
bool initialized = info.borrow0CumulativeLast != 0;
```

Do not use `totalSupply`, `pairReserve0`, or `pairReserve1` to determine whether a pool has been created. A pool may be initialized before any liquidity is added, in which case liquidity-related fields can still be 0.

### 4.5 LikwidPairPosition.getPositionState

Queries LP position state:

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

Swap with a fixed input amount:

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

Swap with a fixed output amount:

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

Use `LikwidHelper` for quotes before swapping:

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

Regular swaps use dynamic fees in the actual execution path. For production quoting, use:

```text
dynamicFee = true
```

## 5. Fee Parameters

`fee` and `marginFee` are both `uint24`. Integrations should use the fee tiers defined by the protocol deployment.

Fee values are expressed in millionths:

- `3000 = 0.3%`
- `5000 = 0.5%`

Examples in this guide use:

```text
fee = 3000
marginFee = 3000
```

Important notes:

- `fee` and `marginFee` must match the values used when the pool was created
- Any later logic that locates a pool by `poolId` depends on these two fields
- If the project or target network uses fixed tiers, use the actual configured values

## 6. Create Pair

### 6.1 Flow

The standard `Create Pair` flow is:

1. Prepare tokenA, tokenB, `fee`, and `marginFee`
2. Sort addresses to derive `currency0` and `currency1`
3. Compute `poolId`
4. Call `LikwidHelper.getPoolStateInfo(poolId)` to check whether the pool exists
5. If `initialized == false`, call `LikwidVault.initialize(poolKey)`
6. Validate transaction success and the `Initialize` event
7. Persist `PoolKey` and `poolId`

### 6.2 Parameters

| Field | Type | Description |
| --- | --- | --- |
| `currency0` | `address` | Smaller address |
| `currency1` | `address` | Larger address |
| `fee` | `uint24` | Swap fee |
| `marginFee` | `uint24` | Margin fee |

### 6.3 Checking initialized Before Creation

Before calling `initialize`, check pool state with `LikwidHelper.getPoolStateInfo(poolId)`:

```solidity
LikwidHelper.PoolStateInfo memory info = helper.getPoolStateInfo(poolId);
bool initialized = info.borrow0CumulativeLast != 0;
```

Rules:

- `initialized == true`: the pool has already been created; do not call `LikwidVault.initialize(poolKey)` again
- `initialized == false`: the pool has not been created; calling `LikwidVault.initialize(poolKey)` is valid

`borrow0CumulativeLast` is 0 before initialization and is set to a non-zero value after successful initialization.

### 6.4 Success Validation

Validate at least:

1. Transaction receipt `status == success`
2. Receipt contains an `Initialize` event
3. Event `currency0`, `currency1`, `fee`, and `marginFee` match submitted parameters
4. Event `id` equals the locally computed `poolId`
5. `getPoolStateInfo(poolId)` returns `borrow0CumulativeLast != 0`

`Initialize` event:

```solidity
event Initialize(
  bytes32 indexed id,
  address indexed currency0,
  address indexed currency1,
  uint24 fee,
  uint24 marginFee
);
```

### 6.5 Common Failure Causes

- Token addresses are identical
- `currency0` / `currency1` are not sorted correctly
- Pool is already initialized, possibly causing `PoolAlreadyInitialized`
- Incorrect fee parameters

## 7. Add Liquidity

There are two different liquidity flows:

- Adding initial liquidity
- Increasing liquidity on an existing LP position

They use different interfaces and must not be mixed.

## 8. Initial Liquidity

### 8.1 When to Use

Use `LikwidPairPosition.addLiquidity` when:

- Adding the first liquidity to a newly created pool
- The current address does not already hold an LP NFT for this pool
- Creating a new LP position is desired

Before the first liquidity add, the pool must be initialized:

```text
LikwidVault.initialize(poolKey)
```

Then call:

```text
LikwidPairPosition.addLiquidity(...)
```

Correct order:

```text
Initialize -> addLiquidity
```

If the pool has not completed `Initialize`, do not call initial `addLiquidity`.

### 8.2 Parameters

| Field | Type | Description |
| --- | --- | --- |
| `key` | `PoolKey` | Must exactly match the pool creation parameters |
| `recipient` | `address` | LP NFT recipient |
| `amount0` | `uint256` | Actual `currency0` amount supplied |
| `amount1` | `uint256` | Actual `currency1` amount supplied |
| `amount0Min` | `uint256` | Minimum acceptable `currency0` amount |
| `amount1Min` | `uint256` | Minimum acceptable `currency1` amount |
| `deadline` | `uint256` | Expiration timestamp in seconds |

### 8.3 Initial Price

When adding initial liquidity, the pool has no existing reserve ratio:

- `amount0` and `amount1` are chosen by the integrator
- Together, these values define the initial pool price
- Do not derive the other side from `pairReserve0 / pairReserve1`

### 8.4 Fields to Persist

After a successful first `addLiquidity`, persist:

- `tokenId`
- `poolId`
- `PoolKey`
- `recipient`

`tokenId` is required for future `increaseLiquidity` calls.

### 8.5 Receipt Validation

Validate:

1. Transaction receipt succeeded
2. `tokenId` is available from the return value
3. `Transfer` event confirms the NFT was minted
4. `ModifyLiquidity` event confirms `poolId` and `tokenId`
5. `getPositionState(tokenId)` confirms the position exists

Relevant events:

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

## 9. Increase Liquidity on an Existing LP Position

### 9.1 When to Use

When the user already holds an LP NFT for the pool, use:

```solidity
increaseLiquidity(tokenId, amount0, amount1, amount0Min, amount1Min, deadline)
```

### 9.2 Recommended Flow

1. Prepare the existing `tokenId`
2. Compute `poolId` from `PoolKey`
3. Call `LikwidHelper.getPoolStateInfo(poolId)`
4. Read `pairReserve0` and `pairReserve1`
5. Enter the amount for one side
6. Derive the other side from the current reserve ratio
7. Compute `amount0Min` and `amount1Min` based on slippage
8. Call `LikwidPairPosition.increaseLiquidity(...)`

### 9.3 Amount Calculation

If `currency0` is the input side:

```text
amount0 = inputAmount
amount1 = inputAmount * pairReserve1 / pairReserve0
```

If `currency1` is the input side:

```text
amount1 = inputAmount
amount0 = inputAmount * pairReserve0 / pairReserve1
```

### 9.4 Minimum Amounts

For percentage-based slippage:

```text
amount0Min = amount0 * (100 - slippage) / 100
amount1Min = amount1 * (100 - slippage) / 100
```

For example, `slippage = 1` means the minimum acceptable amount is `99%` of the target amount.

### 9.5 deadline

This guide uses:

```text
deadline = current time + 300 seconds
```

Integrators may adjust this per product requirements, but it should not be too short or too long.

## 10. Swap Integration

### 10.1 When to Use

Regular swaps should use `LikwidPairPosition` when:

- The pool has completed `Initialize`
- The pool has available liquidity
- The integration only needs to swap between `currency0` and `currency1`

This guide does not use `LikwidLendPosition.exactInput` / `exactOutput`. Those interfaces are for Lend module mirror swaps and require a Lend NFT `tokenId`; they are not regular pair swaps.

### 10.2 Preconditions

Before executing a regular swap, confirm:

1. `poolId` is computed correctly from `PoolKey`
2. The pool is initialized
3. The pool has `pairReserve0` and `pairReserve1`
4. `LikwidPairPosition` has stored the `PoolKey` for this `poolId`

The fourth point usually means an LP position has been created through the current `LikwidPairPosition.addLiquidity`. Regular swap parameters only pass `poolId`, so the contract looks up the corresponding `PoolKey` internally.

### 10.3 exactInput

Use `exactInput` when the user specifies how much input token to sell.

Parameters:

| Field | Type | Description |
| --- | --- | --- |
| `poolId` | `bytes32` | Pool identifier |
| `zeroForOne` | `bool` | `true` means `currency0 -> currency1`; `false` means `currency1 -> currency0` |
| `to` | `address` | Output token recipient |
| `amountIn` | `uint256` | Fixed input amount |
| `amountOutMin` | `uint256` | Minimum acceptable output amount |
| `deadline` | `uint256` | Expiration timestamp in seconds |

Recommended flow:

1. Compute `zeroForOne` from the selected input and output tokens
2. Call `LikwidHelper.getAmountOut(poolId, zeroForOne, amountIn, true)` for a quote
3. Compute `amountOutMin` from slippage
4. If the input is ERC20, approve `LikwidPairPosition`
5. If the input is native currency, set transaction `value` to `amountIn`
6. Call `LikwidPairPosition.exactInput(params)`

Slippage example:

```text
amountOutMin = quotedAmountOut * (10000 - slippageBps) / 10000
```

For example, `slippageBps = 100` means 1% slippage.

### 10.4 exactOutput

Use `exactOutput` when the user specifies how much output token to buy.

Parameters:

| Field | Type | Description |
| --- | --- | --- |
| `poolId` | `bytes32` | Pool identifier |
| `zeroForOne` | `bool` | `true` means using `currency0` to buy `currency1`; `false` means using `currency1` to buy `currency0` |
| `to` | `address` | Output token recipient |
| `amountInMax` | `uint256` | Maximum acceptable input amount |
| `amountOut` | `uint256` | Fixed output amount |
| `deadline` | `uint256` | Expiration timestamp in seconds |

Recommended flow:

1. Compute `zeroForOne` from the selected input and output tokens
2. Call `LikwidHelper.getAmountIn(poolId, zeroForOne, amountOut, true)` for the expected input
3. Compute `amountInMax` from slippage
4. If the input is ERC20, approve `LikwidPairPosition`
5. If the input is native currency, set transaction `value` to `amountInMax`
6. Call `LikwidPairPosition.exactOutput(params)`

Slippage example:

```text
amountInMax = quotedAmountIn * (10000 + slippageBps) / 10000
```

If the input is native currency, set `tx.value` to `amountInMax`. The contract settles only the actual `amountIn` and refunds unused native currency to the caller.

### 10.5 Input, Output, and Approvals

Input and output currencies are derived from `zeroForOne`:

```text
inputCurrency = zeroForOne ? currency0 : currency1
outputCurrency = zeroForOne ? currency1 : currency0
```

Only the input currency needs payment or approval:

- ERC20 input: `approve(LikwidPairPosition, amountIn)` or `approve(LikwidPairPosition, amountInMax)`
- Native currency input: pay through transaction `value`
- Output currency: no approval required

### 10.6 Return Values

`exactInput` returns:

| Field | Description |
| --- | --- |
| `swapFee` | Dynamic fee used for this swap |
| `feeAmount` | LP fee amount paid by this swap, charged in input currency |
| `amountOut` | Actual output amount received |

`exactOutput` returns:

| Field | Description |
| --- | --- |
| `swapFee` | Dynamic fee used for this swap |
| `feeAmount` | LP fee amount paid by this swap, charged in input currency |
| `amountIn` | Actual input amount paid |

After a transaction is sent on-chain, return values cannot be read like local function returns. Frontends typically use `staticCall` before sending the transaction, then validate the final result through events and balance changes after confirmation.

### 10.7 Event Validation

After a successful swap, `LikwidVault` emits `Swap`:

```solidity
event Swap(
  bytes32 indexed id,
  address indexed sender,
  int128 amount0,
  int128 amount1,
  uint24 fee
);
```

Validate:

1. Transaction receipt succeeded
2. Receipt contains a `Swap` event
3. `Swap.id` equals the locally computed `poolId`
4. `fee` records the actual dynamic fee; if `staticCall` was used, compare with the preview result
5. Output token balance increased for the recipient

The `sender` in this event is the PositionManager address that calls `LikwidVault.swap`; for regular swaps this is usually `LikwidPairPosition`.

If swap fees are charged, a `Fees` event is also emitted:

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

Integrators can use this event to display fees. For regular swaps, `feeType` is `0`, corresponding to `FeeTypes.SWAP`.

## 11. Native Currency and ERC20 Differences

### 11.1 Native Currency

If a pool includes native currency:

- Native currency address is `0x0000000000000000000000000000000000000000`
- Native currency is always `currency0`
- Native currency does not require `approve`
- Native currency amounts are passed through transaction `msg.value`

For liquidity operations that include native currency:

```text
tx.value = amount0
```

For swaps involving native currency:

| Scenario | `tx.value` |
| --- | --- |
| `exactInput`, native currency is input | `amountIn` |
| `exactOutput`, native currency is input | `amountInMax` |
| Native currency is output | `0` |

### 11.2 ERC20

ERC20 inputs must be approved to `LikwidPairPosition` first:

- spender: the target network's `LikwidPairPosition` address
- amount: the ERC20 amount consumed by this transaction, or `amountInMax` for `exactOutput`

### 11.3 Approval Recommendation

For compatibility with non-standard ERC20 tokens:

1. Read current allowance
2. If allowance is sufficient, skip approval
3. If allowance is insufficient and current allowance is greater than 0, call `approve(spender, 0)` first
4. Then call `approve(spender, targetAmount)`

## 12. Success Validation Checklist

### 12.1 Create Pair

Validate at least:

- Before creation, use `borrow0CumulativeLast != 0` to determine whether the pool is already initialized
- Transaction succeeded
- `Initialize` event exists
- Event `id` equals locally computed `poolId`
- After creation, `getPoolStateInfo(poolId)` returns `borrow0CumulativeLast != 0`

### 12.2 Initial Add Liquidity

Validate at least:

- Transaction succeeded
- Return value includes `tokenId`
- `Transfer` event exists
- `ModifyLiquidity` event exists

### 12.3 Increase Liquidity

Validate at least:

- Transaction succeeded
- `ModifyLiquidity` event has the expected `tokenId`
- `getPositionState(tokenId).liquidity` increased from before the call

### 12.4 Swap

Validate at least:

- Transaction succeeded
- `LikwidVault.Swap` event exists
- `Swap.id` equals locally computed `poolId`
- For `exactInput`, recipient output is at least `amountOutMin`
- For `exactOutput`, actual input is not greater than `amountInMax`

## 13. Recommended Persisted Fields

Persist at least:

| Field | Description |
| --- | --- |
| `chainId` | Current chain ID |
| `poolId` | Pool identifier |
| `currency0` | Sorted smaller address |
| `currency1` | Sorted larger address |
| `fee` | Swap fee |
| `marginFee` | Margin fee |
| `tokenId` | LP NFT ID |
| `owner` | LP holder |

Persisting `tokenId` is especially important because it is required for future liquidity increases.

## 14. Recommended Call Order

### 14.1 Create Pool and Add Initial Liquidity

```text
1. Sort tokens to get currency0 / currency1
2. Compute poolId
3. Call LikwidHelper.getPoolStateInfo(poolId)
4. Use borrow0CumulativeLast != 0 to check initialized
5. If not initialized, call LikwidVault.initialize(poolKey)
6. Confirm Initialize completed
7. If ERC20 is involved, approve(LikwidPairPosition, amount)
8. Call LikwidPairPosition.addLiquidity(...)
9. Persist tokenId
```

### 14.2 Increase an Existing Position

```text
1. Prepare tokenId
2. Compute poolId
3. Query LikwidHelper.getPoolStateInfo(poolId)
4. Compute amount0 / amount1
5. If ERC20 is involved, approve(LikwidPairPosition, amount)
6. Call LikwidPairPosition.increaseLiquidity(...)
7. Validate ModifyLiquidity event
```

### 14.3 exactInput Swap

```text
1. Prepare poolId
2. Compute zeroForOne from input and output tokens
3. Call LikwidHelper.getAmountOut(poolId, zeroForOne, amountIn, true)
4. Compute amountOutMin from slippage
5. If input is ERC20, approve(LikwidPairPosition, amountIn)
6. If input is native currency, set tx.value = amountIn
7. Call LikwidPairPosition.exactInput(...)
8. Validate Swap event and recipient balance change
```

### 14.4 exactOutput Swap

```text
1. Prepare poolId
2. Compute zeroForOne from input and output tokens
3. Call LikwidHelper.getAmountIn(poolId, zeroForOne, amountOut, true)
4. Compute amountInMax from slippage
5. If input is ERC20, approve(LikwidPairPosition, amountInMax)
6. If input is native currency, set tx.value = amountInMax
7. Call LikwidPairPosition.exactOutput(...)
8. Validate Swap event and recipient balance change
```

## 15. Ethers.js Examples

The examples use `ethers v6` and show direct contract integration.

Replace the following values:

- `LIKWID_VAULT_ADDRESS`
- `LIKWID_PAIR_POSITION_ADDRESS`
- `LIKWID_HELPER_ADDRESS`
- `TOKEN_A_ADDRESS`
- `TOKEN_B_ADDRESS`
- ABI, RPC, signer, and network configuration

If one side is native currency, use:

```text
0x0000000000000000000000000000000000000000
```

### 15.1 Shared Utilities

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

### 15.2 Create Pair Example

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

### 15.3 Initial Add Liquidity Example

This example supports both native currency and ERC20. Native currency is always `currency0`.

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

### 15.4 Increase Liquidity Example

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

### 15.5 exactInput Swap Example

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

### 15.6 exactOutput Swap Example

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

## 16. Extracting Results from Events

### 16.1 Extract LP tokenId

After initial liquidity is added, get `tokenId` from one of:

- Function return value
- `Transfer` event
- `ModifyLiquidity` event

Example:

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

### 16.2 Extract Swap Event

Regular swap `Swap` events are emitted by `LikwidVault`, so parse them with the `LikwidVault` ABI.

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

`amount0` and `amount1` follow the contract's internal `BalanceDelta` direction. The input side is usually negative and the output side is usually positive.

## 17. FAQ

### 17.1 Why does the same token pair produce different poolIds?

Common causes:

- `currency0/currency1` order is inconsistent
- One side uses the native currency address while the other uses a wrapped token address
- `fee` differs
- `marginFee` differs

### 17.2 How do I check whether a pool already exists?

Use `borrow0CumulativeLast` returned by `LikwidHelper.getPoolStateInfo(poolId)`:

```solidity
LikwidHelper.PoolStateInfo memory info = helper.getPoolStateInfo(poolId);
bool initialized = info.borrow0CumulativeLast != 0;
```

`initialized == true` means the pool already exists and `LikwidVault.initialize(poolKey)` should not be called again.

Do not use `totalSupply`, `pairReserve0`, or `pairReserve1` for this check. A pool can be initialized before liquidity is added.

### 17.3 Why is native currency always currency0?

Native currency is represented by:

```text
0x0000000000000000000000000000000000000000
```

This is always the smallest address, so native currency is always `currency0`.

### 17.4 Why does increasing liquidity require tokenId?

`increaseLiquidity` adds to an existing LP NFT, not directly to the pool, so the target NFT must be specified.

### 17.5 Why can increaseLiquidity fail?

Common causes:

- `tokenId` is not owned by the caller
- Insufficient approval
- Insufficient native currency `msg.value`
- Slippage protection is too strict, possibly triggering `PriceSlippageTooHigh`
- `tokenId` does not match the target pool

### 17.6 Why can a call fail after approve?

Check:

- spender is the target network's `LikwidPairPosition`
- approved amount is sufficient
- token requires allowance to be reset to 0 before setting a new value

### 17.7 Why does Swap say the pool does not exist or has insufficient liquidity?

Common causes:

- `currency0/currency1` order was wrong when computing `poolId`
- `fee` or `marginFee` does not match pool creation values
- Pool is initialized but has no liquidity
- `LikwidPairPosition` has not stored the `PoolKey` for this `poolId`
- `amountOut` exceeds available output reserves

### 17.8 When should I use exactInput or exactOutput?

- Use `exactInput` when the user enters "sell 10 TokenA"
- Use `exactOutput` when the user enters "buy 10 TokenB"
- `exactInput` protects minimum output with `amountOutMin`
- `exactOutput` protects maximum input with `amountInMax`

### 17.9 Why is the Swap event sender not the user address?

For regular swaps, the user calls `LikwidPairPosition`, and `LikwidPairPosition` calls `LikwidVault.swap`. Therefore, `sender` in `LikwidVault.Swap` is usually the `LikwidPairPosition` address. User-level attribution should combine transaction `from`, swap parameter `to`, and recipient balance changes.

## 18. Pre-Launch Checklist

- Target network `chainId`, RPC, and contract addresses are configured
- `currency0/currency1` sorting is centralized and consistent
- Native currency is mapped to `0x0000000000000000000000000000000000000000`
- Native currency is always treated as `currency0`
- `poolId` calculation is implemented correctly
- Pool initialization checks use `borrow0CumulativeLast != 0`
- `totalSupply`, `pairReserve0`, and `pairReserve1` are not used to determine pool creation
- First LP `tokenId` is persisted
- ERC20 allowance handling is implemented
- `addLiquidity` and `increaseLiquidity` are separated correctly
- `zeroForOne` is computed correctly from input and output tokens
- Swap quotes use `getAmountOut` / `getAmountIn` with slippage protection
- Native currency input sets correct `tx.value`
- `Initialize`, `Transfer`, and `ModifyLiquidity` are validated
- `Swap` event and recipient balance changes are validated

## 19. Placeholders

Replace the following values in examples:

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

If concrete test token addresses, symbols, and decimals are provided later, a network-specific executable example can be added separately. The standard integration guide should remain chain-agnostic.
