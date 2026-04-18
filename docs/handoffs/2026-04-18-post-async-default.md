# Handoff — Post async-default ship (2026-04-18)

Session handoff written at the end of the 2026-04-18 R4-prerequisites cycle that shipped:

- `0242880` — feat: async-default orchestrator bias + in-flight research guard

Branch `main` was pushed clean at `0242880`. Previous session ended at `d89ed3a` (docs-split handoff note). This is the third handoff note on 2026-04-18; they are sequenced by landing order (post-7.7 → post-docs-split → post-async-default).

---

## What shipped this session

Both R3 prerequisites from the prior handoff landed in one commit.

### Change A — orchestrator prompt bias flip

[scripts/seed-agents.ts](../../scripts/seed-agents.ts), orchestrator `system_prompt`, "When to defer research" section rewritten:

- **Async is the default** for enrichment fetches (competitor scans, secondary URLs, market-context searches — anything that adds depth for future turns without gating the specialist's next line).
- **Sync is reserved for two cases**: entity disambiguation, and "user just shared a URL and is asking about what's on it."
- The "hold research until after 2 AI turns" rule from R3 partial stays — the bias flip only governs async-vs-sync once research is appropriate at all.
- Example JSON updated to show `"async": true` as the typical shape.
- Re-seeded to Supabase so the DB orchestrator prompt matches the script.

### Change B — in-flight guard in the async scheduler

[lib/research/scheduler.ts](../../lib/research/scheduler.ts):

- Module-level `Set<threadId>` gate. Ports Zansei's `_flight_lock` / `in_flight` concept from `research_orchestrator.py`.
- `scheduleAsyncResearch` synchronously checks + adds the threadId before calling `after()`. A second call while a job is in flight for that thread is **dropped**, not queued — intentional match to Zansei's semantics; the second request's result would land after the first's anyway, and serializing would make the owner's next turn wait on two fetches.
- `recordInFlightSkip` writes a lightweight `role: 'system'` breadcrumb with `metadata.skip_reason: 'in_flight'` so the grader and ledger can observe drops across runs. Insert is fire-and-forget — the schedule decision is not blocked on persistence.
- Durability: module memory; resets on cold starts / instance rotation. Acceptable at current single-instance volume; DB-backed flag becomes the right answer once R3 ships or deployment goes multi-instance. Noted in the file-level comment.

### Grader instrument

[lib/test/grade-deliberation.ts](../../lib/test/grade-deliberation.ts):

- New `instruments.research.skipped_in_flight` counter. Skip rows do **not** count as fetches or failures — they flow only into the new counter. Non-zero here is NOT a failure signal; it's evidence the lock held.
- `hasResearchRows` now ignores skip breadcrumbs so research-follow-through checks don't spuriously trigger when no tool actually ran.
- Unit test in [scripts/test-grade.ts](../../scripts/test-grade.ts) exercises the breadcrumb path.

### Verification run

- `npx tsc --noEmit` clean.
- `npm run test:quality` — 10/10 graph · 4/4 grade (incl. new test) · 7/7 fixtures.
- `npm run test:persona --persona ai_consultant --research-mode async` — 6/6 grader checks, overall_pass=true. Orchestrator correctly picked sync for the walterreid.com fetch at R4 (the turn where the URL is first mentioned — the "user just shared a URL" sync case under the new prompt).

---

## What is NOT closed — the async observability flag

The judgment-call flag carried forward from post-7.7 and post-docs-split is **still open**:

> R4 async observability — never observed end-to-end in a real persona transcript. Scheduler proven correct by direct smoke test against Serper.

The plumbing is right and the prompt classifies correctly; both R3 prerequisites landed. But the async branch itself still hasn't fired in a transcript. The one fetch this session's harness produced (walterreid.com, ai_consultant R4) landed on the legitimate new **sync** branch because the URL was introduced in the same turn — exactly the case the new prompt preserves as sync.

**What the flag needs to close:** a persona that naturally prompts an **enrichment** fetch (competitor scan, market-context search, secondary URL read) *after* the entity has already been established. None of the 18 personas in the current pool do this reliably. Two paths from here, either is acceptable:

1. **Add a targeted persona** under `test/personas/`. Something like: volunteers URL in R1, asks about *competitors* in R3 or market conditions in R4. This would naturally trip the async branch under the new prompt (enrichment fetch on an already-disambiguated entity).
2. **Manual end-to-end exercise via `/api/chat`**. Start a thread, volunteer a URL, then ask "how are competitors in my space positioning?" Verify the ledger / DB shows `research_scheduled` SSE plus a later system row with `metadata.async: true`.

Either path is a short cycle. **Suggested timing:** fold it into the first specialist replication cycle (Task 2 below). A Finance-focused persona with regretted past spend + a "what are other therapists in Riverside charging" type question would exercise both Finance voice + §7.2 budget hierarchy AND the async enrichment branch in one transcript.

---

## Primary task for the next session

**Begin specialist replication — Finance first, end-to-end.** This is the next coherent work block per BUILD.md §7.1 + §7.3. Everything else in Phase 7's remaining work is gated on replication; everything after Phase 7 is gated on specialist quality.

### Why Finance first

From the prior handoff's analysis (still correct): Finance is the specialist where §7.2's budget signal hierarchy has the most specific prompt material to port, it's frequently pulled when personas mention money, and Walter's regretted LinkedIn-boost spend is ready-made HISTORICAL-pain evidence. The material exists; the work is structuring it.

### Shape of the work (one specialist, end-to-end)

Follow the Marketer v3 pattern shipped in Phase 7.1/7.3 (see [BUILD-ARCHIVE-1.md §Phase 7.1](../../BUILD-ARCHIVE-1.md#phase-71--specialist-voice-rewrite-marketer-shipped) and [§Phase 7.3](../../BUILD-ARCHIVE-1.md#phase-73--hand-curated-case-library--vertical-knowledge-files-marketer-layer)). Five pieces, one commit (or one per piece if that reads better in the log):

1. **Finance voice rewrite** in [scripts/seed-agents.ts](../../scripts/seed-agents.ts). Identity opener as lived history (not credential recitation), tool-voice ban list, anti-sycophancy, anti-jargon, 2–3 sentence default, "use the case, don't cite it" rule. Changelog block above the Finance object.

2. **§7.2 rules** folded into the same rewrite:
   - **Divergence rule** (applies to all specialists; add to Finance first): *"When your expertise leads you to a recommendation the conversation didn't surface, name the bridge. The owner should never be surprised by a recommendation they didn't see coming."*
   - **Evidence-bound rule** (all specialists): *"Every recommendation must reference either something the owner said OR something from research. If it can't be tied to evidence, cut it."*
   - **Budget signal hierarchy** (Finance-specific — dedicated prompt section):
     1. **STATED** — owner explicitly said they can/will spend $X → use directly.
     2. **CURRENT** — owner currently spending $X → floor, not ceiling.
     3. **HISTORICAL** — owner spent $X on past efforts they described negatively → **pain evidence, not willingness to spend again.**
     4. **INFERRED** — no explicit signal → default conservative; name the inference.

3. **Finance case library** at `lib/agents/cases/finance.json` following the schema in [lib/agents/cases/marketer.json](../../lib/agents/cases/marketer.json). 10–15 cases minimum, indexed by `business_type_category`. For Finance the cases should exhibit the budget signal hierarchy in action: STATED working well, HISTORICAL misread as willingness producing regret, INFERRED conservative defaults that earned trust, pricing-that-doesn't-cover-labor pattern, burn-rate pressure, etc. **`case-loader.ts` already handles per-specialist lookup** — no loader changes needed; it just looks for `lib/agents/cases/<name>.json`.

4. **Extend the grader** with §7.2's tripwire in [lib/test/grade-deliberation.ts](../../lib/test/grade-deliberation.ts): advisor turn >80 words containing no user-quote-echo and no research-reference = suspect. Unit test in [scripts/test-grade.ts](../../scripts/test-grade.ts). Keep the check instrument-style (observation, not hard pass/fail) unless evidence says it should block — Marketer v3 showed some long turns that were right to be long.

5. **Validation — full 12-persona batch.** `npm run test:persona` against each registered persona (the batch used for Phase 7.1/7.3 Marketer validation). Finance fires when the orchestrator judges it useful; don't force it. Check grader output on naturally-triggered Finance turns. If Finance fires in zero batch runs, the signal is that the orchestrator's `description_for_orchestrator` for Finance needs tightening — **not** that the voice/cases are broken. If the signal instead is "Finance fires but is now overlong or too narrow," the voice rewrite or token budget is where to look.

### Validation is the batch, not a single persona

Corrected in the post-docs-split handoff and worth restating: **real deliberations pull 3–4 specialists per persona**. The batch covers Finance naturally across multiple personas (slate_psychology's associate pipeline, ai_consultant's regretted LinkedIn spend, bakery_delivery's unit economics, hudson_home's project pricing, etc.). Walter doesn't have to be a Finance-heavy persona for the Finance changes to validate — several of the 12 will pull Finance over the suite.

**If Finance turns out to fire in <2 of the 12** after the rewrite: tighten `description_for_orchestrator` in the same commit. That's part of the cycle, not a follow-up.

### Done when

- 10–15 Finance cases live in `lib/agents/cases/finance.json`, indexed sensibly by `business_type_category`.
- At least 2 of the 12 personas produce a Finance turn naturally in the batch run, and the grader passes on those turns.
- Zero banned phrases on Finance turns across the batch.
- Budget hierarchy is visibly applied on any persona with regretted past spend — the clearest case is ai_consultant's LinkedIn boost. Finance naming that as HISTORICAL pain rather than willingness is the money check.
- `BUILD.md` updated: check Finance on §7.1, note the shipped case library in §7.3, strike Finance off the remaining-9 list.
- **Ideally also**: a single persona or manual test closes the async-observability flag in the same cycle (see "What is NOT closed" above). Not strictly required for Finance ship, but the natural moment to fold it in.

---

## Out of scope this session

- Any second specialist. One at a time, end-to-end. Sequencing reality from Phase 7 history: Marketer took the full Phase 7.1 + 7.3 arc plus 7.4 length compression to land at reference quality. Finance will take its own cycle. Don't start Realist or Operations in the same session.
- Any R3 multi-batch work. Both prerequisites now shipped; R3 is the next-next cycle, not this one.
- Product / Brainstorm / Champion considerations (parked). Do not add to the roster.
- UI / DESIGN.md changes.
- Orchestrator prompt edits beyond Finance-specific routing description tightening if validation reveals it.

If you find a bug while reading or validating, flag it via `spawn_task` rather than fixing inline.

---

## Current repo state (as of this handoff)

- Branch `main` at `0242880`, pushed to `origin/main`.
- Working tree clean.
- 12 agent configs in Supabase (11 active + Orchestrator) — re-seeded with new async-default prompt.
- Tests green:
  - `test:graph` 10/10
  - `test:grade` 4/4 (includes new skip-row test)
  - `test:fixtures` 7/7
  - `npx tsc --noEmit` clean
- Result bundles from this session's validation runs: `test/results/ai_consultant_20260418_133314/`, `test/results/ferro_family_law_20260418_133745/`, `test/results/slate_psychology_20260418_134355/`. Gitignored; local reference if you want to see what the async-default prompt produced on current personas.
- `relevant-zansei-materials/` still local-only. The `_flight_lock` port is done; nothing more from `research_orchestrator.py` is needed for Finance work. Zansei's `prompts/plan_generation.md` still has budget hierarchy reference material if the per-specialist prompt writing needs it.

---

## Open judgment-call flags carried forward

- **R4 async observability** — still open; the plumbing shipped this cycle but no transcript has exercised the async branch end-to-end. See "What is NOT closed" above. Suggested close path: fold into the Finance cycle via a persona or manual test.
- **Ideation's soft-signal threshold** — still prompt-level, still needs observation across real user openers. Not this session's work. Audit the ledger for turn-1 vs turn-2+ Ideation firing patterns as specialist replication progresses.
- **Walter falsifiability framing** — still the right framing. Run the full 12-persona batch for specialist validation; don't tie a specialist's correctness to any single persona firing that specialist.

---

## Sequencing for future cycles (after Finance ships)

1. **This session's target** — Finance end-to-end (voice + §7.2 + cases + grader + batch validation), ideally closing the async-observability flag in the same cycle.
2. **One specialist per cycle after** — Realist, Operations, Creative, Copywriter, Designer, Accountant, Legal, CX. Order is a judgment call based on what the ledger shows is underfiring or underperforming. The batch data from Finance's validation run will inform the next pick.
3. **R3 batching** — typed `BatchPlan`s, batch round ceilings, milestone-keyed trigger logic. Both prerequisites now shipped (async-default + in-flight lock). Do this after specialist replication is substantially complete — R3 quality depends on specialists that already speak from history.
4. **R6 events + R7 synthesis hooks** — only once R3 is stable.
5. **Parked considerations** revisited only when field evidence supports them: Product specialist, Brainstorm register, Champion counterweight.

---

## Don't look for

- Another attempt at R3 in this cycle. Prerequisites shipped; R3 is its own cycle.
- Multiple specialists started this session. One specialist end-to-end, or don't start.
- Any orchestrator prompt edit that weakens the new async/sync boundary to force the async branch to fire. If async isn't firing on the existing personas, add a persona that naturally triggers it — don't relax the sync carve-outs. The sync cases (entity disambiguation, just-shared URL) are correct.
- A fix for the module-memory durability of the in-flight guard. On single-instance Render deploys it works as designed. Revisit when we go multi-instance or when R3 ships — noted in the scheduler comment already.
