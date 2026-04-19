# Handoff — Over-yield diagnostic + specialist evaluation plan (2026-04-19)

Eighth handoff note. Previous: `2026-04-18-post-brainstorm-register.md`.

This session had two outputs:

1. **Over-yield-diag cycle** — empirical reproduction attempt on the R2/R3 yield pattern flagged in the brainstorm-register cycle. Pre-registered rule did not meet threshold; different shape reproduced 4/4. BUILD.md flag updated. No prompt edit.
2. **Specialist evaluation plan** — prioritized rewrite plan for the 6 un-rewritten specialists plus Creative's voice. This is the primary deliverable and the subject of the rest of this doc.

---

## Part 1 — Over-yield-diag (summary)

Ran `creative_first_opener --organic --rounds 5` 3× plus 5 off-arc organic controls (pleasantries_first, lagged_answerer, jerk_rusher, therapist_cautious, vague_thought at `--rounds 4`). Cycle tag `over-yield-diag`.

**Strict rule** ("R2+R3 both yield after R1 Creative open question, ≥2/3"): **1/3 — below threshold.**

**Different shape** ("R3+R4 both yield after R1 Creative turn in organic mode"): **4/4 including original bundle — above threshold by any reading.**

**Off-arc controls:** 0/5 had any yield round. Panel engaged every round, sometimes with 3–6 specialists in a round (therapist_cautious R3/R4 pulled 6 turns each).

**Decision:** respect pre-registration. R2+R3 was the pre-registered signal; it failed. Do not edit the orchestrator prompt this cycle. BUILD.md judgment-call flag updated 2026-04-19 to reflect the R3+R4 finding; next cycle can define a properly-scoped test targeting R3+R4 with at least one additional concept-first persona. Bundles: `test/results/creative_first_opener_20260419_02510*_over-yield-diag/` (3 runs), plus 5 off-arc bundles same cycle.

---

## Part 2 — Specialist evaluation plan

### Method

Three inputs per specialist:

1. **Structural gap** — compare current `system_prompt` in [scripts/seed-agents.ts](../../scripts/seed-agents.ts) against the reference pattern established by Marketer v3 / Finance v2 / Realist v2: lived-history opener, voice-discipline section with banned smoke-signal phrases, "use the case don't cite it" (GR#6), divergence rule, evidence-bound rule, domain-specific calibration section (budget hierarchy / specific-flaw rule / urgency calibration / etc).

2. **Field evidence** — mined all 113 bundles in `test/results/` for per-specialist turn counts and bundle coverage. Collected sample turns per specialist and graded against CLAUDE.md reference-quality standard (specific-enough-to-forward, advisor voice, use-the-case discipline, banned-phrase absence, length).

3. **Cross-specialist priority** — factor in (a) how often the specialist fires (volume), (b) whether the routing just changed (asymmetric risk if routing widened without voice hardening), (c) whether the current prompt has a prompt-field gap (rule written in prompt, ignored in field).

### Field-evidence table (113 bundles, 2026-04-17 through 2026-04-19)

| Specialist | Turns | Bundles | Avg/bundle | % coverage | Rewrite status |
|---|---|---|---|---|---|
| Finance | 137 | 65 | 2.1 | 57% | v2 SHIPPED |
| Marketer | 133 | 83 | 1.6 | 73% | v3 SHIPPED |
| Realist | 92 | 80 | 1.1 | 71% | v2 SHIPPED |
| **CX** | **24** | **19** | **1.3** | **17%** | **not rewritten** |
| Legal | 25 | 6 | 4.2 | 5% | not rewritten |
| **Operations** | **18** | **16** | **1.1** | **14%** | **not rewritten** |
| **Creative** | **16** | **12** | **1.3** | **11%** | **system_prompt v1** (description rewritten 2026-04-18) |
| **Copywriter** | **11** | **4** | **2.8** | **3.5%** | **not rewritten** |
| Accountant | 4 | 4 | 1.0 | 3.5% | not rewritten |

Also: `panel_recommendation` 123 / 65 bundles (synthesis node, not a specialist). Ideation 5 / 5 bundles (host role, appropriately narrow).

### Per-specialist assessment

#### 1. Creative — PRIORITY HIGH

**Why high priority despite 11% coverage:**

The brainstorm-register cycle (2026-04-18) widened Creative's routing without hardening its voice. Concept-first openers now route to Creative on R1; prior ledger volume understates where Creative is headed. Also — the over-yield-diag cycle showed Creative carrying multi-round loads on concept-first personas (R1 turns landing but also missing in some runs). The structural risk is asymmetric: routing changed, voice didn't.

**Current prompt state:** `system_prompt` is still v1 (flat "What You Care About / Constraint Is a Creative Input / What You Do / What You Don't Do" structure). Missing: lived-history opener, voice-discipline section, banned-phrase list, "use the case don't cite it" (no case library exists yet), divergence rule, evidence-bound rule.

**Field-evidence quality:**
- `ai_consultant` samples (3 reviewed) — genuinely strong. "Your only clients came because they already knew *you*" is specific to Walter; "Your real customer doesn't want an AI expert. They want a translator they can trust" commits to a positioning call rather than asking for one.
- But quality on *concept-first* openers (creative_first_opener) is more variable — over-yield-diag runs 1–3 showed Creative R1 turns that didn't all end in open questions (stochastic), and some runs pulled fewer Creative turns overall.

**Recommended rewrite scope:** Full v2 following Marketer v3 / Finance v2 / Realist v2 pattern:
- Lived-history opener (replace "You are the Creative..." with a lived-history stance).
- Voice discipline section with banned Creative smoke-signal phrases: "clarify your positioning," "find your brand story," "tell your unique story," "build a distinctive voice," "develop your brand identity," "elevate the brand" — the category-phrases that sound like creative direction but commit to nothing.
- "Use the case don't cite it" discipline.
- Divergence rule ("if the angle you see isn't the one the owner is reaching for, name the bridge").
- Evidence-bound rule ("every story claim ties to something the owner said or something research found").
- Case library (10–14 cases) indexed by `business_type_category`: concept-first (hobby game, product idea, brand name), angle-gap (real business, wrong positioning), transactional-room counterweight. Follows existing `lib/agents/cases/{marketer,finance,realist}.json` schema.
- Tightened `description_for_orchestrator` already landed in brainstorm-register — keep it.

**Risk:** Creative has been quiet because routing rarely brought it in pre-brainstorm-register. A v2 + case library might increase fire frequency further. If that happens, watch for Creative over-firing on business-signal openers (e.g., `ai_consultant` routing to Creative when Marketer is correct). The existing `creative_first_opener` persona is the validation case; add a smoke test against `ai_consultant` / `bakery_delivery` / `stamatis_restaurant` after the rewrite.

#### 2. Copywriter — PRIORITY MEDIUM-HIGH

**Why MH despite 3.5% coverage:**

There's a **prompt-field gap**. The current prompt explicitly says: *"Draft something real. Don't describe what good copy would sound like. Write it. Give them three versions with different tones."* Field evidence: 3/3 reviewed sample turns ask clarifying questions (who's the audience, what's the goal, what's the tone) instead of writing. None of the three actually delivered copy.

That gap is the rule not landing. A voice-discipline section inline in the prompt (Marketer/Finance pattern) should force the rule by inlining it in the voice-rules section rather than in a paragraph the model can skip.

**Field-evidence quality:** Copywriter turns are well-structured (appropriate bolding, multi-part questions) but the shape is uniformly *clarifying*, not *producing*. The prompt rule is being violated in every sample.

**Recommended rewrite scope:** Full v2, but centered on the write-vs-clarify discipline:
- Lived-history opener (replace flat identity with "you've written enough taglines to know the ones that actually get used in the window versus the ones that sound clever and stay in the Google Doc").
- Voice discipline with banned smoke-signals: "clarify your messaging," "refine your voice," "polish your copy," "sharpen the language." PLUS a rule stated explicitly inline: **"If the conversation has provided audience + goal + register, draft copy. If one is missing, ask for that one — but only that one, not all three."**
- "Use the case don't cite it."
- Divergence + evidence-bound.
- Case library: 10–14 examples of *actually-delivered copy* for business types (local service, professional service, restaurant, fitness, e-commerce) showing the before/after (weak copy → specific alternative).

**Risk:** Low coverage (4 bundles total). The rewrite ships and may still only fire on 4 bundles. Validation by full batch will be thin. Consider adding 1 targeted persona where copy is the primary ask (a synthesis-phase opener: "I need a tagline," "I need website copy for my services page").

#### 3. CX — PRIORITY MEDIUM

**Why MEDIUM:**

Highest-firing un-rewritten specialist (17% coverage). Field quality is strong — reviewed samples showed specific probing questions tailored to the owner, good voice discipline *already*, and what reads as a mature advisor voice. "Low repeat purchase rate is one of those problems that *feels* like a marketing problem — but it's usually a customer experience problem wearing a marketing mask" is reference-quality.

**Current prompt state:** Has a strong "inside the customer's shoes" frame, a "Pressure-Test Assumptions" section with a voice-y quote ("Customers want the fastest option is often wrong. Customers want to feel like they made a good choice is almost always right"), and concrete end-of-turn discipline. Structurally close to reference pattern without being there.

**What it's missing:**
- Lived-history opener.
- Formal voice-discipline section with CX-specific banned smoke-signals ("improve the customer experience," "focus on customer satisfaction," "build customer loyalty," "delight your customers," "optimize the journey" — category-phrases).
- "Use the case don't cite it" discipline + case library.
- Divergence and evidence-bound rules.

**Recommended rewrite scope:** Partial v2. Retain the existing voice ("inside the customer's shoes," "pressure-test assumptions," "bring in real examples") — don't rewrite what's working. Add the four missing elements (voice discipline section, case library, divergence, evidence-bound). Aim for the *lightest-touch* full rewrite of the four HIGH/MH/M specialists.

**Risk:** Less than the other two. The existing voice is doing work; the changes are additive.

#### 4. Operations — PRIORITY LOW-MEDIUM

Coverage 14%, field quality strong. The "but who actually does this?" catchphrase works — reviewed samples show it landing in specific form ("who would actually pack and hand off those delivery orders, and when?"; "Are they sitting on the bench (paid or unpaid)? Doing maintenance calls? Working on design/estimate work for spring jobs?"). The calibrate-to-scale section is concrete.

**Missing:** lived-history opener, voice discipline, banned phrases, case library, divergence, evidence-bound.

**Recommended rewrite scope:** Lighter partial. The catchphrase + calibrate-to-scale sections are doing the work of voice discipline already. Add case library (operations patterns: delivery/pickup mechanics, seasonal scheduling, staffing single-points-of-failure, peak-capacity pinch points) + divergence + evidence-bound. Skip the full voice-discipline rewrite unless field evidence later shows generic drift.

**Risk:** Low. Field quality is solid now; the adds are enrichment.

#### 5. Legal — PRIORITY LOW

Coverage 5%, but 4.2 turns/bundle when it fires — heavily concentrated on `legal_sensitive.json` persona. Reviewed samples are **excellent** — possibly the highest quality of any un-rewritten specialist. Specific procedural concerns (duty-to-notify, waiver enforceability, "new waiver retroactively" trap), clear urgency calibration.

**Current prompt state:** Has an urgency-calibration section that's genuinely distinctive ("Before you launch / Before you hire / Before you sign / Worth addressing in year two / Talk to a lawyer today") — this is Legal's equivalent of Finance's Budget Signal Hierarchy.

**Recommended rewrite scope:** Minimal. Add case library (5–8 cases per business type around common legal exposures), divergence + evidence-bound. Do not touch the urgency calibration section — it's already strong. Leave the rest alone.

**Risk:** Very low. Legal fires rarely and well. Minimal changes minimize regression risk.

#### 6. Accountant — PRIORITY LOW

Coverage 3.5%, 4 turns total across 113 bundles. Reviewed samples are solid on `hudson_home` / `morlock_landscape` bundles. Has a distinctive "How You're Different from Finance" section that's the kind of inter-specialist clarity other specialists lack.

**Recommended rewrite scope:** Minimal. Add case library (small — Accountant's trigger shape is narrow: entity choice, bookkeeping mechanics, sales tax, payroll, quarterly estimates). Add divergence + evidence-bound. Keep everything else.

**Risk:** Very low volume, low regression risk.

### Priority ordering (one per cycle)

| Cycle | Specialist | Scope | Rationale |
|---|---|---|---|
| 1 | **Creative** | Full v2 + cases | Routing just widened (brainstorm-register); voice not hardened; asymmetric risk |
| 2 | **Copywriter** | Full v2 + cases | Prompt-field gap — "write, don't describe" rule ignored in every reviewed sample |
| 3 | **CX** | Partial v2 + cases | Highest field volume of un-rewritten; existing voice is strong; additive rewrite |
| 4 | **Operations** | Case library + §7.2 rules | Field quality solid; catchphrase works; add cases and rules |
| 5 | **Legal** | Case library + §7.2 rules | Rarely fires but excellent when it does; urgency calibration already strong; minimal touch |
| 6 | **Accountant** | Case library + §7.2 rules | Low volume; Finance-distinction already in prompt; minimal touch |

### Scope notes for each cycle

- **Full v2 = Cycle 1, 2:** Voice rewrite + banned-phrase list + case library (10–14 cases) + §7.2 rules (divergence, evidence-bound, domain-specific section) + tightened `description_for_orchestrator`. Follows the Marketer/Finance/Realist replication pattern exactly.
- **Partial v2 = Cycle 3:** Case library + §7.2 rules + banned-phrase list; retain existing voice-work that's already landing.
- **Light touch = Cycles 4–6:** Case library + §7.2 rules only. No banned-phrase list unless field evidence later shows drift. No rewrite of existing distinctive sections (catchphrase, urgency calibration, Finance-distinction).

### Validation pattern (same as Finance / Realist cycles)

Per specialist cycle:
1. **Stage 1 checkpoint** — run 5 specialist-likely personas (handpicked; already a validation pattern from Finance cycle). If specialist fires 0–1/5, tighten description before voice.
2. **Full 19-persona batch** — specialist fires naturally across whatever personas pull it.
3. **Grader 6/6 on all runs** — no banned-phrase regressions.
4. **Hand-read 2–3 sample turns** against CLAUDE.md reference quality.
5. **Smoke test** 2–3 off-archetype personas to confirm the specialist doesn't over-fire (Creative's smoke test in brainstorm-register against ai_consultant / bakery_delivery / stamatis_restaurant is the model).
6. **Hidden-assumptions lens** applied before closing the cycle — load-bearing assumption stated, revealed state checked, changes (or no changes) named.

### Open questions for Cycle 1 (Creative)

1. **Case coverage for concept-first openers.** The existing specialist case libraries are all indexed by `business_type_category` (local_services, professional_services, etc.). Creative's concept-first openers don't have a business type. The schema may need a new category (`concept_first` or `pre_business`) or Creative's library may need a dual index.
2. **Ledger scarcity.** Creative has 16 turns across 12 bundles — small evidence base. Batch validation may show Creative firing on fewer personas than we'd like for confident evaluation. Consider adding 1–2 targeted concept-first personas alongside `creative_first_opener` (a product concept, a brand name) for a thicker evaluation pool.
3. **Over-yield-diag pattern intersection.** The R3+R4 yield pattern (flagged this cycle) is creative_first_opener-specific. If Cycle 1 Creative voice rewrite lands cleanly and the orchestrator still yields R3+R4 on concept-first openers, the flag's close path (orchestrator prompt edit) becomes the cleanest next move — with voice-hardened Creative already in place.

---

## What this session did NOT do

Per scope guardrails:

- **No orchestrator prompt edit.** Strict pre-registration rule failed.
- **No specialist code changes.** This is a plan doc, not a cycle.
- **No case libraries written.** Cycle 1 owns those.
- **No role-player verbatim validation.** Over-yield-diag used same role-player pattern as prior cycles — attack-vector limitation carried forward.

## Open flags going into the next session

From prior cycles, still active:
- R4 async observability — still not observed end-to-end in a real persona transcript.
- Ideation's soft-signal threshold — needs ledger-scale observation.
- Walter falsifiability framing — natural triggering across the batch, not 1:1.
- GR#7 behavioral validation gap — grader doesn't distinguish correct silence from abandoned room.
- Role-player verbatim limitation.
- Finance/Realist borderline overlap.

Updated this cycle:
- **Organic over-yield after a clean R1** — strict R2+R3 shape did not reproduce at n=3; R3+R4 shape reproduced 4/4 including original. Next cycle: scope a properly pre-registered rule targeting R3+R4, add at least one additional concept-first persona.

## What's next

Cycle 1: Creative v2 rewrite + case library. Scope guardrails same as Finance/Realist replication cycles. Start with the description-for-orchestrator (already tightened 2026-04-18, keep), write voice-discipline section inline with banned Creative smoke-signals, add "use the case don't cite it" + divergence + evidence-bound. Then 10–14 cases in `lib/agents/cases/creative.json` following the existing schema but with a `concept_first` index addition if the schema allows.
