# Morning high-impact news spotlight

Add a prominent at-a-glance news block directly above the existing Economic Calendar on the SHLM Centre page. The full calendar and its expandable rows remain unchanged below it.

## What members will see

- A new **Morning high-impact news** section between the Gold Desk and the full Economic Calendar.
- Only today's high-impact releases scheduled before 12:00 PM Pacific time, matching the Centre's existing market-session reference.
- Each highlighted release shows its title and the viewer's local release time in substantially larger, bolder type than the regular calendar rows.
- Currency and HIGH labels remain visible for quick scanning, with forecast and previous figures shown when available.
- If no high-impact morning releases are scheduled, the section shows a restrained “No high-impact morning releases” status rather than disappearing.
- The section is identical for members, SHLM MOD, and Founder views because all roles use the same Centre payload.

## Technical details

- Add a focused `MorningNewsSpotlight` presentation component alongside the existing calendar component.
- Filter the existing `payload.econEvents` by today's Los Angeles date, `impact === "high"`, and a release time earlier than `12:00` Pacific; do not add another data request.
- Reuse the existing timezone conversion so displayed times stay local to the viewer.
- Insert the spotlight immediately before `<EconomicCalendar />` in `src/routes/centre.tsx`.
- Keep the existing full calendar, heads-up notice, expansion behavior, and data-source labels unchanged.
- Verify desktop and phone layouts, all three role-equivalent views, and the current build.
