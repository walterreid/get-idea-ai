# BUILD.md — GetIdea.ai

This is the living build plan. Read CLAUDE.md first. Every technical decision here serves the product philosophy defined there.

Check this file before every task. Update it after every task.

Format: `[ ]` not started · `[x]` complete · `[~]` in progress · `[!]` blocked

**Archive split (2026-04-18).** Historical design detail for phases already shipped now lives in [BUILD-ARCHIVE-1.md](BUILD-ARCHIVE-1.md). The entries below for shipped phases carry a one-line status, a link to the archive, and the checked tasks — nothing more. A reader scanning this file sees what's done and what's next; anyone needing *why* a thing was designed a given way follows the archive link.

---

## PHASE 0 — Foundation

**Status:** COMPLETE.
**Full detail:** [BUILD-ARCHIVE-1.md §Phase 0](BUILD-ARCHIVE-1.md#phase-0--foundation)

- [x] Project init, env config, dependencies.
- [x] Supabase client setup + `proxy.ts` session refresh.
- [x] Database schema (`profiles`, `threads`, `messages`, `agent_configs`, `idea_insights`) with RLS.
- [x] UI shell with three-panel layout and placeholder components.
- [~] Set environment variables on hosting provider. MANUAL: Render Dashboard when deploying.

---

## PHASE 1 — Agent Configuration

**Status:** COMPLETE.
**Full detail:** [BUILD-ARCHIVE-1.md §Phase 1](BUILD-ARCHIVE-1.md#phase-1--agent-configuration)

- [x] Agent profile Zod schema and loader (`lib/agents/schema.ts`, `lib/agents/loader.ts`).
- [x] Seed script populates 10+ specialist `agent_configs` with `description_for_orchestrator`.
- [x] All agents seeded active; Orchestrator seeded with `status: 'system'`.
- [x] Orchestrator prompt drafted — reads agent roster at runtime, emits structured routing JSON.

---

## PHASE 2 — LangGraph Orchestrator

**Status:** COMPLETE.
**Full detail:** [BUILD-ARCHIVE-1.md §Phase 2](BUILD-ARCHIVE-1.md#phase-2--langgraph-orchestrator)

- [x] `DeliberationState` annotation in `lib/graph/state.ts`.
- [x] Nodes: `supervisorNode`, `workerNode` (dynamic — no hardcoded names), `interruptHandlerNode`, `recommendationNode`.
- [x] Graph compiled in `lib/graph/compile.ts` with edge routing and `MAX_AGENT_TURNS`.
- [x] Integration tests cover routing, interrupts, and re-evaluation (`npm run test:graph`).

---

## PHASE 3 — Streaming and Client Integration

**Status:** COMPLETE.
**Full detail:** [BUILD-ARCHIVE-1.md §Phase 3](BUILD-ARCHIVE-1.md#phase-3--streaming-and-client-integration)

- [x] `/app/api/chat/route.ts` SSE endpoint with structured events (`routing`, `agent_start`, `token`, `agent_end`, `yield_to_user`, `done`).
- [x] Message persistence (user / agent / orchestrator metadata). `yield_to_user` persisted as orchestrator row with `metadata.message_type: 'yield_to_user'`.
- [x] `lib/hooks/useDeliberation.ts` manages SSE, interrupts via `AbortController`, and agent-status map.
- [x] Auth pages (magic link + PKCE callback). Root redirects based on session.
- [x] Orchestrator routing reason renders as direct message when yielding; expandable annotation on agent messages otherwise.

---

## PHASE 4 — Institutional Memory and Idea Records

**Status:** COMPLETE.
**Full detail:** [BUILD-ARCHIVE-1.md §Phase 4](BUILD-ARCHIVE-1.md#phase-4--institutional-memory-and-idea-records)

- [x] Insight extraction via Claude Haiku; Zod-validated; replaces prior insights each pass (`lib/insights/extract.ts`).
- [x] `prior_insights_context` injected into orchestrator context (`lib/insights/loader.ts`).
- [x] `ThreadSidebar` shows real threads with insight-count badges.
- [x] `/app/ideas` dashboard + `RecommendationBlock` structured card rendered when `agent_name === 'panel_recommendation'`.

---

## PHASE 5 — Web Research and URL Intelligence

**Baseline status:** COMPLETE.
**Full detail:** [BUILD-ARCHIVE-1.md §Phase 5](BUILD-ARCHIVE-1.md#phase-5--web-research-and-url-intelligence-baseline)

Sync-in-POST research: orchestrator emits `research_needed` → `researchNode` (Jina Reader + Serper) → worker. Results persisted as `system` messages with merge-friendly `accumulated_research` metadata. Rate caps 3 URL / 2 search / 10 total per thread.

### Phase 5 evolution — R1–R7

The **R1–R7** table is the canonical map for this codebase (providers, accumulation, triggers, async, epistemics, events, synthesis). The shipped rows (R1, R2, R4, R5) are summarized in the archive; rows below are the ones still open.

**QA:** Research follow-through in transcripts is checked by [lib/test/grade-deliberation.ts](lib/test/grade-deliberation.ts); workflow and bundles are in [docs/testing.md](docs/testing.md).

**Constraint:** No hardcoded agent names in research logic. Orchestrator + `agent_configs` prompts drive behavior.

| Phase | Status | Intent | Primary code / docs |
|-------|--------|--------|----------------------|
| **R1 — Providers** | [x] SHIPPED — see [archive](BUILD-ARCHIVE-1.md#phase-5-evolution--shipped-rows-r1-r2-r4-r5) | Serper (search) + Jina (URL reader). | [lib/tools/web-research.ts](lib/tools/web-research.ts) |
| **R2 — Accumulation model** | [x] SHIPPED — see [archive](BUILD-ARCHIVE-1.md#phase-5-evolution--shipped-rows-r1-r2-r4-r5) | Merge-friendly `accumulated_research` reloaded into graph state. | [lib/graph/state.ts](lib/graph/state.ts) |
| **R3 — Triggers and batches** | [~] | Batch types (entity disambiguation, primary deep-dive, market context, failure analysis, budget feasibility) aligned to **conversation milestones** (CLAUDE three acts), not a timer. Partial (2026-04-18): orchestrator prompt now includes explicit **"hold research until after 2 AI turns"** guidance, matching Zansei's post-Q2 trigger point. Single-batch-per-supervisor-turn remains until true async is the default (see R3 blockers below). | [scripts/seed-agents.ts](scripts/seed-agents.ts) orchestrator prompt; `research_orchestrator.py` in `relevant-zansei-materials/` is the reference implementation |
| **R4 — Async / non-blocking** | [x] SHIPPED — see [archive](BUILD-ARCHIVE-1.md#phase-5-evolution--shipped-rows-r1-r2-r4-r5) | Scheduler + `async: true` flag. | [lib/research/scheduler.ts](lib/research/scheduler.ts) |
| **R5 — Epistemics** | [x] SHIPPED — see [archive](BUILD-ARCHIVE-1.md#phase-5-evolution--shipped-rows-r1-r2-r4-r5) | *User truth beats search truth.* | [scripts/seed-agents.ts](scripts/seed-agents.ts) |
| **R6 — Events** | [ ] | Extend SSE toward batch-level events (`research_started` with batch id, `tool_call`, batch complete). Stay within [DESIGN.md](DESIGN.md): no bouncing dots. | [lib/types/stream.ts](lib/types/stream.ts), [useDeliberation.ts](lib/hooks/useDeliberation.ts), route |
| **R7 — Synthesis hooks** | [ ] | Optional tool-free "strategic brief" before heavy outputs (recommendation), mapping assumption-check / implications from the strategy doc — only if latency and product fit allow. | [lib/graph/nodes.ts](lib/graph/nodes.ts) or post-round pipeline |

**R3 blockers before full ship:** in-flight locking (Zansei's `_flight_lock` prevents duplicate batches; our scheduler doesn't have this guard yet — acceptable at current volume, but a prerequisite for R3) and the async-default flip (see Judgment-call flags below).

**MANUAL:** Monitor Serper and Jina quotas vs historical Tavily usage.

---

## PHASE 6 — Polish, Edge Cases, and Production Hardening

**Status:** §6.1 / §6.3 / §6.4 NOT STARTED. §6.2 methodology COMPLETE and archived.

### 6.1 Error Handling

- [ ] Graceful handling of LLM API failures mid-stream. The UI should show "Agent encountered an issue" rather than crashing.
- [ ] Rate limiting on the API route.
- [ ] Token budget management — prevent runaway conversations from exceeding context limits.

### 6.2 Conversation Quality and Testing

**Status:** COMPLETE (methodology).
**Full detail:** [BUILD-ARCHIVE-1.md §Phase 6.2](BUILD-ARCHIVE-1.md#phase-62--conversation-quality-and-testing)

Canonical ladder (A–E), tiers (1–3), review protocols (A/B/C), human rubric, multi-round persona protocol, and hard-fail checks all live in the archive. Practical entry points:

- `npm run test:quality` — combined local gate (graph + grade + fixtures). Details in [docs/testing.md](docs/testing.md).
- `npm run test:persona` — multi-round persona harness (Phase 7.5).
- [lib/test/grade-deliberation.ts](lib/test/grade-deliberation.ts) — tripwire grader + instruments.

### 6.3 Performance

- [ ] Supervisor routing decisions should complete in under 2 seconds.
- [ ] Agent responses should begin streaming within 3 seconds of routing.
- [ ] The UI must remain responsive during generation.

### 6.4 Deployment

- [ ] Staging environment with seed data.
- [ ] Production deploy checklist: environment variables, RLS verification, CORS, rate limits.
- [ ] LangSmith integration for debugging orchestrator decisions in production.

---

## PHASE 7 — Advisor Instrument Tuning

**Goal:** Specialists speak with lived-in specificity. The Orchestrator already sings — this phase tunes the **instruments**, not the conductor. Output quality moves from "correct but generic" (original observed state) to "reference quality" (CLAUDE.md standard).

**Read first:** CLAUDE.md (Reference quality, Golden rules — especially #1, #4, #6). [BUILD.md §6.2](#62-conversation-quality-and-testing) (multi-round persona protocol).

**Status:** IN PROGRESS — 7.1 Marketer + Finance + Realist + Creative-v2 routing · 7.2 instrument · 7.3 Marketer-layer + Finance + Realist · 7.4 · 7.5 · 7.6 · 7.7 all SHIPPED. Brainstorm-register cycle `brainstorm-register` closed 2026-04-18. **Next coherent block: 7.1/7.2/7.3 replication to the remaining 6 specialists** (Creative got a routing + token-cap fix this cycle, not a full voice rewrite).

**Sequencing reality (vs. original linear ordering):**

- 7.5 (multi-round harness) was pulled forward ahead of 7.1–7.4 because without it, specialist changes could not be measured.
- 7.3 (case library + knowledge files) was done before 7.2 (divergence / budget / evidence rules) because the Marketer 7.1 evidence showed voice-rewrite alone didn't move the quality needle — case material was the load-bearing lever.
- 7.2's rules were integrated directly into 7.3's `recommendationNode` wiring (divergence rule, budget signal hierarchy, assumption check) rather than shipped as a separate subphase.
- 7.4 length compression shipped 2026-04-18 with per-specialist token budgets in [lib/agents/token-budgets.ts](lib/agents/token-budgets.ts).

**Primary falsifiability case:** the Walter Reid / `ai_consultant` persona. Same opener, before and after each subphase — but real deliberations pull 3–4 specialists per persona, so specialist replication validates against the full 12-persona batch, not 1:1 persona-to-specialist (see 7.1 replication note below).

**Source material:** prompt and harness patterns transplanted from the ad101 / Zansei project. Local reference bundle at `relevant-zansei-materials/` (gitignored — see [relevant-zansei-materials/README.md](relevant-zansei-materials/README.md) if you have a local copy; also a smaller in-repo copy at `test/external-references/zansei/`). See [CLAUDE.md §6](CLAUDE.md) for the philosophical rule this operationalizes.

### Judgment-call flags carried forward

These are explicit "we made a call, a future phase should watch for the signal" notes. Do not lose them in the next compression.

- **R4 async observability.** Still not observed end-to-end in a real persona transcript. The async-default prompt bias and in-flight guard shipped in commit `0242880`. The Finance cycle 19-persona batch (2026-04-18) produced 0 async fires and 2 sync fires (both on the "user just shared a URL" carve-out, correctly sync). The current 18-persona pool does not include a persona whose natural R3/R4 asks a market/competitor question AFTER the entity is already established — that's the shape that would trip the async branch under the new prompt. Next close path: either a targeted persona whose R3 volunteers a URL and R4 asks "what are other [category] businesses in my area doing" (the enrichment fetch case), or a manual `/api/chat` exercise. Not a blocker for further specialist replication. Scheduler remains proven-correct by direct smoke test against Serper.
- **Ideation's soft-signal threshold.** "Route to Ideation on contentless openers" is prompt-level guidance, not a code check. Intentional — keeping orchestrator judgment intact is a Phase 7 principle. The threshold needs observation across real user openers. A future phase should audit the ledger for: how often Ideation fires on turn 1 (expected: pure greetings only); how often it fires on turn 2+ (would be a bug — handoff not working); whether a specialist is wrongly skipped because Ideation picked up an opener with actual signal. See §7.7 archive entry.
- **Walter falsifiability framing.** Run the full 12-persona batch and check whatever specialists naturally fire. Not 1:1 persona-to-specialist — real deliberations pull 3–4 specialists per conversation. Specialists whose archetype is rarely triggered by the existing pool (probably Legal, possibly Accountant) may warrant a targeted persona added later, but this is additive, not a prerequisite for specialist replication.
- **GR#7 behavioral validation gap (2026-04-18, post-gr7-followup).** Added GR#7 ("the conversation is not a form") + `--organic` harness mode + 5 Zansei personas. All 5 cycle runs passed grader 6/6, but the grader has **no GR#7-specific check** — it can't distinguish "panel correctly went silent because the user wasn't asking a new question" from "panel had no idea what to do and gave up." The cycle's GR#7 evidence is hand-read transcripts (especially `pleasantries_first` and `lagged_answerer` under `--organic`), which won't run again next cycle. Two close paths: (a) extend grader with GR#7 instruments (consecutive-yield count, `panel_recommendation` skips on organic runs, ratio of CX/Ideation turns to off-arc personas) — risk: instrument drift; or (b) keep GR#7 validation as explicit hand-read in each cycle's done-when checklist — favored for now per "grader-as-floor-not-ceiling" memory. Revisit if hand-reading becomes the bottleneck.
- **Role-player verbatim limitation (2026-04-18).** The role-player rewrites persona answers in-character at most rounds rather than pasting `expected_answer_style.q*` verbatim. This is correct for organic personas (style preservation) but limits attack-vector testing for `prompt_injector`: only the R1 intake answer and scripted R3 wrong-claim made it into the conversation; the XML-tag breakout from `expected_answer_style.q2_primary_challenge` was rewritten by the role-player and never reached the panel. Both attacks that *did* fire were cleanly ignored. Future security cycles may want a `--verbatim-q2` flag or a dedicated security harness, not this one's responsibility.
- **Finance/Realist borderline overlap (2026-04-18, realist-rep cycle, hidden-assumptions lens).** Some Realist cases (pricing-below-break-even, lease-requires-mature-revenue) involve numbers and sit near Finance territory. The hidden assumption is that the orchestrator will consistently assign the pricing flaw to Finance (numeric) and the structural planning flaw to Realist (market/timing). Stage-1 showed no same-turn Finance+Realist duplication — both specialists fired appropriately on distinct trigger shapes. Watch for this pattern in subsequent cycles: if Finance and Realist begin making the same point from different angles in the same round, it signals description drift. The close signal: any `messages.json` where both `finance` and `realist` appear in the same round with overlapping content.
- ~~**Brainstorm-register routing gap (2026-04-18, manual /chat session).**~~ **CLOSED 2026-04-18 (cycle `brainstorm-register`).** Creative-first openers now route to Creative on R1. New orchestrator subsection "When the Opener Is a Concept, Not a Business" names the trigger narrowly (game idea / product concept / brand name / "I have an idea for X" with no business framing) and sequences Realist/Finance to later rounds if structural or budget reality becomes relevant. Validated: `creative_first_opener` persona fires Creative R1, grader 6/6, zero Finance/Realist turns in R1/R2. Smoke test against 3 business-signal personas (ai_consultant → marketer, bakery_delivery → finance, stamatis_restaurant → realist) confirms no Creative over-fire. See [docs/manual_chat_2026-04-18_game_brainstorm.md](docs/manual_chat_2026-04-18_game_brainstorm.md) and [docs/handoffs/2026-04-18-post-brainstorm-register.md](docs/handoffs/2026-04-18-post-brainstorm-register.md).
- ~~**Creative token-cap truncation (2026-04-18, manual /chat session).**~~ **CLOSED 2026-04-18 (cycle `brainstorm-register`).** Creative cap raised 220 → 350 in [lib/agents/token-budgets.ts](lib/agents/token-budgets.ts), matching Realist's quantitative-reasoning band. Cycle bundle: advisor turns 234 and 227 words, both complete sentences, zero mid-sentence truncation. Orchestrator false-interrupt-attribution guard added as a new CRITICAL rule in the orchestrator prompt (prompt-only fix per "routing-is-the-art" memory; state plumbing deferred). See [docs/manual_chat_2026-04-18_game_brainstorm.md](docs/manual_chat_2026-04-18_game_brainstorm.md).
- **Organic over-yield after a clean R1 (2026-04-18 observation; 2026-04-19 diagnostic, cycle `over-yield-diag`).** Initial observation: `creative_first_opener` 5-round organic bundle yielded R2–R4 after a clean Creative R1. Diagnostic cycle 2026-04-19 ran creative_first_opener 3× organic + 5 off-arc organic controls (pleasantries_first, lagged_answerer, jerk_rusher, therapist_cautious, vague_thought). **Strict pre-registered rule (R2+R3 both yield after R1 open question, ≥2/3) did NOT reproduce — 1/3.** BUT a different shape reproduced 4/4: **R3 yields in all 4 creative-first runs and R4 yields in all 4** (R2 is stochastic — yields 2/4, engages 2/4; R3+R4 are deterministic). 0/5 off-arc runs had any yield round — pleasantries/lagged/jerk/therapist/vague all engaged every round with multi-specialist depth. Contrast: creative-first = 100% multi-round yield (2–4 consecutive); off-arc = 0% yield. Pattern is real but targets R3+R4, not R2+R3, and only shows up on concept-first openers. Per pre-registration discipline, no prompt edit this cycle. Next test carefully: (a) rule targets R3+R4, (b) at least one additional concept-first persona (product concept, brand name) to confirm the pattern is about the *opener shape* not this specific persona's prose. Bundles: `test/results/creative_first_opener_20260419_02510*_over-yield-diag/` (3 runs) and 5 off-arc bundles in the same cycle. Do not fix preemptively.

### 7.1 Specialist voice rewrite

**Status:** Marketer v2/v3 SHIPPED (2026-04-17 / 2026-04-18) · **Finance v2 SHIPPED (2026-04-18)** · **Realist v2 SHIPPED (2026-04-18)**. Other 7 NOT yet rewritten.
**Full detail for Marketer ship:** [BUILD-ARCHIVE-1.md §Phase 7.1](BUILD-ARCHIVE-1.md#phase-71--specialist-voice-rewrite-marketer-shipped)

- [x] Marketer v3 — lived-in stance, voice-discipline section, banned-phrase list, "use the case, don't cite it" rule. Changelog block above the Marketer object in [scripts/seed-agents.ts](scripts/seed-agents.ts).
- [x] **Finance v2 (2026-04-18)** — lived-history opener replacing generic "discussed with numbers" framing; voice discipline with Finance-specific banned smoke-signal phrases ("optimize your pricing", "build a financial plan", "improve your unit economics", "watch your cash flow", "keep your costs low", "focus on profitability"); dedicated Budget Signal Hierarchy section (STATED > CURRENT > HISTORICAL > INFERRED) mirroring `recommendationNode`'s language so per-turn and synthesis speak the same grammar; divergence rule; evidence-bound rule; "use the case, don't cite it" discipline. Paired with tightened `description_for_orchestrator` that explicitly names Finance-vs-Realist ("Finance names the specific number that is wrong, missing, or misapplied") and Finance-vs-Accountant ("Finance is unit economics; Accountant is mechanics/compliance"). Validated against 19-persona batch — **Finance fired in 16/19**, zero banned phrases, budget hierarchy visibly applied on `ai_consultant` (LinkedIn boost treated as opportunity-cost-dominated rather than willingness-to-spend). Changelog block above the Finance object in [scripts/seed-agents.ts](scripts/seed-agents.ts). 35 total Finance turns across batch; max consecutive Finance 5 (earned each turn on distinct numerics). See [lib/agents/cases/finance.json](lib/agents/cases/finance.json) for the case library shipped alongside.
- [x] **Realist v2 (2026-04-18)** — lived-history identity opener replacing credential-framing ("you are the anchor, you say the thing nobody is saying"); voice discipline with Realist-specific banned smoke-signal phrases ("the market is crowded," "you'll need to differentiate," "significant headwinds," "manage your risks," etc.); "name the specific flaw, not the category" rule (Realist's structural equivalent of Finance's budget-signal hierarchy — forces the flaw to be named precisely, not by category, with the explicit test: "could you replace this business's name and have the critique still read accurate?"); divergence rule; evidence-bound rule; "use the case, don't cite it" discipline. Paired with tightened `description_for_orchestrator` naming four specific structural-flaw trigger patterns and the Finance/Realist distinction ("Finance names the specific number; Realist names structural flaws — market position, dependency concentration, timing, problem-solution mismatch"). 14 cases in [lib/agents/cases/realist.json](lib/agents/cases/realist.json) across professional_services ×4, local_services ×3, restaurant_food ×2, fitness_wellness ×2, ecommerce_dtc ×3. Stage-1: 3/5 Realist-likely personas fired (ai_consultant, therapist_cautious, hudson_home), zero banned phrases, all 5 pass grader 6/6. Batch (cycle `realist-rep`, 18 unique personas — cut short to save tokens): **Realist fired in 15/18**, zero Finance+Realist same-round duplications, all personas grader-pass. Did not fire on legal_sensitive, opening_greeting, poza_salon — all correct (low structural-flaw trigger). 1 organic run (lagged_answerer) confirmed GR#7 behavior. Changelog block above the Realist object in [scripts/seed-agents.ts](scripts/seed-agents.ts).
- [x] **Creative — routing + token-cap cycle only (2026-04-18, cycle `brainstorm-register`).** Not a full voice rewrite. Four edits: (1) orchestrator prompt subsection "When the Opener Is a Concept, Not a Business" — narrowly-triggered R1/R2 Creative routing for concept-first openers (game ideas, product concepts, brand names, "I have an idea for X" without business framing); Realist/Finance sequencing is pushed to R3+ rather than suppressed. (2) Creative `description_for_orchestrator` rewrite following Finance v2 / Realist v2 pattern — role opener + 4 numbered triggers + Creative-vs-Designer divergence rule + Creative-vs-Ideation distinction + grounding clause. (3) Creative token cap 220 → 350 in [lib/agents/token-budgets.ts](lib/agents/token-budgets.ts). (4) Orchestrator CRITICAL rule guarding against false-interrupt attribution when an agent turn ends mid-sentence from token budget. Validated: `creative_first_opener` R1 → Creative, grader 6/6, advisor turns 234/227 words (both complete sentences), 3/3 business-signal smoke tests route to their business specialists (no Creative over-fire). Changelog blocks above the orchestrator and Creative objects in [scripts/seed-agents.ts](scripts/seed-agents.ts). A full Creative voice rewrite (voice-discipline section, cases, divergence + evidence-binding rules) remains deferred to the specialist replication pattern — this cycle was a routing + truncation fix, not a full 7.1/7.3 block.
- [ ] **Other 6 specialists — next block.** Pattern from Marketer/Finance/Realist replication: voice rewrite + cases + §7.2 rules + description tightening, one per cycle. Remaining: Copywriter, Designer, Accountant, Operations, Legal, CX. Operations and Accountant under-fire; CX has been holding its own. Pick one per cycle for focused iteration.

  **Validation approach (corrected 2026-04-18).** Earlier thinking implied each specialist needed a 1:1 persona that *primarily* exercised it. That framing was too rigid — real deliberations pull 3–4 specialists per persona, and the batch suite already covers this naturally. The correct pattern is:

  - Replicate voice + cases to the next specialist (pick one at a time for focused iteration).
  - Run the **full 19-persona batch** — the specialist fires when the orchestrator judges it useful, across whatever personas happen to pull it. Walter doesn't have to exercise the Accountant for the Accountant's changes to be validated; several personas in the batch will pull it naturally over the suite.
  - Check the grader's output on those naturally-triggered turns. If a new Accountant prompt ships and not a single persona in the batch surfaces an Accountant turn, *that* is the signal that the orchestrator description or routing guidance needs tightening — not that the specialist is broken.
  - **Stage-1 checkpoint pattern** (confirmed by Finance cycle 2026-04-18): before running the full batch, run 5 specialist-likely personas first. If the specialist fires in 0–1 of the 5, the description needs tightening — not the voice. Finance's initial description under-fired (0 fires in 2 personas); tightening with explicit "bring in when numbers are *misapplied*, not only *missing*" + Finance-vs-Realist / Finance-vs-Accountant distinctions moved it to 5/5 Stage 1 and 16/19 batch.
  - For specialists whose archetype is rarely triggered by the existing pool (probably Legal, possibly Accountant — also confirmed by this batch: Legal 4 turns, Accountant 1 turn), consider adding a targeted persona the way `legal_sensitive.json` was added — but this is additive, not a prerequisite.

### 7.2 Divergence, budget signal hierarchy, evidence binding

Three generative constraints, lifted from ad101/Zansei `plan_generation.md`. These are not phrase bans — they shape what a specialist is allowed to say in the first place. **Partially absorbed** into 7.3's `recommendationNode` wiring; the per-specialist rollout still pending, folded into the 7.1/7.3 replication cycle.

- **Divergence rule** (all specialists): *"When your expertise leads you to a recommendation the conversation didn't surface, name the bridge. The owner should never be surprised by a recommendation they didn't see coming."*
- **Budget signal hierarchy** (Finance agent specifically):
  1. **STATED** — owner explicitly said they can/will spend $X → use directly.
  2. **CURRENT** — owner currently spending $X → floor, not ceiling.
  3. **HISTORICAL** — owner spent $X on past efforts they described negatively → this is **pain evidence, not willingness to spend again.**
  4. **INFERRED** — no explicit signal → default conservative; name the inference.
- **Evidence-bound rule** (all specialists): *"Every recommendation must reference either something the owner said OR something from research. If it can't be tied to evidence, cut it."*

- [ ] Add divergence rule to all specialist prompts (rollout with 7.1/7.3 replication — Marketer has it in v3; Finance has it in v2; 8 remaining).
- [x] **Budget signal hierarchy in Finance prompt (2026-04-18)** — dedicated section in [scripts/seed-agents.ts](scripts/seed-agents.ts) Finance object, mirroring the exact STATED / CURRENT / HISTORICAL / INFERRED grammar already enforced at [recommendationNode](lib/graph/nodes.ts). Canonical case in the batch: `ai_consultant` R3 — Walter proposes another $100–200 LinkedIn boost after describing the prior $300–500 as regretted; Finance names the opportunity-cost-dominated math rather than re-upping the channel.
- [ ] Add evidence-bound rule to all specialist prompts (Marketer + Finance have it; 8 remaining).
- [x] **Evidence-binding instrument in grader (2026-04-18).** Added `instruments.advisor_turns.suspect_unbound_turns` counter in [lib/test/grade-deliberation.ts](lib/test/grade-deliberation.ts) — counts agent turns >80 words with no user-quote-echo (persona hints) AND no research-reference signal. **Instrument only, NOT factored into `overall_pass`.** Shared `RESEARCH_REFERENCE_SIGNALS` list between the existing `researchFollowthroughOk` check and the new `isTurnEvidenceBound` helper. Unit tests in [scripts/test-grade.ts](scripts/test-grade.ts) cover: long+unbound=1, long+persona-echo=0, short=0, long+research-reference=0. Finance-cycle batch (19 personas) recorded 21 suspect turns total across all specialists — observational; some long-but-bound Finance turns didn't echo the business name and counted, which is the pattern the counter was designed to surface.

**Done when:** primary persona transcript shows at least one specialist naming a bridge, and the Finance turn handles regretted LinkedIn boost spend as HISTORICAL pain rather than willingness. **(Second half confirmed 2026-04-18 on `ai_consultant` with Finance v2.)**

### 7.3 Hand-curated case library + vertical knowledge files

**Status:** Marketer layer SHIPPED (2026-04-18) · **Finance case library SHIPPED (2026-04-18)**. Other 8 case libraries NOT yet created.
**Full detail:** [BUILD-ARCHIVE-1.md §Phase 7.3](BUILD-ARCHIVE-1.md#phase-73--hand-curated-case-library--vertical-knowledge-files-marketer-layer)

- [x] Layer A — Per-specialist cases structure; Marketer 13 cases shipped.
- [x] **Finance case library shipped (2026-04-18):** 14 cases in [lib/agents/cases/finance.json](lib/agents/cases/finance.json) indexed by `business_type_category` (professional_services ×4, local_services ×3, restaurant_food ×2, fitness_wellness ×2, ecommerce_dtc ×3). Each case exhibits a specific budget-hierarchy pattern or money-shape (HISTORICAL-pain-not-willingness, owner-labor-not-free, margin-swap-dressed-as-new-revenue, opportunity-cost-ceiling, payback-period-vs-monthly-revenue, seasonal trough reserve, new-location ramp curve). Follows Marketer schema exactly; no loader changes needed ([case-loader.ts](lib/agents/case-loader.ts) auto-discovers `finance.json`).
- [x] Layer B — 5 vertical playbooks + 8 channel guides in `lib/knowledge/`; injected at `recommendationNode` only.
- [x] Recommendation-node enrichment (divergence / budget / assumption-check / evidence rules).
- [ ] **Specialist replication — the remaining block.** 8 × (case library JSON + validation against naturally-triggering personas in the full 19-persona batch). Pair with each specialist's 7.1 voice rewrite and 7.2 rule rollout; pick one specialist at a time for focused iteration.

### 7.4 Length compression as consequence

**Status:** SHIPPED 2026-04-18 (commit `8955276`).
**Full detail:** [BUILD-ARCHIVE-1.md §Phase 7.4](BUILD-ARCHIVE-1.md#phase-74--length-compression-as-consequence)

- [x] Per-specialist token budgets in [lib/agents/token-budgets.ts](lib/agents/token-budgets.ts) (static config, not a DB column — migration path documented for later).
- [x] `buildLLMClient` honors optional `maxTokens`; `workerNode` passes per-specialist cap.
- [x] Spot-checks showed 21–46% reduction across advisor turns; no mid-sentence truncation observed.

Full batch re-validation folds into the Phase 7.1/7.3 specialist replication cycle since those changes also affect advisor-turn shape.

### 7.5 Test harness upgrades

**Status:** SHIPPED 2026-04-17 (pulled forward ahead of 7.1–7.4).
**Full detail:** [BUILD-ARCHIVE-1.md §Phase 7.5](BUILD-ARCHIVE-1.md#phase-75--test-harness-upgrades)

- [x] Typing delay ([lib/test/pacing.ts](lib/test/pacing.ts)), response-length bands by personality, separate-Claude role-player ([lib/test/role-player.ts](lib/test/role-player.ts)).
- [x] Multi-round harness [scripts/run-persona-session.ts](scripts/run-persona-session.ts) with R1–R6, cross-run ledger, `npm run test:persona`.
- [x] 18-persona pool; grader `instruments` block; 12-persona batch validation (11/12 pass at 2026-04-18).
- [x] **24-persona pool as of 2026-04-18 (post-GR#7 cycle)** — 5 additional Zansei personas added: `jerk_rusher` (hostile + impatient), `lagged_answerer` (out-of-sync answers), `pleasantries_first` (social-first / refuses to be transactional — designed for `--organic`), `prompt_injector` (verbatim Zansei attack strings), `therapist_cautious` (clinical-ethics-aware register, distinct from `slate_psychology`'s skeptical register). All 5 ran 4-round in cycle `gr7-followup`; all passed grader 6/6.
- [x] **25-persona pool as of 2026-04-18 (post-brainstorm-register cycle)** — `creative_first_opener` added (Mira, hobby game concept, no business framing). Designed as falsifiability case for the orchestrator "Concept, Not a Business" routing edit. Organic-only by design (`organic_recommended: true`) — scripted R3 wrong-claim / R4 contradiction would reintroduce business framing artificially.
- [x] **`--organic` harness mode shipped 2026-04-18** ([scripts/run-persona-session.ts](scripts/run-persona-session.ts)) — disables scripted R3/R4 stimuli AND the forced R5 closure; role-player drives every round. Built specifically for personas whose entire point is testing off-arc behavior the scripted scaffold defeats. See GR#7 in CLAUDE.md.
- [x] **Bundle naming + `run_metadata.json` shipped 2026-04-18** ([lib/test/write-result-bundle.ts](lib/test/write-result-bundle.ts)) — bundle dir format extended to `<persona>_<stamp>[_<case_id>][_<cycle>]/`, preserving Zansei's persona-first sort. Each bundle now writes `run_metadata.json` with `{cycle, persona_id, rounds, research_mode, organic, role_player_model}` for cheap `jq` aggregation across cycles. New `--cycle <tag>` and `--organic` flags are additive — existing usage unchanged.
- [ ] Add before/after transcript pair for primary persona (Walter) into `test/fixtures/` — unblocked by Phase 7.4. Fold into the specialist-replication cycle so the "after" captures both length-compressed state AND the broader voice-rewrite surface as specialists roll out.

### 7.6 Recommendation force, research follow-through, R4 async research

**Status:** SHIPPED 2026-04-18 (commit `5b53b2c`).
**Full detail:** [BUILD-ARCHIVE-1.md §Phase 7.6](BUILD-ARCHIVE-1.md#phase-76--recommendation-force-research-follow-through-r4-async-research)

- [x] Recommendation force — `force_recommendation` state flag short-circuits supervisor.
- [x] Research follow-through rule in `WORKER_RESEARCH_EPISTEMICS` — closes silence-after-research failure.
- [x] R4 async — [lib/research/scheduler.ts](lib/research/scheduler.ts) + `async` flag on `RoutingDecisionSchema.research_needed`.

Judgment-call flag (async observability) carried forward at the top of Phase 7.

### 7.7 Ideation — the host voice for contentless openers

**Status:** SHIPPED 2026-04-18 (commit `a38d2ba`).
**Full detail:** [BUILD-ARCHIVE-1.md §Phase 7.7](BUILD-ARCHIVE-1.md#phase-77--ideation--the-host-voice-for-contentless-openers)

- [x] New `ideation` specialist record (host voice, tight 140-token cap).
- [x] Orchestrator "Opening the Room" section routes to Ideation only on contentless openers; explicit "no two in a row" rule.
- [x] Color + persona + `test-graph` active-agent count updated to 11.

Design principle carried forward: Ideation is a **host**, not a peer specialist. Future host roles (e.g., closing host after recommendation) should be modeled the same way, not added to the specialist roster. Judgment-call flag (soft-signal threshold observability) carried forward at the top of Phase 7.

### Phase 7 Complete When:

The same opener (*"nobody really knows about my AI consultancy — I'm competing against people who watched a few YouTube videos"*) produces a visibly different advisor turn after all subphases.

**Before:** *"You should clarify your positioning and build a thought-leadership engine to differentiate in a crowded market."*

**After:** something tied to Walter's stated constraint and regretted spend — naming what's **at risk** (invisibility in a market where differentiation itself is invisible) and what not to do (another LinkedIn boost treating past pain as willingness), before naming what to do. Specific enough to forward to a friend who would say: *"they heard you."*

**Deferred to a potential Phase 8 (only if Phase 7 does not close the gap):** Orchestrator running-diagnosis schema (stated vs observed problem, `plan_readiness` flag), diagnosis-pattern case indexing, stop-list tracked across turns. Do not pre-build these — the Orchestrator already reads the room well; adding metadata layers risks complicating what sings.

### Parked considerations (not scheduled — revisit when relevant)

These are thoughts that emerged during Phase 7 cycles but aren't the right call now. Captured so they survive into future planning without growing the current scope.

- **Potential "Product" specialist (raised 2026-04-18).** Product thinking — *"what problem does this solve, for whom, how would you test it cheaply, is your roadmap reflecting what you've learned or what you originally hoped?"* — is a distinct register not cleanly held by the current 10. If added, it would be a full peer specialist (own voice, own case library, own falsifiability persona — Walter is a good candidate since pre-marketing AI consulting is exactly the archetype Product would challenge). **Not bundled into 7.7.** Decision deferred: add as its own cycle post-specialist-replication, only if field evidence shows the existing panel consistently misses product-framing questions. Risk of conflating with Marketer/Realist if scoped carelessly — the test before adding is whether a well-framed Product prompt produces materially different turns from what Marketer or Realist already say on the same persona.
- **Ideation vs Creative/Designer — "brainstorm" register? (raised 2026-04-18).** Ideation (7.7) is scoped narrowly as a cold-open host. But there's a separate thought worth holding: what happens when a user walks in with *"I have five business ideas and I need help picking one"* or *"what game should I create"*? That's a real ideation *process* inside the conversation — not orientation. Creative touches brand/angle-finding; Designer touches tangible expression; neither is *"help me flesh out and choose between alternatives"*. Could be covered by a richer Creative prompt, or by a dedicated "brainstorm" register. **Not a new specialist yet** — probably a prompt enrichment to Creative when we get to 7.1/7.3 replication for Creative, not a new seat at the table. Keep the specialist count stable unless field evidence forces otherwise.
- **Potential "Champion" / "Evangelist" as Realist's opposite (raised 2026-04-18).** If field evidence ever shows the room is systemically too skeptical — ideas getting critiqued without anyone naming genuine promise — a counterweight voice whose job is *"here's why this could work"* might be warranted. Creative leans that way sometimes but isn't dedicated to it. Do not add preemptively. The 12-persona batch doesn't currently show this pattern.

---

## Principles That Apply to Every Phase

These are not suggestions. They are constraints.

**No hardcoded agents.** If you write `if (agentName === "finance")` anywhere in application logic, you have made a mistake. All behavior is driven by database configs.

**The Orchestrator's reasoning is product surface.** Treat routing decisions as content, not logs. They tell the user why the system is structured the way it is.

**Silence is a valid output.** The system must be able to decide that no agent should speak. Build the yield-to-user path first, not last.

**Interrupts are not edge cases.** They are the primary mechanism by which users participate as peers. Test them as heavily as the happy path.

**Meet the user where they are.** The system must work for someone who has never heard the word "margin" and someone who wants to discuss unit economics. Both deserve the same quality of thinking.

Read CLAUDE.md before starting any phase. If a technical decision conflicts with the product philosophy, the philosophy wins.
