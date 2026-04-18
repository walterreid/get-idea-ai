# Handoff — Post Finance specialist replication (2026-04-18)

Session handoff written at the end of the 2026-04-18 Finance replication cycle. Fourth handoff note on 2026-04-18 (post-7.7 → post-docs-split → post-async-default → **post-finance-replication**).

Previous session ended at `064986b` (post-async-default handoff pushed). This session ships Finance voice + cases + §7.2 instrument — the first specialist replication after Marketer v3.

---

## What shipped this session

### Change A — Finance voice rewrite + §7.2 rules

[scripts/seed-agents.ts](../../scripts/seed-agents.ts), Finance agent object:

- **Changelog block** above the Finance object (v2, 2026-04-18), matching the Marketer v3 pattern.
- **Identity opener** replaced — from generic "make sure money is discussed with numbers" to lived history: *"You've seen enough owners talk themselves into numbers that didn't survive contact with a bank account."*
- **Voice discipline** section with inline banned smoke-signal phrases specific to Finance: *"optimize your pricing," "build a financial plan," "improve your unit economics," "watch your cash flow," "keep your costs low," "focus on profitability."* Tool-voice ban ("generate / output / deliverable / the report / projection model"). Anti-sycophancy ("skip 'Great question'"). Two-to-three sentence default, one-thing-per-turn rule.
- **"Use the case, don't cite it"** discipline (GR#6) with Finance-specific right/wrong examples — *"Your hours aren't free — at 20 a week they're a line item your pricing has to carry"* (right) vs. *"I worked with a baker once"* (wrong).
- **Budget Signal Hierarchy** as a dedicated section — STATED > CURRENT > HISTORICAL > INFERRED — mirroring the exact language already in `recommendationNode` so per-turn advice and recommendation synthesis speak the same grammar. HISTORICAL regret explicitly called out as pain evidence, not willingness.
- **Divergence rule** (Name the bridge when expertise points to a recommendation the conversation hasn't surfaced).
- **Evidence-bound rule** (Every number traces to something the owner said or something research found).

### Change B — `description_for_orchestrator` tightened after Stage 1

First attempt under-fired (0 fires in 2 Stage 1 personas) because Finance's description read "bring in when money is discussed *without numbers*," which the orchestrator correctly read as "skip Finance if the owner already gave numbers." The real pull is numbers being **misapplied** — regretted spend re-upped as willingness, pricing without owner labor costed, payback period never specified. Rewrote to:

- Name the misapplication triggers explicitly (regretted spend being re-upped; scaling/hiring without unit economics; pricing without owner hours costed; channels without payback windows; delivery/promotion margin swaps dressed as new revenue).
- Call out Finance-vs-Realist: *"Realist names strategic flaws; Finance names the specific number that is wrong, missing, or misapplied. Prefer Finance over Realist when the flaw is numeric."*
- Call out Finance-vs-Accountant: *"Accountant thinks in mechanics and compliance; Finance thinks in unit economics and cashflow shape."*

After re-seed, Finance fired in 5/5 Stage 1 personas and 16/19 batch.

### Change C — Finance case library

New [lib/agents/cases/finance.json](../../lib/agents/cases/finance.json). 14 cases indexed by `business_type_category`:

- **professional_services (×4)** — regretted LinkedIn boost (HISTORICAL pain); solo consultant owner-labor not free; fractional service anchor pricing; no-named-budget INFERRED-conservative.
- **local_services (×3)** — contractor overhead floor; net-30 working capital squeeze; seasonal trough reserve planning.
- **restaurant_food (×2)** — delivery platform margin swap; owner-cook hidden labor cost.
- **fitness_wellness (×2)** — membership payback vs. monthly revenue; utilization vs. gross sales.
- **ecommerce_dtc (×3)** — monthly-discount-is-the-price; ad spend without payback discipline; new-location ramp curve.

Schema identical to [marketer.json](../../lib/agents/cases/marketer.json). No loader changes required — [case-loader.ts](../../lib/agents/case-loader.ts) auto-discovers `finance.json` by specialist name.

### Change D — Evidence-binding instrument in grader

[lib/test/grade-deliberation.ts](../../lib/test/grade-deliberation.ts):

- New `instruments.advisor_turns.suspect_unbound_turns` counter. Counts agent turns >80 words with no user-quote-echo (any `business_name_hints` from the persona) AND no research-reference signal.
- Extracted shared `RESEARCH_REFERENCE_SIGNALS` list used by both the existing `researchFollowthroughOk` check and the new `isTurnEvidenceBound` helper — single source of truth.
- **Instrument only, NOT factored into `overall_pass`.** Per plan: "Marketer v3 produced some long turns that were right to be long. Watch the counter across runs; promote to hard-fail only if a specific pattern emerges."
- When no persona hints are supplied, counter stays at 0 (the user-quote-echo check has nothing to anchor against).

Unit tests in [scripts/test-grade.ts](../../scripts/test-grade.ts) — 4 new assertions (long+unbound=1; long+persona-echo=0; short=0; long+research-reference=0). All 8/8 passing.

### Verification run

- `npx tsc --noEmit` clean.
- `npm run test:grade` — 8/8 (4 new tests).
- `npm run test:fixtures` — 7/7 (no regressions).
- `npm run test:graph` — 10/10.
- Full 19-persona batch (`npm run test:persona --research-mode async` on each):
  - **overall_pass: 17/19.** Two pre-existing non-Finance fails: `ideation_cold_open` (recommendation forced too early — persona only has 3 rounds) and `stress_rusher` (terse persona, advisors don't echo business name). Both pre-date this cycle.
  - **Finance fired in 16/19 personas** — 35 total Finance turns across the batch. Vs. the handoff floor of ≥2 and the plan target of ≥4, well exceeded.
  - **Zero banned phrases on any Finance turn.**
  - **Zero tool-voice violations** anywhere in the batch.
  - **Zero Marketer regression** — Marketer's voice discipline held (no generic smoke-signal phrases surfaced) across all 19 runs.
  - **Budget hierarchy visibly applied on `ai_consultant`** — Finance treated Walter's proposed $100–200 LinkedIn boost as opportunity-cost-dominated by his 5-hrs-a-week opportunity cost ($9,750 over 13 weeks at $150/hr); did NOT re-up the channel; surfaced the three specific numbers Walter doesn't have (engagement value, conversion rate, hourly rate) before any spend.
  - **Max consecutive Finance turns: 5** (on `hudson_home`). Each turn addressed a distinct numeric escalation — Manhattan project value → payback period → break-even count → net margin → already-active Facebook ad account. Earned, not redundant; the orchestrator's judgment, not a Finance flaw.
  - **`suspect_unbound_turns` total: 21 across all specialists in the batch.** Observational — several were Finance turns discussing the owner's specific situation without name-dropping the business ("each associate" vs. "your associates at Slate Psychology"). The pattern the counter was designed to surface. Not blocking.
  - **Async fires: 0.** Sync fires: 2 (both on the "user just shared a URL" carve-out, correctly sync). Async observability flag remains open.

Result bundles for every persona run live under `test/results/` (gitignored). Ledger line per run in `test/results/_ledger.jsonl`.

---

## What is NOT closed — carried forward

### R4 async observability (still open)

Scheduler + prompt shipped `0242880`; orchestrator description + Finance voice + 19-persona batch shipped this session. **Zero async fires across 19 real persona runs with `--research-mode async`.** The sync fires that did happen landed on the correct carve-out (user just shared a URL). Absence of async fires is not a scheduler bug — it's that no current persona's R3/R4 asks a market/competitor question AFTER the entity is already established. That's the shape that would trip async under the new prompt.

**Suggested close paths** (either is acceptable; neither is a blocker for specialist replication):

1. Add a targeted persona under `test/personas/` — volunteers URL in R1, asks about competitors in R3 or market conditions in R4. Mirrors the ideation/legal_sensitive pattern of a purpose-built test persona.
2. Manual `/api/chat` exercise. Start a thread, volunteer a URL, then ask "how are competitors in my space positioning?" Watch the ledger / DB for `research_scheduled` SSE + a later system row with `metadata.async: true`.

### Ideation's soft-signal threshold

Still prompt-level guidance. `ideation_cold_open` in the Finance batch fired Ideation on R1 (correct: pure greeting) and then forced into recommendation on R2 because the harness's closure flag triggered before any specialist got airtime. That's a harness artifact, not an Ideation bug. `opening_greeting` also fired Ideation on R1 and handed off correctly. No turn-2+ Ideation mis-fires observed. Continue watching.

### Walter falsifiability framing

Still correct. The 19-persona batch validates Finance changes across the suite — not 1:1 on Walter.

---

## Pattern confirmed this cycle (worth carrying forward)

**Stage-1 checkpoint before full batch.** Finance's first seed fired 0/2 on Stage 1 (`ai_consultant`, `slate_psychology`). The correct response was to tighten `description_for_orchestrator`, not to re-tune the voice or add more cases. After the description edit (explicit Finance-vs-Realist + Finance-vs-Accountant distinctions), Finance fired 5/5 Stage 1 and 16/19 batch. The "Routing is the art" memory applies in both directions: under-firing AND over-firing are description/orchestration signals, not voice signals.

For each remaining specialist: run 5 specialist-likely personas first, check fire rate, tighten `description_for_orchestrator` if needed, *then* commit to the full 19-persona batch.

---

## Primary task for the next session

**Next specialist replication.** Eight remain (Realist, Creative, Copywriter, Designer, Accountant, Operations, Legal, CX). Pick order based on this cycle's ledger signals:

- **Realist fires often (11 turns in batch) but from a generic register** — good replication candidate, with a high signal-to-fix ratio.
- **Operations (3 turns) and Accountant (1 turn) under-fire** — replicate the voice+cases, then tighten description the way Finance did this cycle. Accountant in particular rarely gets pulled naturally; a targeted persona may help after voice work lands.
- **CX (7 turns) holds its own on the demand-side questions it's good at** — worth replicating but lower priority than Realist.
- **Legal (4 turns) is mostly carried by `legal_sensitive.json`** — similar low natural-fire pattern to Accountant.
- **Creative, Copywriter, Designer** — synthesis-phase specialists. Batch ledger doesn't show much firing (which is expected; they're synthesis-phase voices). Lower priority until R3 multi-batch research gives them more context to work with.

Suggested next pick: **Realist**. High fire rate means the voice rewrite will be visible across many personas, and the description tightening pattern will be less critical (Realist already routes correctly; it's the *quality* of the turn that needs to move from generic anchoring to lived-history pushback).

### Shape of the work (same five pieces, same pattern)

1. **Realist voice rewrite** in [scripts/seed-agents.ts](../../scripts/seed-agents.ts). Identity opener as lived history. Voice discipline section. Banned smoke-signal phrases specific to Realist ("the market is crowded," "you'll need to differentiate," "growing concerns," etc.). "Use the case, don't cite it." Changelog block.
2. **§7.2 rules** folded in: divergence + evidence-bound (already on Marketer + Finance). Realist doesn't need a dedicated hierarchy section like Finance's budget hierarchy — but may benefit from an explicit "the flaw is specific" rule (name the named flaw, not the category). Decide when you write it.
3. **Realist case library** at `lib/agents/cases/realist.json`. 12–14 cases. Focus on structural flaws named specifically — "market is dominated by two players with distribution you don't have," "your hiring assumption requires a candidate pipeline you haven't built," "you're solving a problem one degree removed from what the customer actually wants." Patterns where the specific flaw was the one thing the conversation had been circling.
4. **Grader extension** — optional. The `suspect_unbound_turns` instrument already covers the generic-register problem. Only add Realist-specific tripwire if the batch reveals a pattern.
5. **Validation** — same 19-persona batch. Compare Realist turns before (batch bundles from this cycle are in `test/results/*_20260418_*`) and after.

### Done when (Realist cycle — template for subsequent specialists)

- 12–14 Realist cases live in `lib/agents/cases/realist.json`.
- Realist fires in ≥6 of 19 persona runs (current baseline is 11 turns across 19 runs — post-rewrite should stay at or above that range).
- Zero Realist-specific banned phrases on any Realist turn.
- At least one Realist turn in the batch names a structural flaw by its specific shape, not by its category.
- BUILD.md updated.
- All pre-batch sanity checks green.

---

## Out of scope next session

- Any second specialist in the same session. One at a time, end-to-end — this cycle's lesson reinforces the Marketer-cycle lesson.
- R3 multi-batch work. Both prerequisites now shipped; R3 stays gated on specialist replication substantially complete (≥5 of 9, maybe more).
- UI / DESIGN.md changes.
- Orchestrator prompt edits beyond the specialist-specific `description_for_orchestrator` tightening (Finance cycle showed this is the right lever; don't touch the main orchestrator body).

---

## Current repo state (as of this handoff)

- Branch: `main`, pending commit (see below).
- Working tree has this session's changes:
  - `scripts/seed-agents.ts` — Finance v2 prompt + tightened description + changelog block.
  - `lib/agents/cases/finance.json` — NEW (14 cases).
  - `lib/test/grade-deliberation.ts` — `suspect_unbound_turns` instrument + shared `RESEARCH_REFERENCE_SIGNALS` + `isTurnEvidenceBound` helper.
  - `scripts/test-grade.ts` — 4 new tests.
  - `BUILD.md` — Finance marked shipped on §7.1 / §7.2 (partial: instrument) / §7.3; §7.2 instrument checked.
  - `docs/handoffs/2026-04-18-post-finance-replication.md` — this file.
- Supabase: 12 agent configs seeded. Finance prompt in DB matches the script.
- Tests green:
  - `test:graph` 10/10
  - `test:grade` 8/8 (4 new tests)
  - `test:fixtures` 7/7
  - `npx tsc --noEmit` clean
- Result bundles from this session: 19 directories under `test/results/` matching `*_20260418_16*` / `*_20260418_17*`. Gitignored; local reference for the "before Realist / after Realist" comparison in the next cycle.
- `relevant-zansei-materials/` still local-only, unreferenced by this cycle.

---

## Open judgment-call flags carried forward

- **R4 async observability** — still open, still no natural trigger in the current persona pool. Close path: targeted persona OR manual `/api/chat`. Not a blocker.
- **Ideation's soft-signal threshold** — still prompt-level, still holding. No turn-2+ Ideation mis-fires in this cycle's 19-persona batch.
- **Walter falsifiability framing** — still correct. Validated across 19 runs, not 1 Walter run.
- **New this cycle — Finance over-concentration risk.** Max consecutive Finance: 5 (`hudson_home`); 4 (`ferro_family_law`); 3 (`slate_psychology`, `bakery_delivery`). Each individual turn was earned, but the pattern is worth watching as more specialists are replicated. If Realist v2 shows similar patterns, the signal will be: the tightened `description_for_orchestrator` language may be too aggressive on re-pulls. For now, each Finance turn in a consecutive run was addressing a distinct numeric — not redundant.

---

## Don't look for

- A second specialist started this session. One specialist end-to-end, or don't start.
- Any R3 work. Prerequisites shipped; R3 is still its own cycle after specialist replication is substantially further along.
- Weakening the orchestrator's async/sync carve-outs to force the async branch. If async isn't firing on existing personas, add a persona that naturally triggers it OR run a manual test — don't relax the sync cases.
- Reverting the `suspect_unbound_turns` counter to hard-fail. The 21 observations this cycle include legitimate long-but-bound Finance turns that just didn't echo the business name. Counter stays instrument-only until evidence says otherwise.
