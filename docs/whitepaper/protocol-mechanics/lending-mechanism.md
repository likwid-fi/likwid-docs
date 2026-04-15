---
title: "Lending Mechanism"
description: "The Lending Mechanism in the Likwid Protocol allows users to directly borrow tokens from the liquidity pools, creating a flexible borrowing environment for both leveraged traders a"
---

#### **1. Introduction**

The **Lending Mechanism** in the Likwid Protocol allows users to directly borrow tokens from the liquidity pools, creating a flexible borrowing environment for both leveraged traders and liquidity providers. This system mimics the **MarginSwap** mechanism, where users can take out loans in the same way they engage in leveraged trading, while utilizing liquidity that flows between the **lending pool** and the **swap pool**.

This mechanism aims to create a more efficient liquidity environment by combining leveraged trading and lending into a shared pool, ensuring liquidity is optimally allocated and utilized.

#### **2. Mechanism**

![](/assets/gitbook/spaces-2FdZGvDixUA5eWtjX2MfjG-2Fuploads-2FsEsPdE1I37pO4T4N9eMt-2Ffile.excalidraw-6842089981.svg)

* **Direct Borrowing:** Users can borrow tokens directly from the liquidity pool. When a loan is initiated, the system mints debt tokens to represent the borrowed liquidity.
* **Debt Token Minting:** These debt tokens represent the borrower’s obligation to return the borrowed asset with interest. Initially, the borrowed liquidity is drawn from the **lending pool**. If the lending pool's liquidity is exhausted, the system will then access the **swap pool** to fulfill the borrowing request.
* **Shared Liquidity:** The borrowed liquidity in the lending pool and the leveraged positions in the **MarginSwap** mechanism are all part of the same liquidity pool. This ensures that the liquidity for both borrowing and leveraged trading is shared and managed together, optimizing capital utilization across both systems.
* **Interest Rate:** The interest rate for both the lending pool and MarginSwap users is dynamic, adjusting according to the overall liquidity utilization in the pools. Both types of users are subject to the same interest rates, ensuring fairness and liquidity efficiency.

#### **3. Impact on Margin Swap**

When a **MarginSwap** is executed, the margin tokens (the tokens used as collateral for leverage) will automatically enter the **lending pool** for accruing interest. This means that, in addition to benefiting from leveraged trading, margin traders are also able to earn interest on their collateral as long as it remains in the lending pool.

* **Automatic Entry into Lending Pool:** After a MarginSwap, the margin tokens that were originally used for leveraging are automatically deposited into the lending pool, where they begin to earn interest.
* **Shared Liquidity and Interest:** Since the margin tokens are part of the same liquidity pool, they share the same interest rate as the rest of the lending liquidity. This creates an efficient dual-use for the assets, allowing them to generate passive income for margin traders while also supporting leveraged trades.
* **Maximizing Capital Efficiency:** By moving margin collateral into the lending pool, users can earn a passive return (interest), while still having their assets actively used in leveraged trading. This mechanism helps maximize the overall capital efficiency within the system

This shared liquidity model allows for better capital utilization, as the same pool serves multiple purposes: facilitating leveraged trades through margin swaps and fulfilling borrow requests in the lending contract.
