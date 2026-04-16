---
title: "截断预言参考"
description: "在 Likwid v2.2 中，truncated reserve 是一种受限的内部价格参考，会按照协议设定的速度逐步向 pair reserve 靠拢。"
---

在 Likwid v2.2 中，所谓的 “truncated oracle” 更准确地说，是一种从池子储备推导出的、受边界约束的内部价格参考。协议同时维护实时的 pair reserve 和 truncated reserve。随着时间推移，truncated reserve 会以 `priceMoveSpeedPPM` 限制的速度逐步向实时 pair 状态靠拢，而不是立即追随每一次短期储备冲击。

![](/assets/whitepaper/truncated-oracles-reference.png)

例如，当某个 ETH/USDC 池子在单个区块中出现突发性价格跳变时，truncated reserve 会有意滞后于这次变化。这意味着：

* 清算与费率逻辑可以参考一个受约束的储备视图，而不是最极端的瞬时价格打印结果
* 短时储备冲击不会立刻主导所有下游计算
* 持续性的市场变动仍然会随着时间推移逐步反映到截断参考中

这一机制属于 vault 自身的价格保护逻辑，并不是第三方预言机服务。

#### 分段追赶模型

为了描述这个受限参考如何随时间追赶实时市场状态，我们使用下面的概念模型：

1. **相对价格偏差**\
   表示预言参考价格与实际市场价格之间的偏离幅度：

   $$
   R_p = \frac{|P_o - P_a|}{P_o}
   $$

   * ( P\_o )：截断参考价格
   * ( P\_a )：由当前 pair reserve 推导出的实际价格
2. **追赶时间关系**\
   时间与价格偏差之间用一个二次关系来表达：

   $$
   K \cdot T^2 = R_p
   $$

   * ( T )：时间（可以按秒或按区块理解，视具体实现而定）
   * ( K )：可配置的速度常数
   * 随着 ( T ) 增大，截断参考会逐步 **收敛** 到当前 pair 状态

***

<br>
