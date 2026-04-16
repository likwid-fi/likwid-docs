---
title: "保证金仓位机制"
description: "Likwid v2.2 的保证金仓位通过 LikwidMarginPosition 开启，并在 LikwidVault 中结合原生费率、镜像储备与清算控制完成结算。"
---

在保证金交易中，用户通过 `LikwidMarginPosition` 建立杠杆敞口，并与 `LikwidVault` 中保存的储备状态结算。从概念上看，协议仍然会用下面这组镜像储备扩张关系来理解头寸：

$$
(x+x')(y+y′)=k
$$

其中：

* x：表示 X 资产数量。
* x′：表示协议状态中用于 X 的镜像记账侧。
* y：表示目标 ERC-20 代币数量。
* y′：表示协议状态中用于 Y 的镜像记账侧。

#### 费率结构

v2.2 中的保证金仓位成本来自池子原生参数与 swap 执行逻辑的组合：

* **Swap fee (`PoolKey.fee`)**：池子的基础 LP 手续费；当 pair reserve 相对 truncated reserve 的偏离足够大时，该费率还会动态上调。
* **Margin fee (`PoolKey.marginFee`)**：用户增加杠杆时额外收取的费用。
* **保证金相关 swap 费用记账**：保证金开仓和平仓都可能经过 swap 引擎，因此最终成本取决于池子费率模型和请求状态变化的规模。
* **低费率池限制**：当前管理器会拒绝在基础 LP 费率低于保证金使用阈值的池子中创建保证金仓位。

关于费率引擎本身，可参阅 [针对 MEV 与套利攻击的动态费率策略](/zh/whitepaper/risk-management-and-strategies/dynamic-fee-strategy-against-mev-and-arbitrage-attacks)。

#### 保证金仓位工作流

Likwid 的保证金功能允许用户抵押资产、从池子中借入流动性，并收到一个代表仓位状态的 NFT。

![](/assets/v2/margin-position-flow.svg)

1. **抵押**：用户提供 X 作为抵押，建立保证金仓位。
2. **选择杠杆倍数**：管理器会校验所选杠杆是否在协议允许范围内，并确认目标池子可用于保证金行为。
3. **借入与费用计算**：`LikwidMarginPosition` 计算借入数量，扣除 margin fee，并依据当前 pair reserve 与 truncated reserve 应用 swap 费率逻辑。
4. **Vault 结算**：`LikwidVault` 通过保证金余额流更新 real reserve、mirror reserve、pair reserve、lend reserve 以及 protocol-interest reserve。
5. **仓位 NFT**：协议为该仓位签发或更新一个 margin position NFT，持续记录所有权以及抵押/债务状态变化。

#### 持续的风险控制

仓位建立后，协议会结合原生的保证金等级与储备状态持续监控其健康度：

* **最小保证金 / 借入等级** 用于约束每次状态更新后的仓位健康度。
* **清算等级** 决定仓位在什么条件下可以被协议或外部清算者平掉。
* **保险基金记账** 可以在清算压力场景中吸收一部分不利结果。

以上能力都直接实现于 v2.2 的保证金管理器与 vault 中。
