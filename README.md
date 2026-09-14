# Traton_Ideation — V2G Thesis Ideas (Heavy-Duty Truck Depots)

Plain-language ideation for an M.Sc. thesis at **TRATON / MAN R&D** ("UnPlugged Energisers")
on **V2G / bidirectional charging for heavy-duty truck depots**.

## Repository map

| Area | What it is |
|---|---|
| [`energy-markets/`](energy-markets/) | **Market reference.** A sourced, seven-part explanation of how the German electricity market actually works end to end — the D-2 → D+n flow, the BRP / BSP / aggregator role model, what a "we'll be your BRP" offer really contains, the balancing products, and the complete reBAP imbalance-price formula. Every claim traced to a primary source (BNetzA decisions, the Standard-Bilanzkreisvertrag, the TSOs' own model descriptions). Includes [`energy-markets/explainer.html`](energy-markets/explainer.html), a single-file visual walkthrough with an interactive reBAP module explorer. |
| [`apps/depot-energy-trading-simulator/`](apps/depot-energy-trading-simulator/) | **Interactive simulator (Next.js).** Play the depot owner: 10 electric trucks, pick a BRP contract, buy day-ahead, adjust intraday, live through delivery, read the settlement invoice. The imbalance price is computed with the real three-module reBAP formula; every fee and assumption is a slider. |

## Thesis ideation files

| File | What it is |
|---|---|
| [`index.html`](index.html) | **Start here.** Clearly-explained report: every diagram has *In plain words / Why it matters / Watch out / Fact / Diesel-era* boxes. Restored layered diagram, bigger ideas, FCR market facts, the test-bench answer, and the car-vs-truck literature. Open in any browser (diagrams render via Mermaid). |
| [`novel-ideas.html`](novel-ideas.html) | **Fresh Lens** — a deliberately broad, high-novelty sweep: tools to build (5-min SoH test, profitability sandbox, learned-controller API, HIL rig, open benchmark), novel science bets (hybrid physics+AI twin, federated fleet learning, carbon-aware V2G, RL, incentive design, flexibility forecasting), and moonshots — each with honest novelty flags. |
| [`THESIS_IDEAS_V2G_HDtrucks.md`](THESIS_IDEAS_V2G_HDtrucks.md) | Full reference with all reasoning, the literature critique, and the v3 update (§13). |

## The recommendation (grown to 9-month size)

> **The Battery-Passport-Informed Life-Budget Controller** — treat battery life as a finite budget and *allocate it
> across stacked services* (arbitrage + peak shaving + FCR/aFRR + PV), priced by a **measured wear map**, then generalise
> across DE/NL/CN into a **customer/government decision matrix**.

This grows the two pieces you liked but felt were too small — **C1 (grid services)** and **D1 (cross-country)** — into
components of one spine, anchored by your real-truck/bench **wear map (A1–A3)** and your **decision matrix (D2)**.

## What's inside index.html
- The layered platform diagram (restored)
- 3 bigger new ideas: life-budget portfolio · bankable firm capacity · V2G-vs-resale-value
- A1–A3 (passport, test + **test-bench answer**, wear map)
- C1 with the **FCR/aFRR facts** (1 MW floor, 4-h products, 25-min aFRR gate, aggregation math)
- D1 + D2 (your decision matrix)
- **Literature: cars vs trucks** (Dubarry, Uddin, EPRI, Shiledar drayage study)
- The corrected bench test protocol, honest cautions, open questions, and a parked-ideas appendix

## Why the market reference is here

Every grid-services idea in the thesis map (C1 in particular — FCR/aFRR participation, the 1 MW floor,
4-hour products, the aggregation maths) depends on getting the German market mechanics right. The
`energy-markets/` folder is that foundation, written so the numbers in a business case can be defended
clause by clause rather than asserted. The simulator is the same material made runnable.
