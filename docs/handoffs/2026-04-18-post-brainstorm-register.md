# Handoff — Post brainstorm-register cycle (2026-04-18)

Seventh handoff note, 2026-04-18: post-7.7 → post-docs-split → post-async-default → post-finance-replication → post-gr7-followup → post-realist-rep → **post-brainstorm-register**.

Previous session ended at `552099e` (Realist v2 — voice rewrite + 14 cases + §7.2 rules + batch validation). This session is a scoped routing + truncation fix, not a full voice rewrite: four small edits (orchestrator prompt + Creative description + Creative token cap + orchestrator interrupt-attribution rule) plus one falsifiability persona, closing the two judgment-call flags that came out of the 2026-04-18 manual `/chat` session.

---

## What shipped this session

### Edit 1 — Orchestrator "When the Opener Is a Concept, Not a Business" subsection

New subsection in the orchestrator `system_prompt` in [scripts/seed-agents.ts](../../scripts/seed-agents.ts), inserted after the existing "Customer Experience is not the default opener" paragraph and before the "CRITICAL — how to reference agents in `next_speaker`" header. Names the trigger narrowly:

- The user walks in with a game idea, product concept, brand name, feature idea, story premise, or anything framed as *"I have an idea for..."* / *"I want to make..."* / *"what if there was..."* — **without** naming a business, revenue goal, customer economics, or market.
- Route R1 (and ideally R2) to Creative (or Designer if the concept is visual / experiential).
- Sequencing, not suppression: Realist and Finance remain correct when structural or budget reality needs naming, but are pushed past R1/R2. The rule prevents R1 gating on business framing, not R3 gating.
- Five worked examples distinguishing concept-first from business-signal openers (positive: domino roguelike, Ember Kitchen brand name, "I want to make a game"; negative: bakery adding delivery, AI consultancy).

### Edit 2 — Creative `description_for_orchestrator` rewrite

Finance v2 / Realist v2 pattern applied to Creative in [scripts/seed-agents.ts](../../scripts/seed-agents.ts) lines 381–382. Role opener + 4 numbered triggers + Creative-vs-Designer divergence rule + Creative-vs-Ideation distinction + grounding clause + phase guidance. The load-bearing additions are the two divergence rules:

- **Creative vs Designer** — Creative finds the story and angle; Designer gives the story tangible form (identity system, UX surface, physical environment). On a concept-first opener where the user is exploring *what the thing is*, Creative leads.
- **Creative vs Ideation** — Ideation is a cold-open host for pure greetings and contentless openers; Creative is a specialist for concept work once the user has named any idea, however rough. If the user has named any concept — even a vague one — route to Creative, not Ideation.

Not a full voice rewrite (no voice-discipline section, no banned-phrase list, no case library). That work is deferred to Creative's turn in the 7.1/7.3 replication rotation.

### Edit 3 — Creative token cap 220 → 350

One-line change in [lib/agents/token-budgets.ts](../../lib/agents/token-budgets.ts). Moved Creative from the "concise probing / observation" band (200–220) to its own group at 350, matching Realist's quantitative-reasoning band. Added inline rationale citing the 2026-04-18 manual /chat session where Creative truncated mid-sentence 3× at 220 tokens in brainstorm turns. A phase-aware cap (shorter in synthesis, longer in exploration) is defensible but out of scope — a flat raise is the minimal change.

### Edit 4 — Orchestrator false-interrupt-attribution CRITICAL rule

New rule added to the orchestrator `system_prompt` immediately after the existing "CRITICAL — when `next_speaker` is 'user'" rule in [scripts/seed-agents.ts](../../scripts/seed-agents.ts):

> CRITICAL — do not claim the user interrupted unless they actually did. A prior agent message that ends mid-sentence, at an em-dash, with ellipses, or in a cut-off phrase is almost always the system's token budget running out — not a user action. If a turn reads incomplete and no user message appears between the truncated turn and this routing decision, the right move is to re-route to the same speaker so they can finish OR yield to the user for input. Do not write "the user interrupted" in the reason unless a user message actually appears between the prior agent turn and this decision.

Prompt-only fix per the *routing-is-the-art* memory. State plumbing (`last_agent_truncated` flag through `buildOrchestratorContext`) is deferred — raising Creative's cap to 350 should itself reduce the frequency of the underlying truncation, which reduces how often this rule even needs to fire. Revisit if the pattern recurs after this cycle.

### Edit 5 — New persona `test/personas/creative_first_opener.json`

Falsifiability case for Edits 1 + 2 + 3. Mira, a software developer brainstorming a roguelike-dominos game on evenings. `organic_recommended: true`, no budget, no website, `r3_wrong_claim: null`, `r4_contradiction: null`. All nine `expected_answer_style` slots rewritten in creator-register (mechanic-focused, not business-focused). Conversational behaviors explicitly name the "gently deflects if the panel pushes toward business framing" pattern — the point is that Creative should engage on the design question before anyone asks about audience, revenue, or channel.

### BUILD.md updates

- Phase 7 Status line: Creative-v2-routing added to shipped list; remaining count 7 → 6.
- Two judgment-call flags moved to CLOSED with validation pointers: brainstorm-register routing gap, Creative token-cap truncation.
- One new judgment-call flag added: organic over-yield after a clean R1 (observation — not a regression of this cycle, flagged for watching in future brainstorm-register transcripts).
- §7.1: Creative routing + token-cap cycle marked shipped with 4-edit detail and validation numbers; "Other 7 specialists" → "Other 6 specialists".
- §7.5: persona pool 24 → 25.

---

## Validation run

Pre-cycle:
- `npm run seed` clean (12/12 agents).
- `npx tsc --noEmit` clean.
- `npm run test:quality` passed (graph 10/10, grade 8/8, fixtures 7/7).

Cycle harness run (organic, 5 rounds, cycle tag `brainstorm-register`):
- **R1 speaker: Creative** ✓ (not Finance, not Realist, not Ideation, not Marketer).
- **R1 and R2: zero Finance/Realist turns** ✓ (financial gating absent from first two rounds).
- **Brainstorm register visible in Creative's R1 turn** ✓ — Creative asked *"when you're down to your last domino, does the player feel like they made a series of bad choices they can learn from — or does it feel like they hit a wall they couldn't have predicted?"* That's mechanic tension, not audience/revenue framing.
- **No mid-sentence truncation** ✓ — both Creative turns ended on complete sentences (234 words / 227 words).
- **Grader 6/6** ✓ (anti-generic, voice, structure, word count, business-context-mention, research-followthrough).
- **No false-interrupt language in routing reasons** ✓ — grep for `interrupt` across the bundle returned no matches.

Bundle: `test/results/creative_first_opener_20260418_234149_brainstorm-register/`.

Smoke test against 3 business-signal personas (1 round each, cycle tag `brainstorm-register-smoke`):
- `ai_consultant` R1 → **marketer** ✓ (expected — business signal present).
- `bakery_delivery` R1 → **finance** ✓.
- `stamatis_restaurant` R1 → **realist** ✓.

Zero Creative over-fire on business-signal personas. Edit 1's trigger language is narrowly scoped enough that the signal reads clean.

---

## Self-applied lens: hidden-assumptions

- **Load-bearing assumption:** routing creative-first openers to Creative doesn't cause Creative to over-fire on personas that should route to business specialists (Marketer / Finance / Realist).
- **Revealed:** 3/3 business-signal smoke tests routed to their expected business specialist. The orchestrator correctly distinguishes "user named a concept without business context" from "user named a business with a tactical question." Edit 1's trigger list (no business, no revenue goal, no customer economics, no market) is the load-bearing specificity.
- **Changed:** Nothing in the shipped edits. No prompt tightening needed.

Secondary observation surfaced by the lens (not a regression of this cycle):

- **Organic over-yield pattern.** In the `creative_first_opener` 5-round bundle, R1 Creative was clean, but the panel then yielded to the user for R2/R3/R4 — three consecutive yields — despite the role-player returning meaningful substance in R2 (*"feedback system, not just constraint. That's the thing I'm missing."*). Creative re-engaged in R5 after the role-player essentially restated the opener. Likely from prior orchestrator guidance on yield-to-user behavior, not this cycle's edits. Flagged in BUILD.md §7 judgment-call flags. Close path (only if this pattern recurs): orchestrator prompt edit along the lines of *"if the user answered a specialist's question with new substance, re-engage the specialist — don't yield."* Do not fix preemptively.

---

## Scope guardrails respected

Per user guardrails for this session:
- No second specialist replication this cycle.
- No R3 multi-batch dispatch work.
- No GR#7 grader instrumentation.
- No R4 async observability work.
- No state plumbing for `last_agent_truncated` (prompt-only fix).
- No phase-aware token budget (flat raise).
- No full Creative voice rewrite (deferred to specialist replication rotation — this was a routing + truncation fix).

---

## Open flags going into the next session

From the top of Phase 7, still active:
- R4 async observability — still not observed end-to-end in a real persona transcript.
- Ideation's soft-signal threshold — needs ledger-scale observation.
- Walter falsifiability framing — natural triggering across the batch, not 1:1.
- GR#7 behavioral validation gap — grader doesn't distinguish correct silence from abandoned room.
- Role-player verbatim limitation — some attack-vector testing blocked by in-character rewrite.
- Finance/Realist borderline overlap — watch for same-round duplication.

New this cycle:
- Organic over-yield after a clean R1 (see §7 judgment-call flag).

---

## What's next

Per BUILD.md §7.1, the remaining specialist replication block: Copywriter, Designer, Accountant, Operations, Legal, CX. Operations and Accountant under-fire; CX has been holding its own. Pick one per cycle. Creative's own full voice rewrite (voice-discipline section + banned-phrase list + case library) is the natural next candidate if field evidence suggests Creative's advisor quality lags — but this cycle's fix was a routing + truncation problem, which may be enough.
