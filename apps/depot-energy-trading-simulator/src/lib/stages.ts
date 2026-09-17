/**
 * The narrated timeline.
 *
 * Every stage answers the same four questions in the same order, so the shape
 * of the page never changes underneath you:
 *
 *   1. WHEN does this happen?
 *   2. WHAT happens, in one sentence?
 *   3. WHO says what to WHOM?   <- the sequence diagram
 *   4. WHY does it work this way?
 *
 * The message text is deliberately written as speech. Where a number appears it
 * is the live number from the current simulation, so the script can never drift
 * away from the result shown underneath it.
 */

import type { FlowStep } from "@/components/Flow";
import type { ActorId } from "@/lib/actors";
import type { Phase, SimulationResult } from "@/lib/types";

export interface StageFacts {
  dayAheadMwh: number;
  dayAheadAvgPrice: number;
  intradayNetMwh: number;
  /** Gross volume actually traded intraday - buys PLUS sells, not netted. */
  intradayGrossMwh: number;
  grossImbalanceMwh: number;
  absImbalanceMwh: number;
  deliveredMwh: number;
  peakKw: number;
  brpName: string;
  hasIntradayAccess: boolean;
}

export function factsFrom(result: SimulationResult, brpName: string, hasIntradayAccess: boolean): StageFacts {
  const t = result.totals;
  const daCost = result.perQh.reduce((a, p) => a + p.dayAheadMw * 0.25 * p.dayAhead, 0);
  const daMwh = result.perQh.reduce((a, p) => a + p.dayAheadMw * 0.25, 0);
  return {
    dayAheadMwh: t.dayAheadMwh,
    dayAheadAvgPrice: Math.abs(daMwh) > 1e-9 ? daCost / daMwh : 0,
    intradayNetMwh: t.intradayMwh,
    // Buying 1 MWh back after selling 1 MWh is 2 MWh of trading, not 0. The net
    // figure hides exactly the activity this stage is trying to show.
    intradayGrossMwh: result.perQh.reduce((a, q) => a + Math.abs(q.intradayMw) * 0.25, 0),
    grossImbalanceMwh: t.grossImbalanceMwh,
    absImbalanceMwh: t.absImbalanceMwh,
    deliveredMwh: t.deliveredMwh,
    peakKw: t.peakKw,
    brpName,
    hasIntradayAccess,
  };
}

export interface Stage {
  id: string;
  /** Which of the original detail panels, if any, belongs under this stage. */
  detailPhase?: Phase;
  n: number;
  clock: string;
  title: string;
  /** One sentence. If you read nothing else on the card, read this. */
  oneLiner: string;
  /** The everyday-language version of the same idea. */
  plain: string;
  actors: ActorId[];
  steps: FlowStep[];
  /** The thing people get wrong about this stage. */
  watchOut?: { title: string; body: string };
  /** Two or three short "so what" bullets. */
  takeaways: string[];
}

const mwh = (v: number) => `${Math.abs(v).toFixed(2)} MWh`;
const eur = (v: number) => `€${v.toFixed(2)}`;

export function buildStages(f: StageFacts): Stage[] {
  return [
    // ---------------------------------------------------------------- setup
    {
      id: "setup",
      detailPhase: "setup",
      n: 0,
      clock: "before anything",
      title: "Your depot, and who you hired",
      oneLiner:
        "Ten identical trucks leave together, come back together, and have to be full again by morning.",
      plain:
        "Everything in this simulation is one truck, copied ten times. Same battery, same charger, same shift, same starting charge. So whenever a number looks odd, it can never be because one truck was different — it is always the market or the plan.",
      actors: ["you", "brp"],
      steps: [
        {
          from: "you",
          to: "brp",
          msg: "“We have ten electric trucks. We want to buy power for them. Will you be our BRP?”",
          detail:
            "You cannot buy electricity on the exchange yourself. You need someone who already has a balance group with the TSO.",
        },
        {
          from: "brp",
          to: "you",
          msg: "“Yes. Here is our price list: a monthly fee, a fee per MWh, and here is what we do if you miss your plan.”",
          detail: "That last part is the expensive part, and it is the reason the three BRP offers differ.",
        },
      ],
      takeaways: [
        "You are a customer of the BRP. You are not a market participant yourself.",
        "The trucks are identical on purpose — it removes one whole source of confusion.",
      ],
    },

    // ------------------------------------------------------------ day-ahead
    {
      id: "auction",
      detailPhase: "dayAhead",
      n: 1,
      clock: "D‑1 · before 12:00",
      title: "The day-ahead auction — buying tomorrow's power",
      oneLiner:
        "You say how much power you want tomorrow and the most you will pay. At 12:00 everyone's bids are matched at once and a single price comes out.",
      plain:
        "This is a sealed auction, like bidding for a flat. You post the highest you would pay, you do not see anyone else's bid, and you find out the price only after it closes. If the price ends up below your limit, you buy — and you pay the closing price, not the number you wrote down.",
      actors: ["you", "brp", "exch"],
      steps: [
        {
          from: "you",
          to: "brp",
          at: "~09:00",
          msg: `“Tomorrow the trucks need about ${mwh(f.dayAheadMwh)}, mostly overnight. Buy it in the cheap hours.”`,
          detail: "In this simulator that instruction is the plan mode you picked in Setup.",
        },
        {
          from: "brp",
          to: "exch",
          at: "before 12:00",
          msg: "“Bid: buy this much in this quarter hour, at up to this price.” — one bid per quarter hour, 96 of them.",
          detail: "The BRP submits under its own name. The exchange never learns your depot exists.",
        },
        {
          from: "exch",
          to: "exch",
          at: "12:00",
          msg: "The auction closes. Every bid and offer in the coupled European market is matched in one calculation.",
          detail:
            "One price per quarter hour, and everyone who bought pays that same price — whether they bid €70 or €2 000.",
        },
        {
          from: "exch",
          to: "brp",
          at: "early afternoon",
          msg: `“Cleared. You bought ${mwh(f.dayAheadMwh)}, at ${eur(f.dayAheadAvgPrice)}/MWh on average across the day.”`,
        },
        {
          from: "brp",
          to: "you",
          msg: "“Bought. Here is your power, quarter hour by quarter hour, and what it cost.”",
        },
      ],
      watchOut: {
        title: "Why you bid without knowing the price",
        body: "Because the price does not exist until everybody has bid. It is not hidden from you — it has not been calculated yet. That is the whole point of an auction: all the bids arrive blind, then one price is worked out that clears the most volume. Your bid is not a guess at the price. It is a statement of the most you are prepared to pay.",
      },
      takeaways: [
        "You commit to a volume roughly 12 to 36 hours before you use it.",
        "One price per quarter hour, the same for everyone who bought.",
        "This is the cheapest power you will buy all day. Everything after this is a correction.",
      ],
    },

    // ----------------------------------------------------------- nomination
    {
      id: "nomination",
      n: 2,
      clock: "D‑1 · 14:30",
      title: "Nomination — the promise to the TSO",
      oneLiner:
        "Your BRP sends the TSO 96 numbers: exactly how much your balance group will draw in each quarter hour tomorrow.",
      plain:
        "Up to now you had a purchase. From 14:30 you have a promise. This is the single most important step in the whole day, and it is the one everybody skips — because from this moment, everything you do is measured against these 96 numbers.",
      actors: ["brp", "exch", "tso"],
      steps: [
        {
          from: "brp",
          to: "tso",
          at: "by 14:30",
          msg: "“Here is my schedule for tomorrow: 96 quarter-hourly figures. My balance group will draw exactly this much.”",
          detail: "It must balance: every MWh coming in has to be matched by an MWh going out.",
        },
        {
          from: "exch",
          to: "tso",
          msg: "“Confirming the same trade from our side — this volume moves from our balance group to theirs.”",
          detail: "Both sides tell the TSO the same story. If they disagree, the exchange's version wins.",
        },
        {
          from: "tso",
          to: "brp",
          msg: "“Received. It balances. Accepted.”",
        },
      ],
      watchOut: {
        title: "A trade and a nomination are not the same thing",
        body: "A trade is a deal with another company — if it goes wrong, you argue with them. A nomination is a promise to the system operator, and the system operator does not argue: it measures what you actually did, compares it to what you promised, and bills the difference. That bill is the imbalance settlement in stage 5.",
      },
      takeaways: [
        "This is the moment your trade becomes a physical commitment.",
        "Your BRP does this for you. It is the core of what you are paying them for.",
        "Your BRP's own cut-off is earlier than 14:30 — often 13:00. Ask.",
      ],
    },

    // -------------------------------------------------------------- intraday
    {
      id: "intraday",
      detailPhase: "intraday",
      n: 3,
      clock: "D‑1 15:00 → 5 min before delivery",
      title: "Intraday — fixing the plan as reality changes",
      oneLiner:
        "The promise was made yesterday. Today the trucks are running late. Intraday is where you buy and sell to move your plan without breaking the promise.",
      plain:
        "Think of the day-ahead auction as booking a table for ten. Intraday is phoning the restaurant to say two more are coming and you will be half an hour late. You are not cancelling — you are adjusting. And unlike the auction, you can do it any time, right up to five minutes before.",
      actors: ["you", "brp", "exch", "tso"],
      steps: [
        {
          from: "you",
          to: "brp",
          msg: "“The trucks are running late. We will not need the early-evening charge — push it to later tonight.”",
          detail: "In this simulator, that is the delay revealed on the intraday step.",
        },
        {
          from: "brp",
          to: "exch",
          msg: f.hasIntradayAccess
            ? `“Sell the power we no longer need, buy it back when we do.” — ${mwh(f.intradayGrossMwh)} changes hands this day.`
            : "— this BRP offers no intraday access, so nothing can be adjusted.",
          detail: f.hasIntradayAccess
            ? "No auction here. It is a live order book: you either accept somebody's standing price, or post your own and wait."
            : "Whatever no longer matches the plan will simply become imbalance in stage 5.",
        },
        {
          from: "exch",
          to: "brp",
          msg: f.hasIntradayAccess
            ? "“Matched.” — sold into one price, bought back at another."
            : "— nothing traded.",
          detail: f.hasIntradayAccess
            ? "You sell at the lower price and buy at the higher one. That gap is the spread, and it is the real cost of changing your mind."
            : undefined,
        },
        {
          from: "brp",
          to: "tso",
          msg: "“Updated schedule.” — the promise from 14:30 is rewritten to match.",
          detail: "This is why intraday works: the promise moves with you, as long as you trade before the gate closes.",
        },
      ],
      watchOut: {
        title: "Three ways intraday is not like the day-ahead auction",
        body: "One: it is continuous, not a single auction — there is no 12:00 moment, you trade whenever someone will trade with you. Two: there is no single price. There is a price to buy and a lower price to sell, and you always cross that gap. Three: it closes 5 minutes before delivery inside Germany, and 30 minutes before across the border. After that, nothing can be fixed by trading — only by the TSO, and it charges you for it.",
      },
      takeaways: [
        "Intraday exists because the day-ahead promise was made up to 36 hours early.",
        "Every adjustment costs you the spread. Doing nothing costs you the imbalance price.",
        "Which of those is cheaper is genuinely the question this simulator answers.",
      ],
    },

    // -------------------------------------------------------------- delivery
    {
      id: "delivery",
      detailPhase: "delivery",
      n: 4,
      clock: "on the day, in real time",
      title: "Delivery — the trucks actually charge",
      oneLiner:
        "No more trading. Cables go in, electrons move, and a meter records what you really drew every 15 minutes.",
      plain:
        "This is the part everyone pictures when they think about charging a truck, and it is the part where you have the least freedom. Your only job now is to hit the number you promised. Everything clever already happened yesterday.",
      actors: ["you", "tso"],
      steps: [
        {
          from: "you",
          to: "you",
          msg: "The trucks plug in and charge. Your controller follows the plan as closely as the trucks allow.",
          detail: `Across this day you actually draw ${mwh(f.deliveredMwh)}, peaking at ${(f.peakKw / 1000).toFixed(2)} MW.`,
          kind: "power",
        },
        {
          from: "you",
          to: "tso",
          msg: "Your meter reports every quarter hour — automatically, through the metering operator.",
          detail: "You do not send this. It happens to you.",
        },
        {
          from: "tso",
          to: "tso",
          msg: "Meanwhile the TSO is fixing the whole country's error in real time, using reserves it bought in advance.",
          detail:
            "It has no idea your depot exists. It sees one national number and corrects that.",
        },
      ],
      watchOut: {
        title: "Nobody calls you",
        body: "There is no phone call, no warning and no permission step. If your trucks draw more than promised, nothing stops you — the power flows, the meter records it, and you find out what it cost weeks later. That delay is exactly why the plan matters.",
      },
      takeaways: [
        "You cannot trade your way out of a problem during delivery.",
        "The gap between the plan and the meter is the only thing that carries into the bill.",
      ],
    },

    // ------------------------------------------------------------ settlement
    {
      id: "settlement",
      detailPhase: "settlement",
      n: 5,
      clock: "after the fact · monthly",
      title: "Settlement — who pays whom, and why",
      oneLiner:
        "The TSO compares what your balance group promised with what it drew, prices the gap, and bills your BRP. Your BRP then deals with you.",
      plain:
        "This is the only stage where money actually moves, and it moves in a chain: TSO to BRP, BRP to you. You never get a bill from the TSO, because as far as the TSO is concerned, you do not exist — only your BRP's balance group does.",
      actors: ["you", "brp", "tso"],
      steps: [
        {
          from: "tso",
          to: "tso",
          msg: "Works out one imbalance price for the whole country, for each quarter hour — the reBAP.",
          detail: "Same price for everyone. You have no say in it and cannot shop around.",
        },
        {
          from: "tso",
          to: "brp",
          msg: `“You were off by ${mwh(f.absImbalanceMwh)} across the day, quarter hour by quarter hour. Here is the bill.”`,
          kind: "money",
          detail: `Short means you drew more than promised, long means less. Add the whole day up with the signs and it is only ${mwh(f.grossImbalanceMwh)} ${f.grossImbalanceMwh >= 0 ? "short" : "long"} — but that is not what you are charged on.`,
        },
        {
          from: "brp",
          to: "you",
          msg: `“Here is your share.” — how much of that reaches you depends entirely on which offer you signed with ${f.brpName}.`,
          kind: "money",
          detail:
            "Pass-through sends you all of it. Pooled nets you against other customers first. Full-service absorbs it and charges a premium every month instead.",
        },
      ],
      watchOut: {
        title: "The imbalance price can pay you",
        body: "If the country is short and you happened to draw less than promised, you helped — and you get paid for it. The sign flips both ways. This is not a penalty system; it is a price, and sometimes it is on your side.",
      },
      takeaways: [
        "Money flows TSO → BRP → you. Never TSO → you.",
        "Every quarter hour is priced on its own. Being short at 18:00 and long at 19:00 does not cancel out — you pay for both.",
        "The imbalance price is the same for everyone. Your exposure to it is what you negotiated.",
      ],
    },
  ];
}
