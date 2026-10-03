# SHLM Centre Layout and Polish Plan

## Audit findings

### Current order
The signed-in Centre currently renders: notification banner → page heading → Market Brief → Session Bar → Market Conditions → market price/map cards → Liquidity Radar + Market Drivers → morning news spotlight → morning news explanations → Economic Calendar → NY Opening Range → Market Environment → Trade Readiness → Notification Center.

### Repeated information found
1. **Market Environment** repeats the same state, volatility, driver alignment, liquidity, and structure readings already shown in Market Conditions, Market Drivers, Liquidity Radar, and the market cards. It adds a comparison layout but no new underlying information.
2. **Morning news** renders the same high-impact releases once in the spotlight and again in a separate explanation section. The explanation section also repeats the same generic open-timing paragraph on every event.
3. **Market Drivers** repeats each macro driver's interpretation in both its individual tile and a long combined paragraph; Gold then summarizes those same drivers again in its score.
4. **Session status** appears in the Session Bar and again as a row in the Market Brief immediately below it.

The following are related but should remain because they answer different questions:
- **Market Brief vs detail sections:** intentional 30-second summary followed by supporting detail.
- **Market Map vs Liquidity Radar:** fixed session reference levels vs nearest open liquidity ranked by side and distance.
- **Morning spotlight vs full calendar:** today's curated high-impact preparation vs the complete chronological release list.

## Page order

Use this top-to-bottom order after the existing sticky navigation:

1. Page heading and member controls
2. Weekly Behavior notification banner, when a new alert exists
3. Session Bar — first market-information block
4. SHLM Market Brief — immediately below the Session Bar
5. Market Conditions
6. Existing market price cards with their Market Map strips
7. Liquidity Radar
8. Market Drivers
9. NY Opening Range
10. Trade Readiness
11. Notification Center
12. Morning high-impact news spotlight with integrated explanations
13. Full Economic Calendar — final page section, with nothing below it

The alert stays above the Session Bar because it is a transient account notification, not a market-information section. The Market Environment comparison is removed as duplicated content rather than moved.

## Liquidity Radar mobile fix

- Give “Liquidity Radar” a dedicated full-width header row with wrapping allowed and no truncation.
- Put the NAS100 / US30 / Gold selector on its own full-width row underneath the title.
- Use equal-width selector options on narrow screens so they remain stable and readable.
- Keep upside/downside liquidity content below the selector; stack it vertically on phones and retain the two-column desktop view.
- Preserve all current level values, distance labels, swept treatment, and delayed-data note.

## Deduplication changes

- Remove the standalone Market Environment comparison because every value is already presented in a more useful source section.
- Remove the Session row from Market Brief because the Session Bar directly above already owns that information.
- Remove the combined macro-driver prose that restates every driver tile; retain the individual driver reads and the single driver score.
- Merge the morning spotlight and morning explanation area into one section. Each release appears once before the calendar.
- Keep distinct event-specific “what it measures” and “most likely response” commentary.
- Show each generic timing explanation—before, at, or after the 6:30 AM open—once per timing group, not once per release.

## Visual polish

- Present each morning release as a compact, high-contrast editorial card using the existing black-and-white SHLM tokens.
- Separate “What it measures” and “Likely response” with clear typography, restrained borders, and small familiar icons rather than long undifferentiated paragraphs.
- Use state color only where it conveys impact or alignment; keep structural decoration monochrome.
- Preserve the existing day-grouped calendar, event details, impact badges, relevant markets, real-data-only behavior, and mobile collapses.

## Scope and verification

- No changes to data sources, calculations, authentication, memberships, payments, journal, Weekly Behavior logic, notifications, or hidden-until-real-data rules.
- Apply the same layout to member, SHLM MOD, and Founder views because they share this Centre route.
- Verify the public build, narrow phone layout, desktop layout, full title visibility, final section order, and absence of repeated generic news copy.
- Live values and Monday notification behavior still require the planned signed-in live-session check after the NY open.