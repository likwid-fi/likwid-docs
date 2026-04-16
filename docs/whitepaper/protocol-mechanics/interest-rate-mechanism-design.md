---
title: "Interest Rate Mechanism Design"
description: "Borrowing Interest Rate Model"
---

**Borrowing Interest Rate Model**

The Likwid Protocol uses a tiered borrowing rate curve configured through `marginState` in `MarginBase`. The borrow rate increases with utilization so that lightly used pools stay efficient while highly utilized pools become progressively more expensive to borrow from.

**Utilization Rate**

At the contract level, utilization is computed from the pool's mirror reserve relative to the total borrow-side reserve:

$$
u = \frac{\text{mirrorReserve}}{\text{realReserve} + \text{mirrorReserve}}
$$

This is equivalent to measuring how much of the borrow-side reserve is already mirrored into active debt.

**Interest Rate Calculation**

The implementation in `InterestMath.getBorrowRateByReserves()` applies three cumulative segments:

#### 1. Low Utilization Phase

When utilization is below $U_{\text{medium}}$, the rate increases linearly from the base rate:

$$
r = r_{\text{base}} + u \times m_{\text{low}}
$$

* **rateBase (`r_base`)**: Base borrow rate.
* **u**: Utilization rate.
* **mLow (`m_low`)**: Slope applied before the medium threshold.

***

#### 2. Medium Utilization Phase

Once utilization reaches $U_{\text{medium}}$, the medium slope is added on top of the low-utilization segment:

$$
r = r_{\text{base}} + U_{\text{medium}} \times m_{\text{low}} + (u - U_{\text{medium}}) \times m_{\text{medium}}
$$

* **useMiddleLevel (`U_medium`)**: Medium utilization threshold.
* **mMiddle (`m_medium`)**: Slope applied between the medium and high thresholds.

***

#### 3. High Utilization Phase

Above $U_{\text{high}}$, the high-utilization slope is layered on top of both prior segments:

$$
r = r_{\text{base}} + U_{\text{medium}} \times m_{\text{low}} + (U_{\text{high}} - U_{\text{medium}}) \times m_{\text{medium}} + (u - U_{\text{high}}) \times m_{\text{high}}
$$

* **useHighLevel (`U_high`)**: High utilization threshold.
* **mHigh (`m_high`)**: Slope applied once utilization exceeds the high threshold.

***

### Default Parameters

The deployed defaults are initialized in `MarginBase` as raw `marginState` values, where `1,000,000 = 100%`.

| Parameter | Contract field | Description | Default Value |
| --------- | -------------- | ----------- | ------------- |
| `r_base` | `rateBase` | Base interest rate | `20000` (2%) |
| `m_low` | `mLow` | Slope for low utilization phase | `10` |
| `U_medium` | `useMiddleLevel` | Medium utilization threshold | `300000` (30%) |
| `m_medium` | `mMiddle` | Slope for medium utilization phase | `100` |
| `U_high` | `useHighLevel` | High utilization threshold | `700000` (70%) |
| `m_high` | `mHigh` | Slope for high utilization phase | `10000` |
