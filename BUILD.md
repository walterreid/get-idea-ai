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

**Status:** COMPLETE.
**Full detail:** [BUILD-ARCHIVE-PHASE-7.md](BUILD-ARCHIVE-PHASE-7.md) (archive of 7.1/7.2/7.3 specialist-replication cycles + 7.4–7.7 summaries).

9 of 10 specialists carry voice rewrites or light-touch v2 updates + §7.2 rules (divergence + evidence-bound) + case libraries + changelog-tracked prompts. Designer is the only specialist without — no field evidence surfaced a Designer-specific discipline gap. All 7.4 · 7.5 · 7.6 · 7.7 also SHIPPED.

- [x] 7.1 Specialist voice rewrite — Marketer v3, Finance v2, Realist v2, Creative v2, Copywriter v2, CX partial-v2, Operations/Legal/Accountant light-touch v2 (9/10 specialists; Designer held back).
- [x] 7.2 Divergence + budget signal hierarchy + evidence-bound — rolled out to all 9 specialists (domain-specialized per specialist) + grader instrument.
- [x] 7.3 Case libraries + vertical knowledge files + recommendation-node enrichment — 9 case libraries totalling 108 cases; 5 vertical playbooks + 8 channel guides at `recommendationNode`.
- [x] 7.4 Length compression (per-specialist token budgets).
- [x] 7.5 Test harness upgrades (25-persona pool, `--organic` mode, bundle naming + `run_metadata.json`).
- [x] 7.6 Recommendation force + research follow-through + R4 async.
- [x] 7.7 Ideation host voice.

**Cycles shipped:** `finance-rep` · `realist-rep` · `brainstorm-register` · `gr7-followup` · `over-yield-diag` · `creative-rep` · `copywriter-rep` · `cx-rep` · `trio-rep` · `over-yield-diag2` (2026-04-17 through 2026-04-19).

**Phase 7 Complete When:** the `ai_consultant` opener produces reference-quality turns tied to Walter's stated constraint and regretted spend. **Confirmed cycle `creative-rep`:** Creative R2 delivers *"That healthcare example is the angle — and it's not 'AI consulting.' It's risk architecture for regulated environments where a hallucination isn't a bad user experience, it's a lawsuit."* — forwardable, specific, commit-with-exclusion shape. Gap closed.


### Judgment-call flags — open observations

These are explicit "we made a call, a future phase should watch for the signal" notes. Do not lose them in the next compression. Closed flags moved to [BUILD-ARCHIVE-PHASE-7.md](BUILD-ARCHIVE-PHASE-7.md).

- **R4 async observability.** Still not observed end-to-end in a real persona transcript. Async-default prompt bias + in-flight guard shipped in commit `0242880`; scheduler proven-correct by direct smoke test against Serper. Next close path: a targeted persona whose R3 volunteers a URL and R4 asks "what are other [category] businesses in my area doing" (the enrichment fetch case), or a manual `/api/chat` exercise.
- **Ideation's soft-signal threshold.** "Route to Ideation on contentless openers" is prompt-level guidance, not a code check. Needs ledger-scale observation across real user openers — does Ideation fire on turn 1 only (expected), turn 2+ (bug), or mask signal a specialist should have caught. Audit the ledger when production traffic accrues.
- **GR#7 behavioral validation gap.** Grader has no GR#7-specific check — it can't distinguish correct yield (owner stopped generating signal) from abandoned room. Current stance: keep GR#7 validation as explicit hand-read in each cycle's done-when checklist. Revisit if hand-reading becomes the bottleneck.
- **Role-player verbatim limitation.** Role-player rewrites persona answers in-character at most rounds. Correct for organic personas, limiting for security-attack testing (`prompt_injector`). Future security cycles may want a `--verbatim-q2` flag or a dedicated security harness.
- **Finance/Realist borderline overlap.** Some Realist cases (pricing-below-break-even, lease-requires-mature-revenue) involve numbers and sit near Finance territory. Stage-1 showed no same-turn duplication. Watch: any `messages.json` where both `finance` and `realist` appear in the same round with overlapping content signals description drift.
- **Creative firing rate 13% + Copywriter firing rate 8%.** Narrow-by-design fire rates post-v2. **2026-04-19 spot-check (session close):** hand-read `glory_days_vintage` and `poza_salon` panel_recommendations from cx-rep cycle — both commit to prioritization with specific exclusion (not category language) **without Creative or Copywriter firing**. Evidence supports the narrow fire rate being correct: panel_recommendation carries the commitment at synthesis; neither specialist needs to fire on every bundle for the output to hit reference quality. Flag downgraded to observational-only.
- **CX firing rate post-v2 ≈ 9%.** Combined cx-rep (1/5) + trio-rep (0/6). Below v1's 17% baseline. Non-firing may be correct routing — persona sets lacked obvious moment-of-truth or supply-side-too-long shapes. Next probe: incidental observation during any future cycle that runs a broader persona set.
- ~~**Organic over-yield R3+R4.**~~ **CLOSED 2026-04-19 (cycle `over-yield-diag2`).** Pre-registered rule ("≥3/3 concept-first organic runs show R3+R4 both-yield") **FAILED — 2/3**. `brand_name_opener` (new persona) showed active R3+R4 engagement because the persona generates decision-shape signal the role-player can engage with; `creative_first_opener` and `product_concept_opener` yielded R3+R4. Off-arc control `pleasantries_first` also yielded R3+R4 (1/2 off-arc), meaning the pattern is **not concept-first-specific**. Reinterpreted: R3+R4 yield correlates with "no new signal from owner in organic mode" — correct behavior per CLAUDE.md GR#7 ("silence is a valid output"). 4/5 grader 6/6 (1 pre-existing `vague_thought` `mentions_business_context` failure unrelated to this cycle). 0 banned-phrase hits across 29 agent turns. No orchestrator prompt edit needed. Bundles: `test/results/*_over-yield-diag2/`.
- ~~**JSON-validity test gap.**~~ **CLOSED 2026-04-19 (session close).** Added [scripts/test-cases-json.ts](scripts/test-cases-json.ts) + wired into `test:quality` as `test:cases-json`. Validates parse + schema + ID uniqueness across `lib/agents/cases/*.json`. 9/9 current files pass (108 total cases).

---

## Principles That Apply to Every Phase

These are not suggestions. They are constraints.

**No hardcoded agents.** If you write `if (agentName === "finance")` anywhere in application logic, you have made a mistake. All behavior is driven by database configs.

**The Orchestrator's reasoning is product surface.** Treat routing decisions as content, not logs. They tell the user why the system is structured the way it is.

**Silence is a valid output.** The system must be able to decide that no agent should speak. Build the yield-to-user path first, not last.

**Interrupts are not edge cases.** They are the primary mechanism by which users participate as peers. Test them as heavily as the happy path.

**Meet the user where they are.** The system must work for someone who has never heard the word "margin" and someone who wants to discuss unit economics. Both deserve the same quality of thinking.

Read CLAUDE.md before starting any phase. If a technical decision conflicts with the product philosophy, the philosophy wins.
