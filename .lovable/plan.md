# SHLM master update — audit and staged plan

**Audit only. No code, database, settings, service connections, or paid subscriptions changed. Approval authorizes Stage 1 only.**

## What already exists

- SHLM styling, typography, dropdowns, reusable controls, existing accounts/roles, paid and lifetime access, Stripe enrollment and Wise payouts.
- Centre Map, Drivers, Radar, session summaries, opening range, readiness, calendar, Weekly Behavior and notifications. Internals stays hidden.
- Persistent Journal entries, P&L, win rate, screenshots, personal rules and imports; separate browser-local Session Guard.
- Recruiter referral/commission/bonus/payout tracking and live updates; beta preview and username email; Supabase storage and Realtime; Tawk support chat and external Discord.
- **Verified daily history:** NQ/YM each have **3,817 rows, 25 August 2011–28 October 2026**, with only **5 non-estimated character labels each**. This is not validated intraday forecast history.

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

## Dependencies and costs — no services enabled

- **Stages 1–2:** existing Supabase/auth/email services suffice; no new paid vendor inherently required. Database/hosting usage applies. Email availability on the actual host needs checking; TradingView access remains manually granted.
- **Video:** managed processing/playback is needed, not raw storage alone. **Cloudflare Stream** supports MP4/MOV, resumable uploads and adaptive playback: published **$5/month per 1,000 stored minutes of capacity + $1 per 1,000 watched minutes**, encoding included. Conditional example: 1,000 stored + 1,000 watched minutes = $6 before other services/tax. **Mux** is an alternative; starting storage/delivery rates are $0.0024/minute-month and $0.0008/delivered minute, subject to tier, resolution and account allowances. Confirm budget before selecting either. Large video bytes/encoding must bypass normal page requests.
- **In-site chat:** reuse Supabase database + Realtime. Published Free allowances: 2 million realtime messages/month and 200 peak connections. Pro starts at $25/month with different allowances/overages; actual project plan/headroom is unverified. Message fan-out/reactions/presence affect usage. Rate limits/moderation and browser push are additional implementation, not automatic Realtime features.
- **Forecast feeds:** licensed live and historical intraday data for CME NQ/MNQ, CBOT YM/MYM and COMEX GC/MGC is a likely production dependency. Yahoo is delayed, has no supported multi-year intraday guarantee, and prohibits redistribution. Existing Tradovate access does not permit shared redistribution either.
- **Databento candidate:** internal-use plans start at $199/month, **not an all-in quote or licence for this member website**. Historical data, commercial distribution, exchange/non-display/derived-data rights need a written quote. A licensed sourced economic calendar with point-in-time history may add subscription costs. Validation also needs durable ingestion and background processing.

No defensible monthly total without video duration/viewing, chat concurrency, account plans and market licensing. **Present costs and obtain approval before connecting or enabling any paid service.**

## Security and deployment findings

- Current public tables have RLS enabled; Journal/screenshots are owner-scoped and the screenshot bucket is private. Weekly activity direct access is service-role-only under its policies.
- **Legacy weakness:** some Founder application/account APIs authorize by shared passcode, not authenticated Founder identity; the passcode persists in browser storage. New administration must require authorized accounts server-side. Do not silently expand Stage 1 into unrelated security rewrites.
- Centre accepts historical paid purchases while the dashboard calculates expiry; leave existing entitlement behavior unless separately approved. Journal vault is a presentation gate, not a backend session lock.
- shlmtrdng.com and Lovable are independently deployed, with some calls routed to Lovable. Validate secrets/callbacks/versions on the actual host; source does not prove live configuration.
- Authenticated Founder/member/MOD browser testing is unavailable in this externally managed setup. Private workflows and exact beta failure remain unverified; public route checks and database reads do not substitute.

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

## Technical references and official costs

Existing TanStack/React, Tailwind/shadcn, Supabase server functions and RLS are reused. New storage is additive; internal recruiter identifiers and financial services remain unchanged. Atomic database operations are required for trade/lock correctness, not browser-only coordination.

Evidence: `src/lib/beta.functions.ts`, `src/components/hub/BetaIndicator.tsx`, `public/guard/index.html`, `src/components/hub/Journal.tsx`, `src/lib/hub.functions.ts`, `src/lib/quotes.server.ts`, `src/lib/weekly-behavior.server.ts`, `src/server.ts`, `src/routes/api/public/weekly-tick.ts`, `src/lib/admin-api.ts`, `src/hooks/use-admin-mode.ts`, `src/routes/recruiters.tsx`.

[Stream pricing](https://developers.cloudflare.com/stream/pricing/) · [Mux pricing](https://www.mux.com/docs/pricing/overview) · [Supabase pricing](https://supabase.com/pricing) · [Realtime billing](https://supabase.com/docs/guides/realtime/pricing) · [Yahoo delays/redistribution](https://help.yahoo.com/kb/exchanges-data-providers-yahoo-finance-sln2310.html) · [Databento pricing](https://databento.com/pricing) · [CME licensing](https://www.cmegroup.com/market-data/license-data/market-data-policy-education-center.html)

**Awaiting approval of Stage 1 only. Stages 2–4 and paid services remain unapproved.**
