# 05 — Imbalance pricing: the reBAP, formula by formula

**reBAP** = *regelzonenübergreifender einheitlicher Bilanzausgleichsenergiepreis* —
the uniform imbalance price across Germany's four LFC areas.

Primary source for everything in this file: German TSOs, *"Calculation of the uniform
imbalance price (reBAP) across Germany's 4 LFC areas — Model description"*, valid from
**01.11.2023**, published on `netztransparenz.de`. Implements BNetzA decisions
**BK6-21-192** (28.04.2022, ISHM), **BK6-12-024**, **BK6-19-217**, **BK6-19-552**,
**BK6-20-345** and **BK6-22-162**.

This file is the specification the simulator in `apps/depot-energy-trading-simulator`
implements.

---

## 5.1 The top-level rule

```
                 ┌ max( AEP_Module1 , AEP_Module2 , AEP_Module3 )   if Balance_GCC > 0   (system SHORT)
reBAP_qh   =     ┤ min( AEP_Module1 , AEP_Module2 , AEP_Module3 )   if Balance_GCC < 0   (system LONG)
                 └ AEP_Module2                                       if Balance_GCC = 0
```

When `Balance_GCC = 0`, modules 1 and 3 are **undefined**, so module 2 alone sets the price.

One price, per quarter hour, for the **whole German control block**, applying to **all**
balance groups regardless of direction. **Single pricing, symmetric.**

---

## 5.2 The system imbalance: `Balance_GCC` (the NRV-Saldo)

```
Balance_GCC =   (k·Δf)_pos        − (k·Δf)_neg                     ← FCR
              + aFRR_Activation_pos  − aFRR_Activation_neg
              + aFRR_Optimization_pos − aFRR_Optimization_neg      ← PICASSO + IGCC
              + mFRR_Activation_pos  − mFRR_Activation_neg
              + mFRR_Optimization_pos − mFRR_Optimization_neg      ← MARI
              + additional_measures_pos − additional_measures_neg
              + Difference_pos       − Difference_neg
```

| Term | Meaning |
|---|---|
| `k·Δf` | FCR |
| `aFRR_Activation` | **nationally** activated aFRR. Volumes activated *for* foreign countries are booked as an offsetting volume in `aFRR_Optimization`. |
| `aFRR_Optimization` | the aFRR result of the **PICASSO and IGCC** optimisation. Positive = **import** of aFRR, negative = **export**. |
| `mFRR_Activation` / `mFRR_Optimization` | the same for **MARI**. |
| `additional_measures` | capacity reserve (KapRes), disconnectable loads (AbLa), TSO intraday trading, the **50/100 mHz procedure**, the national grid reserve, emergency reserve. |
| `Difference` | schedule − measured flow over interconnector lines + actual interconnection values. Equals ENTSO-E TP's *"difference between measured MV and scheduled flows SV over all interconnectors"*, in MW, **with reversed sign**. Schedules are ramped. |

**Sign convention: `Balance_GCC > 0` means the GCC LFC areas are SHORT (under-supplied)
on average within the quarter hour.** Negative means long.

---

## 5.3 Module 1 — Base component (PICASSO + MARI prices)

Per direction, build a volume-weighted average of the two platform marginal prices.

**Step 1 — aFRR product price.**
PICASSO produces a cross-border marginal price (CBMP/MP) **per 4-second optimisation cycle**,
separately for positive and negative direction. Within a quarter hour there are
**225 cycles**. In one cycle there is a price for *either* the positive or the negative
direction — **only under *perfect netting* are both directions priced in the same cycle.**

```
VWAP_aFRR,GCC,dir,qh  =  volume-weighted average of all 4-second CBMPs
                          of that direction within the quarter hour
SD_aFRR,GCC,dir,qh    =  Satisfied Demand = activated aFRR + aFRR exchange volumes
```

**Optimisation cycles with Perfect Netting are excluded — neither their marginal price nor
their satisfied demand enters the VWAP.** If *all* cycles of a quarter hour are perfect
netting, the VWAP is **undefined** for that quarter hour.

**Step 2 — mFRR product price.** Same construction from MARI prices, covering both
**scheduled** and **direct** activation, giving `VWAP_mFRR,GCC,dir,qh` and `SD_mFRR,GCC,dir,qh`.

**Step 3 — combine, per direction, with a four-way case distinction:**

```
                       ⎧ VoAA_GCC,dir,qh                         if aFRR VWAP = 0 AND mFRR VWAP = 0
                       ⎪ VWAP_mFRR,GCC,dir,qh                    if aFRR VWAP = 0 AND mFRR VWAP ≠ 0
AEP1_GCC,dir,qh   =    ⎨ VWAP_aFRR,GCC,dir,qh                    if aFRR VWAP ≠ 0 AND mFRR VWAP = 0
                       ⎪ VWAP_aFRR·SD_aFRR + VWAP_mFRR·SD_mFRR
                       ⎩ ─────────────────────────────────────    otherwise
                            SD_aFRR       +      SD_mFRR
```

**Step 4 — pick the direction:**

```
                ⎧ AEP1_GCC,pos,qh   if Balance_GCC > 0
AEP_Module1 =   ⎨ AEP1_GCC,neg,qh   if Balance_GCC < 0
                ⎩ undefined         if Balance_GCC = 0
```

Rounded commercially to 2 decimal places, €/MWh.

### 5.3.1 EB GL price bounds

**Art. 55(4) EB GL:** the imbalance price for *negative* imbalance shall not be **less
than** (a) the weighted average price for **positive** activated balancing energy from FRR
and RR, or (b) where nothing was activated in either direction, the **value of avoided
activation**.

**Art. 55(5) EB GL:** the imbalance price for *positive* imbalance shall not be **greater
than** (a) the weighted average price for **negative** activated balancing energy from FRR
and RR, or (b) the VoAA.

The model description states these bounds are **implicitly ensured** by the volume-weighted
price determination — there is no separate clipping step.

### 5.3.2 Value of Avoided Activation (VoAA)

Applies when there is **no FRR demand in the GCC**, or no activation toward the GCC
requirement, in the quarter hour.

> **VoAA = the arithmetic mean of the first (i.e. cheapest) aFRR bid price available for
> the German control areas on the PICASSO platform, across all optimisation cycles of that
> quarter hour.**

Note it is an *arithmetic* mean of *cheapest available bids* — the price at which the
system *would have* been balanced. That keeps the price incentive-correct even in a quarter
hour where nothing happened.

---

## 5.4 Module 2 — Incentivising component (intraday coupling)

**This is the anti-arbitrage device.** It is the direct answer to the standard objection
that single pricing lets you speculate.

### Step 1 — the Intraday Price Index (`ID AEP`)

- Take **all trades of the quarter-hourly product** in continuous intraday trading in the
  German market area, across the relevant NEMOs — currently **EPEX SPOT SE** and
  **Nord Pool AS**.
- Include the trades whose **trading time is closest to the start of the settlement period**,
  accumulating until total traded volume `V_ID` **exactly reaches or exceeds 500 MW**.
- **Only if** the quarter-hourly product does not reach 500 MW, supplement with trades of
  the **hourly product** covering that settlement period, again nearest-in-time first,
  until 500 MW is reached or exceeded.
- `ID AEP` = the **volume-weighted average price** of exactly that set of trades.
- **If 500 MW is never reached, the index is undefined for that settlement period and no
  imbalance price coupling takes place.**

### Step 2 — the minimum distance `ΔP`

A minimum distance of **25 %, but at least 10 €/MWh**, is imposed between `ID AEP` and
Module 2 — *provided* |`Balance_GCC`| ≥ 500 MW. At `Balance_GCC` = 0 MW there is **no**
distance. Between 0 and 500 MW it **increases linearly**.

```
             ⎧      10 €/MWh · min(125 MWh, |Balance_GCC|)                              ⎫
ΔP  =  max   ⎨      ───────────────────────────────────────  ,                          ⎬
             ⎪                  125 MWh                                                 ⎪
             ⎪      |ID_AEP| · min(125 MWh, |Balance_GCC|) · 0.25                       ⎪
             ⎩      ──────────────────────────────────────────                          ⎭
                                125 MWh
```

*(125 MWh over a quarter hour = 500 MW.)*

> **Two reading notes on this formula.**
>
> 1. **`AEP_Module1` is *undefined*, not zero, when `Balance_GCC = 0`.** Some renderings of
>    the model write a `0` in that branch. It is not a price of zero euros — the module has
>    no defined value, which is exactly why § 5.1 says module 2 alone sets the price in that
>    settlement period. The reference implementation in
>    `apps/depot-energy-trading-simulator/src/lib/rebap.ts` returns `null` here, not `0`.
> 2. **The ΔP formula is dimensionally sloppy in the source.** `Balance_GCC` is stated in
>    **MW** everywhere else in the model description, but inside `min(125 MWh, |Balance_GCC|)`
>    it is compared against an energy in **MWh**. The intended reading is the energy one:
>    convert the balance to MWh first (MW × 0.25 h), then clamp at 125 MWh. That is what the
>    implementation does, and it is what makes the stated "at 500 MW the full distance
>    applies" come out right.

### Step 3 — Module 2

```
                  ⎧ ID_AEP + ΔP    if Balance_GCC > 0  AND  V_ID ≥ 500 MW
AEP_Module2  =    ⎨ ID_AEP − ΔP    if Balance_GCC < 0  AND  V_ID ≥ 500 MW
                  ⎪ ID_AEP         if Balance_GCC = 0  AND  V_ID ≥ 500 MW
                  ⎩ zero / not applicable                        otherwise
```

### Why this matters

Because the final reBAP is the **max** of the modules when short and the **min** when long,
Module 2 guarantees:

- System short → reBAP ≥ intraday index **+ ΔP**. Being short is always **more expensive**
  than having bought in intraday.
- System long → reBAP ≤ intraday index **− ΔP**. Being long always **earns less** than
  having sold in intraday.

**Staying imbalanced is never cheaper than trading flat, in either direction, at all times.**
That is precisely the property people reach for dual pricing to obtain — obtained here
*without* destroying the reward for helping the system.

---

## 5.5 Module 3 — Scarcity component

Applies only when the system imbalance reaches **80 % of the dimensioned FRR** in the
relevant direction, plus additional procured FRR. Below that threshold it has no effect.

- Positive `Balance_GCC` (undersupply) → Module 3 is a **lower limit** for the reBAP.
- Negative `Balance_GCC` (oversupply) → Module 3 is an **upper limit**.

It is a **second-order (parabolic) function** of `Balance_GCC`, anchored on Module 2 and
running toward **twice the intraday bid cap** at the point where all reserves are exhausted.

```
                ⎧ f_short,pos    if Balance_GCC ≥ P_db,pos
AEP_Module3 =   ⎨ f_short,neg    if Balance_GCC ≤ P_db,neg
                ⎩ zero / n.a.    otherwise
```

with

```
                 ⎧ AEP_M2 + (2·BP_cap − AEP_M2) · ( (Balance_GCC − P_db,pos) / (P_Res,pos − P_db,pos) )²   if AEP_M2 ≠ 0
f_short,pos  =   ⎨
                 ⎩          2·BP_cap          · ( (Balance_GCC − P_db,pos) / (P_Res,pos − P_db,pos) )²   otherwise

                 ⎧ AEP_M2 + (−2·BP_cap − AEP_M2) · ( (Balance_GCC − P_db,neg) / (P_Res,neg − P_db,neg) )²  if AEP_M2 ≠ 0
f_short,neg  =   ⎨
                 ⎩         −2·BP_cap           · ( (Balance_GCC − P_db,neg) / (P_Res,neg − P_db,neg) )²  otherwise
```

Parameters:

```
P_db,pos   =  0.8 · Σ( P_aFRR,pos + P_mFRR,pos )                                  ← dead band, short
P_db,neg   = −0.8 · Σ( P_aFRR,neg + P_mFRR,neg )                                  ← dead band, long
P_Res,pos  =       Σ( P_aFRR,pos + P_mFRR,pos + P_disload + P_capres )
P_Res,neg  =     − Σ( P_aFRR,neg + P_mFRR,neg + P_disload + P_capres )
BP_cap     =  highest permissible bid price in intraday exchange trading (9 999 €/MWh)
```

where `P_aFRR,*` / `P_mFRR,*` are the **dimensioned** reserve powers **plus additionally
procured FRR**, `P_disload` = contracted disconnectable loads (AbLa), `P_capres` =
contracted capacity reserve.

The regulator's stated intent (BK6-20-345) is that this component should **almost never
bind**. Its reason for tightening it: intraday price coupling alone cannot exclude
arbitrage in every situation, because the coupling only reflects trades that *actually
happened*, not the trades that were never concluded because the price looked too high.

---

## 5.6 Capacity reserve regulation — the one asymmetric case

Under **§§ 26 and 32 KapResV**, if:
- a capacity reserve activation has occurred (`P_Abruf.KapRes > 0`), **and**
- `Balance_GCC` > total available positive aFRR + mFRR,

then:

```
reBAP_neg  =  max/min( AEP_M1, AEP_M2, AEP_M3 )        ← as usual, per sign of Balance_GCC

                 ⎧ max( reBAP_neg , PrID.Limit · 2 )   if capacity reserve activated
reBAP_pos   =    ⎨                                        AND Balance_GCC > P_aFRR,pos + P_mFRR,pos
                 ⎩ reBAP_neg                            otherwise
```

`PrID.Limit · 2` = **2 × 9 999 = 19 998 €/MWh**.

**Effect:** short balance groups pay at least 19 998 €/MWh; long balance groups settle at
the normal price. **This is the only quarter hour in which the German reBAP is deliberately
asymmetric.** If the normally-calculated AEP already exceeds 19 998 €/MWh, it applies
symmetrically to both directions again.

---

## 5.7 Financial neutrality — where the money actually lands

The reBAP revenues the TSOs collect through balance-group settlement do **not** equal the
costs of the balancing measures used. Both **deficits and surpluses** arise.

> "These deficits and surpluses are added up by the TSOs on a **calendar-year** basis and
> included in the determination of the **network usage charges (Netznutzungsentgelte, NNE)**.
> In this way, the TSOs are placed in a **financially neutral** position and the deficits /
> surpluses have an NNE-increasing / NNE-reducing effect."

So the "budget balanced" property in textbook models is **approximate in reality**, and the
residual is socialised onto **network users** — i.e. eventually onto retail tariffs. This
is an important counter-argument to treating imbalance charges as a pure penalty: under
financial neutrality they are a **transfer**, not a cost recovery.

---

## 5.8 One-price vs two-price — the full argument

### 5.8.1 The mechanics

Day-ahead price 30 €/MWh. Imbalance price 33 €/MWh when the system is short, 27 €/MWh when
long. A wind farm (or a depot) scheduled at 25 MW.

| System state | Your deviation | Your deviation is | **One-price** | **Two-price** |
|---|---|---|---|---|
| Short | over-produces / under-consumes | **helping** | 33 (paid) | 30 (paid) |
| Short | under-produces / over-consumes | **aggravating** | 33 (charged) | 33 (charged) |
| Long | over-produces / under-consumes | **aggravating** | 27 (paid) | 27 (paid) |
| Long | under-produces / over-consumes | **helping** | 27 (charged) | 30 (charged) |

Read the last two columns as **incentives**, not prices. On the *aggravating* rows the two
schemes are **identical**. They differ **only** on the *helping* rows — and there,
two-price replaces a reward with the day-ahead price, i.e. with **indifference**.

### 5.8.2 Why single pricing won

1. **Direction vs magnitude.** Two-price penalises deviation *as such*. One-price prices the
   deviation's *effect on the system*. Only the second is economically meaningful when a
   large share of generation is stochastic.
2. **Passive balancing is free reserve.** Every MW that BRPs supply by leaning the right way
   is a MW the TSO does not have to activate — and, through dimensioning, eventually a MW it
   does not have to procure. Two-price destroys the incentive to supply it.
3. **The imbalance price should equal the real-time value of energy.** Same logic that makes
   day-ahead and intraday prices useful. Two-price deliberately breaks it for half the
   market in every period.
4. **The revenue is a transfer, not a cost** (see 5.7). Two-price therefore functions as a
   **tax on forecast error**, falling hardest on variable renewables and small portfolios,
   and recovered eventually in tariffs and risk premia.
5. **Two-price distorts intraday behaviour.** Facing an effective bid-ask spread against the
   imbalance price, a BRP will trade intraday at prices it *knows* to be bad, purely to
   avoid the spread. That is noise, not price discovery.
6. **It is the EU legal default.** **EB GL Art. 55** sets single pricing as the model;
   dual pricing requires explicit regulatory approval and justification.

### 5.8.3 The honest objection, and the actual fix

The objection is legitimate: single pricing creates a **speculative** incentive to
deliberately under- or over-nominate if you can forecast the system's direction.

The textbook fix — cap the imbalance price back at the day-ahead price — **is** two-price,
and throws out the cooperation incentive along with the speculation incentive.

What real systems do instead:

| Device | Germany |
|---|---|
| **Incentivising component** | Module 2. Removes the systematic arbitrage in both directions, at all times. |
| **Scarcity component** | Module 3. In tight periods the price escalates far beyond anything a speculator would risk. |
| **Legal obligation + supervision** | *Bilanzkreistreue* (Ziffer 5.2) is a **contractual duty**. Deliberate systematic imbalance is investigable (Ziffer 11.4), with REMIT on top. |
| **Shorter time units** | 15-min ISP and 15-min MTU cut structural imbalance and shrink the window in which anyone can forecast system direction better than the market. |
| **Deeper markets** | The real answer to a thin balancing market is more liquidity and more participants, not a price intervention. |

**The clean formulation:** *single pricing with incentivising and scarcity components
dominates dual pricing, because it preserves the property people want from dual pricing —
imbalance is never cheaper than trading — without destroying the cooperation signal.*

### 5.8.4 Where dual pricing survives

Around five EU TSOs still use it. The usual arguments:
- **Diverging directions inside one settlement period** — both up and down activated in the
  same period, so "the direction of the system" is ill-defined.
- **Overreaction risk** — self-balancing BRPs swing the system the other way.

Note the first is a **measurement problem**: the ambiguity comes from a settlement period
too long relative to the dynamics. **15-minute periods plus per-cycle marginal pricing
shrink it directly.** The Nordics explicitly considered keeping dual pricing for diverging
periods and **dropped the idea before go-live** (1 November 2021).

---

## 5.9 Sweden / Nordics, for comparison

| | **Germany** | **Sweden** |
|---|---|---|
| TSO(s) | 4 TSOs in one control block (NRV/GCC) | Svenska kraftnät |
| Bidding zones | 1 | 4 (SE1–SE4) |
| Imbalance pricing | Single, symmetric | Single, symmetric |
| Single price since | 2012 model; ISHM-compliant 01.11.2023 | **01.11.2021** |
| Position | one balance group position | **single position** since 01.11.2021 (production + consumption merged) |
| ISP | 15 min, long-standing | 15 min from 22.05.2023; 15-min **price** from 18–19.03.2025 |
| Settlement body | each TSO, per control area | **eSett Oy** (Nordic-wide, owned by the 4 Nordic TSOs) |
| Price basis | max/min of three modules | mFRR EAM marginal price, dominating direction |
| Extra components | intraday coupling + scarcity | **imbalance fee 1.15 €/MWh** (SE/NO/FI harmonised) |
| Products | FCR, aFRR, mFRR | FFR, **FCR-N**, FCR-D up/down, aFRR, mFRR |
| mFRR energy GCT | 25 min | 45 min |
| Platforms | PICASSO, MARI, IGCC | Nordic mFRR **EAM** (live 04.03.2025); MARI/PICASSO accession pending |
| Independent aggregator | not implemented; awaiting NC DR | framework being built by eSett |
| Congestion management | Redispatch 2.0 (cost-based, mandatory) | counter-trading / special regulation |

Two structural asymmetries worth internalising:

- **Germany is one price zone with four TSOs; Sweden is one TSO with four price zones.**
- **Germany settles nationally; Sweden settles Nordically** — a Swedish BRP's imbalance
  counterparty is a joint venture in Finland, not its own TSO.

Two Nordic specifics:
- **FCR-N** has no Continental equivalent — a continuously-acting, **symmetric** containment
  product for *normal operation* (49.9–50.1 Hz), reflecting the smaller, less inertial
  Nordic synchronous area.
- The Nordic system that the DTU course describes is the one that **abandoned** two-price
  pricing, for exactly the reasons in 5.8.2. After the mFRR EAM go-live, eSett's own market
  review reports **substantially more volatile 15-minute prices**, with the top and bottom
  5 % markedly more extreme; **Denmark responded on 02.06.2025 with a 25 MW tolerance band**,
  rounding small mFRR demands to zero so tiny activations stop setting the price.
