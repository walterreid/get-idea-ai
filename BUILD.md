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

## PHASE 8 — Accounts, Admin, and Account Management

**Status:** 8.1 SHIPPED (2026-04-19). 8.2–8.4 placeholders.
**Read first:** CLAUDE.md (Rule #4 — calibrate to the user). Phase 7 archive for context on what the user surface currently is.

This phase scaffolds ownership and management around the advisor-board experience that Phase 7 completed. The philosophy is the same as Phase 7's: the admin surface is an *advisor-voice* surface (owner attending to their own product), not a tool-voice dashboard. Phase 8.1 is foundation only — role column, dev-login, role helper. The consumer work (8.2+) lands later.

### 8.1 Admin role + dev-login

Foundation for account management: role column on profiles, dev-only password login for the admin account, role helper for future admin-route guards. Magic link remains the primary auth flow for all users including admin.

- [x] `profiles.role` column with CHECK constraint (`'user' | 'admin'`), default `'user'`. Partial index on admin rows. Migration [supabase/migrations/002_add_admin_role.sql](supabase/migrations/002_add_admin_role.sql).
- [x] Init script [scripts/init-admin.ts](scripts/init-admin.ts) — idempotent role + password setter. Finds `ADMIN_EMAIL` user, sets `role = 'admin'`, sets/generates `DEV_USER_PASSWORD`. Safe to re-run. Runs via `npm run admin:init`.
- [x] Dev-login route [app/dev/login/route.ts](app/dev/login/route.ts) — NODE_ENV + env-var double-guard. Production returns 404; dev with env set signs in via `signInWithPassword` and redirects to `/chat`. No bypass code; real Supabase auth.
- [x] Role helper [lib/auth/role.ts](lib/auth/role.ts) — `getCurrentUserRole()` / `isAdmin()`. Scaffolded; unused until 8.2.
- [x] Guard test [scripts/test-dev-login-guard.ts](scripts/test-dev-login-guard.ts) — asserts 404 when `NODE_ENV !== 'development'`. Wired into `test:quality` as `test:dev-login-guard`. CI-enforced.

### 8.2 Admin console UI

- [ ] `/admin/*` route tree with server-side `isAdmin()` guard (returns 404 for non-admin to avoid leaking that admin pages exist).
- [ ] User list view — reads `profiles` + `auth.users` via admin-scoped query.
- [ ] Per-user thread list + message preview — uses admin-bypass RLS (see 8.3) or service-role data-access layer.
- [ ] Delete-thread action — soft delete via existing `threads.status` column.
- [ ] Trigger: "admin user cannot be deleted" — enforced at DB level so client-side mistakes can't orphan the system.

### 8.3 Admin-bypass RLS policies

- [ ] Extend each user-scoped table's RLS with an OR clause: `(auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))` — enables admin read without a service-role client in the app layer.
- [ ] Decision to make when landing: admin **read-all** is almost certainly right; admin **write-all** may not be — audit trails matter and admin-initiated writes to user data should be rare + explicit. Consider granting admin write only for the specific actions the console needs (e.g., soft-delete a thread) rather than full write access.

### 8.4 User management

- [ ] User self-service: display name edit, delete-account flow, email change.
- [ ] Admin actions: promote/demote role, reset user password (bypass email), revoke sessions.
- [ ] Trigger guards: cannot demote the last admin; cannot delete any admin user via the console (matches 8.2).
- [ ] Audit log table for admin actions — append-only, signed by admin user ID + timestamp.

---

## PHASE 9 — Design System + Marketing Surface

**Status:** 9.1 SHIPPED (2026-04-20). 9.2–9.5 placeholders.
**Read first:** [DESIGN.md](DESIGN.md) (new, Phase 9.1). CLAUDE.md (product philosophy — The Table language + advisor voice).

This phase adopts a new editorial design system (the "Zansei DNA" adapted for distributed-authority advisor-panel framing) across marketing and product surfaces. The canonical term for the advisor collective is **The Table**. The landing's five-beat persuasion arc (*you arrive → what you need → the table listens → who sits at the table → pull up a chair*) carries the argument.

### 9.1 Design system rewrite + landing rebuild

- [x] New [DESIGN.md](DESIGN.md) — wholesale rewrite. Merges prior chat guidance with the proposed editorial system. Canonical "The Table" term defined. Three column-width system (col-poem / col-prose / col-proof) documented. Creative agent color shift rationale.
- [x] Token refactor in [app/globals.css](app/globals.css) — palette values shifted from warm-navy/paper to terracotta/cream+ink. Variable NAMES kept stable (audit showed 200+ references) to avoid cascading refactors. Added Zansei-named semantic aliases (cream, ink, terracotta, etc.) + dark-band tokens (stamp-bg, stamp-ink) + excerpt card tokens + column-width utility classes.
- [x] Font swap in [app/layout.tsx](app/layout.tsx) — Lora → Newsreader, Plus Jakarta Sans → DM Sans. JetBrains Mono held. Newsreader italic explicitly imported (used for emphasis rules).
- [x] Creative agent color shift `#B85C38` → `#C9712E` — de-collides with the new terracotta primary (`#B45230`). One CSS var change, propagates to chat immediately.
- [x] Five marketing section components in [components/marketing/](components/marketing/): Recognition (Beat 1), OfferStamp (Beat 2 dark band), Reframing (Beat 2 pivot), Proof (Beat 3 advisor excerpt), Invitation (Beat 5 closing with inline AuthForm). RosterGrid retained from prior cycle with copy-only update for "The Table" language.
- [x] [app/page.tsx](app/page.tsx) rewritten — composes the 5 beats, auth-aware CTAs preserved from prior cycle.

### 9.2 Chat visual polish

Token values already apply to chat as of 9.1 (chat uses the same `--color-*` variables). Chat won't look *wrong*, but component-level refinement is separate.

- [ ] MessageBubble card treatment updated to match editorial register.
- [ ] RecommendationBlock spacing + typography updated.
- [ ] AgentRoster cards — refine avatar/monogram treatment.
- [ ] Composer — subtle terracotta send-button hover, interrupt indicator copy pass.
- [ ] Orchestrator + research annotations — typographic quietness pass.

### 9.3 Column-width translation (chat)

- [ ] Orchestrator annotations → `col-poem` width (left-anchored inside center panel).
- [ ] User + advisor messages → `col-prose` width.
- [ ] RecommendationBlock → `col-proof` width.
- [ ] Research annotations → `col-poem` register.

### 9.4 Advisor display names

- [ ] Author name candidates (first-name-only, culturally-considered).
- [ ] UI surfaces: chat roster, message bubble attribution, recommendation-block sign-off.
- [ ] Backend prompts stay role-addressed; name is UI-only.

### 9.5 Takeaway / deliverable shape (deferred)

- [ ] Audit whether owners need a persistent residue between sessions (discussed earlier as a post-Phase-7 consideration).
- [ ] If yes: decide between Idea Record evolution, starred-turns pattern, or shape-dependent deliverable.
- [ ] If no: retire the thread.

---

## Principles That Apply to Every Phase

These are not suggestions. They are constraints.

**No hardcoded agents.** If you write `if (agentName === "finance")` anywhere in application logic, you have made a mistake. All behavior is driven by database configs.

**The Orchestrator's reasoning is product surface.** Treat routing decisions as content, not logs. They tell the user why the system is structured the way it is.

**Silence is a valid output.** The system must be able to decide that no agent should speak. Build the yield-to-user path first, not last.

**Interrupts are not edge cases.** They are the primary mechanism by which users participate as peers. Test them as heavily as the happy path.

**Meet the user where they are.** The system must work for someone who has never heard the word "margin" and someone who wants to discuss unit economics. Both deserve the same quality of thinking.

Read CLAUDE.md before starting any phase. If a technical decision conflicts with the product philosophy, the philosophy wins.
