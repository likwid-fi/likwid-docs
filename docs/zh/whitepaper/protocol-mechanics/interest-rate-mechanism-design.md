---
title: "利率机制设计"
description: "借贷利率模型"
---

**借贷利率模型**

Likwid 协议采用一条通过 `MarginBase` 中 `marginState` 配置的分段借贷利率曲线。随着利用率上升，借贷成本会逐步提高，从而让低利用率池子保持效率，并让高利用率池子在资金紧张时显著抬高借入成本。

**利用率**

在合约层，利用率由池子的镜像储备占总借贷侧储备的比例决定：

$$
u = \frac{\text{mirrorReserve}}{\text{realReserve} + \text{mirrorReserve}}
$$

这也可以理解为：借贷侧储备中，已经被映射为活跃债务的那一部分比例。

**利率计算**

`InterestMath.getBorrowRateByReserves()` 在实现上采用三段累计区间：

#### 1. 低利用率阶段

当利用率低于 $U_{\text{medium}}$ 时，利率会从基础利率开始线性增长：

$$
r = r_{\text{base}} + u \times m_{\text{low}}
$$

* **rateBase (`r_base`)**：基础借贷利率。
* **u**：利用率。
* **mLow (`m_low`)**：在中等阈值之前应用的斜率。

***

#### 2. 中等利用率阶段

当利用率达到 $U_{\text{medium}}$ 后，中段斜率会叠加到低利用率区间之上：

$$
r = r_{\text{base}} + U_{\text{medium}} \times m_{\text{low}} + (u - U_{\text{medium}}) \times m_{\text{medium}}
$$

* **useMiddleLevel (`U_medium`)**：中等利用率阈值。
* **mMiddle (`m_medium`)**：在中等阈值与高阈值之间应用的斜率。

***

#### 3. 高利用率阶段

当利用率超过 $U_{\text{high}}$ 时，高利用率斜率会叠加到前两个区间之上：

$$
r = r_{\text{base}} + U_{\text{medium}} \times m_{\text{low}} + (U_{\text{high}} - U_{\text{medium}}) \times m_{\text{medium}} + (u - U_{\text{high}}) \times m_{\text{high}}
$$

* **useHighLevel (`U_high`)**：高利用率阈值。
* **mHigh (`m_high`)**：超过高阈值后应用的斜率。

***

### 默认参数

当前部署的默认值在 `MarginBase` 中作为原始 `marginState` 参数初始化，其中 `1,000,000 = 100%`。

| Parameter | Contract field | Description | Default Value |
| --------- | -------------- | ----------- | ------------- |
| `r_base` | `rateBase` | 基础利率 | `20000` (2%) |
| `m_low` | `mLow` | 低利用率阶段斜率 | `10` |
| `U_medium` | `useMiddleLevel` | 中等利用率阈值 | `300000` (30%) |
| `m_medium` | `mMiddle` | 中等利用率阶段斜率 | `100` |
| `U_high` | `useHighLevel` | 高利用率阈值 | `700000` (70%) |
| `m_high` | `mHigh` | 高利用率阶段斜率 | `10000` |
