---
title: "Liquidation Guide"
description: "In the LIKWID protocol, liquidation plays a crucial role in ensuring market stability. The protocol offers two methods for liquidation: Direct Liquidation and Repayment Liquidation"
---

In the LIKWID protocol, liquidation plays a crucial role in ensuring market stability. The protocol offers two methods for liquidation: **Direct Liquidation** and **Repayment Liquidation**. Both methods are designed to maintain a healthy liquidity environment while providing rewards to participants involved in the liquidation process.

#### **1. Direct Liquidation Method**

The **Direct Liquidation** method is implemented in the `LikwidMarginPosition` contract through the `liquidateBurn` function. This function allows liquidators to directly call for a liquidation event.

**Key Points:**

* **Function:** `liquidateBurn(uint256 tokenId, uint256 deadline)`
* **Reward:** Liquidators are rewarded with 1% of the liquidated position’s value.

**Verify the Position is Liquidatable (The Critical Check)**

This is the most important step in the process. To avoid wasting gas on failed transactions, you must first verify that the **position itself** is in a state where it can be liquidated. This check confirms if the position's `marginLevel` has fallen below the protocol's official liquidation threshold.

The **only recommended way** to perform this check is by using our purpose-built, gas-efficient helper contract.

* **Contract:** `LikwidHelper.sol`
* **Method:** `checkMarginPositionLiquidate(uint256 tokenId) returns (bool)`

**Core Logic & Threshold**

This function will return true if the specified tokenId represents a position whose marginLevel is less than or equal to **1.1**. This is the definitive, on-chain confirmation that the position is ready to be liquidated.<br>

**Example Code:**

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

#### **2. Repayment Liquidation Method**

The **Repayment Liquidation** method is an alternative approach where liquidators call for liquidation by repaying the borrower's debt. This method is implemented in the `LikwidMarginPosition` contract through the `liquidateCall` function.

The primary incentive for this method is that **in exchange for repaying the debt, the liquidator is entitled to claim the position's entire remaining margin as their reward.** This creates a direct arbitrage opportunity: if the market value of the margin collateral is greater than the value of the debt being repaid, the liquidator profits from the difference.

**Key Points:**

* **Function:** `liquidateCall(uint256 positionId, uint256 deadline)`
* **Repayment:** Liquidators repay the position’s outstanding debt and trigger liquidation.

How to calculate the repayment amount:

95% of the asset value, the repayment amount is calculated using `Asset Value * 0.95 / Mark Price` or `Asset Value * 0.95 / (1 / Mark Price)`

```solidity
LikwidHelper.getLiquidateRepayAmount(uint256 tokenId)
```

***

#### **Conclusion**

Both liquidation methods offer opportunities for participants to earn rewards while maintaining the health of the LIKWID protocol. By engaging in either the **Direct Liquidation** or **Repayment Liquidation**, liquidators help ensure the protocol’s success and sustainability.
