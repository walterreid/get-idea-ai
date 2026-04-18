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

**Status:** IN PROGRESS — 7.1 Marketer · 7.3 Marketer-layer · 7.4 · 7.5 · 7.6 · 7.7 all SHIPPED. **Next coherent block: 7.1/7.3 replication to the other 9 specialists** (now unblocked by 7.4). 7.2's specialist-prompt rollout folds into that replication.

**Sequencing reality (vs. original linear ordering):**

- 7.5 (multi-round harness) was pulled forward ahead of 7.1–7.4 because without it, specialist changes could not be measured.
- 7.3 (case library + knowledge files) was done before 7.2 (divergence / budget / evidence rules) because the Marketer 7.1 evidence showed voice-rewrite alone didn't move the quality needle — case material was the load-bearing lever.
- 7.2's rules were integrated directly into 7.3's `recommendationNode` wiring (divergence rule, budget signal hierarchy, assumption check) rather than shipped as a separate subphase.
- 7.4 length compression shipped 2026-04-18 with per-specialist token budgets in [lib/agents/token-budgets.ts](lib/agents/token-budgets.ts).

**Primary falsifiability case:** the Walter Reid / `ai_consultant` persona. Same opener, before and after each subphase — but real deliberations pull 3–4 specialists per persona, so specialist replication validates against the full 12-persona batch, not 1:1 persona-to-specialist (see 7.1 replication note below).

**Source material:** prompt and harness patterns transplanted from the ad101 / Zansei project. Local reference bundle at `relevant-zansei-materials/` (gitignored — see [relevant-zansei-materials/README.md](relevant-zansei-materials/README.md) if you have a local copy; also a smaller in-repo copy at `test/external-references/zansei/`). See [CLAUDE.md §6](CLAUDE.md) for the philosophical rule this operationalizes.

### Judgment-call flags carried forward

These are explicit "we made a call, a future phase should watch for the signal" notes. Do not lose them in the next compression.

- **R4 async observability.** Never observed end-to-end in a real persona transcript — orchestrator was conservative on both personas tested and didn't emit `async: true`. Scheduler proven correct by direct smoke test against Serper. A future cycle needs either (a) a persona that reliably triggers research (volunteers URL + asks research-gated question) or (b) an orchestrator-prompt bias flip making async the default for enrichment fetches. See §7.6 archive entry for context.
- **Ideation's soft-signal threshold.** "Route to Ideation on contentless openers" is prompt-level guidance, not a code check. Intentional — keeping orchestrator judgment intact is a Phase 7 principle. The threshold needs observation across real user openers. A future phase should audit the ledger for: how often Ideation fires on turn 1 (expected: pure greetings only); how often it fires on turn 2+ (would be a bug — handoff not working); whether a specialist is wrongly skipped because Ideation picked up an opener with actual signal. See §7.7 archive entry.
- **Walter falsifiability framing.** Run the full 12-persona batch and check whatever specialists naturally fire. Not 1:1 persona-to-specialist — real deliberations pull 3–4 specialists per conversation. Specialists whose archetype is rarely triggered by the existing pool (probably Legal, possibly Accountant) may warrant a targeted persona added later, but this is additive, not a prerequisite for specialist replication.

### 7.1 Specialist voice rewrite

**Status:** Marketer v2/v3 SHIPPED (2026-04-17 / 2026-04-18). Other 9 NOT yet rewritten.
**Full detail for Marketer ship:** [BUILD-ARCHIVE-1.md §Phase 7.1](BUILD-ARCHIVE-1.md#phase-71--specialist-voice-rewrite-marketer-shipped)

- [x] Marketer v3 — lived-in stance, voice-discipline section, banned-phrase list, "use the case, don't cite it" rule. Changelog block above the Marketer object in [scripts/seed-agents.ts](scripts/seed-agents.ts).
- [ ] **Other 9 specialists — UNBLOCKED 2026-04-18.** Evidence from the 12-persona batch run (11/12 pass) shows Marketer v3 + case injection produces reference-quality turns when the case-match is tight. Original hold condition was Phase 7.4 length compression; 7.4 shipped. **Replication is now the next coherent work block.**

  **Validation approach (corrected 2026-04-18).** Earlier thinking implied each specialist needed a 1:1 persona that *primarily* exercised it. That framing was too rigid — real deliberations pull 3–4 specialists per persona, and the batch suite already covers this naturally. The correct pattern is:

  - Replicate voice + cases to the next specialist (pick one at a time for focused iteration).
  - Run the **full 12-persona batch** — the specialist fires when the orchestrator judges it useful, across whatever personas happen to pull it. Walter doesn't have to exercise the Accountant for the Accountant's changes to be validated; several of the 12 personas will pull it naturally over the suite.
  - Check the grader's output on those naturally-triggered turns. If a new Accountant prompt ships and not a single persona in the batch surfaces an Accountant turn, *that* is the signal that the orchestrator description or routing guidance needs tightening — not that the specialist is broken.
  - For specialists whose archetype is rarely triggered by the existing pool (probably Legal, possibly Accountant), consider adding a targeted persona the way `legal_sensitive.json` was added — but this is additive, not a prerequisite.

### 7.2 Divergence, budget signal hierarchy, evidence binding

Three generative constraints, lifted from ad101/Zansei `plan_generation.md`. These are not phrase bans — they shape what a specialist is allowed to say in the first place. **Partially absorbed** into 7.3's `recommendationNode` wiring; the per-specialist rollout still pending, folded into the 7.1/7.3 replication cycle.

- **Divergence rule** (all specialists): *"When your expertise leads you to a recommendation the conversation didn't surface, name the bridge. The owner should never be surprised by a recommendation they didn't see coming."*
- **Budget signal hierarchy** (Finance agent specifically):
  1. **STATED** — owner explicitly said they can/will spend $X → use directly.
  2. **CURRENT** — owner currently spending $X → floor, not ceiling.
  3. **HISTORICAL** — owner spent $X on past efforts they described negatively → this is **pain evidence, not willingness to spend again.**
  4. **INFERRED** — no explicit signal → default conservative; name the inference.
- **Evidence-bound rule** (all specialists): *"Every recommendation must reference either something the owner said OR something from research. If it can't be tied to evidence, cut it."*

- [ ] Add divergence rule to all specialist prompts (rollout with 7.1/7.3 replication).
- [ ] Add budget signal hierarchy as a dedicated section in the Finance agent prompt.
- [ ] Add evidence-bound rule to all specialist prompts.
- [ ] Extend [lib/test/grade-deliberation.ts](lib/test/grade-deliberation.ts) with a tripwire: advisor turn >80 words containing no user-quote or research-reference = suspect.

**Done when:** primary persona transcript shows at least one specialist naming a bridge, and the Finance turn handles regretted LinkedIn boost spend as HISTORICAL pain rather than willingness.

### 7.3 Hand-curated case library + vertical knowledge files

**Status:** Marketer layer SHIPPED (2026-04-18). Other 9 case libraries NOT yet created.
**Full detail:** [BUILD-ARCHIVE-1.md §Phase 7.3](BUILD-ARCHIVE-1.md#phase-73--hand-curated-case-library--vertical-knowledge-files-marketer-layer)

- [x] Layer A — Per-specialist cases structure; Marketer 13 cases shipped.
- [x] Layer B — 5 vertical playbooks + 8 channel guides in `lib/knowledge/`; injected at `recommendationNode` only.
- [x] Recommendation-node enrichment (divergence / budget / assumption-check / evidence rules).
- [ ] **Specialist replication — the big remaining block.** 9 × (case library JSON + validation against naturally-triggering personas in the 12-persona batch). Pair with each specialist's 7.1 voice rewrite and 7.2 rule rollout; pick one specialist at a time for focused iteration.

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
