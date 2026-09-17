/**
 * The four parties in this simulation, and the one colour each of them keeps
 * everywhere in the app — in the flow diagrams, in the cash-flow diagram and in
 * the setup panel. If you only remember one thing from the colours:
 *
 *   ORANGE is you. BLUE acts on your behalf. GREEN is the marketplace.
 *   GREY is the referee, and you never talk to it directly.
 */

export type ActorId = "you" | "brp" | "exch" | "tso";

export interface Actor {
  id: ActorId;
  label: string;
  sub: string;
  /** One line: what this party is actually for. */
  does: string;
  color: string;
}

export const ACTORS: Record<ActorId, Actor> = {
  you: {
    id: "you",
    label: "You",
    sub: "the depot owner",
    does: "You own the trucks and decide when they charge. You never touch the market yourself.",
    color: "var(--series-2)",
  },
  brp: {
    id: "brp",
    label: "Your BRP",
    sub: "balance responsible party",
    does: "Your only door to the market. They buy and sell for you, and they promise your schedule to the TSO.",
    color: "var(--series-1)",
  },
  exch: {
    id: "exch",
    label: "Power exchange",
    sub: "EPEX SPOT",
    does: "The marketplace where electricity is actually bought and sold. It matches buyers with sellers.",
    color: "var(--series-3)",
  },
  tso: {
    id: "tso",
    label: "The TSO",
    sub: "system operator",
    does: "The referee. It keeps the whole country in balance and bills anyone who breaks their promise.",
    color: "var(--text-secondary)",
  },
};

export const ACTOR_ORDER: ActorId[] = ["you", "brp", "exch", "tso"];
