# Connect every news release to the 6:30 NY open

## Current behavior

The section lives in `MorningNewsImpact` inside `src/components/hub/EconomicCalendar.tsx` and uses today's high-impact releases before noon Pacific.

- `event.time < "06:30"` is labeled **Before the 6:30 open**.
- Every event at exactly 6:30 or later is labeled **After the 6:30 open**.
- If any event is before 6:30, one shared sentence says its reaction is already priced into the first candles.
- If none is before 6:30, the shared sentence says to expect a “normal open” and treats the later release as when the “real move” begins.
- Each release card explains the number and its likely directional effect, but does not explain that release's own connection to the 6:30 opening move.

That final two-point behavior is the disconnect: a 6:30 or later release can still create, accelerate, interrupt, or reverse the opening move.

## Scoped change

Change only the presentation logic and wording inside `MorningNewsImpact`. Keep its existing release filter, live data, theme explanations, order, styling, and all other Centre sections unchanged.

### Shared opening summary

Replace the current before/after conditional sentence with one stable message:

> Every high-impact release below can shape the 6:30 AM opening move. A release before the open can set the initial direction and volatility; one at or after the open can start, accelerate, or reverse that move.

This removes the misleading “normal open” / “real move later” distinction.

### Per-release opening context

Keep the visible timing tag, but classify exactly 6:30 separately so the relationship is explicit:

- **Before the 6:30 open** (`time < 06:30`)
  - Add: “This lands before the open. Its first reaction can set the direction and volatility traders carry into the 6:30 opening candles; watch whether that move continues or reverses at the open.”
- **At the 6:30 open** (`time === 06:30`)
  - Add: “This lands as the open begins and can directly trigger the first sharp move, widen volatility, or reverse the initial candle.”
- **After the 6:30 open** (`time > 06:30`)
  - Add: “This lands after the open but still belongs to the opening sequence. Price may position for it beforehand, then accelerate or reverse when the number hits.”

Place this new sentence in each existing release card under its current “Most likely” explanation, so every listed release connects back to the 6:30 open rather than relying on one generic label.

## Verification

- Check before-6:30, exactly-6:30, and after-6:30 examples render the intended label and explanation.
- Confirm existing release-specific “what it is” and “Most likely” text is unchanged.
- Confirm calendar fetching, the spotlight, full calendar, market boards, journal, and access rules are untouched.
- Confirm the section remains readable on desktop and phone and the project remains error-free.
