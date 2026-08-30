# Remove timezone label next to the clock

## Change
In `src/components/hub/SessionBar.tsx`, remove the timezone chip (line 26) that sits next to the live clock:

```tsx
<span className="text-xs uppercase tracking-widest text-muted-foreground">{localTz}</span>
```

The clock itself stays (line 25), and the "LA market" label on the right stays. Only the IANA timezone string (e.g. `America/Los_Angeles`) disappears from view.

## Files
- `src/components/hub/SessionBar.tsx` — delete the single `<span>` rendering `{localTz}`.

No other files, data, or behavior change.
