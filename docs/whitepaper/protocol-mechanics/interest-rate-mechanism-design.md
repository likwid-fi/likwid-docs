---
title: "Interest Rate Mechanism Design"
description: "Borrowing Interest Rate Model"
---

**Borrowing Interest Rate Model**

The Likwid Protocol employs a borrowing interest rate model inspired by the rate mechanism used in Curve Protocol, where the borrowing rate is dynamically adjusted based on the utilization rate of the assets in the liquidity pool. Specifically:

**Utilization Rate(if synthetic token is y' )**

The **utilization rate** in the Likwid Protocol is defined as the proportion of the synthetic token y′ in the liquidity pool. This rate is used to determine how effectively the available liquidity is being utilized:

$$
u= \frac {y′} {y′+y}
$$

**Interest Rate Calculation**

Likwid Protocol's interest rate calculation is based on a segmented rate curve similar to the model used by Curve Protocol.&#x20;

![](/assets/gitbook/spaces-2FdZGvDixUA5eWtjX2MfjG-2Fuploads-2FGaDqCL2pCez9ufMGt1Df-2Ffile.excalidraw-ce103fb53a.svg)

A **tiered interest rate curve** is used to reflect different utilization phases:

#### 1. Low Utilization Phase

When the utilization rate is below $U_{\text{low}}$, the interest rate increases linearly:

$$
r = r_{\text{base}} + u \times m_{\text{low}}
$$

* &#x20;**r\_base** : Base interest rate
* **u** : Utilization rate
* **m\_low**: Interest rate slope for low utilization
* This phase is capped at a maximum interest rate of **r\_max1**

***

#### 2. Medium Utilization Phase

When the utilization rate exceeds $U_{\text{medium}}$, the interest rate increases steadily to reflect market demand:

$$
r = r_{\text{max1}} + (u - U_{\text{medium}}) \times m_{\text{medium}}
$$

* **m\_medium**: Interest rate slope for medium utilization
* This phase is capped at **r\_max2**

***

#### 3. High Utilization Phase

When the utilization rate exceeds $U_{\text{high}}$, the interest rate grows rapidly to reflect high market demand:

$$
r = r_{\text{max2}} + (u - U_{\text{high}}) \times m_{\text{high}}
$$

* &#x20;**m\_high:** Interest rate slope for high utilization

***

### Default Parameters

| Parameter | Description                        | Default Value |
| --------- | ---------------------------------- | ------------- |
| r\_base   | Base interest rate                 | 5%            |
| m\_low    | Slope for low utilization phase    | 10            |
| U\_medium | Medium utilization threshold       | 40%           |
| m\_medium | Slope for medium utilization phase | 100           |
| U\_high   | High utilization threshold         | 80%           |
| m\_high   | Slope for high utilization phase   | 10,000        |
