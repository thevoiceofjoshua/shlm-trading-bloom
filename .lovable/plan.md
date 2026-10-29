# SHLM master update — audit and staged plan

**Read-only audit. Approval covers Stage 1 only.**

## Already exists

SHLM styling/navigation/controls; accounts/roles/membership; Stripe/Wise; Centre Map, Drivers, Radar, context, calendar, Weekly Behavior/notifications; Journal analytics/screenshots/imports; separate Guard; Recruiter ledgers/live updates; beta preview/email; Supabase storage/Realtime; Tawk/Discord. **Internals stays hidden.**

**Database verified:** NQ/YM each have **3,817 daily rows, 25 August 2011–28 October 2026**, only **5 non-estimated labels each**. Daily history is not validated intraday prediction history.

## Broken or missing

- **Indicators:** email-only submission; no saved requests, dynamic catalogue, restored statuses, pending uniqueness or admin queue. UI is staff-only but submit endpoint enforces sign-in alone. Validation is length-only; retries duplicate emails; success copy implies unverified TradingView access. **Exact live button failure remains unproven** without a signed-in reproduction. No Founder-recipient events appeared in the visible 14-day email window; absence does not prove failure. `/affiliate-program` is absent; `/recruiters` works.
- **Guard/Journal:** Guard is one browser-local W/L counter, with no user/account binding, P&L, BE or durable session. Journal saves separately; no atomic trade/lock finalization or lock-aware edits. Guard ignores storage errors. Import dedupe is current-entry-only; CSV lacks equivalent protection, and missing Tradovate point-value metadata can produce wrong P&L. Preserve **one-win/three-trade locks, two-loss warning**, Pacific **5:00–7:15 PM / 6:20–7:30 AM** windows, **4:50 PM / 6:15 AM** resets. Existing 15-second undo can reverse a lock-causing trade; reconcile BE/undo with finalization before Stage 2 without silently changing thresholds.
- **Markets:** 15M/5M exist, not genuine 1H/4H. Cash-index prices and futures structure are mixed; Gold futures are labeled XAU/USD. **Confirmed code gap:** partial feed success can retain sample rows under a delayed label; freshness lacks per-source checks. This is not proof of a member's current screen. Full leadership/correlation, ATR and 30–45-minute target feasibility are missing; extrema/swings imply liquidity, not verified resting orders.
- **Forecasts:** NQ/YM reads exist, Gold does not; Tue/Wed manipulation and Thursday expansion remain fixed. No six-scenario engine, frozen checkpoint predictions, input/outcome ledger, per-market accuracy or walk-forward validation. Evidence scores are not probabilities. Active five-minute scheduling has recent successes and a timeout; native/external paths differ and need DST/retry/deduplication reconciliation.
- **Bible Study:** no page, independent membership, teaching pipeline, protected playback or persistent community chat/moderation. Screenshot storage does not encode video; Tawk is support chat. Replies/reactions/pins, mutes, rate limits, membership revocation and supported notifications need new secure records/workflows.

## Services and costs — nothing enabled

- **Stages 1–2:** existing Supabase/auth/email suffice; no new paid provider inherently needed. Normal usage applies; email failure must not erase requests; TradingView grants remain manual.
- **Video:** managed processing required. **Cloudflare Stream** supports MP4/MOV/resumable uploads: **$5/month per 1,000 stored minutes of capacity + $1 per 1,000 watched minutes**, encoding included. Conditional example: 1,000 stored + 1,000 watched = $6 before other services/tax. **Mux** is an alternative with tier/resolution-dependent costs. Raw Storage alone cannot guarantee MOV/adaptive playback. Video bytes/encoding bypass ordinary page requests.
- **Chat:** Supabase Postgres/Realtime, no separate vendor required. Published Free allowances: **2 million messages/month, 200 peak connections**. Pro starts **$25/month**; actual project plan/headroom unverified. Fan-out/presence/reactions affect usage; anti-spam and supported push need implementation.
- **Forecasts:** licensed live/intraday history for **CME NQ/MNQ, CBOT YM/MYM, COMEX GC/MGC** likely required. Yahoo is delayed, lacks supported multi-year intraday guarantees and prohibits redistribution; existing Tradovate access is not a redistribution licence. Databento internal-use plans start **$199/month**, **not an all-in commercial website quote**; history/exchange/non-display/derived/distribution rights require written terms. A sourced point-in-time macro calendar may add costs; validation needs background processing.

Budget depends on viewing/library minutes, chat traffic, plans and feed licensing. **Present costs and obtain approval before any paid activation.**

## Security and deployment

- All current public tables have RLS. Journal/screenshots are owner-scoped; screenshot bucket is private. Weekly activity policies allow service-role direct reads only.
- **Legacy weakness:** some Founder application/account APIs accept a shared passcode, not authenticated Founder identity; passcode persists in browser storage. New administration must enforce authorized accounts server-side. Broader security fixes need reviewed scope, not silent audit changes.
- Centre accepts historical paid purchases while dashboard membership calculates expiry; preserve unless separately approved. Journal vault is a presentation gate, not a backend session lock.
- Independent Cloudflare/Lovable deployments and cross-host calls need live configuration checks. Current external Supabase session does not permit authenticated Founder/member/MOD browser testing; exact beta failure and private flows remain unverified.

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

**Preserve styling/history; test each stage on phone/desktop and stop for review before the next.**

## Official cost/licensing sources

[Stream](https://developers.cloudflare.com/stream/pricing/) · [Supabase](https://supabase.com/pricing) · [Yahoo](https://help.yahoo.com/kb/exchanges-data-providers-yahoo-finance-sln2310.html) · [Databento](https://databento.com/pricing)

**Awaiting approval of Stage 1 only. Stages 2–4 and paid services remain unapproved.**
