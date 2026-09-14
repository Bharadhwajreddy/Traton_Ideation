# 04 — The German balancing products in detail

Platform: **`regelleistung.net`**, operated jointly by the four German TSOs.
Primary source for this file: German TSOs, *"Description of concepts for balancing and
the balancing markets in Germany"* (Public, January 2025) — referred to below as
**[Concepts]** — plus the PQ-Bedingungen v. 05.07.2024.

---

## 4.1 Product comparison

| | **FCR** (Primärregelleistung) | **aFRR** (Sekundärregelleistung) | **mFRR** (Minutenreserve) |
|---|---|---|---|
| Purpose | *Contain* the frequency deviation | *Restore* frequency, free up FCR | Restore/replace aFRR, handle longer events |
| Full activation time | **30 s** | **5 min** | **12.5 min** (was 15 min before PICASSO/MARI) |
| How activated | **Autonomously**, by local droop controllers, proportional to Δf | Automatically by the TSO's LFC controller via **PICASSO** | Manually / semi-automatically via **MARI** |
| Merit order on activation? | **No** | Yes (cross-border) | Yes (cross-border) |
| Shared across | Whole **Continental Europe synchronous area** | LFC block / PICASSO members | LFC block / MARI members |
| **Capacity auction GCT** | **D-1 08:00** | **D-1 09:00** | **D-1 10:00** |
| Capacity product | 6 × 4 h blocks | 6 × 4 h blocks | 6 × 4 h blocks |
| Direction | **symmetric** (one product) | positive & negative separately | positive & negative separately |
| Min bid / increment | 1 MW / 1 MW | 1 MW / 1 MW | 1 MW / 1 MW |
| Capacity remuneration | **pay-as-cleared** | **pay-as-bid** | **pay-as-bid** |
| Energy market | **none** | **RAM**, 15-min products | **RAM**, 15-min products |
| Energy GCT | — | **QH − 25 min** | **QH − 25 min** |
| Energy remuneration | **none** | **pay-as-cleared** at the PICASSO cross-border marginal price | **pay-as-cleared** at the MARI cross-border marginal price |
| Energy bid price limit | — | **15 000 €/MWh** | **15 000 €/MWh** |
| **RR** | not procured in Germany | | |

*(Table structure and values from [Concepts], Table 2 and §6.3.)*

---

## 4.2 Three consequences people get wrong

### (a) FCR has **no energy payment at all**
"With the FCR, the provision of balancing capacity **and activation** are remunerated via
the service fee; there is **no separate remuneration for the activation**." [Concepts, §6.3]

So FCR does not fit the merit-order story in any textbook. A battery earning FCR earns a
€/MW availability payment and is then moved around by frequency for free. Its energy
throughput is a *cost* (round-trip losses, degradation), not a revenue.

FCR is also **symmetric**: you must be able to move ±P by the same amount. You may use
*different* technical units for the two directions, which matters for a depot (charging
trucks give you downward headroom; discharging trucks give you upward).

### (b) Winning capacity **obliges** you to bid energy
"Successful BSPs on the RLM are **obliged to submit balancing energy bids of the same
volume** to the RAM." [Concepts, §6.3]

If you cannot, you may nominate a **collateral BSP** (*Ersatzanbieter*) to submit on your
behalf. Non-contracted, energy-only bids into the RAM are also permitted — but RAM
liquidity is far thinner than RLM liquidity.

### (c) *Freisetzung* is dead — bid at marginal cost
Until 8 December 2022, unselected energy bids were **released** and could be sold
elsewhere, so the intraday price was a genuine opportunity cost and bids were marked up
accordingly.

Since then: "the opportunities for the balancing energy market are **'sunk costs'** from a
game-theoretical point of view. Thus, according to market theory, **the rational bidding
strategy in the balancing energy market is to bid at marginal costs**." [Concepts, §6.3]

The TSOs' own ex-post analysis (with Consentec) found reality only partly matches: after
the move to marginal pricing, **aFRR bids shifted toward the low end and mFRR bids toward
the high end**, and the **four largest pools are pivotal in nearly every energy auction**.
That is a live market-power question and another legitimate thesis angle.

---

## 4.3 Dimensioning — how much is bought

Since **December 2019**, German FRR dimensioning is **dynamic**: rolling, per 4-hour
block, probabilistic (it targets a residual-risk quantile given forecast errors, outage
statistics and load).

Typical annual means (2023):

| | positive | negative |
|---|---|---|
| aFRR | ≈ 1 922 MW | ≈ 1 842 MW |
| mFRR | ≈ 681 MW | ≈ 372 MW |

FCR obligation ≈ **564 MW** (2024) — Germany's share of the **3 000 MW** Continental
European requirement, allocated by the ENTSO-E key.

These numbers matter directly: the **dead band of the scarcity component** in the imbalance
price is **80 % of the dimensioned aFRR + mFRR** in the relevant direction (doc 05, §5.5).

**Core shares** (*Kernanteile*, limits on FRR exchange between German LFC areas) can be set
by the TSOs in consultation with BNetzA, but **currently none are set**. [Concepts, §6.3]

---

## 4.4 The European platforms

| Platform | Product | What it does |
|---|---|---|
| **IGCC** | aFRR **netting** | Cancels opposite aFRR demands across TSOs *before* activation. Costless by construction. |
| **PICASSO** | aFRR **energy** | Common merit order, re-optimised **every 4 seconds** → up to **225 optimisation cycles per quarter hour**. Produces a **cross-border marginal price (CBMP)** per cycle per direction. |
| **MARI** | mFRR **energy** | Common merit order for scheduled and direct activation, quarter-hourly. |
| **TERRE** | RR | Germany does not participate (no RR product). |

Key structural facts:
- The platforms are **TSO-to-TSO**. A BSP only ever contracts with, bids to, and is paid by
  **its own connecting TSO**.
- **Perfect netting** cycles (both directions priced in the same 4-second cycle because
  demands exactly cancel) are **excluded** from the price calculation.
- In case of **separation** from PICASSO, national marginal prices are determined for the GCC.
- The marginal bid activated to fix a German imbalance may physically sit in Belgium,
  Austria or the Czech Republic. Cross-border optimisation is not a detail; it dominates.

---

## 4.5 Prequalification — condensed

(Full version in doc 02, §2.4.)

```
1. IT concept            → meet the TSOs' IT minimum requirements
2. Delivery concept      → one per pool, per reserve group, per reserve unit
3. Service run           → practical test against the published profile;
                           proves suitability AND quantifies the prequalified MW
4. Third-party consents  → written knowledge-and-consent from the connecting grid
                           operator, the supplier, the BRP and the operator,
                           wherever those roles are not the same legal person
5. I&C test              → redundant data link to the TSO control system
─────────────────────────────────────────────────────────────────────────
→ prequalified MW ≥ 1 MW  ⇒  framework contract with the connecting TSO
   validity 5 years · portal: pq-portal.energy · duration up to 3 months
```

Structure:

```
Pool  (one per reserve type, per provider)
 ├── Reserve group (Reservegruppe)  — several connection points
 │     ├── Technical unit
 │     └── Technical unit
 └── Reserve unit  (Reserveeinheit)  — one connection point
       └── Technical unit
```

A **technical unit** is explicitly *"both generating units and controllable consumption
units"* [Concepts, fn. 9] — controllable load is a first-class citizen, not an exception.

The TSOs publish dedicated guides for **wind power** and for **electric vehicles and other
mobile installations**. The latter is the document to read before any depot V2G project.

---

## 4.6 What is *not* balancing (but gets called "ancillary services")

| Service | Germany | Market or obligation? |
|---|---|---|
| **Redispatch 2.0** (§ 13a EnWG) | Congestion management. Plants ≥ 100 kW, incl. RES and CHP, are **directed** and compensated at cost. | **Mandatory, cost-based. Not a market.** |
| **Reactive power / voltage** | Mostly a regulated obligation on connected generators + bilateral contracts | Obligation |
| **Black start / restoration** | Bilateral contracts | Bilateral |
| **Interruptible loads (AbLaV)** | Contracted disconnectable loads | Separate tender |
| **Capacity reserve (KapResV)** | Out-of-market plants, may only run on TSO instruction | Separate tender |
| **Grid reserve (Netzreserve)** | Out-of-market plants held for grid security | Designation |
| **Inertia / FFR** | **No dedicated German market.** (Nordics have FFR; Great Britain has DC/DM/DR.) | — |

If you are building a business case for a depot, **Redispatch 2.0 is a risk, not a
revenue** — being directed down is compensated at cost, not at market value.

---

## 4.7 Can 10 electric trucks actually do this?

Order of magnitude for the depot in this repo's simulator:

| Quantity | Value |
|---|---|
| Trucks | 10 |
| Usable battery per truck | ~ 540 kWh (Traton/Scania/MAN class, ~600 kWh nameplate) |
| Charger power | 150–400 kW (CCS), up to 1 MW with MCS |
| Depot grid connection | typically **1–3 MVA** — the binding constraint |
| Theoretical fleet energy | ~ 5.4 MWh |
| Theoretical fleet power | 1.5–4 MW, **capped by the grid connection** |

Against the **1 MW minimum bid size**:

- **Nominally** the depot clears 1 MW easily.
- **Practically**, the prequalified capacity is what the **service run** demonstrates as
  *reliably* deliverable over the full block. With 4-hour products and trucks that leave
  and return, availability is highly time-varying. A depot whose trucks are all out from
  06:00 to 18:00 has ~0 MW of prequalified upward capacity in blocks 2–4.
- Realistic route: **join an aggregator's pool**, where your time-varying availability is
  diversified against other assets. That is the whole economic point of pooling.
- **Negative aFRR / negative mFRR is the easy product for a depot**: "deliver negative
  balancing energy" = "charge harder than planned", which needs only headroom, not stored
  energy. If you are going to prequalify for anything, prequalify for the **negative**
  direction first.

This asymmetry — downward flexibility is cheap and abundant for a charging depot, upward
flexibility is expensive and requires V2G plus battery-warranty negotiation — is the
central design insight for depot flexibility, and it is modelled explicitly in the
simulator.
