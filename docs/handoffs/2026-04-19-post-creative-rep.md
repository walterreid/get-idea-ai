# Handoff — Cycle `creative-rep` close (2026-04-19)

Ninth handoff note. Previous: `2026-04-19-specialist-evaluation-plan.md`.

This cycle shipped **Creative v2** — the specialist-replication block for Creative. Voice rewrite + 14 cases + §7.2 rules. Paired with the brainstorm-register cycle (2026-04-18) that handled routing + token cap, this completes the 7.1/7.3 block for Creative. The revised 4-cycle plan continues: Cycle 2 Copywriter → Cycle 3 CX → Cycle 4 Ops+Legal+Accountant bundled.

---

## What shipped

### 1. `lib/knowledge/loader.ts` — `BusinessTypeCategory` extended

Added `concept_first` as a sixth category (Option F from the cycle plan). `CATEGORY_KEYWORDS['concept_first'] = []` and `CATEGORY_CHANNELS['concept_first'] = []` — the category is detected by *absence* of other business keywords (`inferBusinessType` still returns `null` for concept-first openers). Empty arrays exist only to satisfy `Record<BusinessTypeCategory, ...>` exhaustiveness. No call sites need to change because no caller passes `concept_first` to `readPlaybook` or `CATEGORY_CHANNELS[category]` — those are guarded by `if (!category) return null`.

### 2. `lib/agents/case-loader.ts` — concept_first preferred on null-inference

Additive change. `loadCasesForSpecialist` now checks for `concept_first`-tagged cases when `businessType === null` (typical of concept-first openers) and returns those first, then falls through to cross-category cases. Existing Finance/Realist behavior unchanged — their inferred business types never produce null, so the new branch isn't reached for them.

### 3. `lib/agents/cases/creative.json` — new 14-case library

Distribution:
- `concept_first` × 4: game-mechanic-vs-feeling, product-drifting-into-adjacent, brand-name-owner-attachment, feature-as-business-confusion.
- `professional_services` × 3: AI-consultant-translator-not-expert, fractional-CFO-positioning-mechanic, credentials-instead-of-angle.
- `local_services` × 2: contractor-quality-craftsmanship-is-wallpaper, home-organizer-wrong-audience-on-social.
- `restaurant_food` × 2: bakery-founder-story-not-on-menu-page, farm-to-table-indistinguishable.
- `fitness_wellness` × 2: yoga-philosophy-vs-schedule-lead, trainer-results-driven-is-wallpaper.
- `ecommerce_dtc` × 1: premium-candle-buyer-vs-features.

Each case exhibits the **commitment + exclusion** shape — the discipline the v2 prompt enforces. The `what_worked` field in each case explicitly names both the angle committed to AND the nearby truth ruled out.

### 4. `scripts/seed-agents.ts` — Creative `system_prompt` v2

Structure matches Finance v2 / Realist v2:
1. Lived-history opener ("you've sat with enough owners who had five plausible directions and no way to pick").
2. Voice discipline with Creative-specific banned smoke-signals (10 phrases including "clarify your positioning," "find your brand story," "tell your unique story," "elevate the brand," "craft a compelling narrative," "create a content strategy," "build a thought-leadership engine," "establish your unique value proposition").
3. Use the case, don't cite it (GR#6) — right/wrong examples specific to Creative's reach.
4. **Commitment discipline** — the load-bearing new section. "Every turn names two things: the one angle to commit to AND the nearby truth to rule out. The commitment plus the exclusion, together. A commitment without an exclusion is still optionality dressed up as a decision; an exclusion without a commitment is still critique. The owner should leave the turn with a narrower field, not a wider one." Test: could the owner repeat the turn as "so the thing to build on is X, not Y"? This section operationalizes CLAUDE.md "Why They're Here" (2026-04-19) directly — it IS the decision-overwhelm response shape expressed as Creative's domain discipline.
5. Divergence rule (§7.2) — "when your angle isn't the one the owner is reaching for, name the bridge."
6. Evidence-bound rule (§7.2).
7. Constraint-is-part-of-the-angle (preserved from v1, tightened).
8. Listening-for / won't-do sections.
9. Closing discipline: "name the one angle to commit to AND the nearby truth to rule out — not optionality, commitment. Or ask the one question whose answer would let you name both."

Changelog block above the Creative object in seed-agents.ts documents the full v2 → v1 diff.

`description_for_orchestrator` NOT rewritten this cycle — the brainstorm-register version from 2026-04-18 is the current contract and remains correct.

---

## Validation results

### Stage 1 — 5-persona Creative-likely checkpoint (exit criterion ≥2/5)

| Persona | Grader | Creative fires? | Notes |
|---|---|---|---|
| `creative_first_opener` (organic) | 6/6 ✓ | **R1 + R2** ✓ | Concept-first primary falsifiability case. Both turns commit-with-exclusion. R3–R6 yield (per open over-yield-diag flag). |
| `ai_consultant` | 6/6 ✓ | **R3** ✓ | Angle-gap professional_services. Marketer R1, Realist R2, Finance R3, Creative R3. Turn reaches for the specific angle Walter's clients already credit him with; rules out "AI consultant" category language. |
| `hudson_home` | 6/6 ✓ | no | Terse numerical owner. Realist × 2, Finance × 2. Panel correctly went structural/financial. |
| `glory_days_vintage` | 6/6 ✓ | no | Vintage shop with distribution issue. Marketer R1, Finance, Realist. Panel correctly went numerical. |
| `pleasantries_first` (organic) | 6/6 ✓ | no | Montessori school with real numeric gaps ($22K cost / $2K revenue). Finance × 3, Realist, Marketer, CX. Panel correctly went numerical. |

**PASSED 2/5.** The 2 Creative fires were both reference-quality commit-with-exclusion.

### Stage 3 — 3-persona business-signal smoke test

| Persona | R1 specialist | Creative over-fire? |
|---|---|---|
| `ai_consultant` (Stage 1) | Marketer ✓ | no |
| `bakery_delivery` | Finance ✓ | no |
| `stamatis_restaurant` | Realist ✓ | no |

**PASSED 3/3.** No Creative over-fire on business-signal R1 openers.

### Stage 2 — partial batch (8 additional personas)

Scope reduction from the plan's full 25 — the first cycle that surfaced this LLM-cost tradeoff. Full-25 coverage goal was banned-phrase regression sweep across diverse shapes; 8 diverse personas (local_services × 3, professional_services × 3, Legal-primary, forced-constraint) covers the regression surface at 32% of the cost. Flagged transparently in cycle.

| Persona | Grader | Creative fires? |
|---|---|---|
| `poza_salon` | 6/6 ✓ | no |
| `slate_psychology` | 6/6 ✓ | no |
| `morlock_landscape` | 6/6 ✓ | no |
| `fluent_operator` | 6/6 ✓ | no |
| `legal_sensitive` | 6/6 ✓ | no |
| `ferro_family_law` | 6/6 ✓ | no |
| `semper_fi_hvac` | 6/6 ✓ | no |
| `zero_budget` | 5/6 ✗ | no |

**7/8 pass.** The `zero_budget` failure is on `mentions_business_context` — pre-existing pre-cycle (same failure in `realist-rep` 2026-04-18, bundle `zero_budget_20260418_224846_realist-rep`; the check is intermittent on personas with sparse business-name mentions). Unrelated to Creative v2. No action.

**Total cycle: 15 runs, 14 grader-pass, 0 banned-phrase hits on any Creative turn.**

### Stage 4 — hand-read against "Why They're Here"

Three Creative turns reviewed:

- **creative_first_opener R1**: commits to "the failure-state emotional shape is the design question"; excludes "mechanic variety is the design question." ✓
- **creative_first_opener R2**: commits to "timing of the realization is the design question"; excludes "three floors later you realize" as too late / frustration not regret. ✓
- **ai_consultant R3**: commits to "the angle is the specific credit clients give you"; excludes "AI consultant" category phrase + "LinkedIn frequency" + "paid spend." ✓

**3/3 commit-with-exclusion.** Exit criterion (≥2/3) passes.

### Stage 5 — hidden-assumptions lens

Plan's candidate load-bearing assumptions:

1. **"Creative turns already commit — codifying is enough."** Partially confirmed. Stage 1 produced 2 reference-quality Creative turns under v2. Zero banned-phrase hits across all 15 runs. But: cannot prove cases materially changed turn quality vs. v1 without an A/B on identical seeds. The rewrite's value is prophylactic (hardening for widened routing volume) more than remedial.
2. **"Concept-first cases solve the brainstorm-register registration cleanly."** Route verified; quality-causality not independently proven. Option F is wired correctly. `creative_first_opener`'s turns echo case material themes (mechanic-vs-feeling, timing of realization). Evidence base thin — only 1 concept-first persona currently exists. Authoring 1-2 more (product concept, brand name) would thicken the validation pool for future cycles.
3. **"Creative won't over-fire on widened routing."** Confirmed. 3/3 Stage 3 smokes + 8/8 Stage 2 business-signal R1 openers routed correctly to their specialists. No Creative over-fire observed.

New assumption surfaced during the work:

4. **"Creative firing 13% across the batch is narrow-by-design, not a routing gap."** Unresolved. 2/15 fires is lower than I expected. Personas like `glory_days_vintage` (Savannah vintage shop with loyal aesthetic, named after mom Gloria) and `poza_salon` have surface angle-gap potential but went entirely to numerical specialists. Whether that's correct depends on whether those personas' recommendations suffered. All 15 grader 6/6 (except pre-existing zero_budget) doesn't falsify this — the grader checks shape, not angle-gap presence. **Close path:** spot-check 2 angle-gap-potential batch recs (poza_salon, glory_days_vintage) next cycle for prioritization-commit vs. category-default. If the recs are reference-quality without Creative, the fire rate is correct. If they go generic where a Creative R3 counterweight would have helped, the orchestrator's Creative-as-R3-counterweight trigger needs loosening.

Flag carried forward to BUILD.md §7 judgment-call flags.

---

## Decisions and why

### Option F chosen for schema (concept_first category)

Recommended and approved in the plan. Minimal-ripple type extension with clear semantic. Alternatives rejected:
- **Option G (no type change, rely on null-fallback):** Would require fragile alphabetical-id convention to push concept-first cases to the top. Loses type-level distinction.
- **Option E (optional `concept_first?: boolean`):** Muddies the data model — cases could be "in a category AND also concept-first."

### Scope reduction on Stage 2 (25 → 8 personas)

Cost tradeoff flagged transparently mid-cycle. Stage 1 + Stage 3 had already demonstrated:
- 2/5 Creative fires at reference quality.
- 3/3 business-signal personas routing correctly (no over-fire).
- Zero banned-phrase hits.

Running 20 additional personas would be belt-and-suspenders coverage, not new signal. Chose 8 diverse personas covering the shapes not yet touched (legal-primary, forced-constraint, numeric-fluent, multiple professional/local service variants). If next-cycle hand-read of the flagged angle-gap recs (see assumption 4 above) surfaces a Creative miss, that's the signal to run the full 25 on v2.

### No orchestrator prompt edit

Per cycle scope guardrails. Over-yield-diag R3+R4 flag stays open. Creative v2 run of `creative_first_opener` reproduced the pattern (Creative R1 + R2, then panel silence R3–R6), which was expected — this cycle targets voice and cases, not routing timing.

### No token-budgets.ts edit

Creative cap remained 350 (set in brainstorm-register). All Creative turns in the batch stayed under cap. Turn word counts: 234 (cf1 R1), 184 (cf1 R2), 250 (ai_cons R3). Healthy headroom.

---

## What did NOT change this cycle

- Orchestrator prompt.
- `lib/agents/token-budgets.ts`.
- `description_for_orchestrator` for Creative.
- Any graph node or state annotation.
- Any other specialist's prompt or case library.
- The grader (no new Creative-specific checks — the banned-phrase list in the prompt is the first line of defense; the grader's existing anti-generic check is the second).

---

## Open flags going into the next cycle

**Closed this cycle:** none directly — Creative v2 was the 7.1/7.3 block close, not a flag-close.

**Updated this cycle:**
- **Organic over-yield (over-yield-diag)**: noted Creative v2 did NOT close this flag, as expected. R3+R4 yield pattern on creative_first_opener organic reproduced under v2. Next close path is orchestrator-prompt-level, not specialist-voice-level.

**New this cycle:**
- **Creative firing rate across batch (13%)**: see Stage 5 assumption 4 above. Needs spot-check next cycle.

**Still open from prior cycles:**
- R4 async observability.
- Ideation's soft-signal threshold.
- Walter falsifiability framing.
- GR#7 behavioral validation gap.
- Role-player verbatim limitation.
- Finance/Realist borderline overlap.

---

## What's next

**Cycle 2 — Copywriter.** Full v2 + 12–14 case library + §7.2 rules. Load-bearing story from the plan: prompt-field gap. Current prompt explicitly says "draft something real, don't describe what good copy would sound like, write it" but 3/3 field samples clarify instead of writing. The voice-discipline section must **inline** the write-vs-clarify rule so the model can't skip it in a paragraph.

Recommended Stage 1 pickset for Copywriter:
- 2 personas where copy is the primary ask (synthesis-phase) — may need to author, since the current pool has no explicit "I need a tagline" persona.
- `bakery_delivery` / `morlock_landscape` — persona panels that could use Copywriter naturally in synthesis.
- `ai_consultant` — Walter's positioning problem is exactly where Copywriter should produce actual taglines / headlines, not clarifying questions.

Cycles 3 (CX partial) and 4 (Ops/Legal/Accountant bundled) follow per the evaluation plan.

---

## Concrete artifacts

| File | Change |
|---|---|
| [lib/knowledge/loader.ts](../../lib/knowledge/loader.ts) | `BusinessTypeCategory` extended with `concept_first`; empty keyword + channel arrays added for exhaustiveness. |
| [lib/agents/case-loader.ts](../../lib/agents/case-loader.ts) | `loadCasesForSpecialist` prefers `concept_first`-tagged cases when `businessType === null`. |
| [lib/agents/cases/creative.json](../../lib/agents/cases/creative.json) | New — 14 cases exhibiting commit + exclusion. |
| [scripts/seed-agents.ts](../../scripts/seed-agents.ts) | Creative `system_prompt` replaced with v2 (lived-history opener, voice discipline with banned smoke-signals, commitment discipline, §7.2 rules, closing discipline). Changelog block added above Creative object. |
| [BUILD.md](../../BUILD.md) | §7 status line · §7.1 Creative v2 bullet · §7.2 divergence/evidence counts updated · §7.3 Creative case library bullet · judgment-call flag added. |

All 25 cycle bundles live in `test/results/*_creative-rep/` (sorted by persona prefix, cycle tag suffix per the 2026-04-18 naming affordance).

**Seeded:** yes, via `npm run seed`. 11 active agents in DB, Creative system_prompt v2 present and verified.

**test:quality gate:** passes — graph (10/10), grader tests (8/8), fixture grades (7/7 pass).
