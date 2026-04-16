---
title: "池子创建"
description: "Likwid v2.2 中的池子由 LikwidVault 初始化，并配置 swap fee 与 margin fee，之后由 pair、lend 与 margin 管理器共同使用。"
---

Likwid v2.2 中的池子创建始于 `LikwidVault`。对于任意一个有序代币对，池子只初始化一次，之后所有流动性、借贷和保证金相关操作都会在这个共享的池子状态上结算。

池子核心刻意保持精简：它只保存定价、费率、储备和保险基金等底层状态，而所有面向用户的操作都通过各类仓位管理合约对外暴露。

核心池子参数包括：

* **资产对**：`currency0` 与 `currency1`，在 vault 中按地址顺序排序。
* **Swap Fee (`fee`)**：swap 引擎使用的基础 LP 手续费。
* **Margin Fee (`marginFee`)**：保证金扩张时收取的额外费用。

池子初始化后，同一个池子状态可以同时被以下模块使用：

* `LikwidPairPosition`，用于双边 LP 仓位 NFT
* `LikwidLendPosition`，用于单边借贷仓位 NFT
* `LikwidMarginPosition`，用于杠杆保证金仓位 NFT

此外，用户还可以向该池子的保险基金额外捐赠资本，以增强系统对压力事件的吸收能力。
