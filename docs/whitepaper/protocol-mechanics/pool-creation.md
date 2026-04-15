---
title: "Pool Creation"
description: "Likwid Protocol's liquidity provisioning system features a dual-path architecture anchored by a central routing module (\"Provide Liquidity For Lending & Margin\"). Liquidity Provide"
---

Likwid Protocol's liquidity provisioning system features a dual-path architecture anchored by a central routing module ("Provide Liquidity For Lending & Margin"). Liquidity Providers initiate flows that dynamically bifurcate based on chain compatibility:&#x20;

Funds route through the autonomous "Likwid Vault" which implements isolated lending markets with fallback safeguards like lToken conversions during liquidity shortages. This design enables seamless liquidity deployment across both mature and emerging blockchain ecosystems while maintaining consistent core functionality.​​

Likwid's foundational trading pools are established  that configures essential parameters, including:

* **Asset Pairing**: X and Y, the ERC-20 token.
* **Fee Tiers**: While dynamic fees are central to the protocol, three predefined fee tiers are set for future adjustments based on market demands.
