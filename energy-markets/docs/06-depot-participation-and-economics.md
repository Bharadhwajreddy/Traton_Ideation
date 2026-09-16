# 06 — A 10-truck depot in the German market: what you can actually do

This file connects docs 01–05 to the concrete case the simulator models, and documents
every modelling assumption in the simulator so the numbers are auditable.

---

## 6.1 The depot's position in the role map

```
             ┌──────────────────────────────────────────────────────────┐
             │ DEPOT — 10 e-trucks, 1 grid connection, 1 MaLo-ID        │
             │ Roles you hold: Letztverbraucher (+ Anlagenbetreiber     │
             │ if you do V2G)                                           │
             └───────────┬─────────────────────────┬────────────────────┘
                         │                         │
       retail / supply   │                         │  flexibility contract
                         ▼                         ▼
           ┌─────────────────────────┐   ┌──────────────────────────┐
           │ SUPPLIER / SERVICE BRP  │   │ AGGREGATOR  (= BSP)      │
           │ • your Unterbilanzkreis │   │ • prequalified pool      │
           │ • nominates 14:30 D-1   │   │ • bids aFRR/mFRR         │
           │ • DA/ID execution       │   │ • NEEDS written consent  │
           │ • imbalance allocation  │◄──┤   from your supplier+BRP │
           └───────────┬─────────────┘   └────────────┬─────────────┘
                       │ Bilanzkreisvertrag           │ Rahmenvertrag
                       ▼                              ▼
           ┌──────────────────────────────────────────────────────────┐
           │ TSO (50Hertz / Amprion / TenneT DE / TransnetBW)          │
           │ • imbalance settlement (reBAP)  • balancing procurement   │
           └──────────────────────────────────────────────────────────┘
                       ▲
                       │ metered values
           ┌───────────┴───────────┐
           │ DSO (VNB) + MSB       │  grid fees, levies, metering
           └───────────────────────┘
```

**You are never the BRP in any realistic depot setup** (doc 03, §3.8). You are a customer
*inside* a balance group, ideally inside your own **Unterbilanzkreis** so your position is
ring-fenced and you keep the trading upside.

---

## 6.2 The four value stacks, ranked by accessibility

| # | Value stack | Effort | Typical value | Needs |
|---|---|---|---|---|
| 1 | **Avoid peak grid charges** (Leistungspreis, and § 19(2) StromNEV if you qualify) | low | often the **largest single item** | load management only |
| 2 | **Day-ahead price arbitrage** (smart charging) | low | 10–30 % of energy cost | dynamic tariff or a service BRP |
| 3 | **Intraday re-optimisation** | medium | a few €/MWh | service BRP + trading desk or algo |
| 4 | ~~**Balancing markets** (aFRR/mFRR)~~ — **out of scope for this project** | high | lumpy | prequalification or an aggregator pool |

Note the ordering. **Grid-charge optimisation usually beats every energy-market strategy**
for a depot, and it needs no market role at all. Anyone pitching V2G revenue that ignores the
Leistungspreis is selling you the fourth-best thing first.

> **Correction.** An earlier version of this file named **§ 14a EnWG** as the depot's grid-charge
> lever. It is not: § 14a covers controllable consumption devices above 4.2 kW connected in **low
> voltage** and commissioned from 1 January 2024, so a ~1.6 MW depot on a medium-voltage connection
> with RLM metering is outside its scope. The applicable instrument is **§ 19(2) sentence 1 StromNEV**
> (*atypische Netznutzung*): where the annual peak reliably falls outside the network operator's
> published high-load windows (*Hochlastzeitfenster*), an individual network charge can be agreed,
> down to as little as 20 % of the standard rate, notified to the regulator by **30 September**.
> (§ 19(2) sentence 2, *intensive Netznutzung*, needs ≥ 7 000 Benutzungsstunden and ≥ 10 GWh/a —
> far beyond a depot.)

The simulator models stacks 2, 3 and 4 explicitly and carries 1 as a configurable
grid-charge block so the comparison is honest.

---

## 6.3 The asymmetry that defines depot flexibility

| | **Downward flex** (= negative balancing energy) | **Upward flex** (= positive balancing energy) |
|---|---|---|
| What it means | charge **harder** than planned | charge **less**, or **discharge** (V2G) |
| What it needs | spare charger + grid headroom | stored energy you are willing not to drive on, or V2G hardware |
| Battery cost | none (you were going to charge anyway) | **degradation**, plus warranty exposure |
| Risk to operations | low — you just finish earlier | **high** — a truck that leaves at 70 % SoC is a failed shift |
| Availability | high whenever trucks are plugged in and not full | low, and worst exactly when prices spike (evening peak = trucks out or needed full) |

**Conclusion: prequalify for the negative direction first.** Downward flexibility from a
charging depot is close to free. Upward flexibility is a genuine cost that has to clear a
high bar. The simulator prices both and lets you see the difference.

---

## 6.4 Simulator model specification

Everything below is implemented in
`apps/depot-energy-trading-simulator/src/lib/` and is configurable in the UI.

### 6.4.1 Time base

- **96 quarter hours** per day, matching the German ISP and, since 01.10.2025, the
  day-ahead MTU.
- Phases: `SETUP → DAY_AHEAD → INTRADAY → DELIVERY → SETTLEMENT`.

### 6.4.2 Truck model

Per truck `i`:

| Parameter | Default | Unit |
|---|---|---|
| Usable battery capacity | 540 | kWh |
| Max charge power | 350 | kW |
| Max discharge power (V2G) | 200 | kW |
| Charging efficiency `η_c` | 0.94 | — |
| Discharging efficiency `η_d` | 0.94 | — |
| Round-trip efficiency | `η_c · η_d` ≈ 0.88 | — |
| SoC floor (never go below) | 15 | % |
| SoC required at departure | 90 | % |
| Energy consumed per shift | 380 | kWh |
| Departure / return | per-truck schedule | QH index |

State update per quarter hour, with `Δt = 0.25 h`:

```
if plugged in:
    SoC_i(t+1) = SoC_i(t) + η_c · P_charge_i(t) · Δt  −  (1/η_d) · P_discharge_i(t) · Δt
if on shift:
    SoC_i(t+1) = SoC_i(t) − consumption_i(t)
```

Hard constraints checked every quarter hour:

```
0 ≤ P_charge_i ≤ P_charge_max,i              and   P_charge_i · P_discharge_i = 0
0 ≤ P_discharge_i ≤ P_discharge_max,i
SoC_floor ≤ SoC_i ≤ 100 %
Σ_i (P_charge_i − P_discharge_i)  ≤  P_grid_cap        ← depot grid connection
SoC_i(departure) ≥ SoC_required                        ← else OPERATIONAL FAILURE
```

An operational failure is **not** priced as an energy cost. It is surfaced as a separate
red counter, because a depot that misses a shift has lost far more than any imbalance
charge. (Configurable penalty: default 1 500 €/failed departure, representing a swapped
vehicle or a missed delivery window.)

### 6.4.3 Degradation cost

Simple, transparent, and deliberately conservative:

```
degradation_cost  =  c_deg  ·  Σ_t Σ_i ( P_charge_i(t) + P_discharge_i(t) ) · Δt / 2
```

i.e. a €/kWh charge on **throughput**, halved so that one full cycle (in + out) is charged
once. Default `c_deg = 0.04 €/kWh`, derived from ~ 400 €/kWh pack cost over ~ 5 000
equivalent full cycles with a 50 % residual-value assumption. **Change this number** — it
is the single most leveraged assumption in any V2G business case, and the simulator exposes
it as a slider for exactly that reason.

Charging-only operation still incurs it, so smart charging is not modelled as free either.

### 6.4.4 Price scenarios

Four hand-built German day profiles, fully deterministic and replayable:

| Scenario | Day-ahead shape | System imbalance character | What it teaches |
|---|---|---|---|
| **Windy spring day** | deep negative midday, low evening | long system, frequent negative reBAP | Getting *paid* to charge; why negative prices reward inflexible consumption |
| **Dunkelflaute** | high and flat, sharp evening peak | short system, high positive reBAP | Scarcity, why upward flex is valuable, Module 3 territory |
| **Typical weekday** | classic duck curve | mixed, near-zero much of the day | Baseline. Module 2 does the work. |
| **Volatile / scarcity event** | duck curve + an evening spike | a short quarter hour that reaches the scarcity dead band | Module 3 firing, and what a single bad quarter hour costs |

Each scenario provides, per quarter hour: `dayAheadPrice`, `intradayIndex` (the `ID AEP`),
`intradayVolume` (for the 500 MW test), `balanceGCC` (MW), and the platform inputs needed
for Module 1 (`vwapAfrrPos/Neg`, `vwapMfrrPos/Neg`, `sdAfrrPos/Neg`, `sdMfrrPos/Neg`, `voaaPos/Neg`).

Prices are **synthetic but calibrated** to realistic German ranges. They are **not**
historical data and must not be cited as such. The data layer is deliberately shaped so a
real **ENTSO-E Transparency Platform** or **SMARD** feed can be substituted later — see
`src/lib/scenarios/README.md`.

### 6.4.5 The reBAP engine

`src/lib/rebap.ts` implements doc 05 **exactly**: Module 1 with the four-way case
distinction and VoAA fallback, Module 2 with the 500 MW index test and the `ΔP` formula,
Module 3 with the parabolic scarcity function and the 80 % dead band, the max/min
selection, and the KapResV asymmetric case. Every intermediate value is exposed in the UI
so you can see which module bound in each quarter hour.

### 6.4.6 BRP contract models

Three offers, matching doc 02 §2.2. All parameters are editable.

| | **Stadtwerke Basis** | **FlexPool Partner** | **GreenTrade Full-Service** |
|---|---|---|---|
| Model | **A — pass-through** | **B — pooled/netted** | **C — full-service** |
| Monthly fee | 250 € | 600 € | 1 200 € |
| Energy fee | 1.50 €/MWh | 2.80 €/MWh | 4.50 €/MWh |
| Imbalance treatment | 100 % of your deviation × reBAP | your deviation netted against a pool first (default pool netting factor 0.55) | absorbed by the BRP |
| Tolerance band | none | ±5 % of schedule | ±10 % of schedule |
| Outside the band | — | 1.5× reBAP | 120 €/MWh flat penalty |
| Credits passed through | 100 % | 100 % | **60 %** (haircut) |
| Intraday access | day-ahead only | DA + ID continuous | DA + ID + IDA auctions |
| Balancing market access | no | yes, via their pool | yes, via their pool |
| Collateral required | 8 000 € | 15 000 € | 25 000 € |

The **credit haircut** row is deliberately included: it is a private, contractual two-price
scheme hiding inside a single-price regulatory regime, and it is extremely common in real
offers. The simulator shows you exactly what it costs you.

### 6.4.7 Trading fees (all editable)

| Fee | Default | Basis |
|---|---|---|
| Exchange fee, day-ahead | 0.06 €/MWh | EPEX-style per-MWh trading fee |
| Exchange fee, intraday continuous | 0.12 €/MWh | higher for continuous |
| Clearing fee (ECC-style) | 0.035 €/MWh | |
| BRP execution fee | 0.50 €/MWh | broker/service margin |
| Intraday bid-ask half-spread | 1.50 €/MWh | you buy at index + spread, sell at index − spread |
| Widening near gate closure | ×1.8 in the last 4 QH | liquidity thins |
| Grid fees + levies + taxes | 95 €/MWh | Netzentgelt, KWKG, § 19 StromNV, Offshore, Konzessionsabgabe, Stromsteuer |
| Leistungspreis (peak power) | 120 €/kW·a → shown as €/kW on the day's peak | the item that usually dominates |

**Balancing-market participation is disabled.** FCR / aFRR / mFRR are out of scope for this project,
so no capacity is ever offered and the balancing lines never appear in the P&L. The calculation
remains in `simulate.ts` and can be re-enabled by restoring the offer UI in `PhaseDayAhead.tsx`.

### 6.4.8 Settlement identity

The simulator's P&L closes exactly to:

```
NET  =  − day-ahead energy cost
        − intraday energy cost (+ sales revenue)
        − imbalance settlement (signed, can be positive)
        − exchange + clearing + execution fees
        − BRP fixed fee (pro-rated to the day) − BRP energy fee
        − grid fees, levies and taxes
        − peak-power charge
        − battery degradation cost
        + balancing capacity revenue
        + balancing activation revenue
        − operational failure penalties
```

Every line is displayed, and the day-ahead / intraday / imbalance split is broken out per
quarter hour so you can see which decisions produced which number.

---

## 6.5 Things the simulator deliberately does NOT model

Stated explicitly so you do not over-claim from it:

- **Redispatch 2.0.** A depot ≥ 100 kW is in scope for § 13a EnWG; being directed down is
  a *risk*, compensated at cost. Not modelled.
- **§ 19(2) StromNEV individual network charges.** Modelled only as a flat configurable
  peak-power charge; the simulator does not check your load against a DSO's high-load windows.
- **VAT and electricity-tax mechanics.** Folded into one levy figure.
- **Balancing markets entirely.** Out of scope for this project and disabled in the UI.
- **Multi-day and seasonal effects.** One day at a time.
- **Battery thermal behaviour, C-rate-dependent efficiency, calendar ageing.**
  Degradation is a flat €/kWh on throughput.
- **Historical price data.** Scenarios are synthetic (see 6.4.4).
- **Price-forecast error.** The planner optimises against the day's *actual* cleared prices —
  perfect foresight. The arbitrage saving is an **upper bound**, not an estimate.
- **Sweden / Nordic rules.** Germany only, by design.
