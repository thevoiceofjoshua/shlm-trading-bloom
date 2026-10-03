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
- Market Internals is a separate read-only layer (src/lib/internals.server.ts); it must never modify Direction/Structure or Drivers — keeps the confirmation stack independent.
- Weekly Behavior (src/lib/weekly-behavior.server.ts) is a read-only context layer: it reuses quote/calendar helpers and must never alter Centre boards or emit trade instructions — keeps it independent of existing signals.
- Weekly Behavior activity is persisted by a service-only atomic database routine; the server's scheduled handler and authorized page checks run it, while member pages only read the resulting feed — prevents duplicate events and exposes no write access to members.
- Centre market context (src/lib/market-context.server.ts) is a read-only layer reusing Weekly Behavior's session/sweep helpers; Brief, Comparison and Market State are pure summaries in src/lib/centre-insights.ts — keeps summaries from becoming independent indicators.

- Recruiter earnings use an append-only `recruiter_lands` ledger tagged by Pacific calendar month; "this month" is derived, so there is no scheduled reset job. Why: no timer to fail, history preserved.
- Recruiter payouts go through Wise (src/lib/wise.server.ts + payouts.functions.ts): Founder token stored AES-GCM encrypted (WISE_ENC_KEY) in service-only wise_connection, only recipient IDs + masked bank summaries stored, payouts reserved atomically via reserve_recruiter_payout; the webhook never trusts its payload and re-reads the transfer from Wise. Why: no raw bank numbers or token ever reach the database in plain form or a browser, and no double-paying.
