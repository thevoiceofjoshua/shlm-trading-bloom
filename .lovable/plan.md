# SHLM master update — audit and staged plan

**Audit only: no code, database, settings or services changed. Approval is for Stage 1 only.**

## Already exists

- Existing SHLM styling, fonts, navigation, reusable controls, accounts, Founder/MOD roles, paid/lifetime access, Stripe and Wise.
- Centre Map, Drivers, Radar, market/session summaries, opening range, readiness, calendar, Weekly Behavior and notifications. **Internals remains hidden.**
- Persistent Journal entries, P&L, win rate, screenshots, rules and imports; separate browser-local Session Guard.
- Recruiter referral/commission/bonus/payout tracking and live updates; beta preview and username email; Supabase storage/Realtime; Tawk support chat and external Discord.
- **Database verified:** NQ/YM each have **3,817 daily rows, 25 August 2011–28 October 2026**, with only **5 non-estimated character labels each**. This is not validated intraday forecast history.

## Broken or missing

### 1. Indicators and naming

- Username submission **emails only**: no saved request, database indicator catalogue, restored status, duplicate-pending constraint or admin queue. One indicator is hardcoded.
- UI is staff-only; submit endpoint checks sign-in but not the same eligibility. Validation is length-only; retries can duplicate emails. Success copy implies TradingView access without verifying a grant.
- **Exact reported live button failure is unproven:** audit did not submit a request. No Founder-recipient events appeared in the available 14-day email window; that alone does not prove a failure.
- `/recruiters` exists; `/affiliate-program` currently returns 404. Naming/routing can change without touching financial services.

### 2. Journal and Guard

- Guard stores W/L and timestamps in one browser key, not per user/account. No P&L, BE, durable sessions, Journal sync or server-enforced lock.
- Journal requires explicit entry saves; it does not persist each Guard trade or finalize locks atomically. Journal edits/direct writes do not consult Guard.
- Guard silently ignores storage errors. Durable pending-save recovery, concurrent-tab safety and cross-device restore are absent.
- Import deduplication is current-entry-only; CSV lacks equivalent prevention. Tradovate has a point-value fallback that can yield wrong P&L when metadata is missing.
- Preserve actual rules: **one win locks; three trades lock; two losses warn**. Windows: **5:00–7:15 PM / 6:20–7:30 AM Pacific**, resets **4:50 PM / 6:15 AM**. Existing 15-second undo can undo a lock-causing trade; BE counting and audited undo must be reconciled with finalization before Stage 2, without silently changing thresholds.

### 3. Centre and forecasts

- Current structure is **15M/5M**, not real 1H/4H. Headline NASDAQ/US30 prices are cash indices, while live structure uses futures; Gold futures are labeled XAU/USD. Price levels need consistent instrument identity.
- **Confirmed code gap:** partial feed success can retain sample values in individual rows while the overall payload says delayed. Per-input provenance/freshness needs correction; this is not proof of a member's displayed state.
- Full leadership/correlation, ATR and 30–45-minute target feasibility are missing. Session extrema/swings infer potential liquidity, not verified resting orders.
- Weekly Behavior has NQ/YM, no Gold; Tue/Wed manipulation and Thursday expansion remain hardcoded. Six scenarios and three frozen checkpoint forecasts do not exist.
- Weighted evidence scores are **not calibrated probabilities**. Activity history lacks frozen inputs/levels, outcome adjudication, per-market accuracy and walk-forward validation.
- Five-minute scheduling is active; recent responses include successes and a timeout. Native/external paths differ and do not create durable 5 PM/5 AM/6:25 AM forecasts. Reconcile DST, session dates, retries and duplicates.

### 4. Bible Study

- No page, independent membership, teaching catalogue, direct-upload/processing pipeline, protected playback or persistent community chat/moderation.
- Private screenshot storage exists, but has no bucket-specific size/MIME limits and no video encoding. Tawk is support chat, not group chat.
- Replies/reactions/history/pins, mutes/removals, rate limits and membership revocation need secure persistent records. Push notifications require additional device support and permission.

## Services and costs — approval required before activation

| Dependency | Audit conclusion |
|---|---|
| Stages 1–2 | Existing Supabase/auth/email can support these; no new paid provider inherently needed. Database/hosting usage applies. Save requests independently of email delivery; TradingView grants remain manual. |
| Video | Managed encoding/adaptive playback required. **Cloudflare Stream** supports MP4/MOV and resumable uploads: published **$5/month per 1,000 stored minutes of capacity + $1 per 1,000 watched minutes**, encoding included. Conditional example: 1,000 stored + 1,000 watched = $6 before other services/tax. **Mux** is an alternative with tier/resolution-dependent pricing. Raw Supabase Storage alone is not reliable MOV processing/playback. Upload bytes and encoding must bypass normal page requests. |
| Native chat | Reuse Supabase Postgres + Realtime; no separate chat vendor inherently needed. Published Free allowances: **2 million realtime messages/month, 200 peak connections**. Pro starts at **$25/month**, with different allowances/overages. Actual project plan/headroom unverified; fan-out/presence/reactions affect usage. Quotas do not replace anti-spam controls. |
| Forecast market feeds | Licensed real-time and intraday historical coverage for **CME NQ/MNQ, CBOT YM/MYM, COMEX GC/MGC** is a likely production dependency. Yahoo is delayed, has no supported multi-year intraday guarantee, and prohibits redistribution. Existing Tradovate account access does not permit shared redistribution either. |
| Feed candidate/calendar | Databento internal-use plans start at **$199/month**, **not an all-in quote or licence for this member website**. Historical data, commercial distribution and exchange/non-display/derived-data rights need a written quote. A licensed economic calendar with point-in-time history may add costs. Forecast ingestion/validation needs background processing. |

No defensible monthly total without video library/viewing minutes, chat concurrency, account plans and market licensing. **No paid service connected or enabled in this audit. Present its budget and obtain approval first.**

## Security and deployment

- All current public tables have RLS enabled. Journal/screenshots are owner-scoped; screenshot bucket is confirmed private. Weekly activity direct reads are service-role-only under its policies.
- **Legacy weakness:** some Founder application/account APIs accept a shared passcode instead of authenticated Founder identity; that passcode persists in browser storage. New administration must verify the authorized account server-side. Broader security remediation needs reviewed scope, not a silent audit fix.
- Centre currently accepts historical paid purchases while dashboard membership calculates expiry. Preserve entitlement behavior unless separately approved. Journal passcode is a presentation gate, not a backend session lock.
- shlmtrdng.com and Lovable are independently deployed, with some requests routed to Lovable. Check secrets/callbacks/versions on the actual host; source cannot prove live settings.
- Authenticated Founder/member/MOD browser testing is unavailable with the current external Supabase session. Private flows and exact beta failure remain unverified. Public responses and database reads are not substitutes.

## Stages and approval gates

### Stage 1 — fixes and naming only

**Affects:** Beta panel, existing admin dashboard, account dropdowns, portal route/metadata, additive indicator/request tables and permissions.

- Trace the actual signed-in button failure before selecting a fix.
- Database-backed indicators; requests tied to authenticated member and chosen active indicator, unique pending requests and preserved status/history. Confirm only after persistence; track email separately.
- Founder-only add/rename/archive/reorder and request approve/reject list/counter, enforced for your authorized account on every direct call. MOD/members cannot administer.
- Rename visible Recruiter references to **Affiliate Program**; serve `/affiliate-program`, redirect old `/recruiters`, preserve sign-in return and referral links. Leave roles, tracking, commissions, bonuses, payout history and Wise unchanged.
- Test unauthorized/direct calls, concurrent duplicates, failed email/save/retry, refresh persistence, immediate dropdown updates, both routes and phone/desktop. **Stop for review before Stage 2.**

### Stage 2 — one trade log and durable sessions

**Affects:** Guard, Journal quick log/history, analytics adapters, imports, new trade/session records and every session-sensitive write path.

- Result/P&L/market quick entry with optional existing details; identity/account/session auto-filled. Positive WIN, negative LOSS and BE net commissions validated server-side.
- Persist each confirmed trade once; atomically update totals and finalize the correct session on existing locks. Block new logging immediately; safely reconcile pending saves.
- Secure edits/undo, stable idempotency, honest pending/saved/error states, retry and refresh restore; preserve records/analytics.
- Test lock thresholds, simultaneous saves, network loss, user/account isolation, dedupe and cross-screen readback before continuing.

### Stage 3 — five-section Centre and evidence-based forecasts

**Affects:** Existing Centre/Weekly pages, feed adapters, leadership/setup summaries, prediction/outcome storage and scheduled validation.

- Exactly **Market Outlook, Liquidity Intelligence, Market Relationship, Session Outlook, Setup Quality**; retain detail in existing expandable views/pages, remove redundancy, keep Internals hidden.
- Genuine 1H/4H context, 15M setup, 5M confirmation; supported countertrend scalps allowed. Nearby targets/invalidation consider volatility and 30–45-minute feasibility, not fixed risk/reward.
- Three-market scenarios, dynamic weekdays and immutable **5:00 PM, 5:00 AM, 6:25 AM Pacific** forecasts with DST/market-calendar handling.
- Frozen inputs, defined outcomes, per-market walk-forward/out-of-sample evaluation. **NO RELIABLE FORECAST** when evidence is insufficient; no invented prices, accuracy or unvalidated probabilities.
- Test feed loss/staleness, rolls, holidays/DST, checkpoint retries, no look-ahead and actual session outcomes. Calibrated accuracy requires evidence accumulated over time, not deployment alone.

### Stage 4 — Bible Study community

**Affects:** Homepage dropdown, `/bible-study`, independent membership/content/chat records, protected media provider and community administration.

- Join/leave using existing accounts, independently of mentorship; server-enforced member viewing/chat rights.
- Admin direct MP4/MOV upload, progress/resume, verified processing status, title/description/scripture/thumbnail/publication/featured/edit/delete controls and signed built-in playback.
- Persistent realtime chat with history/replies/reactions/pins, announcements, moderation, rate limits and supported notifications.
- Test phone upload interruption, actual MOV/MP4 playback, processing failures, revoked membership, unauthorized administration and chat reconnect. Present video/chat costs before activation.

**Each stage preserves SHLM styling and unrelated working features, tests concrete rules and phone/desktop flows, and stops for review before the next. No destructive history changes without impact review.**

## Technical references

Reuse TanStack/React, existing design controls, Supabase server functions/RLS. Additive storage; atomic trade/lock operations; internal recruiter identifiers unchanged.

Evidence: `src/lib/beta.functions.ts`, `src/components/hub/BetaIndicator.tsx`, `public/guard/index.html`, `src/components/hub/Journal.tsx`, `src/lib/hub.functions.ts`, `src/lib/quotes.server.ts`, `src/lib/weekly-behavior.server.ts`, `src/server.ts`, `src/lib/admin-api.ts`, `src/routes/recruiters.tsx`.

[Stream pricing](https://developers.cloudflare.com/stream/pricing/) · [Mux pricing](https://www.mux.com/docs/pricing/overview) · [Supabase pricing](https://supabase.com/pricing) · [Yahoo delays/licensing](https://help.yahoo.com/kb/exchanges-data-providers-yahoo-finance-sln2310.html) · [Databento pricing](https://databento.com/pricing) · [CME licensing](https://www.cmegroup.com/market-data/license-data/market-data-policy-education-center.html)

**Awaiting approval of Stage 1 only. Stages 2–4 and paid services remain unapproved.**
