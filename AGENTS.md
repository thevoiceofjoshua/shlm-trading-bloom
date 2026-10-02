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
