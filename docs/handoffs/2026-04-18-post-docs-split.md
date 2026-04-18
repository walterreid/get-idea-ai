# Handoff — Post docs split (2026-04-18)

Session handoff written at the end of the 2026-04-18 documentation cycle that shipped:

- `ea0438a` — docs: split BUILD.md into living plan + BUILD-ARCHIVE-1.md; fix stale `test/` gitignore notes; add `relevant-zansei-materials/README.md` (local-only)

Branch `main` was pushed clean at `ea0438a`. Previous session (Phase 7.7 ship) left off at `d6dbf70`; `a38d2ba` was the last code change.

---

## Primary tasks for the next session

Two tasks, sequenced. **Task 1 is the main shipment; Task 2 is stretch** — do it only if Task 1 lands cleanly with context/time to spare. Do not half-finish Task 2.

### 1. Async-default flip + in-flight guard (target ship)

Half-day cycle. Two changes, one commit. Closes the R4 async-observability judgment-call flag from the post-7.7 handoff.

**Why now.** R4 shipped the async *capability* (commit `5b53b2c`). But the orchestrator was conservative on every persona tested and never emitted `async: true`, so the path was never observed end-to-end in a real transcript. The scheduler was proven correct only by a direct Serper smoke test. Flipping the default bias makes async the observable normal case for enrichment fetches; the lock closes a race we don't hit at present volume but must close before R3 multi-batch work.

**Change A — orchestrator prompt bias flip.**

- File: [scripts/seed-agents.ts](../../scripts/seed-agents.ts), orchestrator `system_prompt`.
- Current guidance (paraphrase): if the research is non-blocking for the next specialist AND user has completed ≥2 turns, set `async: true`.
- New guidance: **async is the default** for enrichment fetches (competitor scans, secondary URLs, market-context searches, any research that *adds* depth but isn't *gating* the specialist's next turn). Only set `async: false` (or leave unset) when the research is **entity-disambiguating** or **the user just shared a URL and is asking about what's on it** — cases where the specialist cannot answer meaningfully without the result.
- Keep the "first 2 turns: hold research" guidance from R3 partial. That stays.
- Re-seed after the edit (`npm run seed`) — orchestrator prompt lives in the DB.
- Validation: run `test:persona` on one persona that reliably shares a URL early (candidates: `ai_consultant` volunteers walterreid.com in R2; `ferro`/`glory_days` from the batch pool also share URLs). Expect the ledger to log at least one `research_async_scheduled` event; expect R3's specialist to reference the fetched content. If the orchestrator is still sync-defaulting for enrichment fetches, tighten the prompt copy — don't add a code check. *Routing is the art.*

**Change B — in-flight guard in the scheduler.**

- File: [lib/research/scheduler.ts](../../lib/research/scheduler.ts).
- Current state: `scheduleAsyncResearch` wraps each dispatch in Next.js `after()`. Nothing prevents two concurrent scheduled jobs for the same thread if the orchestrator emits `async: true` on two back-to-back turns before the first finishes.
- Port the concept from Zansei's `research_orchestrator.py` (`_flight_lock` + `in_flight` flag). Reference only — re-express in TypeScript.
- Suggested shape: a module-level `Map<threadId, Promise<void>>` (or a DB-backed flag if you want cross-process safety; module-level is fine for the current single-instance deployment). Before scheduling, check the map; if a job is in flight for this thread, skip and log `research_skip_in_flight` to the ledger/grader instruments rather than dispatching.
- This is **not** a queue — we deliberately drop the second request rather than serialize. Zansei does the same. The orchestrator sees the result on the next turn either way.
- Add a grader instrument counter for in-flight skips so the ledger records them (low signal today, essential when R3 batches arrive).

**Done when:**

- One `test:persona` run against a URL-sharing persona produces a ledger row showing `research_async_scheduled` (R2) followed by a later specialist turn that references the fetched content (R3 or R4). This is the observability that's been missing since R4 shipped.
- A contrived test (two rapid `async: true` emissions from the orchestrator in the same thread) produces one dispatch and one skip — not two dispatches. Easiest way to force this: two consecutive harness rounds where the persona shares different URLs; compare ledger rows.
- `test:quality` (graph + grade + fixtures) stays green.
- `npx tsc --noEmit` clean.
- Do **not** flip the code path for non-enrichment research (the "user just shared a URL" case). That must remain sync so the specialist's next turn has the content.

**Risks to watch for:**

- Prompt bias flips can cascade — if `async: true` starts firing on *entity-disambiguation* fetches (where the specialist needs the content to answer), the R3 specialist will stumble. Read the orchestrator's `reason` field on a few runs to confirm it's classifying correctly.
- The in-flight map lives in process memory. On Vercel/Next.js cold starts it resets. Acceptable for now; note it in the scheduler comments so future R3 work knows the durability boundary.

### 2. Begin specialist replication — ONE specialist only (stretch)

Attempt only if Task 1 lands cleanly. Sequence the work so Task 1's commit lands first regardless.

**Pick which specialist before starting.** The 12-persona batch is the validation surface (not a single falsifiability persona). From the batch pattern and the "Routing is the Art" memory, the most useful next specialists are probably:

- **Finance** — heaviest prompt section (budget signal hierarchy from §7.2) and the specialist most often pulled when personas mention money. High leverage.
- **Realist** — the anchor voice; gets pulled frequently; currently reasons from principle rather than from cases.
- **Operations** — "but who actually does this?" register; gets pulled on any persona with moving parts. Cleaner scope than Finance.

**Recommendation: Finance first.** It's the specialist where §7.2's budget signal hierarchy has the most specific material to port, and Walter's regretted LinkedIn-boost spend is ready-made HISTORICAL-pain evidence.

**Shape of the work (one specialist, end-to-end):**

1. **Voice rewrite** in [scripts/seed-agents.ts](../../scripts/seed-agents.ts) following the Marketer v3 pattern (`BUILD-ARCHIVE-1.md §Phase 7.1`): identity opener as lived history, tool-voice ban list, anti-sycophancy, anti-jargon, 2–3 sentence default, "use the case, don't cite it" rule. Changelog block above the specialist object.
2. **§7.2 rules** folded into the same rewrite: divergence rule (all specialists), evidence-bound rule (all specialists), and for Finance specifically the full budget signal hierarchy as a dedicated prompt section.
3. **Case library** — new JSON at `lib/agents/cases/<specialist>.json` following the schema in [lib/agents/cases/marketer.json](../../lib/agents/cases/marketer.json). 10–15 cases minimum, indexed by `business_type_category`. For Finance: cases should exhibit the budget signal hierarchy in action (STATED working well, HISTORICAL misread as willingness producing regret, etc.).
4. **Validation:** run the 12-persona batch (`npm run test:persona` against each registered persona). The specialist fires when the orchestrator judges it useful — don't force it. Check grader output on naturally-triggered turns. If the specialist fires in zero batch runs, the signal is that the orchestrator's `description_for_orchestrator` needs tightening, not that the specialist is broken.
5. **Extend the grader** with the §7.2 tripwire: advisor turn >80 words containing no user-quote and no research-reference = suspect. Land this in [lib/test/grade-deliberation.ts](../../lib/test/grade-deliberation.ts) and a unit test in [scripts/test-grade.ts](../../scripts/test-grade.ts).

**Done when:**

- At least 2 of the 12 personas produce the new specialist's turn naturally, and the grader passes on those turns.
- Zero banned phrases on the new specialist's turns.
- Budget hierarchy is visibly applied on any persona with regretted past spend (check Walter's LinkedIn boost case).
- BUILD.md updated: check the box on the new specialist in §7.1; note the shipped case library in §7.3; strike the specialist off the remaining-9 list.

**If Finance isn't the right pick when you start** — use the judgment memory (*Routing is the Art*) and pick based on what the 12-persona batch shows is underfiring. Don't default to Finance out of inertia. But pick one and finish it; don't start two.

---

## Out of scope this session

- Any R3 multi-batch batching work. That's its own cycle once async-default and in-flight lock are both landed.
- Any specialist beyond the one picked for Task 2.
- Product / Brainstorm / Champion considerations (parked).
- UI or DESIGN.md changes.
- Any orchestrator prompt edits beyond the async-bias flip in Task 1. (The soft-signal Ideation threshold and other routing concerns stay untouched.)

If you find a bug while reading or validating, flag it via `spawn_task` rather than fixing inline — this session has enough scope.

---

## Current repo state (as of this handoff)

- Branch `main` at `ea0438a`, pushed to `origin/main`.
- Working tree clean.
- 11 active agents seeded in Supabase (Marketer, Finance, Creative, Copywriter, Designer, Accountant, Operations, Legal, CX, Realist, Ideation) + Orchestrator.
- All tests green as of the last code-session validation run (`5b53b2c`/`a38d2ba`):
  - `test:graph` 10/10
  - `test:grade` 3/3
  - `test:fixtures` 7/7
  - `npx tsc --noEmit` clean
- BUILD.md is now the living plan; [BUILD-ARCHIVE-1.md](../../BUILD-ARCHIVE-1.md) has the historical detail. Read the archive when you need *why* a thing was designed a given way.
- [relevant-zansei-materials/README.md](../../relevant-zansei-materials/README.md) is the port-source reference for Task 1's `_flight_lock` work. **Read, don't run** — it's Python. Patterns cross over; implementation does not.

---

## Open judgment-call flags carried forward

Unchanged from the post-7.7 handoff, noted here so they're not lost:

- **R4 async observability** — Task 1 of this session is explicitly what closes this flag. If Task 1 ships cleanly, delete this flag from the carry-forward list in the next handoff.
- **Ideation's soft-signal threshold** — still prompt-level, still needs observation across real user openers. Not this session's work. Audit the ledger for turn-1 vs turn-2+ Ideation firing patterns when the specialist replication cycle is further along.
- **Walter falsifiability framing** — still the right framing. Run the full 12-persona batch for validation; don't tie a specialist's correctness to any single persona firing that specialist.

---

## Sequencing for future cycles (after this session)

1. **This session** — async-default flip + in-flight guard (Task 1); optional first specialist (Task 2).
2. **Specialist replication continues** — one specialist per cycle following the Task 2 shape until the remaining 8 (or 9, if Task 2 doesn't land) are done.
3. **R3 batching** — typed `BatchPlan`s, batch round ceilings, milestone-keyed trigger logic. Prerequisite: in-flight lock (shipped in this cycle) and async-default (shipped in this cycle).
4. **R6 events + R7 synthesis hooks** — only once R3 is stable.
5. **Parked considerations** revisited only when field evidence supports them: Product specialist, Brainstorm register, Champion counterweight.

---

## Don't look for

- Any attempt at R3 in this cycle. R3 is the next-next cycle; the prerequisites ship here.
- Async-default changing the code path for entity-disambiguation research. That stays sync by design; only enrichment becomes async-default.
- Multiple specialists in Task 2. One specialist, end-to-end, or don't start.
