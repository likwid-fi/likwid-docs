---
title: "结论"
description: "Likwid v2.2 将由 vault 管理的流动性、NFT 仓位、原生费率控制和基于储备的风险管理整合在同一套杠杆与借贷系统中。"
---

Likwid v2.2 将双边流动性、单边借贷以及杠杆保证金仓位统一到同一个由 vault 管理的架构中。`LikwidVault` 负责承载池子核心状态，而 `LikwidPairPosition`、`LikwidLendPosition` 与 `LikwidMarginPosition` 则在这套共享储备系统之上向用户暴露 NFT 型仓位。

协议最具辨识度的能力都属于原生实现：随着储备移动加剧，swap 费率可以动态扩大；借贷利率会随利用率变化；清算由保证金管理器直接执行；保险基金记账也内置在池子状态中。这让 Likwid 能在不依赖任何第三方扩展框架的前提下，提供一套明确、可验证的链上杠杆与借贷结构。
