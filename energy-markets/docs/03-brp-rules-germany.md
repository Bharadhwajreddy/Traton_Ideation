# 03 — Becoming and being a BRP in Germany: the actual rules

Source of every quoted clause: **Standard-Bilanzkreisvertrag Strom**, approved by
Bundesnetzagentur decision **BK6-18-061 of 12.04.2019**, in force since **01.08.2020**,
published by the BNetzA and by the TSOs on `netztransparenz.de`. Clause numbers below are
the contract's own *Ziffern*; annexes are *Anlagen*.

---

## 3.1 Legal stack

```
Directive (EU) 2019/944                 — market design, Art. 5 (supply), Art. 17 (aggregation)
Regulation (EU) 2017/2195  "EB GL"      — Art. 17-18 BRP duties, Art. 44-55 imbalance settlement
Regulation (EU) 2017/1485  "SO GL"      — operational security, prequalification duty
Regulation (EU) 2019/943                — internal market regulation
        │
EnWG (Energiewirtschaftsgesetz)         — §§ 20, 22, 23b; § 13 / 13a (redispatch)
StromNZV (Stromnetzzugangsverordnung)   — § 4 balance groups, § 5 schedules,
                                          § 8 balancing energy, § 26 balance group contract
KapResV                                 — capacity reserve, §§ 26 & 32 (imbalance price effect)
        │
BNetzA BK6-18-061                       — approves the standard contract
BNetzA BK6-07-002 (MaBiS)               — settlement process & deadlines
BNetzA BK6-12-024, BK6-19-217,
       BK6-19-552, BK6-20-345,
       BK6-21-192, BK6-22-162           — the imbalance price (reBAP) decisions
        │
Standard-Bilanzkreisvertrag Strom       — the contract you actually sign
PQ-Bedingungen (TSOs, v. 05.07.2024)    — if you also want to be a BSP
```

---

## 3.2 Prerequisites to open a Bilanzkreis (Ziffer 3)

There is **no licence and no prequalification** to be a BRP. It is a contract, not a
permit. But three things must be true:

1. **Ziffer 3.1** — grid usage must be agreed with each relevant grid operator (NB), and
   that NB must make each injection/withdrawal point **assignable** to your balance group.
   *These agreements are not part of the Bilanzkreisvertrag.*
2. **Ziffer 3.2** — for deliveries into other balance groups, valid contractual
   relationships must exist: between the TSO and the other BRP (same control area), and/or
   between you and the other TSO (other control areas).
3. **Ziffer 2.2** — the TSO sets up the balance group(s) under an **EIC** per Anlage 1.

You sign with **one TSO per control area** you operate in. Germany has four control areas
(50Hertz, Amprion, TenneT DE, TransnetBW) inside one bidding zone and one **Netzregelverbund
(GCC)**. If you operate nationwide you need four contracts — but only **one** reBAP applies
to all of them.

### Declaration values (Anlage 1.1) — Ziffern 5.4–5.8

At contract conclusion you must **bindingly declare** how you will use the balance group:
the type of use, the energy volumes and the peak powers (*Deklarationswerte*).

- **Ziffer 5.5** — changes exceeding **20 %, and at least 10 MW** (power) or
  **240 MWh/day / 2 000 MWh/week** (volume) of the originally declared values must be
  notified in writing **5 working days in advance**, updating Anlage 1.1.
- **Ziffer 5.6** — the TSO answers within **5 working days** whether collateral is required
  or increased.
- **Ziffer 5.7** — increased declaration values only become effective **once the collateral
  has arrived** at the TSO.
- **Ziffer 5.8** — the TSO may, with reasons, require you to re-validate Anlage 1.1.
- **Ziffer 5.9** — you must disclose the name and address of all traders/suppliers assigned
  to your balance group (Anlage 6), in advance of any change.

---

## 3.3 Collateral (Sicherheitsleistungen) — Ziffer 14

This is the real financial barrier to entry.

- **14.1** — the TSO may require **appropriate collateral in justified cases**, with written
  reasons. Due within **10 working days**. It may make the *setup* of a balance group
  conditional on collateral.
- **14.2 — the sizing formula.** Collateral is deemed appropriate if, using the **maximum
  values from Anlage 1.1**, it does not exceed:

  ```
  collateral  ≤  [ FC-Cons over 1 week  +  FP-Export over 48 hours ]
                 ×  mean reBAP of the last 12 calendar months
  ```

  where `FC-Cons` = energy delivered from the balance group to grid connections and
  `FP-Export` = energy delivered out by schedule. Deliveries **between your own balance
  groups** under the same contract, and all deliveries inside a sub-balance-group or chain
  assignment, are **excluded**.

- **14.3** — the TSO **may** raise and **must** lower the collateral if (a) the reBAP moves
  materially or (b) you change your declaration values.
- **14.4 — permitted forms**, at your choice:
  - a **self-debtor guarantee** under German law from a company of sufficient
    creditworthiness, waiving the defences of voidability, set-off and prior recourse,
    **capped at 10 % of the guarantor's liable equity**;
  - a **self-debtor bank guarantee** from an EU credit institution, same waivers;
  - **pledge of an account**.
  If you can show none of these is possible, the TSO must accept a **transfer bearing
  interest at the base rate**. Pure cash collateral is not to be accepted.
- **14.5** — on your request, the TSO must re-examine the justification after **1 year**,
  then **every 6 months**, and return collateral **without delay** once the grounds fall away.
- **14.6** — the TSO may draw on it only after a payment reminder and a further reasonable
  deadline of **at least 10 working days** has expired fruitlessly.
- **14.7** — after any drawdown you must top it back up **without delay**.
- **Ziffer 14.1 / 13.5** — a **sub-balance-group posts no collateral of its own**; its
  exposure is counted inside the settlement balance group's.

Evidence the TSO may demand when justifying a collateral request includes proof of
creditworthiness such as **the current annual report**.

---

## 3.4 Operational duties

### Schedule management (Ziffer 6, Anlage 3)

| Obligation | Deadline |
|---|---|
| **Day-ahead nomination** of all schedules to the TSO | **14:30 on D-1** (Anlage 3, Ziff. 1.3) |
| Updating day-ahead schedules | allowed until **14:30 on D-1** |
| **Availability** of your named contacts around day-ahead nomination times | at least until all your schedules are confirmed (Ziffer 6.2) |
| Next-day schedule **changes** submitted 14:30–18:00 | merely **received and acknowledged**; processed only from **18:00** when the intraday phase for D opens |
| **Intraday nomination changes** (inside DE, and between German control areas) | at least **one quarter hour** lead time, to any quarter hour of the day (Anlage 3, Ziff. 1.4) |
| **Retroactive schedule changes** (intra-control-area only) | until **16:00 on the calendar day after delivery**; if that is not a working day, by 16:00 of the next working day, at the latest 16:00 of the **third** calendar day after delivery (Anlage 3, Ziff. 1.5) |
| **Urgent Call** — TSO demand for the final retroactive nomination, to dispel suspicion of abusive nomination | by **10:00 the following calendar day**, request must be concretely reasoned and sent by e-mail |

**Tolerance for temporarily unbalanced intraday nominations** (Anlage 3, Ziff. 1.4):

| Time to delivery | Allowed temporary imbalance |
|---|---|
| more than 2 hours | ≤ **10 %** of the declared max FP-Export (MW) |
| 2 hours to 15 minutes | ≤ **10 %** of declared max FP-Export, but **max 50 MW** |
| higher values | only in justified cases, applied for via **Anlage 8**; refusal or revocation must be reasoned in writing |

> **The hard rule:** the imbalance must be closed **at the latest one quarter hour before
> the start of delivery**, by a nomination that is *complete* and shows a *balanced
> quarter-hourly power balance*.

**TSO rejection rights:**
- Day-ahead: schedules exceeding **twice** the declared Anlage 1.1 maxima over several
  hours *and* causing significant imbalance may be rejected — after an e-mail warning and
  a **1-hour** window to correct.
- Intraday: cross-control-area schedule changes may be rejected if they would create a
  **congestion**; the rejection must be reasoned in text form afterwards.

### Balance discipline (Ziffer 5) — *Bilanzkreistreue*

- **5.1** Responsibility for a balanced quarter-hourly power balance, proper schedule
  management, and the economic settlement of residual deviations.
- **5.2** Duty to keep deviations **as small as reasonably possible** through reasonable
  measures, **in particular due care in forecasting**. Drawing imbalance energy to cover
  load, or to compensate over-injection, is **only permissible to the extent it offsets
  non-forecastable deviations.**
- **5.3** Relief for **four quarter hours** (including the one in which it occurred) after
  an unplanned power-plant outage per § 5(4) StromNZV, to the extent the deviation is
  caused by that outage. Definition of an outage: **Anlage 4**.
- **11.4** Where settlement shows significant deviations suggesting a breach of Ziffer 5,
  TSO and BRP **jointly** clarify whether they were avoidable.

> Read 5.2 carefully. It means **deliberate, systematic self-balancing against the reBAP is
> a contractual breach**, not a clever strategy. On top of it sit **REMIT** (market
> manipulation) and BNetzA supervision. This is the legal backstop that makes single
> imbalance pricing workable — see doc 05, §5.3.

### Data and IT

- Grid operators and MSBs must supply settlement data **without delay, electronically**
  (§ 26 StromNZV).
- The BRP must **check that data promptly**, particularly for balance-group settlement, and
  **report objections immediately and electronically** to the responsible grid operator.
- Communication runs over the standard **EDI@Energy / MaBiS / GPKE** message formats.
  Schedules use the ENTSO-E **ESS/ERRP** schedule message per the TSOs' published process
  description *"Fahrplananmeldung in Deutschland"* (Anlage 3, Ziff. 2).

---

## 3.5 Imbalance determination and invoicing — Ziffer 11

- **11.1** After the end of the delivery month, the TSO determines the deviations per
  **MaBiS (BK6-07-002)**. A **Bilanzabweichung** exists where, in a quarter hour, all
  withdrawals assigned to the balance group (including schedule-based withdrawals) differ
  from all injections assigned to it (including schedule-based injections).
- **11.2** Deviation per quarter hour × **reBAP** (per Ziffer 10). If the balance group
  **took up** imbalance energy, it is treated as **delivered by the TSO** at that price; if
  it **gave off** imbalance energy, as **taken by the TSO** at that price. Charges and
  credits are **netted over the billing month**, and the resulting balance is invoiced.
- **11.3** Settlement is **monthly**, on MaBiS deadlines. Minimum invoice content: **Anlage 7**.
- **11.5** Receivables fall due at the TSO's stated date, **at the earliest two weeks after
  receipt** by the BRP. TSO credit notes fall due **at the latest two weeks after the credit
  note's issue date**. Timeliness is judged by **money arriving in the account**. Plus
  statutory VAT, separately shown — **not** charged if the BRP is seated outside Germany or
  other legal grounds forbid it.
- **11.6** Objections based on the **correctness of data supplied by the NB or MSB** cannot
  be raised against the TSO's invoice. Where the TSO is responsible for the error, objections
  are admissible only within **two months** of receiving the invoice.
- **11.7** The TSO may refuse third-party payments in advance.
- **11.8** Late payment: statutory default interest, plus the cost of further reminders or
  collection.

### The four payment directions

The sign of the reBAP and the sign of your balance group's position jointly determine who
pays whom:

| reBAP | Balance group | Result |
|---|---|---|
| **positive** | **short** (under-supplied) | **BRP pays TSO** |
| **positive** | **long** (over-supplied) | **TSO pays BRP** |
| **negative** | **short** | **TSO pays BRP** |
| **negative** | **long** | **BRP pays TSO** |

*(Source: German TSOs, reBAP model description, section 1.)*

The reBAP of a quarter hour applies to **all** balance groups, short or long alike. The
single exception is a **capacity reserve activation** under § 32 KapResV — see doc 05, §5.6.

---

## 3.6 Sub-balance groups (Unterbilanzkreise) — Ziffer 13

The construct a depot or a fleet operator most likely ends up using.

- Terms *Abrechnungs-, Haupt- und Unterbilanzkreis* follow the MaBiS definitions.
- Terminating a Bilanzkreisvertrag **automatically ends** all directly related assignments
  from the moment the termination takes effect.
- On **ordinary** termination the BRP informs the affected parties itself; on
  **extraordinary** termination the TSO informs them **without delay in text form**.
- **13.4** On request of the settlement balance group's BRP, the TSO discloses [the
  assigned sub-balance groups].
- **13.5** The sub-balance group's exposure is included in the **settlement balance group's**
  collateral calculation under Ziffer 14.1. **The sub-balance group posts no collateral of
  its own.**

---

## 3.7 Termination — Ziffer 12

- **Ordinary termination:** to the end of a month, with **10 working days' notice**.
- **Extraordinary termination:** for cause; the contract lists insolvency
  (with reference to § 103 InsO, where the insolvency administrator demands performance)
  among the relevant circumstances.
- Universal succession and affiliated-company transfers (§§ 15 ff. AktG) are dealt with
  separately.

---

## 3.8 Practical "can I be a BRP?" checklist

| # | Requirement | Typical reality for a depot owner |
|---|---|---|
| 1 | Legal entity able to contract with a TSO | ✅ |
| 2 | Bilanzkreisvertrag per control area | ⚠ paperwork, but free |
| 3 | Creditworthiness / collateral per Ziffer 14 | ❌ often the killer — 1 week of consumption + 48 h of exports × 12-month mean reBAP |
| 4 | 24/7 schedule management, EDI@Energy capability, named reachable contacts | ❌ needs an operations desk or a service provider |
| 5 | Forecasting capability sufficient to satisfy Ziffer 5.2 | ⚠ |
| 6 | Data validation and objection handling per § 26 StromNZV | ⚠ |
| 7 | Exchange membership or broker access for DA/ID | separate, on top |

For **10 trucks** — order of magnitude **6 MWh/day** — being your own BRP is economically
absurd. The realistic structures are:

1. **Supplier with a flexibility tariff.** Zero effort, zero market exposure, you capture
   almost none of the value. A "dynamic tariff" (§ 41a EnWG obliges suppliers above a
   threshold to offer one) passes through the day-ahead price plus a margin — this is the
   entry-level version and it is genuinely useful for smart charging.
2. **Service BRP + your own Unterbilanzkreis.** You keep the trading decisions and the
   upside, they keep the TSO relationship and the collateral. **This is the structure the
   simulator in this repo models.**
3. **Aggregator as BSP.** Your depot joins someone else's prequalified pool for aFRR/mFRR;
   they need your supplier's and BRP's written consent (see doc 02, §2.4).
4. **Own BSP prequalification.** Only worth it at pool scale — you need ≥ **1 MW** of
   *reliably available* capacity, an IT link to the TSO, and a 5-yearly PQ cycle.
   10 trucks × 350 kW chargers is nominally 3.5 MW but *reliably available* is a much
   smaller and time-varying number. See doc 06.
