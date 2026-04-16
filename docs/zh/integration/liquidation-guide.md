---
title: "清算指南"
description: "在 LIKWID 协议中，清算是维持市场稳定的重要机制。协议支持 Direct Liquidation 与 Repayment Liquidation 两种方式。"
---

在 LIKWID 协议中，清算是维持市场稳定的重要机制。协议提供两种清算方式：**Direct Liquidation（直接清算）** 和 **Repayment Liquidation（偿债式清算）**。两种方式都旨在维持健康的流动性环境，并为参与清算流程的执行者提供奖励。

#### **1. Direct Liquidation（直接清算）**

**Direct Liquidation** 由 `LikwidMarginPosition` 合约中的 `liquidateBurn` 函数实现。该函数允许清算者直接触发一次清算事件。

**关键点：**

* **函数：** `liquidateBurn(uint256 tokenId, uint256 deadline)`
* **奖励：** 清算者可获得被清算仓位价值的 1% 作为奖励。

**先验证仓位是否可清算（关键检查）**

这是整个流程里最重要的一步。为了避免把 gas 浪费在会失败的交易上，你必须先确认 **仓位本身** 是否已经进入可清算状态。这个检查会验证该仓位的 `marginLevel` 是否已低于协议设定的官方清算阈值。

**唯一推荐的方式**，是调用我们专门设计、且 gas 成本较低的 helper 合约。

* **合约：** `LikwidHelper.sol`
* **方法：** `checkMarginPositionLiquidate(uint256 tokenId) returns (bool)`

**核心逻辑与阈值**

当某个 `tokenId` 对应仓位的 `marginLevel` 小于或等于 **1.1** 时，该函数会返回 `true`。这就是链上对于“该仓位已可清算”的最终确认。<br>

**示例代码：**

```solidity

import { ethers, Contract } from "ethers";

// ... (provider setup) ...

const LIKWID_HELPER_ADDRESS = "0x..."; // The deployed LikwidHelper contract address
const helperAbi = ["function checkMarginPositionLiquidate(uint256 tokenId) view returns (bool)"];

const helperContract = new Contract(LIKWID_HELPER_ADDRESS, helperAbi, provider);

/**
 * Checks if a specific position is in a liquidatable state.
 * @param tokenId The token ID of the position to check.
 * @returns A boolean promise, true if the position can be liquidated.
 */
async function isPositionLiquidatable(tokenId: string): Promise<boolean> {
    try {
        console.log(`Checking state of position (tokenId: ${tokenId})...`);
        const canBeLiquidated = await helperContract.checkMarginPositionLiquidate(tokenId);
        console.log(`Position ${tokenId} is liquidatable:${canBeLiquidated}`);
        return canBeLiquidated;
    } catch (error) {
        console.error(`Error checking position ${tokenId}:`, error);
        return false;
    }
}

// Assumption: A signer for the liquidator is configured.
const liquidatorSigner = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);

const LIKWID_MARGIN_ADDRESS = "0x..."; // The LikwidMarginPosition contract address
const marginAbi = ["function liquidateBurn(uint256 tokenId, uint256 deadline)"]; 

const marginContract = new Contract(LIKWID_MARGIN_ADDRESS, marginAbi, liquidatorSigner);

/**
 * Executes the liquidation of a confirmed unhealthy position.
 * @param tokenId The token ID of the position to liquidate.
 */
async function executeLiquidation(tokenId: string): Promise<void> {
    try {
        const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

        console.log(`Executing liquidation for tokenId: ${tokenId}...`);
        const tx = await marginContract.liquidateBurn(tokenId, deadline);
        const receipt = await tx.wait();

        console.log(`Liquidation successful! Tx hash: ${receipt.transactionHash}`);
    } catch (error) {
        console.error(`Execution failed for tokenId ${tokenId}:`, error);
    }
}

// --- Putting It All Together: A Bot's Logic ---

async function runLiquidationCycle(tokenId: string) {
    const isEligible = await isPositionLiquidatable(tokenId);

    if (isEligible) {
        // Optional: Add a profitability calculation here (reward vs. gas cost).
        await executeLiquidation(tokenId);
    } else {
        console.log(`Skipping tokenId ${tokenId}, not eligible.`);
    }
}

// Example: Run the cycle for a specific token.
// runLiquidationCycle("12345");

```

***

#### **2. Repayment Liquidation（偿债式清算）**

**Repayment Liquidation** 是另一条清算路径。清算者通过偿还借款人的债务来触发清算，这条路径由 `LikwidMarginPosition` 合约中的 `liquidateCall` 实现。

这一方式的主要激励在于：**清算者在偿还债务后，可以领取该仓位剩余的全部保证金作为回报。** 因而它形成了一个直接套利机会：如果剩余保证金的市场价值高于清算者所偿还的债务价值，那么清算者就能从中获利。

**关键点：**

* **函数：** `liquidateCall(uint256 positionId, uint256 deadline)`
* **偿债动作：** 清算者需要偿还仓位的未偿债务，并完成清算。

如何计算需要偿还的金额：

资产价值的 95%，即 `Asset Value * 0.95 / Mark Price` 或 `Asset Value * 0.95 / (1 / Mark Price)`

```solidity
LikwidHelper.getLiquidateRepayAmount(uint256 tokenId)
```

***

#### **结论**

这两种清算方式都为参与者提供了获利机会，同时也帮助维持 LIKWID 协议的整体健康。无论采用 **Direct Liquidation** 还是 **Repayment Liquidation**，清算者的参与都能帮助协议保持可持续运转。
