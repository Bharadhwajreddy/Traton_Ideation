# 02 — Market roles: who is who

German market-role model, with the EU harmonised role model (ENTSO-E HRM) names in
brackets. The roles that matter to a depot owner are marked ★.

---

## 2.1 The role map

| Role | German | What it is | Owns assets? | Contract with |
|---|---|---|---|---|
| ★ **BRP** | Bilanzkreisverantwortlicher (BKV) | Financially responsible for a balance group being net-zero every quarter hour | No (purely financial) | TSO (Bilanzkreisvertrag) |
| ★ **Supplier** | Lieferant / Stromlieferant | Sells energy to end customers, holds the customer relationship | No | Customer + DSO + a BRP |
| ★ **BSP** | Regelreserveanbieter (RRA) | Technically delivers balancing energy on TSO command | Yes / controls them | TSO (Rahmenvertrag per reserve type) |
| ★ **Consumer / prosumer** | Letztverbraucher / Anlagenbetreiber | The depot | Yes | Supplier, DSO, MSB |
| **TSO** | Übertragungsnetzbetreiber (ÜNB) | System responsibility, buys & activates reserves, settles imbalances | Grid | Everyone |
| **DSO** | Verteilnetzbetreiber (VNB) / NB | Distribution grid, grid connection, grid fees, assigns metering points to balance groups | Grid | Connection user |
| **MSB** | Messstellenbetreiber | Operates the meter, produces the metered values | Meter | Connection user |
| **NEMO** | Strombörse | Runs day-ahead & intraday markets | No | Exchange members |
| **Aggregator** | Aggregator | *Business model, not a settlement role* — becomes a BSP | Usually not | Depends (see 2.5) |
| **Ancillary service provider** | Anbieter von Systemdienstleistungen | Umbrella term, no single contract | Varies | Varies |

---

## 2.2 ★ BRP — Balance Responsible Party (Bilanzkreisverantwortlicher)

### What it is

A **purely financial counterparty**. It owns no equipment as such. A bank or a pure
trading house can be a BRP. It manages a **Bilanzkreis** (balance group) — a virtual
account, identified by an **EIC code**, into which injections, withdrawals and trades are
booked.

### The two constitutive facts

1. **Nothing in the German system is unassigned.** Every injection point and every
   withdrawal point must be assigned to a balance group at all times
   (§ 4 StromNZV). Your depot's meter *is* in someone's Bilanzkreis right now, whether
   you know it or not — normally your supplier's.
2. **The balance group must be flat in every quarter hour.** That is the *Bilanzkreistreue*
   obligation.

### The legal texts, in order

| Level | Instrument |
|---|---|
| EU regulation | **Regulation (EU) 2017/2195 (EB GL)**, Art. 17–18 (BRP duties), Art. 44–55 (imbalance settlement) |
| EU directive | **Directive (EU) 2019/944**, Art. 5, 17 |
| German statute | **EnWG** §§ 20, 22, 23b |
| German ordinance | **StromNZV** §§ 4, 5, 8, 26 |
| Regulator decision | **BNetzA BK6-18-061** (12.04.2019), approving the standard balance group contract; **superseded by BK6-23-102** (23.11.2023, amended 18.01.2024) |
| Contract | **Standard-Bilanzkreisvertrag Strom** — BK6-18-061 version in force 01.08.2020; **current version applicable from 01.10.2024** |
| Process rules | **MaBiS** (BK6-07-002), **GPKE**, **WiM** |

### Duties, verbatim from the contract

Full details in doc **03**. Headline clauses:

- **Ziffer 5.1** — the BRP is responsible for a **balanced quarter-hourly power balance**
  of the injections and withdrawals assigned to its balance group, for proper schedule
  management, and for the **economic settlement of the residual deviation**.
- **Ziffer 5.2** — the BRP is **obliged to keep deviations as small as reasonably possible**,
  in particular by exercising due care in forecasting. Using imbalance energy to cover load
  or compensate over-injection **is only permissible to the extent it offsets
  non-forecastable deviations.** (i.e. deliberately running imbalanced is a breach.)
- **Ziffer 5.3** — a **four-quarter-hour grace window** after an unplanned power-plant
  outage within the meaning of § 5(4) StromNZV, to the extent the deviation was caused by
  that outage.
- **Ziffer 11.4** — if settlement reveals significant deviations suggesting a breach of
  Ziffer 5, TSO and BRP must **jointly investigate** whether they were avoidable.

### What a BRP-for-hire actually sells you

When a company says *"I will be your BRP for trading"*, what they are selling is a bundle:

1. **Access.** Their Bilanzkreis and their Bilanzkreisvertrag with the TSO. You do not
   need your own EIC code, IT connection, or collateral with the TSO.
2. **Nomination.** They submit your schedule by 14:30 D-1 and your intraday changes, in
   the correct EDI format (ESS/ERRP schedule messages), to the right TSO.
3. **Market access.** Often they are also an exchange member and will execute your
   day-ahead and intraday orders.
4. **Risk absorption.** How much, depends entirely on the contract — see below.
5. **Settlement handling.** They receive the TSO's monthly imbalance invoice for the whole
   balance group and re-allocate it to the customers inside it.

### ⚠ The question you actually asked: *"does the BRP just send me an invoice and not pay anything?"*

**It depends on the commercial model, and there are three that exist in the market:**

| Model | What the BRP does with imbalance | What you pay | Who carries the risk |
|---|---|---|---|
| **A. Pass-through** (*Durchleitung*) | Allocates your metered deviation × reBAP directly to you | Your own imbalance cost, 1:1, + a service fee (€/month + €/MWh) | **You.** Fully exposed to reBAP, including −9 999 and +15 000 spikes. |
| **B. Pooled / netted** | Nets your deviation against other customers in the same Bilanzkreis first, passes on your share of the *residual* | Usually a higher €/MWh fee in exchange | **Shared.** Diversification is the product. Cheaper for you if your error is uncorrelated with the pool's. |
| **C. Full-service / "imbalance insurance"** | Absorbs the imbalance entirely, at an agreed fixed premium (e.g. +2–8 €/MWh on your volume, or a tolerance band with penalties outside it) | A predictable premium | **The BRP.** Priced accordingly. |

So the honest answer: **a BRP can absolutely end up paying**. In model C it pays by
construction. In model B it pays whenever your deviation is offset by another customer's.
Only in model A does it purely pass the bill through — and even then it carries your
**credit risk** towards the TSO, which is why it will ask you for collateral or prepayment.

A pass-through contract is the cheap one. If your quoted fee looks suspiciously low,
you are almost certainly in model A and you own the tail risk.

**Checklist for reading a BRP offer:**
- [ ] Which of A/B/C is it? Get it in writing.
- [ ] Is imbalance netted within the Bilanzkreis before allocation, or per-customer?
- [ ] Is there a **tolerance band** (e.g. ±5 % of schedule) and what happens outside it?
- [ ] Is the reBAP passed through **symmetrically**? (Some contracts pass through charges
      at reBAP but credits at a haircut — that is a private two-price scheme.)
- [ ] Who owns the **negative-price upside** when you are long in a negative-reBAP hour?
- [ ] Who nominates: them or you? What is the **cut-off** they impose on you (often much
      earlier than the TSO's, e.g. 13:00 instead of 14:30)?
- [ ] Collateral: how much, in what form, reviewed how often?
- [ ] Termination notice and what happens to your metering points on termination (see 2.6).

---

## 2.3 ★ Supplier vs BRP — not the same thing

A **supplier** (Lieferant) has the retail contract with you, is on the invoice, is
responsible for grid fees, levies, electricity tax and VAT, and handles the switching
process (GPKE). A supplier **must** be assigned to a balance group, but need not *be* a
BRP; small suppliers typically buy balance-group services from a bigger house.

A **BRP** has no retail relationship and no obligation to you at all under the
Bilanzkreisvertrag — that contract is between the BRP and the TSO. Your rights against
your BRP come only from your private contract with it.

For a depot, a common structure is:

```
Depot (Marktlokation, MaLo-ID)
  │ retail supply contract
  ▼
Supplier / trading house  ──── assigned to ────►  Bilanzkreis (EIC)
                                                    │ Bilanzkreisvertrag
                                                    ▼
                                                  TSO (e.g. 50Hertz)
```

If you want to trade on the exchange yourself, you flip to:

```
Depot ──► own Sub-balance-group (Unterbilanzkreis) inside a service BRP's Bilanzkreis
       └─► exchange membership (or a broker's) for DA/ID orders
```

The **Unterbilanzkreis** construct (Ziffer 13 of the contract) is exactly designed for
this: your energy is ring-fenced and settled separately inside a host balance group, and
under Ziffer 13.5 the sub-balance-group does **not** have to post its own collateral —
its exposure is counted in the host's.

---

## 2.4 ★ BSP — Balancing Service Provider (Regelreserveanbieter)

A **technical** counterparty. It owns or controls **technical units (TU)** — generating
units *or controllable loads* — that can change setpoint on command.

### Prequalification — the gate

You cannot bid until you are prequalified. Per the German TSOs' uniform **PQ-Bedingungen**
(current version 05.07.2024), implementing the SO Regulation, the essential components are:

1. **IT concept** — documented compliance with the TSOs' *IT minimum requirements*
   (confidentiality, availability, integrity).
2. **Delivery concept (Erbringungskonzept)** — one for the **pool**, one for each
   **reserve group**, one for each **reserve unit**.
3. **Service run (Betriebsfahrt)** — a practical trial delivery against a standard test
   profile, which both proves technical suitability and *quantifies* the prequalified
   capacity. It must show the power change achievable within the activation time:
   **FCR 30 s, aFRR 5 min, mFRR 12.5 min**.
4. **Third-party certificates** — if the connecting grid operator, the supplier, the
   **BRP** and the operator are not the same legal person, each must issue a
   **certificate of knowledge and consent** to the balancing provision of that unit.
   *(This clause is why Germany is a contractual-aggregation country — see 2.5.)*
5. **I&C test (Leittechniktest)** — verifies the redundant data link to the TSO's control
   system, correct data points, correct setpoint reception.

Other mechanics:

- Applications go through the **PQ portal** (`pq-portal.energy`).
- Prequalification is done by the **connecting TSO** — the TSO in whose LFC area the unit
  sits — *regardless of voltage level*.
- Process duration: normally **up to three months**.
- **Validity: five years** (since 2023). Units whose PQ has expired but who have filed a
  valid repeat application stay prequalified in the interim.
- **Reserve unit** = one connection point. **Reserve group** = several connection points.
  Both are bundled into one **pool** per reserve type.
- Once the prequalified capacity reaches the **minimum bid size (1 MW)**, the connecting
  TSO concludes a framework contract per reserve type.
- Prequalified provider count (TSO list, 28.11.2024): **29 for FCR, 30 for aFRR,
  27 for mFRR.**
- There are dedicated TSO guides for **wind** and for **electric vehicles and other mobile
  installations** — the latter is directly relevant to a truck depot.

### The link back to the BRP

A BSP's activation changes the physical flow at the connection point. That deviation would
otherwise show up as an imbalance in whoever's balance group that meter sits in. So
balancing activation triggers a **balancing-group correction** — the TSO neutralises the
delivered volume in the affected balance group so the BSP is paid for the energy and the
BRP is not charged for it. In Germany this works because the BRP has consented in writing
at prequalification.

---

## 2.5 ★ Aggregator — a business model, not a settlement role

**There is no "aggregator" line in any settlement equation.** An aggregator becomes a BSP
(for balancing) or acts through a supplier/BRP (for pure price optimisation). Two variants:

### Contractual aggregation — **this is Germany today**
The aggregator, the supplier and the BRP of the participating assets are contractually
aligned. The PQ requirement above (written knowledge-and-consent from the connecting grid
operator, the supplier, the BRP and the operator) makes this mandatory in practice: **an
aggregator in Germany cannot activate your depot over the head of your supplier and your
BRP.**

Practical consequence for a depot: if you sign with a flexibility aggregator, you will
probably also have to move your supply contract, or at least get your supplier to sign the
consent form. Ask about this on day one.

### Independent aggregation — the EU target model
The aggregator acts as BSP over resources belonging to **another** BRP without needing
that BRP's agreement. An automatic **imbalance adjustment** neutralises the delivered
volume in the host BRP's position, and a **compensation payment** flows between aggregator
and host BRP, calculated centrally. This is what **Article 17 of Directive (EU) 2019/944**
requires Member States to enable.

Status:
- **Nordics:** being built by **eSett** — a delivered-reserves message, imbalance
  adjustment based on *delivered* rather than *requested* volumes, and central calculation
  and invoicing of the BSP↔BRP compensation.
- **Germany:** **not implemented in balancing.** The German TSOs expect it to be forced by
  the EU **Network Code on Demand Response (NC DR)**, submitted by ACER to the Commission
  on **7 March 2025**; Commission consultation ran to September 2025, responses published
  January 2026. **Not yet adopted as a Commission Regulation as of early 2026** — re-check
  this, and note the usual implementation window is ~2 years after adoption.

*This is a genuinely open regulatory question and a legitimate thesis angle.*

---

## 2.6 Role transitions and failure modes worth knowing

- **BRP default.** If a BRP's Bilanzkreisvertrag is terminated extraordinarily (Ziffer 12.4),
  all assignments to that balance group end. The TSO informs the affected grid operators,
  and metering points fall back to the **Ersatzversorgung / Grundversorgung** chain. Your
  energy does not stop; your economics do change abruptly. This is a real counterparty risk
  — ask about your BRP's balance sheet, not just its fee.
- **Ordinary termination.** Possible to the end of a month with **10 working days' notice**
  (Ziffer 12).
- **Schedule mismatch with an exchange.** Where your nominated schedule differs from the
  matching schedule of an exchange balance group, **the exchange's nomination wins**
  (Ziffer 12.3.a).
- **Retroactive schedule changes.** Only for intra-control-area schedules, and only until
  **16:00 on the calendar day after delivery** (Anlage 3, Ziff. 1.5). After that your
  position is frozen.
- **Urgent Call.** To dispel suspicion of abusive nomination, the TSO can demand, by 16:00
  on a calendar day, that the BRP file its final retroactive nomination by **10:00 the next
  day**, with concrete written reasons.
