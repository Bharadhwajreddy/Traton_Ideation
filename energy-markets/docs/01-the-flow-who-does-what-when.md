# 01 — The flow: who does what, when

> **Scope:** Germany (one bidding zone, DE/LU), delivery day `D`.
> Everything below is a *market* timeline. The physics happens continuously; the
> markets are just a sequence of contracts layered on top of it.

This file answers the core question: *there is a market operator who clears day-ahead
and intraday, and then at some point the TSO takes over — what exactly is that handover,
and is "balancing" the same thing as "ancillary services"?*

---

## 1.1 The one-paragraph answer

Electricity is sold in a **sequence of markets that get shorter and shorter**, run by
**two different kinds of institution**:

| Who | What they run | Nature |
|---|---|---|
| **NEMO** (EPEX SPOT, Nord Pool) — a *power exchange* | Day-ahead auction, intraday continuous + auctions | Commercial. Trades *energy contracts*. Anyone with an account and a balance group can trade. |
| **TSO** (50Hertz, Amprion, TenneT DE, TransnetBW) | Balancing capacity market, balancing energy market, imbalance settlement | Regulated. Buys *physical controllability*, and financially settles everyone's error. |

The handover is **not** at "H-1". There is no moment at which the TSO takes over the
market. What actually happens:

1. Commercial trading continues until **30 minutes before delivery** on the cross-border
   intraday market and until **5 minutes before delivery** inside the German bidding zone.
2. **In parallel**, and for the *whole* day, the TSO holds reserves it bought in advance
   and activates them in real time to fix whatever error remains.
3. After the fact, the TSO charges or pays each **balance group** for its deviation.

So: markets and balancing overlap in time. Balancing is not "the market after the
market"; it is the *residual* correction of everything the markets failed to get right,
plus the financial consequence of that failure.

---

## 1.2 Is balancing the same as ancillary services?

**No. Balancing is a subset of ancillary services.**

```
ANCILLARY SERVICES (Systemdienstleistungen)
│   Everything the TSO procures or mandates to keep the system running.
│   Legal basis: Directive (EU) 2019/944 Art. 2(48), Art. 31/40; §§ 12, 13 EnWG.
│
├── FREQUENCY / ACTIVE POWER  ──►  this is BALANCING (Regelleistung / Systemausgleich)
│     Legal basis: Regulation (EU) 2017/2195 "EB GL", Regulation (EU) 2017/1485 "SO GL"
│     ├── FCR   — Frequency Containment Reserve  (Primärregelleistung)
│     ├── aFRR  — automatic Frequency Restoration Reserve (Sekundärregelleistung)
│     ├── mFRR  — manual Frequency Restoration Reserve (Minutenreserve)
│     └── RR    — Replacement Reserve — NOT used in Germany
│
├── VOLTAGE CONTROL / REACTIVE POWER (Blindleistung)
│     Mostly a regulated obligation on connected generators + bilateral contracts.
│     NOT a merit-order market.
│
├── SYSTEM RESTORATION / BLACK START (Schwarzstartfähigkeit)
│     Bilateral contracts.
│
├── INERTIA & fast frequency response
│     Germany: no dedicated market. (Sweden/Nordics: FFR is a procured product.)
│
└── CONGESTION MANAGEMENT (Engpassmanagement)
      Germany: REDISPATCH 2.0, § 13a EnWG. MANDATORY and COST-BASED.
      Plants are *directed*, not asked to bid. They are compensated at cost.
      This is a big deal: a large slice of German "ancillary services" is
      a regulated obligation, not a market you can win.
```

Take-away: **every BSP is an ancillary-service provider, but most ancillary-service
providers are not BSPs.** When someone says "we do ancillary services", ask which one.

---

## 1.3 The three separate money flows (the single most important idea)

One physical MWh can be paid for **three times under three different contracts with
two different counterparties**. Confusing these is the number-one source of muddle.

| # | Product | German term | Who pays | Who gets paid | Unit | When decided |
|---|---|---|---|---|---|---|
| 1 | **Balancing capacity** | Regelleistung | TSO | **BSP** | €/MW per 4 h block | D-1 auction |
| 2 | **Balancing energy** | Regelarbeit | TSO | **BSP** | €/MWh activated | Real time, marginal price |
| 3 | **Imbalance energy** | Ausgleichsenergie | TSO ↔ **BRP** | either direction | €/MWh deviation | Ex-post, monthly invoice |

- 1 and 2 are **rewards for being useful**. They go to the technical role (BSP).
- 3 is **not a reward or a penalty — it is a price**. It goes to the financial role (BRP).
- In #3 **no energy physically moves.** It is a pure financial transfer that reprices the
  gap between what your balance group promised and what it did.

The same company is very often both BSP and BRP. They are still different roles, under
different contracts, with different prequalification requirements.

---

## 1.4 The timeline, step by step

### Step 0 — Long before: forward / OTC market
Years to days ahead. Bilateral or broker-traded (EEX futures, OTC). Purely financial
hedging. **Does not create a schedule.** A forward contract has to be turned into a
day-ahead nomination eventually.

### Step 1 — D-1, until 12:00 — **Day-ahead auction** (NEMO)
- Operator: **EPEX SPOT** / **Nord Pool** under SDAC (Single Day-Ahead Coupling).
- Gate closure **12:00 CET on D-1**. Results ~12:45.
- One blind auction for all 24 hours (since **1 October 2025: 96 quarter-hour products** —
  the 15-minute MTU go-live).
- Clearing: EUPHEMIA algorithm, uniform price per MTU across the coupled region subject
  to cross-border capacity.
- Price range: **−500 to +4 000 €/MWh** (harmonised SDAC limits, with an escalation
  mechanism).
- **This is where ~80–90 % of volume is priced.** It is the reference price for everything.

### Step 2 — D-1, 14:30 — **Schedule nomination (Fahrplananmeldung)** to the TSO
This is the step most explanations skip, and it is where the **BRP** becomes essential.

- Under **Anlage 3, Ziffer 1.3 of the Standard-Bilanzkreisvertrag**, the BRP must
  transmit its schedules to the TSO **by 14:30 on the previous day**. Updates are allowed
  up to 14:30.
- A schedule is a **quarter-hourly MW time series** per balance-group pair.
- The balance group must be **nominated balanced**: every MWh delivered *into* your group
  must appear as an export from someone else's group, and total injections = total
  withdrawals, per quarter hour.
- The TSO may **reject** schedules that exceed twice the declared maximum values
  (Anlage 1.1) over several hours and cause significant imbalance — after giving the BRP
  one hour to correct.

> This is the moment where a day-ahead *trade* becomes a *physical promise*. An exchange
> trade is automatically nominated through the exchange's own balance group
> (Börsenbilanzkreis) — see § 12.3 of the contract, where the exchange-nominated schedule
> takes precedence over yours in a mismatch.

### Step 3 — D-1 15:00 onward, and all of D — **Intraday market** (NEMO)
- **Intraday auctions**: IDA1 (D-1 15:00), IDA2 (D-1 22:00), IDA3 (D 10:00) — pan-European
  15-minute auctions under SIDC.
- **Continuous intraday (XBID/SIDC)**: opens D-1 **15:00** for 15-min products, runs
  continuously.
- Gate closures for continuous trading:
  - **Cross-border**: 60 min before delivery (being harmonised to 30 min).
  - **Within the German bidding zone**: **5 minutes** before delivery.
- Products: 15 min, 30 min, 60 min, blocks.
- Price range: **−9 999 to +9 999 €/MWh**. This cap matters — it appears literally in the
  imbalance price formula (see doc 05).

Corresponding **intraday schedule changes** to the TSO can be made with a lead time of at
least **one quarter hour**, to every quarter hour of the day (Anlage 3, Ziffer 1.4).
Temporarily unbalanced intraday nominations are tolerated within limits
(>2 h out: ≤10 % of declared max FP-Export; 2 h–15 min out: ≤10 %, max 50 MW), but the
imbalance **must be closed by a complete, balanced nomination at the latest one quarter
hour before delivery starts**.

### Step 4 — In parallel, D-1 morning — **Balancing capacity auctions** (TSO)
Completely separate market, on `regelleistung.net`. Only **prequalified BSPs** may bid.

| | FCR | aFRR | mFRR |
|---|---|---|---|
| Gate closure | **D-1 08:00** | **D-1 09:00** | **D-1 10:00** |
| Product | 6 × 4 h blocks | 6 × 4 h blocks | 6 × 4 h blocks |
| Direction | symmetric (one product) | pos & neg separately | pos & neg separately |
| Min bid / increment | 1 MW / 1 MW | 1 MW / 1 MW | 1 MW / 1 MW |
| Remuneration | **pay-as-cleared** (capacity price) | **pay-as-bid** (capacity price) | **pay-as-bid** (capacity price) |
| Energy payment | **none** | via RAM | via RAM |

*(Source: German TSOs, "Description of concepts for balancing and the balancing markets
in Germany", Table 2.)*

### Step 5 — Continuous on D — **Balancing energy market (RAM / Regelarbeitsmarkt)** (TSO)
- Products: **15 minutes**, positive and negative, aFRR and mFRR.
- **Gate closure: 25 minutes before the start of the delivery quarter hour.**
  (It was 60 minutes until 22 June 2022.)
- Remuneration: **pay-as-cleared at the cross-border marginal price** determined by the
  European platforms — **PICASSO** for aFRR, **MARI** for mFRR.
- Bid price limit: **15 000 €/MWh** (harmonised, with an ACER adjustment mechanism).
- Winning capacity in Step 4 **obliges** you to submit an energy bid of the same volume
  into the RAM. Extra, non-contracted energy-only bids are allowed.
- **Release of unselected bids (*Freisetzung*) was abolished on 8 December 2022.** An
  unactivated energy bid can no longer be resold elsewhere, so opportunity cost is a sunk
  cost and the game-theoretically rational strategy is to bid at marginal cost.

### Step 6 — Real time on D — **Activation**
- **FCR** activates automatically in **≤30 s**, proportional to frequency deviation, by
  local droop controllers across the whole Continental European synchronous area. No
  merit order, no energy payment.
- **aFRR** activates automatically in **≤5 min** via the TSO's LFC controller and the
  **PICASSO** platform, which re-optimises **every 4 seconds** (up to 225 optimisation
  cycles per quarter hour).
- **mFRR** activates manually/semi-automatically in **≤12.5 min** via **MARI**.
- **IGCC** (imbalance netting) cancels opposite aFRR demands across TSOs *before* any
  energy is activated. Free by construction.
- The marginal bid activated for a German imbalance may physically sit in another country.
  The platforms are **TSO-to-TSO**; a BSP only ever talks to its own connecting TSO.

### Step 7 — Ex post — **Imbalance settlement**
- Per **quarter hour**, per **balance group**.
- Grid operators (NB) and metering point operators (MSB) send metered values to the TSO.
- The TSO compares **all withdrawals incl. schedule-based** vs **all injections incl.
  schedule-based** for the quarter hour → the **Bilanzabweichung** (§ 11.1 of the contract).
- Multiply by the **reBAP** for that quarter hour → charge or credit.
- Netted over the **billing month**; a single balance is invoiced (§ 11.2, § 11.5).
- Payment due at the date the TSO states, **at the earliest two weeks** after the BRP
  receives the invoice.
- Process framework: **MaBiS** (BNetzA decision BK6-07-002).

---

## 1.5 The picture

```
        D-2            D-1                                  D (delivery)            D+n
         │              │                                        │                   │
FORWARD  ├──────────────┤                                        │                   │
(EEX/OTC)│              │                                        │                   │
         │              │                                        │                   │
         │      08:00 FCR capacity auction ─┐                    │                   │
TSO      │      09:00 aFRR capacity auction ├─► reserves held ───┼──► ACTIVATION     │
markets  │      10:00 mFRR capacity auction ─┘                   │    FCR  ≤30 s     │
         │              │                                        │    aFRR ≤5 min    │
         │              │          RAM (balancing energy) ────────┼──► mFRR ≤12.5 min│
         │              │          gate closure: QH − 25 min      │                   │
         │              │                                        │                   │
         │      12:00 ──► DAY-AHEAD AUCTION (EPEX/Nord Pool)     │                   │
NEMO     │              │  96 × 15-min products, uniform price   │                   │
markets  │      14:30 ──► SCHEDULE NOMINATION to TSO             │                   │
         │              │  (BRP duty, Anlage 3 Ziff. 1.3)        │                   │
         │      15:00 ──► INTRADAY opens ─────────────────────────►│ closes QH − 5 min│
         │              │  IDA1/IDA2/IDA3 auctions + continuous  │  (DE internal)    │
         │              │                                        │                   │
SETTLE   │              │                                        │       ────────────►│
         │              │                                        │  metering → reBAP  │
         │              │                                        │  → monthly invoice │
```

---

## 1.6 Why "at H-1 the TSO takes care of balancing" is *almost* right but misleading

What is true: by roughly one hour before delivery, most participants have stopped
actively re-trading, liquidity thins, and the system's remaining error is increasingly
the TSO's problem.

What is not true:
- **You can still trade.** Inside Germany, until QH − 5 min.
- **The TSO did not "start" balancing at H-1.** FCR/aFRR/mFRR capacity was bought the
  previous morning. FCR is acting every second of the day.
- **The TSO does not take over your position.** It never assumes your obligation. It
  fixes the *system*, then bills *you* for your share of the error via the reBAP.
- **The TSO's action is the residual, not the total.** Long and short balance groups net
  against each other first. Imbalance settlement volumes are routinely much larger than
  activated balancing energy, because the TSO only ever touches the net.

The crisp version: **the TSO is the balancer of last resort, not the counterparty of last
resort.** Your BRP is your counterparty; the TSO bills your BRP.

---

## 1.7 What the DTU 46755 lecture model simplifies

Worth knowing when you map a textbook model onto reality:

| Lecture model | Reality in Germany |
|---|---|
| One balancing market with a merit order | **Two** markets: capacity (RLM) and energy (RAM), separate prices, separate merit orders |
| "Up/down regulation bids, most expensive activated sets the price" | True for aFRR/mFRR energy only; FCR has **no** activation price at all |
| Single national merit order | Cross-border: PICASSO/MARI may activate a bid in another country |
| Balancing price = marginal activated bid | reBAP = **max/min of three modules**, one of which is a 4-second-resolution volume-weighted average |
| Budget balanced | Approximately; the annual deficit/surplus is rolled into **network tariffs (NNE)** |
| Load shedding is the marginal action | Before that: interruptible loads (AbLa), capacity reserve, grid reserve, emergency assistance (MEAS), TSO intraday trades |
| Activated balancing energy ≈ imbalance volume | Imbalance volume is **much larger**; groups net first |
