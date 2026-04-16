---
title: "流动性提供"
description: "Likwid v2.2 的流动性提供同时涵盖双边 LP 仓位、单边借贷仓位、原生 swap 手续费以及基于利用率的利息收益。"
---

Likwid v2.2 的流动性提供者可以通过双边 LP 仓位或单边借贷仓位参与。两者最终都会通过 `LikwidVault` 结算，但收益来源、储备路径和风险特征并不相同。

### 1. 双边流动性与 Swap 手续费

通过 `LikwidPairPosition` 添加双边流动性的用户，会获得一个在池子层参与 swap 流程的 NFT 仓位。

* **基础 LP 手续费**：每个池子初始化时都会设置一个 swap fee 参数。
* **压力条件下的动态扩张**：如果当前 pair reserve 相对 truncated reserve 的偏离过大，协议可以提高实际 swap 费率。
* **池子级费率结算**：swap 行为会先更新池子状态与费用，再进入协议费用分配逻辑。

### 2. 单边借贷与利息收益

通过 `LikwidLendPosition` 提供单边资金的用户，获得的是基于利用率的收益，而不是双边 LP 的 swap 费暴露。

* **单资产存入**：出借人只需选择池子的一侧资产并存入，即可获得一个借贷仓位 NFT。
* **利用率驱动的收益**：借贷利率由 `MarginState` 参数与当前储备利用率共同决定。
* **共享的 vault 记账**：lend reserve、mirror reserve 与 interest reserve 会在 vault 中共同更新，从而使借贷收益与杠杆需求能够共存。

### 3. 保证金活动如何驱动收益

保证金行为会从两个层面影响池子的整体收益结构：

* **保证金费用**：当用户增加杠杆时，会产生 margin fee。
* **与保证金相关的 swap 费用**：当开仓或平仓需要经过 swap 引擎时，也会产生对应的 swap fee。

因此，保证金需求不仅与交易者相关，也直接关系到为 vault 储备系统提供资本的流动性提供者。

更多细节可参阅 [利率机制设计](/zh/whitepaper/protocol-mechanics/interest-rate-mechanism-design)。
