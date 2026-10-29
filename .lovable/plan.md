# SHLM master update — audit and staged plan

**Audit only. No code, database, settings, service connections, or paid subscriptions changed. Approval authorizes Stage 1 only.**

## What already exists

- Existing SHLM black-and-white styling, Space Grotesk/DM Sans, dropdown navigation, reusable forms, dialogs, selectors and progress controls. These stay intact.
- Existing accounts, Founder/admin and read-only SHLM MOD roles, paid membership, lifetime-member access, Stripe enrollment and Wise payouts.
- Centre Market Map, Drivers, Liquidity Radar, session context, market summaries, opening range, readiness, economic calendar, Weekly Behavior and notifications. Market Internals remains hidden.
- Journal with persistent entries, trade details, screenshots, calendar, P&L, win rate, personal rules, and Tradovate/CSV imports.
- Session Guard with existing trading windows, win/trade-count locks and undo — currently a separate browser-local tool.
- Recruiter Portal with referral tracking, manual adjustments, commission/bonus calculations, payout history and live updates. These financial services can remain unchanged during renaming.
- Beta indicator preview, password screen and authenticated username-to-email submission.
- Supabase storage and live-update capabilities already used elsewhere. Tawk is support chat; Discord is an external community link, not an in-site Bible Study system.

**Verified current history:** NQ and YM each have **3,817 weekday rows, 25 August 2011–28 October 2026**. Each has only **5 non-estimated character labels**; this is daily price history, not validated intraday forecasts.

## What is broken or missing

### Stage 1: indicator requests and naming

- The username button only sends email. There is **no database request record**, indicator catalogue, restored request status, pending counter or admin request queue.
- Only SHLM SYSTEM is hardcoded. Current UI is staff-only; the submission endpoint requires sign-in but does not enforce the same beta/member eligibility.
- Username validation is length-only. Reloads/retries can generate duplicate emails, and success copy implies future TradingView access without verifying any grant.
- The precise reported production button failure is **not yet proven**: no authenticated submission was made during this audit. No Founder-recipient email events appeared in the available 14-day window; that does not establish an attempted send or its failure reason.
- `/recruiters` exists and still says Recruiter Portal. `/affiliate-program` currently returns 404.

### Stage 2: trading workflow

- Guard records W/L and timestamps in one browser-storage key, not per authenticated user/account. It has no P&L, BE, durable sessions or Journal connection.
- Journal saves whole entries explicitly; it does not persist each Guard trade or atomically finalize locked sessions. Direct Journal writes do not consult Guard locks.
- Browser-storage errors in Guard are swallowed. Cross-device restore, concurrent tabs, pending-save recovery and backend-confirmed lock finalization are absent.
- Import duplicate protection is limited to the current entry; CSV lacks equivalent deduplication. Missing Tradovate point-value metadata can produce incorrect P&L through a fallback. These must be addressed before promising reliable combined totals.
- Existing Guard behavior: one win locks; three recorded trades lock; two losses warn about an optional third. Pacific windows are 5:00–7:15 PM and 6:20–7:30 AM, with resets at 4:50 PM and 6:15 AM. Its current 15-second undo can undo a lock-causing trade. Preserve thresholds; specify how BE and audited undo interact with finalization before this stage.

### Stage 3: Centre and forecasting

- Five-section consolidation is feasible using existing features, but full leadership, rolling correlation, ATR and horizon-aware target analysis are not implemented.
- Current structure uses **15M/5M**, not genuine 1H/4H context. NASDAQ/US30 headline prices use cash indices while live structure uses futures; Gold futures are labeled XAU/USD. Executable levels need consistent instrument identity.
- **A confirmed integrity gap:** partially successful feeds can leave sample values in individual rows while the overall payload is labeled delayed. This is a code-path finding, not proof of what a member saw. Freshness also needs per-source checks.
- Weekly Behavior has NQ and YM reads, no Gold read. Tue/Wed manipulation and Thursday expansion are still hardcoded. The requested six scenarios and three timestamped forecasts do not exist.
- Current weighted evidence scores are **not calibrated probabilities**. Activity events/state are not prediction history: frozen inputs, forecast levels, outcomes, per-market accuracy and walk-forward validation are absent.
- Session highs/lows and swings infer potential liquidity; they do not verify resting orders.
- An existing five-minute scheduler is active, with recent successful responses and one observed timeout. It is not three durable checkpoint forecasts. Native/external schedule paths differ; DST, session dates, retries and duplicate prevention need reconciliation.

### Stage 4: Bible Study

- No Bible Study page, independent membership, teaching catalogue, direct-upload/processing workflow, protected playback, persistent group chat or community moderation exists.
- The existing private screenshot bucket is unsuitable as a complete video system. It has no configured bucket-specific size/MIME limit and supplies no video encoding.
- Replies, reactions, pinned announcements, mutes/removals, membership revocation and notification preferences need persistent records and permissions. Browser push notifications require additional support and user permission; support varies by device.

## Dependencies and costs — before approval of any paid service

| Area | Reuse / dependency | Cost and limitation |
|---|---|---|
| Stage 1 | Existing Supabase accounts/database and notification email | No new paid provider inherently required. Notification configuration must work on the actual host; email failure must not undo a saved request. TradingView access remains manually granted, not automatically provisioned. |
| Stage 2 | Existing Supabase, Journal and Guard | No new external service inherently required. Add durable trade/session storage, transaction-safe saves and retry handling; normal database/hosting usage applies. |
| Video | Managed video service such as **Cloudflare Stream** or **Mux**, plus existing database for metadata | Stream publishes **$5/month per 1,000 stored minutes of capacity**, plus **$1 per 1,000 watched minutes**; encoding included. Supports MP4/MOV and resumable TUS uploads. Example only: 1,000 stored + 1,000 watched minutes = $6 before other services/tax. No service enabled. |
| Video alternative | Mux direct uploads, processing and signed playback | Published starting storage/delivery rates are $0.0024/minute-month and $0.0008/delivered minute; resolution, tier and account allowances affect the bill. Confirm a project-specific budget before selecting it. Raw Supabase Storage alone does **not** provide adaptive video processing or reliable MOV playback. |
| In-site group chat | Supabase database + Realtime | No separate chat vendor is inherently needed. Published Free allowances include 2 million realtime messages/month and 200 peak connections. Pro starts at $25/month, with different allowances and overages. Fan-out/reactions/presence count toward usage; the project's actual plan and headroom were not verified. Quotas do not replace anti-spam limits. |
| Forecast data | Licensed live and intraday historical feed for CME NQ/MNQ, CBOT YM/MYM and COMEX GC/MGC | Current free Yahoo data is delayed and has no supported multi-year intraday service guarantee. Yahoo prohibits redistribution of its supplied information. A paid, licensed feed is a likely production dependency for reliable 5M confirmation and shared member forecasts. |
| Feed candidate | Databento historical/live CME Group coverage | Internal-use plans start at $199/month; **that is not a licence or all-in quote for this member website**. Historical acquisition, exchange/non-display/derived-data/distribution rights and commercial plan requirements need a written quote. Existing Tradovate account access does not authorize shared redistribution either. |
| Releases and validation | Sourced economic calendar with point-in-time history; durable ingestion and validation processing | Existing calendar can be reused where rights and completeness permit. A commercial calendar API may require an additional subscription/quote. Long historical validation and video encoding should not run inside normal page requests. |

Monthly totals depend on retained video duration, viewing minutes, chat activity/concurrency, market licensing and hosting. **No paid service will be connected or enabled without presenting its cost and obtaining approval.**

## Security and deployment findings

- All current public application tables have RLS enabled. Journal rows/screenshots are owner-scoped; the screenshot bucket is confirmed private. Weekly activity policies permit service-role access, not anonymous/member direct reads.
- **Important legacy weakness:** some Founder application/account APIs authorize by a shared passcode rather than authenticated Founder identity; that passcode is persisted in browser storage. New indicator, community and video administration must enforce authenticated authorized accounts server-side, not copy this boundary. Existing security changes require an explicit reviewed scope, not a silent audit fix.
- Centre entitlement currently accepts any historical paid purchase, while the membership dashboard calculates expiry. Preserve existing behavior unless its correction is separately approved.
- The Journal passcode is a presentation/privacy gate, not a backend lock. Session Guard lock enforcement must be added to every relevant write path, including direct requests and edits.
- shlmtrdng.com and Lovable remain independently deployed, with some calls routed to Lovable. Secrets, callbacks and deployment versions must be checked on the host actually used. Source configuration does not prove live secrets are present.
- No current authenticated browser session is available for this external Supabase setup. Signed-in Founder/member/MOD tests, the exact failing beta request, and private live workflows remain unverified. Public route checks and database inspection are not substitutes.

## Implementation stages and acceptance gates

### Stage 1 — fixes and naming ONLY

**Affects:** Beta panel, existing admin dashboard, account dropdown labels/links, portal page metadata/routing, new indicator/request storage and permissions.

1. Trace the actual signed-in button failure and record safe error evidence before choosing a fix.
2. Add database-backed indicators and member-bound requests, pending uniqueness and preserved history. Save first; confirm only after backend acknowledgement. Email is a separate notification outcome.
3. Add member request status and Founder request list/counter; Founder-only create, rename, archive, reorder and approve/reject controls. Restrict mutations to your authorized Founder account; deny members and MOD through direct calls.
4. Rename visible Recruiter references to Affiliate Program, use `/affiliate-program`, and redirect old `/recruiters` links. Keep internal account roles, referral identifiers/links, tracking, commission math, payout ledger and Wise behavior unchanged.
5. Test denied direct calls, duplicate/retry/email-failure cases, reload persistence, dropdown updates, old/new routes and phone/desktop presentation. Stop for review before Stage 2.

### Stage 2 — one trade log, durable sessions

**Affects:** Guard, Journal quick log/history/analytics adapters, trade/session records, imports and every session-sensitive write path.

- Add result/P&L/market quick entry with optional existing details; persist user/account/session identity once.
- Enforce positive WIN, negative LOSS and BE net-after-commission handling server-side. Reuse existing analytics and preserve historical records.
- Atomically save confirmed trades, recalculate totals and finalize the correct locked session. Block new trades immediately while handling pending saves safely.
- Add audited edit/undo rules, idempotent retries, precise pending/saved/error states and restoration after refresh.
- Test simultaneous submissions, lock boundaries, network interruption, user/account isolation, imports, historical analytics and cross-screen readback before Stage 3.

### Stage 3 — five-section Centre and validated forecasts

**Affects:** Existing Centre and Weekly Behavior pages, market-source adapters, new leadership/setup summaries, scheduled prediction/outcome records and validation processing.

- Consolidate into exactly **Market Outlook, Liquidity Intelligence, Market Relationship, Session Outlook and Setup Quality**. Put retained details in existing expandable views/pages; keep Internals hidden.
- Introduce real 1H/4H context, 15M setup and 5M confirmation. Allow independently supported countertrend scalps; select nearby targets/invalidation with volatility and 30–45-minute feasibility, not fixed risk/reward.
- Replace fixed weekday assertions with evidence-based scenarios for all three markets. Freeze 5:00 PM, 5:00 AM and 6:25 AM Pacific snapshots with DST and exchange-session handling.
- Store immutable prediction inputs and defined outcomes; validate chronologically per market. Show **NO RELIABLE FORECAST** until sufficient, fresh evidence exists; never relabel raw evidence scores as probabilities or show invented accuracy.
- Test feed loss/freshness, contract rolls, holidays/DST, checkpoint retries, no look-ahead, real session outcomes and dashboard clarity before Stage 4. Reliable probability/accuracy claims require validation evidence over time, not merely deployment.

### Stage 4 — Bible Study community

**Affects:** Existing homepage dropdown, new `/bible-study`, independent membership/content/chat records, protected media service and community administration.

- Join/leave with existing accounts, independently of paid mentorship; enforce joined-member viewing/chat rights.
- Authorized admin direct MP4/MOV uploads, progress/resume, verified processing state, custom thumbnails and teaching publish/edit/delete controls; signed built-in playback.
- Persistent realtime chat with replies/reactions/history/pins, announcements, moderation, rate limits and supported notifications.
- Test interrupted phone uploads, representative MOV/MP4 files, processing failures, revoked membership, unauthorized administration, reconnect history and simultaneous member chat. Present video/chat costs before activation.

**Every stage preserves SHLM styling and unrelated working features, adds tests for concrete rules, and must pass its acceptance checks before the next stage. No destructive history migration without reviewing its impact.**

## Technical references and official pricing

Source anchors: `src/lib/beta.functions.ts`, `src/components/hub/BetaIndicator.tsx`, `public/guard/index.html`, `src/components/hub/Journal.tsx`, `src/lib/hub.functions.ts`, `src/lib/quotes.server.ts`, `src/lib/weekly-behavior.server.ts`, `src/lib/weekly-activity.server.ts`, `src/server.ts`, `src/routes/api/public/weekly-tick.ts`, `src/lib/admin-api.ts`, `src/hooks/use-admin-mode.ts`, `src/routes/recruiters.tsx`, `wrangler.jsonc`.

- [Cloudflare Stream pricing](https://developers.cloudflare.com/stream/pricing/) · [Direct uploads](https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/)
- [Mux pricing](https://www.mux.com/docs/pricing/overview)
- [Supabase pricing](https://supabase.com/pricing) · [Realtime billing](https://supabase.com/docs/guides/realtime/pricing) · [Resumable storage uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
- [Yahoo exchange delays and redistribution notice](https://help.yahoo.com/kb/exchanges-data-providers-yahoo-finance-sln2310.html)
- [Databento pricing](https://databento.com/pricing) · [CME licensing policies](https://www.cmegroup.com/market-data/license-data/market-data-policy-education-center.html)
- [Trading Economics calendar documentation](https://docs.tradingeconomics.com/economic_calendar/point-in-time/)

**Awaiting your approval of Stage 1. Stages 2–4 and any paid services remain unapproved.**
