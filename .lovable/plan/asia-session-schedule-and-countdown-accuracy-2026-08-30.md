# Asia Session schedule and countdown accuracy

Make the Asia Session follow the real market week and keep its countdown always pointing at the next real 5:00pm–7:30pm PST window.

## What changes

1. Asia Session days become Sunday through Thursday (evenings), instead of Monday through Friday.
   - Sunday 5:00pm–7:30pm PST is a live Asia window (market week opens Sunday 3:00pm PST).
   - There is no Friday evening Asia window, since the market week closes Friday 2:00pm PST.

2. Countdown roll-over
   - Each day at 7:30pm PST, the Asia chip stops showing "Live now" and the countdown rolls to the next day's 5:00pm window.
   - After Thursday's window ends at 7:30pm PST, the countdown rolls to Sunday 5:00pm — displayed as a days/hours/minutes countdown.

3. Countdown stays visible while the market week is closed (Friday afternoon through Sunday 3:00pm), so a member always sees time-to-next-open for both NY Open and Asia rather than a bare "Closed".

All displayed times and countdowns remain in the viewer's own local time zone; the schedule itself stays anchored to Pacific.

## Technical notes

- `src/lib/market-data.ts`: change the `gold` (Asia Session) window's `days` from `[1,2,3,4,5]` to `[0,1,2,3,4]`.
- `src/lib/hub-session.ts`: in `sessionStatuses`, allow the `upcoming` countdown branch when the market week is closed (drop the `weekOpen` gate for upcoming; keep it for `open`), so weekend states show a countdown instead of "Closed". `minutesUntilOpen` already scans the next 7 days and returns the first future start, so Thursday-night → Sunday resolves without further changes.
- No changes to the journal session tabs, labels, or any market data content.

## Verification

- Sunday 6:00pm PST: Asia shows Live now.
- Thursday 8:00pm PST: Asia shows a countdown to Sunday 5:00pm.
- Friday evening / Saturday: both sessions show countdowns to their next real opens.
