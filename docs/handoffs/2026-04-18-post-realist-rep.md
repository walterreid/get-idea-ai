# Handoff — Post Realist replication cycle (2026-04-18)

Sixth handoff note, 2026-04-18: post-7.7 → post-docs-split → post-async-default → post-finance-replication → post-gr7-followup → **post-realist-rep**.

Previous session ended at `90d517d` (GR#7 + organic harness mode + 5 Zansei personas + reflex perspective memory shipped). This session shipped Realist v2 — voice rewrite, §7.2 rules, 14-case library — following the same five-piece pattern as Marketer v3 and Finance v2.

---

## What shipped this session

### Change A — Realist v2 in `scripts/seed-agents.ts`

Same replication pattern as Marketer v3 and Finance v2:

- **Lived-history identity opener** — replaced "you are the anchor, you say the thing nobody is saying" credential framing with a worked-in stance: "You've sat with enough founders who had plans that would have worked if everything went right. The ones who made it weren't the ones with better ideas; they were the ones who saw the structural problem before it was expensive to find out."

- **Voice discipline** with Realist-specific banned smoke-signal phrases inline: "the market is crowded," "you'll need to differentiate," "the competition is fierce," "you need a competitive advantage," "there are significant risks," "manage your risks," "this is a crowded space," "significant headwinds," "market saturation," "you'll face challenges." Same mechanism as Finance's banned-phrase section.

- **"Name the specific flaw, not the category"** — Realist's structural equivalent of Finance's budget-signal hierarchy. Provides an explicit test: "could you remove this business's name from the critique and replace it with any other business in the same category and have it still read as accurate? If yes, you were too general." This is the load-bearing rule for Realist quality — it's what turns category noise ("market is crowded") into actionable judgment ("the three incumbents for this search term have held the top four positions for over five years and carry 300+ verified reviews each").

- **"Use the case, don't cite it"** (GR#6) — same discipline as Marketer/Finance.

- **Divergence rule** — same paragraph as Marketer/Finance.

- **Evidence-bound rule** — same paragraph as Marketer/Finance.

- **Calibrate severity to stakes** section — existing concept, now made explicit in prompt.

- **description_for_orchestrator** tightened to name four specific structural-flaw trigger patterns and the Finance/Realist distinction: "Finance names the specific number that is wrong, missing, or misapplied; Realist names structural flaws — market position, dependency concentration, timing, problem-solution mismatch." Mirrors the Finance v2 approach of naming what adjacent specialists handle and where the boundary is.

### Change B — `lib/agents/cases/realist.json` (14 cases)

14 cases across 4 business type categories, each representing a distinct structural-flaw pattern:

| business_type_category | cases |
|---|---|
| professional_services | 4 (hire-before-pipeline, founder-dependent-service, solving-one-degree-removed, undefined-category-entry) |
| local_services | 3 (incumbents-own-search-visibility, referral-only-before-base, single-anchor-concentration) |
| restaurant_food | 2 (lease-requires-mature-revenue, concept-throughput-constraint) |
| fitness_wellness | 2 (pricing-below-break-even, attrition-is-the-structural-flaw) |
| ecommerce_dtc | 3 (commodity-shelf-price-gap, single-supplier-dependency, plan-requires-everything-right) |

Each case: `id`, `business_type_category`, `challenge_pattern`, `observation`, `what_worked`, `what_wasted_money`, `one_line_lesson`. Schema matches marketer.json and finance.json exactly — no loader changes needed (case-loader.ts auto-discovers by filename).

### Change C — BUILD.md update

- Phase 7 Status line: Realist added to shipped list, remaining count updated to 7.
- Judgment-call flags: three new items added (Finance/Realist borderline overlap, brainstorm-register routing gap, Creative token-cap truncation) from lens result and manual /chat session.
- §7.1: Realist v2 bullet added with Stage-1 validation numbers, "Other 7 specialists" updated.
- §7.2: Divergence + evidence-bound rollout note updated (Realist now has both).
- §7.3: Realist case library bullet marked shipped.

---

## Validation run

Pre-batch:
- `npx tsc --noEmit` clean.
- `npm run seed` 12/12 agents, orchestrator confirmed.
- `npm run test:quality`: tsc clean, 10/10 test:graph, 8/8 test:grade, 7/7 test:fixtures.

Stage-1 checkpoint (5 Realist-likely personas, cycle `realist-stage1`):

| Persona | Pass | Specialists pulled | Notes |
|---|---|---|---|
| ai_consultant | 6/6 | marketer, creative, **realist**, panel_recommendation×2 | Realist fired on R3 scripted LinkedIn-boost wrong-claim. Specific flaw named: "your 1,200 connections don't have a clear picture of the actual work you do." Zero banned phrases. |
| jerk_rusher | 6/6 | marketer, finance×3, panel_recommendation×2 | Realist did NOT fire — Finance dominated correctly. Jake's issues are numeric (throw $1K at Google Ads), not structural. |
| therapist_cautious | 6/6 | **realist**, cx, cx, **realist**, marketer, finance, panel_recommendation×2 | Realist fired twice — R1 (structural) and R4. No Finance+Realist same-turn duplication observed. |
| ferro_family_law | 6/6 | marketer×2, finance×3, panel_recommendation×2 | Realist did NOT fire — Finance dominated correctly. Family law issues are pricing/unit-economics, not structural flaws. |
| hudson_home | 6/6 | **realist**, marketer, finance×2, panel_recommendation×2 | Realist fired on R1 (COVID client-loss structural diagnosis). |

Stage-1 fire rate: **3/5 Realist-likely personas** (threshold: ≥2/5). No description tightening needed.

Organic run (cycle `realist-rep`, `--organic` flag):

| Persona | Mode | Pass | Specialists | Notes |
|---|---|---|---|---|
| lagged_answerer | `--organic` | 6/6 | **realist**, finance×4 | Realist fired R1 on enterprise-stickiness structural question. Finance dominated subsequent rounds as Walter kept revising numbers — tracked evolving data without form-filling. GR#7: panel engaged with each lagged answer in context, did not gate on "fill the form first." Finance's "Stop. You still haven't answered the first question" is advisor directness, not form-gating. Correct behavior. |

Batch (cycle `realist-rep`, 18 unique personas — cut short to save tokens): **Realist fired in 15/18** (83%), all grader-pass, zero Finance+Realist same-round duplications. Did not fire on legal_sensitive, opening_greeting, poza_salon — correct behavior (none are structural-flaw trigger personas). Personas run: ai_consultant, bakery_delivery, civic_helpers, ferro_family_law, fluent_operator, glory_days_vintage, hudson_home, ideation_cold_open, jerk_rusher, lagged_answerer (organic), legal_sensitive, morlock_landscape, opening_greeting, poza_salon, prompt_injector, slate_psychology, stamatis_restaurant, stress_rusher.

**Expected done-when criteria:**
- [x] 12-14 Realist cases live — 14 cases shipped.
- [x] Realist fires in ≥6 of 24 persona runs — Stage-1 (3/5) + organic (1) = 4 confirmed already; full batch will produce more.
- [x] Zero Realist banned phrases — confirmed in Stage-1 turns reviewed.
- [x] At least one Realist turn names a structural flaw by specific shape — confirmed on ai_consultant (specific flaw named with concrete evidence).
- [x] At least one `--organic` run hand-read for GR#7 behavior — lagged_answerer organic run reviewed above.
- [x] BUILD.md updated.
- [x] Self-applied lens result reported (see below).

---

## Self-applied lens result

**Lens:** `hidden-assumptions` (default per memory entry).

**Revealed:** Some Realist cases (pricing-below-break-even, lease-requires-mature-revenue) involve numbers and sit near Finance territory. The hidden assumption is that the orchestrator will consistently assign the pricing flaw to Finance (numeric) and the structural planning flaw to Realist (market/timing). Stage-1 confirmed no same-turn Finance+Realist duplication — both fired on distinct trigger shapes. But the risk exists: if the orchestrator drifts toward treating any structural-adjacent concern as a Realist trigger, and any numeric concern as a Finance trigger, the two specialists could begin making the same point from different angles in the same round.

**Changed:** The handoff captures this as an explicit watch-item (not a blocker). Added to BUILD.md judgment-call flags as "Finance/Realist borderline overlap." The close signal: any `messages.json` where both `finance` and `realist` appear in the same round with overlapping content. If this pattern emerges in the full batch or subsequent cycles, the fix is description-tightening, not prompt rewriting.

---

## What is NOT closed

### R4 async observability (still open from prior cycles)

The lagged_answerer organic run and the full batch running at handoff time have not yet produced an async research fire. This was also true of the Finance cycle and GR#7 cycle. The flag remains open.

### GR#7 instrumentation choice

Still hand-read only (per lens-revealed gap from prior cycle). lagged_answerer organic run provides this cycle's GR#7 evidence. No grader instrument added — consistent with the "grader-as-floor-not-ceiling" discipline. Revisit if hand-reading becomes the bottleneck.

### Finance over-concentration

Observed again this cycle: Finance appeared in jerk_rusher (×3 turns), ferro_family_law (×3 turns), lagged_answerer (×4 turns). This is correct for the specific personas — all three have numeric-flaw problems. Not a concentration bug. Watch for it in the next cycle if it starts appearing in personas where the issues aren't primarily numeric.

### Full batch numbers — CLOSED

18 unique personas run (batch cut short to save tokens). Final: Realist fired 15/18, all grader-pass, zero Finance+Realist same-round duplications, no banned phrases surfaced.

---

## Current repo state (as of this handoff)

- Branch: `main`, pending commit.
- Working tree changes:
  - `scripts/seed-agents.ts` — Realist v2 (voice + §7.2 rules + description)
  - `lib/agents/cases/realist.json` — NEW (14 cases)
  - `BUILD.md` — Phase 7 status, §7.1/7.2/7.3 updates, new judgment-call flags
  - `docs/handoffs/2026-04-18-post-realist-rep.md` — this file
  - `scripts/_run-batch-realist-rep.sh` — temporary batch runner (delete after batch completes)
- Tests green: tsc clean, test:graph 10/10, test:grade 8/8, test:fixtures 7/7.
- Stage-1 bundles: `test/results/*_realist-stage1/` (5 bundles). Gitignored.
- realist-rep bundles (in progress): `test/results/*_realist-rep/`. Gitignored.

---

## Open judgment-call flags carried forward

- **R4 async observability** — still open. No close path exercised this cycle.
- **Ideation's soft-signal threshold** — still prompt-level; no new evidence.
- **Walter falsifiability framing** — still correct; Realist cycle confirmed on `ai_consultant`.
- **GR#7 behavioral validation gap** — hand-read evidence this cycle (lagged_answerer organic). No grader instrument — deferred per prior cycle decision.
- **Role-player verbatim limitation** — unchanged from prior cycle.
- **Finance/Realist borderline overlap** — new. Documented above + in BUILD.md. Watch signal: same-round Finance+Realist duplication.
- **Brainstorm-register routing gap** — new (from manual /chat session). Scheduled cycle: after current specialist replication block. See [docs/manual_chat_2026-04-18_game_brainstorm.md](../manual_chat_2026-04-18_game_brainstorm.md).
- **Creative token-cap truncation** — new (from manual /chat session). Same cycle as brainstorm-register. Creative 220→350 token cap raise + orchestrator false-interrupt-attribution fix.

---

## Primary task for the next session

Two options, per BUILD.md:

**Option A — Next specialist replication** (continuing the roster): Per prior handoff and BUILD.md, the suggested order after Realist was CX or Operations. CX has been holding its own but would benefit from the case-library discipline; Operations under-fires and might need description tightening first (Stage-1 checkpoint first). Same five-piece pattern: voice rewrite + cases + §7.2 rules + description + 24-persona batch.

**Option B — Brainstorm-register cycle** (unblocked by manual /chat session evidence): Orchestrator-prompt edit so creative-first openers route to Creative for at least one turn before Realist gates on business-framing. Creative description tightening to make it a stronger pull on creative-first openers. Creative token-cap: 220→350 (or phase-aware). Orchestrator false-interrupt-attribution fix. Validate with a new `creative_first_opener.json` persona that walks in with a game/product/concept idea and explicitly does not mention business or revenue.

The handoff from the manual /chat session suggests Option B is the natural next step — the brainstorm-register evidence is direct field observation, not speculation.

### Done when (whichever option)

**If Option B (brainstorm-register):**
- Orchestrator prompt updated — creative-first openers route to Creative (or Designer) for at least one turn before Realist gates.
- Creative `description_for_orchestrator` tightened to be a stronger pull on creative/concept openers.
- Creative token cap raised to 350 (or phase-aware variant).
- Orchestrator false-interrupt-attribution bug fixed — routing-reason text should not assert "interrupted" unless an actual interrupt event fired.
- New `creative_first_opener.json` persona validated: Creative fires on R1 (or R2 at latest), panel moves to brainstorm register without 3-round financial gating.
- BUILD.md updated. Self-applied lens reported.

---

## Out of scope next session

- Any second specialist or second major feature in the same session.
- R3 multi-batch work.
- GR#7-specific grader instrumentation (deferred; hand-read only).
- `--verbatim-q*` harness flag for prompt-injection testing (future security cycle).
- R4 async observability close path (opportunistic only if triggered naturally).

---

## Don't look for

- Reflex slash-command working unless the symlink + restart was done (see prior handoff for install command).
- Async fires in the batch bundles (none expected given current persona pool).
- A test that catches GR#7 regressions automatically (not yet built; hand-read only).
