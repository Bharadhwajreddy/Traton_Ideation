# Depot Energy Trading Simulator — Germany

Run a depot of ten electric trucks through the German electricity market for one
delivery day: buy day-ahead, adjust intraday, live through delivery, and read the
settlement invoice.

The point of the thing is to make three normally-invisible mechanisms concrete:

1. **Where the imbalance actually comes from.** Not from bad trading — from operations
   overriding the plan. A truck that must charge to make its departure will charge.
2. **What the reBAP really is.** Three modules, a max/min rule, and one asymmetric edge
   case. Implemented literally from the TSOs' model description, with every intermediate
   value exposed.
3. **What a BRP contract actually does to you.** The regulated price is identical for
   everyone. How much of it reaches you is a private contract term, and it is where most
   of the money moves for a small portfolio.

> **The prices in here are synthetic.** Hand-built, deterministic, calibrated to
> plausible German ranges — not historical data, and not citable as such. See
> "Replacing the data" below.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

Node 20+ . No database, no API keys, no server state — the whole simulation runs in the
browser.

---

## The five phases

| Phase | What happens | What you decide |
|---|---|---|
| **Setup** | Pick the day, the BRP contract, the fleet and the cost assumptions | everything downstream |
| **Day-ahead** | 12:00 D-1 auction, then nomination to the TSO by 14:30 | your charging strategy, and optionally a balancing capacity offer |
| **Intraday** | 11:00 on D: the forecast changes | how much of the gap you close, and at what spread |
| **Delivery** | Real time. Operations override the plan | V2G, and whether to deviate deliberately |
| **Settlement** | Ex post, per quarter hour, invoiced monthly | nothing — you read the bill |

---

## Code map

```
src/lib/
  types.ts        Domain types + the sign conventions used everywhere. Read this first.
  constants.ts    Every default: fleet, fees, the three BRP offers, the chart palette.
  scenarios.ts    Four synthetic German days + the deterministic generator behind them.
  rebap.ts        THE reBAP ENGINE. Modules 1–3, VoAA, ΔP, the scarcity parabola,
                  the max/min rule and the KapResV asymmetric case.
  depot.ts        Truck physics, the charging planner, and the delivery dispatcher.
  settlement.ts   How a raw deviation becomes a euro amount under each BRP contract.
  simulate.ts     The orchestrator. One function, one linear chain, every number traceable.
  format.ts       Number and clock-time formatting.

src/components/
  ui.tsx            Card, Stat, Slider, Toggle, Chip, Note, SegmentedControl, Button.
  charts.tsx        Recharts wrappers: prices, power, imbalance, SoC, P&L.
  PhaseSetup.tsx    Scenario picker, BRP offer cards, depot config, cost assumptions.
  PhaseDayAhead.tsx Strategy, resulting schedule, balancing capacity offer.
  PhaseIntraday.tsx Revealed forecast errors, close-the-gap decision, spread cost.
  PhaseDelivery.tsx Metered vs nominated, SoC, deliberate deviation, reBAP inspector.
  PhaseSettlement.tsx P&L, line-by-line table, and the same day under all three BRPs.

src/app/
  page.tsx        All state lives here; everything else is a pure function of it.
  globals.css     Design tokens, light and dark, and the validated chart palette.
```

### Conventions

- Time base is the **quarter hour**, index 0–95 — the German ISP, and the day-ahead MTU
  since 1 October 2025.
- Power in **MW**, energy in **MWh**, prices in **€/MWh**.
- Depot power: **positive = drawing from the grid**, negative = injecting (V2G).
- System imbalance `balanceGCC`: **positive = the German control block is SHORT.**
  This is the TSOs' own convention and every formula depends on it.

---

## The reBAP engine

`src/lib/rebap.ts` is the part worth reading. It implements, without approximation:

- **Module 1** — volume-weighted PICASSO (aFRR) and MARI (mFRR) marginal prices, with the
  four-way case distinction and the **Value of Avoided Activation** fallback.
- **Module 2** — the intraday price index, the 500 MW coupling test, and the minimum
  distance `ΔP = max(10·s, |ID|·0.25·s)` where `s = min(125, |Balance|·0.25)/125`.
- **Module 3** — the scarcity parabola, anchored on Module 2, with the dead band at 80 %
  of dimensioned FRR and the head at twice the intraday bid cap.
- The selection rule: **max** of the defined modules when the system is short, **min** when
  long, Module 2 alone when exactly flat.
- **KapResV § 26 / § 32** — the one case where the German imbalance price is asymmetric
  between short and long balance groups (19 998 €/MWh for short groups).

Source: German TSOs, *"Calculation of the uniform imbalance price (reBAP) across Germany's
4 LFC areas — Model description"*, valid from 01.11.2023, implementing BNetzA **BK6-21-192**.

Full annotated specification: [`../../energy-markets/docs/05-imbalance-pricing-rebap.md`](../../energy-markets/docs/05-imbalance-pricing-rebap.md).

---

## Replacing the synthetic data with real data

`ScenarioPoint` (in `types.ts`) is deliberately shaped so a real feed drops straight in:

| Field | Where to get it |
|---|---|
| `dayAhead` | ENTSO-E Transparency Platform, or SMARD |
| `idIndex`, `idVolume` | EPEX SPOT continuous intraday trades |
| `balanceGCC` | netztransparenz.de (NRV-Saldo) |
| `vwapAfrr*`, `vwapMfrr*`, `sd*` | netztransparenz.de / regelleistung.net |
| `voaaPos`, `voaaNeg` | PICASSO cheapest-available-bid data |
| `capacityReserveActivated` | netztransparenz.de |

Produce a `Scenario` with those 96 points and register it in `SCENARIOS`. Nothing else
needs to change — the engine, the UI and the settlement logic are all data-agnostic.

---

## Deliberate limitations

Stated so nobody over-claims from the output:

- **Redispatch 2.0** (§ 13a EnWG) exposure is not modelled. For a depot it is a risk, not
  a revenue — compensated at cost.
- **§ 14a EnWG** reduced grid charges appear only as one configurable €/MWh figure, not as
  the actual module choice.
- **VAT and electricity tax** are folded into that same figure.
- **Prequalification availability** is warned about, not enforced — the app flags a
  balancing offer the fleet cannot hold, but does not run a TSO service run.
- **Degradation** is a flat €/kWh on throughput. No calendar ageing, no C-rate or thermal
  dependence.
- **One day at a time.** No seasonal or multi-day effects.
- **Germany only**, by design. Nordic rules differ in ways documented in
  [`../../energy-markets/docs/05-imbalance-pricing-rebap.md`](../../energy-markets/docs/05-imbalance-pricing-rebap.md) § 5.9.

---

## Accessibility and design notes

- The chart palette is the `dataviz` skill's reference instance, **validated with its
  own checker** for the three series used here, all-pairs, in both light and dark mode
  (worst CVD ΔE 9.2 light / 9.4 dark; worst normal-vision ΔE 24.0 / 20.9).
- The light-mode aqua sits below 3:1 contrast on the light surface, so the **relief rule**
  applies: the reBAP series is always directly labelled and every chart has a table view
  beside it.
- Dark mode is a **selected** palette, not an inverted one, and follows both the OS
  setting and an explicit `data-theme` stamp.
- No dual-axis charts anywhere. Where two measures share an x axis they are drawn as
  stacked small multiples instead.
- Verified at 390 px with zero horizontal overflow on every phase.
