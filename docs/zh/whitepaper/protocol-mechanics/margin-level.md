---
title: "保证金等级"
description: "保证金等级 (Margin Level) 衡量杠杆仓位的健康度——抵押价值与债务的比值。本文说明其含义、基于储备感知 (truncatedReserves) 的计算口径，以及前端用于健康度上色的红/黄/绿阈值。"
---

保证金等级 (Margin Level) 是衡量一个杠杆仓位健康程度的核心指标，定义为用户抵押资产价值与未偿债务的比值。值越高表示缓冲越充足、越安全；值越低表示越接近清算线、风险越大。

## 含义

保证金等级把一个仓位的「抵押 / 负债」关系压缩成一个可比较的数字，贯穿杠杆仓位的整个生命周期，是三个环节共用的同一把刻度：

1. **开仓 / 加仓校验**：仓位开出或加仓后的保证金等级必须不低于最低门槛 `minMarginLevel`（默认 **1.17**），否则交易被拒绝。
2. **日常监控**：用户和前端用它实时判断仓位距离清算还有多少缓冲。
3. **清算触发**：当保证金等级跌到清算线 `liquidateLevel`（默认 **1.1**）时，仓位被视为抵押不足，进入清算。

## 计算方式

保证金等级的基本定义与《[清算机制](/zh/whitepaper/protocol-mechanics/liquidation-mechanism)》一致：

```markdown
Margin Level = Asset Value / Debt
```

* **Asset Value**：仓位抵押资产按当前储备折算成债务币种后的价值
* **Debt**：借入本金加上累计利息

展开成协议实际使用的口径，抵押价值是用储备比例做的**纯 spot 线性换算**：

```
positionValue = marginAmount + marginTotal          // 仓位规模（保证金 + 杠杆部分）
repayAmount   = positionValue × reserveBorrow / reserveMargin   // 折算成债务币种
marginLevel   = repayAmount / debtAmount
```

这里的换算只用储备比例，不调用 AMM 报价、不扣 LP 手续费、也不计价格冲击，因此口径稳定、便于链上校验。（合约内部以百万分制定点存储该比值，白皮书层面用比值表达即可。）

关键在于换算所用的储备：协议使用 **`truncatedReserves`**（反操纵的截断储备，详见《[截断预言参考](/zh/whitepaper/risk-management-and-strategies/truncated-oracles)》），而不是即时的 pair 储备。这样可以防止攻击者在单笔交易里推高储备来逃避清算，也让前端展示的保证金等级与链上清算判定使用同一份数据、保持对齐。

::: warning
`Asset Value` 是基于储备的线性换算结果，不含 LP 手续费与价格冲击；`Debt` 是借入本金加上已结算的累计利息。两者都按债务币种计量。
:::

**算例（1000 LIKWID 保证金、1× 杠杆，Long LIKWID）**：

```
positionValue = 1000 + 997 = 1997 LIKWID
repayAmount   = 1997 × truncatedReserve0 / truncatedReserve1
              ≈ 1997 × 0.000000015
              ≈ 0.00003 ETH
debtAmount    ≈ 0.00001541 ETH

marginLevel   ≈ 0.00003 / 0.00001541 ≈ 1.94
```

该仓位的保证金等级约为 **1.94**，落在下文的黄色「警告」区间。

## 健康度阈值（红 / 黄 / 绿）

前端用三档颜色直观地标示仓位健康度：

| 颜色 | 区间 | 含义 |
| --- | --- | --- |
| 🔴 红 / 危险 | `marginLevel < 1.17` | 已触及或接近不可开仓门槛，距清算线 1.1 很近，风险极高 |
| 🟡 黄 / 警告 | `1.17 ≤ marginLevel < 1.97` | 仍可持有，但缓冲有限，建议补充保证金或降低杠杆 |
| 🟢 绿 / 健康 | `marginLevel ≥ 1.97` | 缓冲充足，相对安全 |

::: warning
这三个阈值（**1.17** 与 **1.97**）是**前端展示**用的硬编码常量，用于给保证金等级上色，**不是链上合约常量**。

链上真正起作用的是另两个值：
- `minMarginLevel = 1.17`——开仓 / 加仓后必须达到的最低保证金等级（红线正好对齐它）。
- `liquidateLevel = 1.1`——清算触发线（见《[清算机制](/zh/whitepaper/protocol-mechanics/liquidation-mechanism)》）。

合约 owner 可以通过 `setMarginLevel` 调整链上的 `liquidateLevel`；一旦链上参数变化，前端的红/黄/绿阈值也应据此复核。
:::

## 与清算阈值的关系

前端的三档颜色是**展示层的预警**，帮助用户提前感知风险；它们并不会触发任何链上动作。真正决定仓位是否被清算的，是链上把基于 `truncatedReserves` 算出的保证金等级与 `liquidateLevel`（默认 **1.1**）比较——只有跌到这条线，仓位才会进入清算。换言之，红色并不等于「已被清算」，而是「已经非常接近清算线，请尽快处理」。清算的具体执行路径见《[清算机制](/zh/whitepaper/protocol-mechanics/liquidation-mechanism)》。
