# Handoff — Cycle `copywriter-rep` close (2026-04-19)

Tenth handoff note. Previous: `2026-04-19-post-creative-rep.md`.

This cycle shipped **Copywriter v2** — voice rewrite + 12 cases + §7.2 rules. Cycle 2 of the 4-cycle plan
([evaluation plan](2026-04-19-specialist-evaluation-plan.md)). Load-bearing fix is a **prompt-field gap**:
v1 said *"draft something real, don't describe what good copy would sound like, write it"* as a mid-paragraph
sentence, and 3/3 reviewed field samples asked clarifying questions anyway. v2 carries the rule as an inline
**Write-vs-clarify discipline** section with a numbered decision rule and a self-check test. Validation
evidence (`copy_primary_synthesis` R2 × 4 drafts, R3 commit-with-exclude on the "Unlock Your Career
Potential" wrong-claim) shows the rule landing. The revised 4-cycle plan continues: Cycle 3 CX → Cycle 4
Ops/Legal/Accountant bundled.

---

## What shipped

### 1. `scripts/seed-agents.ts` — Copywriter `system_prompt` v2 + tightened description

Structure matches Finance v2 / Realist v2 / Creative v2:

1. Lived-history opener replacing flat "your job is to turn ideas into language" framing — *"you've written
   enough taglines to know the ones that actually get used in the window versus the ones that sound clever
   and stay in the Google Doc."*
2. Voice-discipline section with Copywriter-specific banned smoke-signal phrases inline (10 phrases
   including "clarify your messaging," "refine your voice," "polish your copy," "sharpen the language,"
   "craft compelling messaging," "craft a compelling narrative," "build a strong brand voice," "develop
   your brand voice," "nail your tone," "find your voice"). Prophylactic rather than remedial — Copywriter
   fires rarely (3.5% coverage pre-cycle), so bans harden the working pattern against future volume.
3. Use the case, don't cite it (GR#6) — Right/wrong examples specific to Copywriter (three delivered
   versions with commitments named; not "I once worked with a bakery where...").
4. **Write-vs-clarify discipline** — load-bearing new section. Copywriter's structural equivalent of
   Finance's Budget Signal Hierarchy / Realist's "name the specific flaw, not the category" / Creative's
   Commitment discipline. The trio (audience, goal, register) + numbered decision rule:
   - All three present → draft (three short versions default)
   - Two present, one missing → ask for that one missing piece
   - Two or more missing → name the biggest gap first
   Self-check test: could the owner paste one of your versions directly on their sign/site/bio and have it
   fit? A menu of clarifying questions is the failure mode.
5. Divergence rule (§7.2) specialized to Copywriter (register-owner-asked-for vs register-audience-needs).
6. Evidence-bound rule (§7.2) specialized to Copywriter.
7. The register follows the audience, not the owner (preserved from v1, tightened with four explicit
   examples — working-families / professionals / people-in-distress / counterweight-to-loud-category).
8. What you're listening for / What you don't do.
9. Closing discipline: *"Three versions or one question."*

`description_for_orchestrator` rewritten to Finance v2 / Realist v2 / Creative v2 pattern — role opener
+ 4 numbered triggers (synthesis-phase shaping, direct copy ask, weak-copy diagnosis, register mismatch)
+ Copywriter-vs-Creative distinction ("Creative commits the angle; Copywriter writes the words after —
sequentially, not in parallel") + Copywriter-vs-Marketer distinction (Marketer owns channel and strategy;
Copywriter owns language once strategy is settled) + grounding clause (copy that assumes unaffordable
brand infrastructure is malpractice) + phase guidance.

Changelog block added above the Copywriter object (Copywriter had no changelog block pre-cycle — this was
the first). Marketer / Finance / Realist / Creative all now have changelog blocks; Copywriter now joins
that set.

### 2. `lib/agents/cases/copywriter.json` — new 12-case library

Distribution:

- `professional_services` × 3: ai-consultant-translator-tagline (Walter's GG Solutions angle);
  senior-consultant-credentials-to-one-line; law-firm-plain-language-trust.
- `local_services` × 2: contractor-window-tagline (no visible screws);
  home-service-warm-direct (HVAC operator writing to scared homeowners).
- `restaurant_food` × 2: bakery-delivery-menu (voice continuity on new offer);
  restaurant-history-one-liner (menu-page annotation, not About-page footnote).
- `fitness_wellness` × 2: yoga-philosophy-bio (philosophy-forward over schedule/logistics);
  trainer-opinionated-headline (posture-as-marketing).
- `ecommerce_dtc` × 1: premium-gift-mechanic (use-case not feature list).
- `concept_first` × 2: brand-name-tagline-first-draft (vertical-specific angle for coupon extension);
  product-concept-one-line-positioning (meditation-app-for-the-7:12pm-parent).

Each case exhibits **write-something-real discipline**: `what_worked` names the audience-goal-register
triad that produced the versions AND the three actual alternatives that got used. `what_wasted_money`
names the category wallpaper or clarifying-question-menu pattern that burned time. Schema matches
[lib/agents/cases/creative.json](../../lib/agents/cases/creative.json) exactly. No loader changes
needed — [lib/agents/case-loader.ts](../../lib/agents/case-loader.ts) auto-discovers by filename.

### 3. `test/personas/copy_primary_synthesis.json` — new persona

Authored mid-cycle per the plan's Stage 1 decision point. Stage 1 runs (ai_consultant, bakery_delivery,
glory_days_vintage, semper_fi_hvac, poza_salon) produced 0/5 Copywriter fires — the orchestrator correctly
routed all 5 to Finance/Marketer/Realist/Operations because none presented a direct copy ask or a
synthesis-phase register-complete moment. That's correct routing for those personas, but it left the
write-vs-clarify discipline untested on real panel behavior.

The new persona is a career coach (Devon Park / Second Draft Career Coaching, Asheville) who walks in
with audience, goal, and register **already named** in the opener and needs homepage + IG bio copy
finalized by Friday. Not a concept-first opener, not organic — R3 scripted wrong-claim is the
category-wallpaper "Unlock Your Career Potential" to test the commit-with-exclude discipline.

### 4. `BUILD.md` — status updates

§7 status line + §7.1 Copywriter v2 bullet + §7.3 Copywriter case library bullet + §7.2 rule rollout
count (5 specialists now carry divergence + evidence-bound + domain-specific discipline) + new judgment-
call flag (Copywriter narrow-fire-rate observation) appended.

---

## Validation results

### Stage 1 — 5-persona Copywriter-likely checkpoint

| Persona | Grader | Copywriter fires? | R1 specialist | Notes |
|---|---|---|---|---|
| `ai_consultant` | 6/6 ✓ | no | Realist | Realist R1 → Creative R2 (angle-commit) → Marketer × 5 (prioritization) → panel_rec. No copy ask surfaced. Correct routing. |
| `bakery_delivery` | 6/6 ✓ | no | Finance | Finance × 3 (margin) → Realist (structural) → panel_rec. Correct routing; question was delivery-decision, not copy. |
| `glory_days_vintage` | 6/6 ✓ | no | Marketer | Marketer → Finance → Realist → panel_rec. Ella's ask was distribution-model, not copy. Correct routing. |
| `semper_fi_hvac` | 6/6 ✓ | no | Marketer | Marketer × 4 → Finance → Realist → Operations → panel_rec. Jesse's ask was Google-visibility mechanics. Correct routing. |
| `poza_salon` | 6/6 ✓ | no | Marketer | Marketer × 3 → Finance → panel_rec. Chair-utilization was the ask. Correct routing. |

**Exit: 0/5 Copywriter fires.** Below the ≥2/5 threshold — but every absence was correct routing, not a
routing gap. The plan anticipated this exact case with the Stage 1 decision point: if Copywriter doesn't
naturally fire in a synthesis-phase register-complete turn across the 5, author a copy-primary persona.
Authored + ran `copy_primary_synthesis` next.

### Stage 1 decision point — `copy_primary_synthesis`

Grader 6/6. **Copywriter fired 5 turns.**

- **R1 Copywriter** — single clarifying question (one question about the one missing piece — whether the
  target audience is actively-shopping or problem-aware-but-not-shopping). Exactly the "two present, one
  missing → ask for that one" rule.
- **R2 Copywriter × 4 turns** — drafted three homepage headlines + three IG bios with named commitments,
  followed by analysis of what each version commits to and which to pick. Actual drafted copy:
  - Homepage: *"You know something's wrong. You just don't know what yet."*
  - IG bio: *"For people who know something's wrong but haven't figured out what yet."*
  Forwardable. Meets audience where they are. Adult-to-adult register, not corporate, not woo — matches
  what the persona specified.
- **R3 Copywriter** — owner proposes *"Unlock Your Career Potential"* (category wallpaper test). Copywriter
  commits to the exclusion ("what every career coach, LinkedIn recruiter, and corporate wellness platform
  says") and returns to version 2 from the already-drafted set ("You know something's wrong"). Textbook
  commit + exclusion.

**Write-vs-clarify discipline: CONFIRMED LANDING.** Zero banned-phrase hits across all 5 Copywriter turns.

### Stage 2 — 7 diverse personas (partial batch)

| Persona | Grader | R1 specialist | Agent counts |
|---|---|---|---|
| `slate_psychology` | 6/6 ✓ | realist | realist × 2, marketer × 2, operations × 1, panel_rec × 2 |
| `morlock_landscape` | 6/6 ✓ | realist | realist × 1, finance × 3, panel_rec × 2 |
| `fluent_operator` | 6/6 ✓ | finance | finance × 3, realist × 1, panel_rec × 2 |
| `legal_sensitive` | 6/6 ✓ | legal | legal × 5, panel_rec × 2 |
| `ferro_family_law` | 6/6 ✓ | realist | realist × 1, marketer × 4, finance × 1, panel_rec × 2 |
| `stamatis_restaurant` | 6/6 ✓ | realist | realist × 1, operations × 1, finance × 1, panel_rec × 2 |
| `zero_budget` | 6/6 ✓ | marketer | marketer × 2, finance × 2, panel_rec × 2 |

**Stage 2: 7/7 pass.** Zero Copywriter fires. Zero banned-phrase hits on any Copywriter or other-specialist
turn. Note: `zero_budget` grader 6/6 this cycle — the `mentions_business_context` check that failed in
prior cycles passed here, likely because the role-player happened to echo the business name more
consistently. Not cycle-attributable either way.

### Stage 3 — business-signal smoke (absorbed into Stage 1 + Stage 2)

Stage 3 R1-over-fire test was satisfied by Stage 1 and Stage 2 evidence rather than a separate run:

- Stage 1 ai_consultant R1 → Realist ✓ (not Copywriter)
- Stage 1 bakery_delivery R1 → Finance ✓ (not Copywriter)
- Stage 2 stamatis_restaurant R1 → Realist ✓ (not Copywriter)

Across **all 13 R1 openers run this cycle** (5 Stage 1 + 1 copy_primary_synthesis + 7 Stage 2),
Copywriter's R1 fires: 0 on business-signal openers, 0 on off-arc personas, 0 on Legal-primary. The one
case where Copywriter fired at R1 was `copy_primary_synthesis` — a persona whose opener explicitly asks
for homepage + IG bio copy. That's correct routing, not over-fire. **No Copywriter over-fire regression
observed.**

### Stage 4 — hand-read

`copy_primary_synthesis` Copywriter turns 2–5 hand-read and confirmed reference-quality above. Every turn
either produced three drafted versions (R2) or committed to an exclusion + recommendation from the
already-drafted set (R3). No menu-of-questions pattern. No banned phrases. Register matched audience
(adult-to-adult, no corporate/woo). Forwardable — Devon could paste any of the three homepage versions on
the live site Friday without another pass.

### Stage 5 — hidden-assumptions lens

Plan's candidate load-bearing assumptions:

1. **"Inline discipline section makes the write-vs-clarify rule land."**
   - Revealed: CONFIRMED. `copy_primary_synthesis` R1 asked one clarifying question (about the one missing
     piece); R2 drafted three versions per artifact; R3 committed with exclusion rather than re-clarifying.
     v1 would have asked a menu of clarifications in R2 per the pre-cycle field-sample pattern.
   - Load-bearing for Cycle 3 (CX) pattern: inline discipline + numbered decision rule is a transferable
     technique when the specialist's domain rule was previously prose-buried.

2. **"Copywriter coverage stays narrow even with v2."**
   - Revealed: CONFIRMED. 0/5 Stage 1 + 0/7 Stage 2 + 1 targeted = 1/13 fire rate (8%) across the cycle —
     narrower than Creative's 13%. The orchestrator's R1 routing didn't pull Copywriter on any
     business-signal opener. Width was intentional in the description rewrite (Copywriter-vs-Creative
     sequential, Copywriter-vs-Marketer mutually exclusive); the narrow rate is the description working as
     intended, not a gap.
   - Unresolved: whether synthesis-phase Copywriter fires often enough organically. Creative's Cycle 1
     hidden-assumption #4 (13% firing rate might be narrow-by-design) is a smaller version of this same
     question — Copywriter's 8% is narrower still. If any of the Stage 2 panel recommendations would have
     benefited from a Copywriter drafting moment that didn't happen, the trigger needs loosening. Not
     blocking.

3. **"Prophylactic banned-phrase list doesn't cause regressions."**
   - Revealed: CONFIRMED. Zero banned-phrase hits across all 5 Copywriter turns (all in
     `copy_primary_synthesis`). Cycle total: 0 banned-phrase regressions.

**New assumption surfaced during the work:**

4. **"Stage 1 Copywriter-likely personas will naturally trigger Copywriter in synthesis."**
   - Load-bearing assumption of the plan's Stage 1 pickset.
   - Revealed: FALSIFIED. The 5 Stage 1 personas (Walter, Maria, Ella, Jesse, Pooran/Zahava) are not
     Copywriter-likely in the way the plan assumed — each has a business problem the panel correctly
     addresses with Marketer/Finance/Realist/Ops specialists. Copywriter's trigger is not "synthesis phase
     is reached" but "a direct copy ask lands OR an earlier specialist hands off explicitly for language."
     Neither happened in any of the 5.
   - Load-bearing for Cycle 2 and forward: when validating a rarely-firing specialist, the Stage 1 pickset
     needs at least one persona whose opener makes the specialist's trigger explicit — authored if the
     pool doesn't already contain one. `copy_primary_synthesis` was the right call; the plan's decision-
     point mechanic worked as designed. Future rarely-firing cycles (Legal in Cycle 4) should default to
     authoring a targeted persona upfront rather than waiting for the decision point.

---

## Decisions and why

### Stage 3 absorbed into Stage 1 + Stage 2

The Stage 3 over-fire smoke test as originally scoped (3 dedicated runs) would have added cost without new
signal once Stage 1 had already produced 5 runs across business-signal openers with zero Copywriter R1
over-fire. The R1-over-fire check is a property of the routing surface and is answered by any opener the
orchestrator evaluates. 5 Stage 1 + 7 Stage 2 + 1 targeted = 13 R1 evaluations; the Stage 3 signal was
already covered.

### Partial Stage 2 (7 personas, not 25)

Per standing memory `partial_stage2_default`. Stage 1 + `copy_primary_synthesis` established the cycle's
load-bearing evidence (write-vs-clarify landing + zero regressions). Stage 2's purpose is regression
sweep across diverse shapes; 7 diverse personas covers the regression surface at 28% of the cost. The
pickset covers professional_services ×3 (slate_psychology, ferro_family_law, fluent_operator),
local_services ×2 (morlock_landscape, zero_budget-vagueness), restaurant (stamatis), legal-primary
(legal_sensitive).

### copy_primary_synthesis authored after Stage 1, not before

Per plan's explicit decision-point scope. Stage 1 runs first, then decide. Result: 0/5 natural fires
triggered the decision. Authoring + running added ~4 minutes to cycle wall-clock for the load-bearing
evidence the cycle hinged on. Correct trade.

### No orchestrator prompt edit

Per cycle scope guardrails. The 0/5 Copywriter fire rate in Stage 1 is not a routing problem — it's
correct routing for the personas that walked in. Over-yield-diag R3+R4 flag stays open. Creative firing
rate 13% flag stays open.

### No token-budgets.ts edit

Copywriter's current cap was adequate for the cycle. Turn word counts in `copy_primary_synthesis` stayed
well under cap (R2 turns averaged ~200w each, draft content included). No mid-sentence truncation observed.

---

## What did NOT change this cycle

- Orchestrator prompt.
- `lib/agents/token-budgets.ts`.
- Any graph node or state annotation.
- Any other specialist's prompt or case library.
- The grader (no new Copywriter-specific checks — the banned-phrase list in the prompt is the first line
  of defense; the grader's existing anti-generic check is the second).
- `lib/knowledge/` (no playbook or channel changes; Copywriter operates at workerNode, not
  recommendationNode).

---

## Open flags going into the next cycle

**Closed this cycle:** none directly — Copywriter v2 was the 7.1/7.3 block close for Copywriter, not a
flag-close. The prompt-field gap was the cycle's load-bearing fix and is not tracked as a judgment-call
flag.

**Updated this cycle:** none.

**New this cycle:**
- **Copywriter firing rate across batch (8%).** Narrower than Creative's 13%. Intentional by description
  (Copywriter-vs-Creative sequential; Copywriter-vs-Marketer mutually exclusive). Needs spot-check next
  cycle for Stage 2 panel recommendations that could have benefited from a drafting moment. If any do, the
  orchestrator trigger needs loosening. Not blocking.
- **Stage 1 pickset assumption falsified.** For rarely-firing specialists, "Stage 1 Copywriter-likely
  personas will naturally trigger Copywriter in synthesis" is false. Cycle 4's Legal cycle (probable
  narrowest-firing specialist) should default to authoring a targeted persona upfront rather than relying
  on Stage 1 natural triggering.

**Still open from prior cycles:**
- Over-yield-diag R3+R4 (orchestrator-prompt-level close path).
- Creative firing rate 13%.
- R4 async observability.
- Ideation's soft-signal threshold.
- Walter falsifiability framing.
- GR#7 behavioral validation gap.
- Role-player verbatim limitation.
- Finance/Realist borderline overlap.

---

## What's next

**Cycle 3 — CX partial v2 + cases.** Highest field volume among un-rewritten (24 turns / 19 bundles /
17% coverage). Existing voice is strong — *"Low repeat purchase rate is one of those problems that feels
like a marketing problem but is usually a customer experience problem wearing a marketing mask"* is
already reference-quality. The rewrite is additive: case library + §7.2 rules + inline CX-specific
discipline section. **Do not touch the "pressure-test assumptions" section; it works.**

Per Cycle 2's Stage 1 pickset lesson: the CX pickset should include at least one persona whose opener
makes a CX-primary ask explicit. The existing pool likely has this shape naturally (any retention-
problem or customer-journey-pain opener pulls CX) so authoring a new persona may not be needed — confirm
at Stage 1 decision point per the same mechanic.

**Cycle 4 — Operations + Legal + Accountant bundled.** Light touch: case library + §7.2 rules only for
each. No voice rewrites. For Legal specifically: default to authoring a dedicated persona upfront (the
pool already has legal_sensitive; may need one more variant).

---

## Concrete artifacts

| File | Change |
|---|---|
| [scripts/seed-agents.ts](../../scripts/seed-agents.ts) | Copywriter `system_prompt` replaced with v2 (lived-history opener, voice discipline with banned smoke-signals, Write-vs-clarify discipline, §7.2 rules, closing discipline). `description_for_orchestrator` rewritten to Finance v2 / Realist v2 / Creative v2 pattern. Changelog block added above Copywriter object. |
| [lib/agents/cases/copywriter.json](../../lib/agents/cases/copywriter.json) | New — 12 cases exhibiting write-something-real discipline. |
| [test/personas/copy_primary_synthesis.json](../../test/personas/copy_primary_synthesis.json) | New — Second Draft Career Coaching synthesis-phase copy-primary opener. Not concept-first; scripted R3 tests commit-with-exclude on category wallpaper. |
| [BUILD.md](../../BUILD.md) | §7 status line · §7.1 Copywriter v2 bullet · §7.3 Copywriter case library bullet · §7.2 rule count · judgment-call flags appended. |

All 13 cycle bundles live in `test/results/*_copywriter-rep/`.

**Seeded:** yes, via `npm run seed`. 11 active agents in DB, Copywriter system_prompt v2 present and verified.

**test:quality gate:** passes — graph (10/10), grader tests (8/8), fixture grades (7/7 pass).
