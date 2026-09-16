# 07 — Sources

Everything cited in docs 01–06, grouped, with a note on what each one is good for.
Retrieved September 2026. Where a document is versioned, the version actually read is named.

---

## A. Primary — German contract and regulator documents

| # | Document | Why it matters | Link |
|---|---|---|---|
| A1 | **Standard-Bilanzkreisvertrag Strom**, approved by BNetzA **BK6-18-061** of 12.04.2019, in force 01.08.2020 — **superseded by BK6-23-102** (23.11.2023, amended 18.01.2024, applicable **01.10.2024**) | The contract a BRP actually signs. Source of every *Ziffer* and *Anlage* quoted in doc 03; clause numbers must be re-checked against BK6-23-102. | [bundesnetzagentur.de (PDF)](https://www.bundesnetzagentur.de/DE/Beschlusskammern/BK06/BK6_83_Zug_Mess/838_bilanzkreisvertrag/BK6-18-061_Standardbilanzkreisvertrag_01_08_2020.pdf?__blob=publicationFile&v=5) |
| A2 | **Calculation of the uniform imbalance price (reBAP) across Germany's 4 LFC areas — Model description**, valid from **01.11.2023** (English, non-binding translation) | The complete reBAP specification. Source of every formula in doc 05. | [netztransparenz.de (PDF)](https://www.netztransparenz.de/xspproxy/api/staticfiles/ntp-relaunch/dokumente/regelenergie/ausgleichsenergiepreis/model_description_of_the_rebap_calculation_since_01.11.2023.pdf) |
| A2-de | Same document, German original | | [netztransparenz.de (PDF)](https://www.netztransparenz.de/xspproxy/api/staticfiles/ntp-relaunch/dokumente/regelenergie/ausgleichsenergiepreis/modellbeschreibung_der_rebap-berechnung_ab__01.11.2023.pdf) |
| A3 | **Description of concepts for balancing and the balancing markets in Germany** (German TSOs, Public, Jan 2025) | The product table, prequalification components, dimensioning, *Freisetzung* abolition rationale. Source for doc 04. | [regelleistung.net (PDF)](https://www.regelleistung.net/xspproxy/api/StaticFiles/Regelleistung/04_Marktinformationen/Modalit%C3%A4ten/Berichte%20EB%20GL_EN/Description%20of%20concepts%20for%20balancing%20and%20the%20balancing%20markets%20in%20Germany.pdf) |
| A4 | **reBAP landing page** — published prices, current and historical, per quarter hour | Where to get the real numbers. | [netztransparenz.de](https://www.netztransparenz.de/de-de/Regelenergie/Ausgleichsenergiepreis/reBAP) |
| A5 | Earlier reBAP model description (valid 01.02.2020) — the pre-ISHM AEP1…AEP4 structure | Useful for understanding what changed in 2023 and why. | [transnetbw.de (PDF)](https://www.transnetbw.de/_Resources/Persistent/5/3/0/3/53030f09c1e9439b63473ebcc31a3e5f54bc3834/modellbeschreibung.pdf) |
| A6 | **Amprion — Ausgleichsenergieabrechnung gegenüber Bilanzkreisverantwortlichen** | A TSO's own plain-language description of BRP settlement. | [amprion.net](https://www.amprion.net/Strommarkt/Bilanzkreise/Ausgleichsenergiepreis/) |
| A7 | **regelleistung.net** — tendering platform: tenders, results, prequalified provider lists, model contracts, PQ-Bedingungen (v. 05.07.2024), wind and EV/mobile-installation prequalification guides | The operational home of the German balancing market. | [regelleistung.net](https://www.regelleistung.net/en-us/) |
| A8 | **PQ portal** | Where prequalification applications are filed. | [pq-portal.energy](https://www.pq-portal.energy/) |

### BNetzA decisions referenced

| Decision | Date | Subject |
|---|---|---|
| **BK6-18-061** | 12.04.2019 | Standard balance group contract (in force 01.08.2020) |
| **BK6-23-102** | 23.11.2023, amended 18.01.2024 | **Current** standard balance group contract, applicable 01.10.2024 |
| **BK6-07-002 (MaBiS)** | — | Market rules for balance group settlement; invoicing deadlines |
| **BK6-12-024** | 25.10.2012 | Original single-price imbalance model |
| **BK6-19-217** | 11.12.2019 | Imbalance price development |
| **BK6-19-552** | 11.05.2020 | Imbalance price development |
| **BK6-20-345** | 11.05.2021 | Scarcity component tightening |
| **BK6-21-192** | 28.04.2022 | **ISHM implementation** — the basis of the current model |
| **BK6-22-162** | 31.10.2022 | Abolition of *Freisetzung* on the RAM (implemented 08.12.2022) |
| **BK6-06-013** | 29.06.2011 | Predecessor balance group contract rules |
| **BK6-19-069** | — | Additional FCR properties |

---

## B. Primary — EU law

| Instrument | Relevance |
|---|---|
| **Regulation (EU) 2017/2195** — *Electricity Balancing Guideline (EB GL)* | Art. 17–18 BRP duties; **Art. 44–55 imbalance settlement**; Art. 55(4)/(5) price bounds; Art. 16(5) balancing energy bid collection |
| **Regulation (EU) 2017/1485** — *System Operation Guideline (SO GL)* | Operational security; prequalification obligation and its repetition |
| **Regulation (EU) 2019/943** — internal electricity market regulation | Market design principles |
| **Directive (EU) 2019/944** | Art. 2(48) ancillary services; Art. 5 supply; **Art. 17 independent aggregation** |
| **ACER Decision 18/2020** | Imbalance settlement harmonisation methodology (ISHM) |
| **ACER — ISH implementation monitoring**, updated August 2024 | Which TSOs are single- vs dual-price |
| **ACER balancing energy pricing methodology** | The 15 000 €/MWh bid price limit and its adjustment mechanism |
| **Network Code on Demand Response (NC DR)** | Submitted by ACER to the Commission **07.03.2025**; consultation to Sept 2025; responses published Jan 2026. **Not adopted as of early 2026 — verify current status.** |

## C. Primary — German statute and ordinance

| Instrument | Sections used |
|---|---|
| **EnWG** (Energiewirtschaftsgesetz) | §§ 12, 13, **13a** (redispatch), **14a** (controllable consumption devices), 20, 22, 23b, 41a (dynamic tariffs) |
| **StromNZV** (Stromnetzzugangsverordnung) | **§ 4** balance groups, **§ 5** schedules (incl. § 5(3) retroactive changes, § 5(4) plant outage), § 8 balancing energy, § 10 loss energy, § 12 difference energy, **§ 26** balance group contract & data duties |
| **KapResV** (Kapazitätsreserveverordnung) | **§ 26** activation, **§ 32** the asymmetric imbalance price case |
| **AbLaV** | Interruptible loads |
| **MsbG** | Metering point operation |
| [StromNZV full text](https://www.gesetze-im-internet.de/stromnzv/StromNZV.pdf) · [StromNZV § 4 (buzer)](https://www.buzer.de/gesetz/4919/a68624.htm) · [StromNZV § 26 (JuraForum)](https://www.juraforum.de/gesetze/stromnzv/26-bilanzkreisvertrag) |

---

## D. Data sources (for replacing the simulator's synthetic scenarios)

| Source | What it gives | Link |
|---|---|---|
| **ENTSO-E Transparency Platform** | Day-ahead prices, activated balancing energy, imbalance prices, interconnector scheduled-vs-measured flows (the `Difference` term in doc 05 §5.2) | [transparency.entsoe.eu](https://transparency.entsoe.eu/) |
| **SMARD** (BNetzA) | German market data, friendlier API, good for day-ahead and generation | [smard.de](https://www.smard.de/) |
| **netztransparenz.de** | reBAP per quarter hour, NRV-Saldo, module effects | [netztransparenz.de](https://www.netztransparenz.de/) |
| **regelleistung.net** | Tender results, activated volumes, prequalified capacities | [regelleistung.net](https://www.regelleistung.net/) |
| **EPEX SPOT** | Day-ahead and intraday market data and fee schedules | [epexspot.com](https://www.epexspot.com/) |

---

## E. Nordic / Swedish comparison (doc 05 §5.9)

| Source | Subject |
|---|---|
| **eSett Oy** — Nordic Imbalance Settlement Handbook; 15-minute settlement; independent aggregator project; market reviews | Nordic settlement mechanics and the post-EAM volatility data |
| **Nordic Balancing Model** — single price project, mFRR EAM, 15-min roadmap | The 01.11.2021 single-price/single-position transition and the 04.03.2025 EAM go-live |
| **Svenska kraftnät** — ancillary service procurement and pricing; *Balancing market outlook 2030* | Swedish product definitions, FCR-N, FFR, procurement volumes |
| **ENTSO-E** — Nordic aFRR capacity markets | [entsoe.eu](https://www.entsoe.eu/network_codes/eb/nordic-afrr-capacity-markets/) |

---

## F. Teaching material

| Source | Note |
|---|---|
| **DTU 46755 — Renewables in Electricity Markets**, Lecture 5b *Balancing markets*, J. Kazempour | The course this work started from. Excellent on the economics; deliberately simplified on institutions — see doc 01 §1.7 for the specific gaps. |

---

## G. How to verify a claim in these docs

1. **Contract clauses (Ziffer / Anlage)** → A1, search the German text. Clause numbering is
   stable across the 2019/2020 versions but check the version you have.
2. **reBAP formulas** → A2. Section numbers in doc 05 map 1:1 onto A2's chapters.
3. **Product parameters (gate closures, min bid, remuneration)** → A3, Table 2.
4. **Prequalification** → A3 §7.1 and the PQ-Bedingungen on A7.
5. **Prices and volumes** → D.
6. **Anything about aggregation status in Germany** → this is moving. Check the NC DR
   status before citing it.

**Caution on dates.** Several items in these docs sit on a moving regulatory boundary: the
NC DR adoption, the balancing bid price cap adjustment mechanism, 15-minute MTU knock-ons,
and Nordic MARI/PICASSO accession. Re-verify anything date-sensitive before it goes into a
thesis.
