<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Google OAuth entry points use shared account-selection options; sign-out actions cancel reads and clear the query cache before Supabase logout and replace navigation to sign-in. Why: prevent silent Google account reuse and stale private data after explicit logout.
- Market Internals is a separate read-only layer (src/lib/internals.server.ts); it must never modify Direction/Structure or Drivers — keeps the confirmation stack independent.
- Weekly Behavior (src/lib/weekly-behavior.server.ts) is a read-only context layer: it reuses quote/calendar helpers and must never alter Centre boards or emit trade instructions — keeps it independent of existing signals.
- Weekly Behavior activity is persisted by a service-only atomic database routine; the server's scheduled handler and authorized page checks run it, while member pages only read the resulting feed — prevents duplicate events and exposes no write access to members.
- Centre market context (src/lib/market-context.server.ts) is a read-only layer reusing Weekly Behavior's session/sweep helpers; Brief, Comparison and Market State are pure summaries in src/lib/centre-insights.ts — keeps summaries from becoming independent indicators.

- Recruiter earnings use an append-only `recruiter_lands` ledger tagged by Pacific calendar month; "this month" is derived, so there is no scheduled reset job. Why: no timer to fail, history preserved.
- Recruiter payouts go through Wise (src/lib/wise.server.ts + payouts.functions.ts): Founder token stored AES-GCM encrypted (WISE_ENC_KEY) in service-only wise_connection, only recipient IDs + masked bank summaries stored, payouts reserved atomically via reserve_recruiter_payout; the webhook never trusts its payload and re-reads the transfer from Wise. Why: no raw bank numbers or token ever reach the database in plain form or a browser, and no double-paying.

- Weekly Behavior US30 read runs the unchanged NASDAQ classifier functions on YM=F bars as a separate output (payload.us30); its sweeps are not logged and it never feeds the NASDAQ label. Why: genuinely independent read without touching NASDAQ logic.

- Referral credit: applications store referred_by_recruiter_id (chosen from a recruiter dropdown); the Stripe webhook appends one +1 recruiter_lands row per paid application (unique application_id). Why: automatic and idempotent, while manual Founder adjustments stay separate.
- Seasonality is an independent read-only history tool using user-scoped RLS and Centre access; complete-month coverage gates returns and verified tradability observations gate odds. Why: partial data and character labels alone cannot justify performance or trading probabilities.
- Seasonality calendar-date patterns aggregate the same month/day across historical years, omit weekends and verified closures, and require sourced event flags. Why: calendar position is not proof of a scheduled economic release.
- Seasonality history is loaded by src/lib/seasonality-sync.server.ts (Yahoo daily NQ=F/YM=F, service role) and refreshed by the existing weekly-tick schedule after the US close; characters are flagged estimated unless a final Day Character label exists, which always overrides. Why: one scheduler, real labels never lost to re-estimates.
- Indicator requests are persisted by service-only atomic routines after verified Centre access; only the designated Founder identity plus a current admin role may manage the catalogue or decisions, and notification delivery is separate from persistence. Why: retries cannot duplicate pending requests and email failures cannot discard them.
- The Affiliate Program uses the unchanged recruiter roles, ledgers and payout services; the legacy recruiter route redirects to the canonical affiliate route. Why: naming changes must not alter referral or financial behavior.
- Guard quick-log outcomes are committed once through service-only transactional routines into owner-scoped session/trade records and the existing Journal payload; ordinary Journal edits cannot mutate Guard trades. Why: lock decisions and saved analytics must agree across tabs and refreshes.
- Manual Guard completion and revert share the trade routine's per-user transaction lock and use server timestamps; audio recaps only patch reflection fields through revision-checked Journal saves. Why: concurrent tabs, refreshes, dictation and trade undo must not bypass session locks or overwrite recorded outcomes.
- Voice Journal records complete bounded WAV files and calls authenticated server-only transcription plus streamed structured extraction; denial audit state is service-only and no raw audio is retained. Why: phone recordings must decode reliably without exposing credentials or silently changing trade history.
- Session Guard is served only by the TanStack `/guard` route; its install manifest targets that route and legacy HTML links redirect there without a static index page. Why: Cloudflare serves a static guard index before the application and can loop a redirect back to itself.
- Historical Journal saves use an authenticated revision-checked atomic routine and preserve legacy text/JSON; live session outcomes use the shared quick log rather than inferred dates. Why: history/imports must not reset current session locks.
- Forecast evidence uses append-only snapshots and outcomes with separate scheduled/issued timestamps; unvalidated sourced context never becomes a calibrated prediction. Why: avoid look-ahead and invented accuracy.
- Bible Study membership is independent of trading purchases; joined-member content/chat is RLS-protected and moderation is server-verified. Why: paid mentorship must not gate community membership.
- Bible videos upload directly to Mux using an atomic per-teaching reservation and signed playback issued only after membership checks; provider secrets stay server-only. Why: large media bypasses ordinary app requests and concurrent uploads cannot create untracked assets.
