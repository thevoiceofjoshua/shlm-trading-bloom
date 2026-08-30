/**
 * SHLM Centre market data — typed sample dataset + session-window helpers.
 *
 * This module is the single typed source for every hub panel. When a live
 * data provider is wired in, only the fetchers below change — the UI stays.
 * All data is clearly labeled "sample" until a provider key is added.
 */

export const DATA_STATE = "sample" as const;
export const DATA_LABEL: Record<string, string> = {
  sample: "Sample data — live feed coming soon",
  live: "Live",
};

/* ----------------------------- Session windows ----------------------------- */

export type SessionKey = "ny-open" | "gold";

export interface SessionWindow {
  key: SessionKey;
  label: string;
  pairs: string[];
  /** Local time-of-day window in LA (Pacific) hours + minutes — the canonical definition */
  startH: number;
  startM: number;
  endH: number;
  endM: number;
  days: number[]; // 0 = Sun … 6 = Sat (market days for this window)
}

export const SESSIONS: SessionWindow[] = [
  {
    key: "ny-open",
    label: "NY Open — NASDAQ / US30",
    pairs: ["NASDAQ (US100)", "DOW (US30)"],
    startH: 6,
    startM: 30,
    endH: 9,
    endM: 0,
    days: [1, 2, 3, 4, 5],
  },
  {
    key: "gold",
    label: "Gold Session — XAU/USD",
    pairs: ["XAU/USD (Gold)"],
    startH: 17,
    startM: 0,
    endH: 19,
    endM: 15,
    days: [1, 2, 3, 4, 5],
  },
];

/* ------------------------------- Quotes ------------------------------------ */

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  dayHigh: number;
  dayLow: number;
}

export interface LevelQuote extends Quote {
  priorDayHigh: number;
  priorDayLow: number;
  premarketHigh: number;
  premarketLow: number;
}

export const INDEX_QUOTES: LevelQuote[] = [
  {
    symbol: "US100",
    name: "NASDAQ",
    price: 18_420.5,
    change: 142.8,
    changePct: 0.78,
    dayHigh: 18_510.0,
    dayLow: 18_280.0,
    priorDayHigh: 18_490.0,
    priorDayLow: 18_310.0,
    premarketHigh: 18_470.0,
    premarketLow: 18_290.0,
  },
  {
    symbol: "US30",
    name: "DOW JONES",
    price: 41_820.3,
    change: -85.2,
    changePct: -0.2,
    dayHigh: 41_980.0,
    dayLow: 41_710.0,
    priorDayHigh: 41_960.0,
    priorDayLow: 41_680.0,
    premarketHigh: 41_940.0,
    premarketLow: 41_700.0,
  },
];

export interface MagDriver extends Quote {
  /** Plain-English cause-and-effect line */
  note: string;
}

export const MAG_SEVEN: MagDriver[] = [
  { symbol: "AAPL", name: "Apple", price: 228.4, change: 1.85, changePct: 0.82, dayHigh: 229.1, dayLow: 226.3, note: "Lifting the index with steady demand." },
  { symbol: "MSFT", name: "Microsoft", price: 425.1, change: 2.4, changePct: 0.57, dayHigh: 426.8, dayLow: 422.5, note: "Adding a steady lift to the index." },
  { symbol: "NVDA", name: "NVIDIA", price: 138.7, change: -0.92, changePct: -0.66, dayHigh: 140.2, dayLow: 137.8, note: "The biggest weight on the index today." },
  { symbol: "AMZN", name: "Amazon", price: 201.3, change: 1.12, changePct: 0.56, dayHigh: 202.4, dayLow: 199.8, note: "Helping push the index higher." },
  { symbol: "GOOGL", name: "Alphabet", price: 178.9, change: 0.78, changePct: 0.44, dayHigh: 180.1, dayLow: 177.6, note: "Gently supporting the index." },
  { symbol: "META", name: "Meta", price: 595.2, change: 3.1, changePct: 0.52, dayHigh: 598.0, dayLow: 591.4, note: "Among the strongest tails for the index." },
  { symbol: "TSLA", name: "Tesla", price: 248.6, change: -1.35, changePct: -0.54, dayHigh: 251.2, dayLow: 246.8, note: "Dragging the index lower." },
];

export const NASDAQ_MACRO: MacroDriver[] = [
  {
    label: "10-Year Yield",
    value: "4.28%",
    direction: "up",
    read: "Rising yields pressure high-multiple tech names.",
    context:
      "Growth stocks like the Mag 7 are valued on future earnings. When the 10-year treasury yield climbs, those future cash flows are discounted more heavily, which can pull richly-valued tech shares lower.",
  },
  {
    label: "Semis / AI cycle",
    value: "Strong",
    direction: "up",
    read: "Chip demand is lifting NVDA and the index.",
    context:
      "When AI accelerator demand stays strong, NVIDIA and the broader semiconductor complex tend to lead the Nasdaq higher. That lifts the index because NVDA carries a heavy weight.",
  },
  {
    label: "USD (DXY)",
    value: "104.3",
    direction: "up",
    read: "A stronger dollar can weigh on multinational tech.",
    context:
      "Apple, Microsoft, and Amazon all make a large share of revenue overseas. A rising dollar makes their products pricier abroad, which can soften demand and pull the Nasdaq lower.",
  },
];

export interface DowDriver {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  /** Plain-English cause-and-effect line */
  note: string;
}

export const DOW_DRIVERS: DowDriver[] = [
  { symbol: "UNH", name: "UnitedHealth", price: 588.2, changePct: 0.45, note: "This stock is pulling the index up today." },
  { symbol: "GS", name: "Goldman Sachs", price: 512.8, changePct: 0.91, note: "This stock is driving the Dow higher." },
  { symbol: "MSFT", name: "Microsoft", price: 425.1, changePct: 0.57, note: "Adding a steady lift to the index." },
  { symbol: "HD", name: "Home Depot", price: 412.3, changePct: -0.32, note: "Slightly weighing the index down." },
  { symbol: "CAT", name: "Caterpillar", price: 398.6, changePct: 0.18, note: "Holding the index steady." },
  { symbol: "MCD", name: "McDonald's", price: 298.4, changePct: -0.12, note: "Barely moving the needle." },
  { symbol: "V", name: "Visa", price: 315.7, changePct: 0.34, note: "Gently supporting the index." },
  { symbol: "AMGN", name: "Amgen", price: 302.1, changePct: -0.41, note: "A small drag on the index." },
  { symbol: "CRM", name: "Salesforce", price: 328.5, changePct: 0.62, note: "Helping push the index up." },
  { symbol: "TRV", name: "Travelers", price: 218.9, changePct: 0.21, note: "A minor positive contribution." },
];

export interface MacroDriver {
  label: string;
  value: string;
  direction: "up" | "down" | "flat";
  /** Plain-English read */
  read: string;
  /** Expanded context (tap-to-expand) */
  context: string;
}

export const DOW_MACRO: MacroDriver[] = [
  {
    label: "10-Year Yield",
    value: "4.28%",
    direction: "up",
    read: "Rising rates often pressure the Dow.",
    context:
      "When the 10-year treasury yield climbs, borrowing gets more expensive for companies. That can slow earnings and weigh on Dow stocks, especially growth-leaning names.",
  },
  {
    label: "Oil (WTI)",
    value: "$78.40",
    direction: "down",
    read: "Falling oil can help Dow transport and consumer names.",
    context:
      "Cheaper oil lowers costs for airlines, shipping, and everyday consumers. That tends to help Dow components like Caterpillar and Home Depot.",
  },
  {
    label: "USD (DXY)",
    value: "104.3",
    direction: "up",
    read: "A stronger dollar can weigh on Dow exporters.",
    context:
      "When the dollar rises, US-made goods get pricier abroad. Companies like Caterpillar and Boeing that sell overseas can see weaker demand, which can pull the Dow lower.",
  },
];

export const GOLD_QUOTE: Quote = {
  symbol: "XAU/USD",
  name: "Gold",
  price: 2_518.4,
  change: 6.8,
  changePct: 0.27,
  dayHigh: 2_524.0,
  dayLow: 2_508.5,
};

export const GOLD_DRIVERS: MacroDriver[] = [
  {
    label: "DXY (Dollar Index)",
    value: "104.3",
    direction: "up",
    read: "A stronger dollar often pressures gold lower.",
    context:
      "Gold is priced in dollars, so a rising dollar makes gold more expensive for overseas buyers. That can cool demand and pull the price down.",
  },
  {
    label: "US 10-Year Yield",
    value: "4.28%",
    direction: "up",
    read: "Rising yields make non-yielding gold less attractive.",
    context:
      "Gold pays no interest, so when bond yields rise, investors can earn more from bonds and tend to rotate away from gold.",
  },
  {
    label: "Real Yields",
    value: "1.92%",
    direction: "flat",
    read: "Stable real yields leave gold range-bound.",
    context:
      "Real yields (nominal yields minus inflation) reflect the true cost of holding gold. When they hold steady, gold tends to trade in a range.",
  },
];

/* --------------------------- Economic calendar ----------------------------- */

export interface EconEvent {
  time: string; // ISO-ish "HH:MM" in LA time
  date: string; // YYYY-MM-DD
  title: string;
  impact: "high" | "medium";
  detail?: string;
}

export const ECON_EVENTS: EconEvent[] = [
  { time: "05:30", date: todayISO(0), title: "CPI (MoM)", impact: "high", detail: "Consumer Price Index month-over-month." },
  { time: "05:30", date: todayISO(0), title: "Core CPI (YoY)", impact: "high", detail: "Core inflation excluding food & energy." },
  { time: "08:30", date: todayISO(0), title: "Jobless Claims", impact: "medium", detail: "Weekly initial unemployment claims." },
  { time: "10:00", date: todayISO(1), title: "FOMC Member Speech", impact: "medium", detail: "Scheduled remarks from a Fed governor." },
  { time: "05:30", date: todayISO(2), title: "PPI (MoM)", impact: "high", detail: "Producer Price Index month-over-month." },
  { time: "08:30", date: todayISO(3), title: "Retail Sales", impact: "medium", detail: "Monthly retail sales report." },
  { time: "05:30", date: todayISO(4), title: "NFP", impact: "high", detail: "Nonfarm payrolls — the monthly jobs report." },
];

/* ----------------------------- Helpers ------------------------------------ */

function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function magSevenBreadth(): { green: number; total: number; label: string } {
  const green = MAG_SEVEN.filter((s) => s.changePct >= 0).length;
  const total = MAG_SEVEN.length;
  const label =
    green > total / 2
      ? `${green} of ${total} green — index tailwind`
      : `${total - green} of ${total} red — index headwind`;
  return { green, total, label };
}

export function dowMovers(): { top: string; label: string } {
  const sorted = [...DOW_DRIVERS].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  const top = sorted[0];
  const direction = top.changePct >= 0 ? "higher" : "lower";
  return {
    top: top.symbol,
    label: `${top.name} is driving the Dow ${direction}`,
  };
}

export function nasdaqMovers(): { top: string; label: string } {
  const sorted = [...MAG_SEVEN].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  const top = sorted[0];
  const direction = top.changePct >= 0 ? "higher" : "lower";
  return {
    top: top.symbol,
    label: `${top.name} is driving the index ${direction}`,
  };
}
