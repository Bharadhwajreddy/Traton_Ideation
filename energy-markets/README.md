# Energy markets — Germany: reference for the depot flexibility work

A sourced, self-contained reference on how the German electricity market actually works
end to end, written to answer one practical question:

> *A depot with 10 electric trucks wants to buy power intelligently and maybe sell
> flexibility. What markets exist, who are the counterparties, what is a BRP, what does it
> cost, and what can the depot legally and practically do?*

Everything here is traceable to a primary source. Formulas are quoted from the TSOs' own
model descriptions; contract duties are quoted from the Bundesnetzagentur-approved standard
balance group contract. See [`docs/07-sources.md`](docs/07-sources.md).

---

## Read in this order

| # | File | What it answers |
|---|---|---|
| 01 | [The flow — who does what, when](docs/01-the-flow-who-does-what-when.md) | **Is balancing the same as ancillary services?** (§ 1.2 — the five families, how each is actually procured, and why there is no single "ancillary services market".) Then the full D-2 → D+n timeline, and where the TSO "takes over". Spoiler: it doesn't. |
| 02 | [Market roles](docs/02-market-roles.md) | BRP, BSP, supplier, aggregator, NEMO, TSO, DSO, MSB. **What a "we'll be your BRP" offer actually contains, and whether they ever pay you.** |
| 03 | [Being a BRP in Germany](docs/03-brp-rules-germany.md) | Every duty, deadline, collateral formula and termination rule, with contract clause numbers. |
| 04 | [Balancing products](docs/04-balancing-products-germany.md) | FCR / aFRR / mFRR in detail: auctions, gate closures, remuneration, prequalification, dimensioning, and what 10 trucks can realistically offer. |
| 05 | [Imbalance pricing — the reBAP](docs/05-imbalance-pricing-rebap.md) | The complete three-module formula, the four payment directions, financial neutrality, and the one-price vs two-price argument settled properly. |
| 06 | [Depot participation and economics](docs/06-depot-participation-and-economics.md) | Connects all of the above to the 10-truck case: the value stack ranked honestly, the **2026 cost stack per MWh**, the Leistungspreis / Benutzungsstunden trap and the **§ 19(2) StromNEV** lever. **Also the full specification of the simulator**, including every default assumption and limitation. |
| 07 | [Sources](docs/07-sources.md) | Links, decision numbers, and how to verify each class of claim. |

**Visual version:** [`explainer.html`](explainer.html) — a twelve-part, single-file walkthrough for someone
starting from zero: what ancillary services are, what a balance group is, what
**contractual aggregation** means and whose permission you need, what actually happens inside a blind auction
you cannot see, every line on a German electricity bill, and a guide to reading the simulator. It opens by settling the question this whole folder exists to answer —
*is the balancing market the same as the ancillary services market?* — then works through the three payments and
the delivery-day timeline with worked examples, and finishes with an **interactive reBAP explorer**: move the system imbalance and intraday index and watch
which of the three modules binds the price. Open it in a browser; no build step, no dependencies,
works offline, light and dark.

**Interactive version:** [`../apps/depot-energy-trading-simulator`](../apps/depot-energy-trading-simulator)
— play the depot owner, pick a BRP, trade day-ahead and intraday, and read your invoice.

---

## The three things worth remembering

**1. One MWh, three payments, two counterparties.**

| Product | Paid to | Unit | Decided |
|---|---|---|---|
| Balancing **capacity** (Regelleistung) | **BSP** | €/MW | D-1 auction |
| Balancing **energy** (Regelarbeit) | **BSP** | €/MWh activated | real time, marginal price |
| **Imbalance** energy (Ausgleichsenergie) | **BRP** ↔ TSO | €/MWh deviation | ex-post, monthly |

**2. Balancing ⊂ ancillary services.** Balancing is the frequency/active-power slice.
Voltage control, black start, inertia and — in Germany, at large scale — congestion
management (Redispatch 2.0, mandatory and cost-based) are ancillary services that are not
balancing and mostly not markets.

**3. The BRP is a financial role, the BSP is a technical role.** The same company often
holds both. They are different contracts with different entry requirements. A depot owner
will realistically be neither — it sits *inside* a BRP's balance group (ideally in its own
Unterbilanzkreis) and joins an aggregator's prequalified pool if it wants balancing revenue.
