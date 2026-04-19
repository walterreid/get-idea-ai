# Handoff — Cycle `cx-rep` close (2026-04-19)

Eleventh handoff note. Previous: `2026-04-19-post-copywriter-rep.md`.

This cycle shipped **CX v2** — **partial** voice rewrite + 10 cases + §7.2 rules. Cycle 3 of the 4-cycle plan
([evaluation plan](2026-04-19-specialist-evaluation-plan.md)). Partial because CX v1 voice was already
working at reference quality (the *"low repeat purchase rate is a CX problem wearing a marketing mask"*
pattern was in v1 and field samples). v2 is additive — preserved the load-bearing v1 sections, added
voice-discipline with banned smoke-signals, the **Experience-gap discipline** inline section (CX's
equivalent of Commit-with-exclude / Write-vs-clarify / specific-flaw / budget-hierarchy), §7.2 rules, and
case library. Token-conscious cycle — 5 validation runs instead of the 13 pattern used in previous
cycles, per user-confirmed conservation intent.

---

## What shipped

### 1. `scripts/seed-agents.ts` — CX `system_prompt` v2 + tightened description

Structure matches Finance v2 / Realist v2 / Creative v2 / Copywriter v2, preserving v1's working sections:

1. Lived-history opener (tightened from "inside the customer's shoes" to a version that names what CX has
   seen before — *"owners who were sure customers wanted speed and found out they wanted certainty, sure
   they wanted low price and found out they wanted to feel they'd made a good choice"*).
2. Voice-discipline section with CX-specific banned smoke-signal phrases inline (10 phrases including
   "improve the customer experience," "focus on customer satisfaction," "build customer loyalty,"
   "delight your customers," "optimize the journey," "enhance the customer experience," "meet customer
   expectations," "exceed customer expectations," "create a seamless experience," "put the customer
   first"). Prophylactic — CX fires at 17% baseline coverage and field samples didn't show these phrases,
   but the list hardens the working pattern.
3. Use the case, don't cite it (GR#6) with right/wrong examples specific to CX.
4. **Experience-gap discipline** — load-bearing inline section. CX's structural equivalent of Finance's
   Budget Signal Hierarchy / Realist's "name the specific flaw" / Creative's Commitment discipline /
   Copywriter's Write-vs-clarify. Every turn names two things: (a) the specific moment in the customer
   journey where the business's assumption and the customer's reality diverge, AND (b) what the customer
   is probably feeling at that moment. Moment + feeling together. *"A moment without a feeling is just a
   process step; a feeling without a moment is therapy, not advice."* Self-check test: could you describe
   the moment so specifically that the owner could stand in the customer's place and feel what the
   customer feels?
5. **Pressure-test assumptions** (preserved from v1, lightly tightened). The *"fastest option vs. good
   choice"* line kept verbatim — it's already reference-quality.
6. **Bring in real examples** (preserved from v1, tightened). Good-interaction / bad-interaction question
   pattern kept.
7. Divergence rule (§7.2) specialized to CX.
8. Evidence-bound rule (§7.2) specialized to CX.
9. What you're listening for (expanded with 6 specific trigger patterns).
10. What you don't do (expanded with CX-specific malpractice — handwritten thank-you is a CX system; $40K
    CRM often is not).

`description_for_orchestrator` rewritten to Finance v2 / Realist v2 / Creative v2 / Copywriter v2 pattern
— role opener + 4 numbered triggers (supply-side-only conversation, retention-shape problem,
untested-assumption-about-customer-behavior, moment-of-truth analysis) + CX-vs-Marketer distinction
(*"Marketer asks how do we reach and convert them; CX asks what happens once we have them, and does the
experience match what we promised"*) + CX-vs-Operations distinction + grounding clause (CX improvements
requiring unaffordable tooling are malpractice) + phase guidance. Changelog block added above the CX
object.

### 2. `lib/agents/cases/cx.json` — new 10-case library

Distribution:

- `professional_services` × 2: post-signing-silence (consultancy 3-week kickoff gap);
  handoff-between-intake-and-senior (law firm partner-to-associate trust break).
- `local_services` × 2: voicemail-gap (HVAC after-hours call going to next contractor);
  post-job-followthrough (landscaper review profile improved by same-evening email).
- `restaurant_food` × 2: first-30-seconds-mismatch (neighborhood Italian with cold doorway);
  allergy-interaction (failure-mode reveals competence).
- `fitness_wellness` × 2: first-class-to-second-class-drop (barre studio anonymity relapse);
  injury-communication (visible adaptation vs. form-capture).
- `ecommerce_dtc` × 2: post-purchase-confirmation-gap (candle brand 48-hour silence);
  unboxing-mismatch (premium brand in Amazon-generic cardboard).

Each case exhibits the **moment-plus-feeling discipline**: `what_worked` names the specific touchpoint
intervention + the emotional shift it created; `what_wasted_money` names the adjacent intervention
(features, ads, pricing) that didn't address the moment. Schema matches existing case files — no loader
changes needed.

### 3. Token-conscious validation — 5 runs, not 13

Per user direction mid-cycle. Stage 1 cut from 5 personas to 3 (bakery_delivery, poza_salon,
glory_days_vintage); Stage 2 cut from 7 to 2 (slate_psychology, morlock_landscape). Stage 3 over-fire
check absorbed into Stage 1 + Stage 2 R1 routing (no dedicated runs). Trade-off: less regression-sweep
coverage than Copywriter or Creative cycles; accepted because CX v1 voice was already known-working and
v2 is additive, not remedial.

---

## Validation results

### Stage 1 — 3 CX-likely personas

| Persona | Grader | CX fires? | R1 specialist | Agent counts |
|---|---|---|---|---|
| `bakery_delivery` | 6/6 ✓ | no | finance | finance × 5, realist × 1, panel_rec × 2 |
| `poza_salon` | 6/6 ✓ | no | marketer | marketer × 2, finance × 2, panel_rec × 2 |
| `glory_days_vintage` | 6/6 ✓ | no | marketer | marketer × 1, finance × 4, panel_rec × 2 |

**0/3 CX fires.** Each persona has a real problem that the orchestrator correctly routed to numeric
(Finance) or channel (Marketer) specialists. The Stage 1 pickset assumed "retention-shape" personas
would naturally pull CX — falsified. *Presenting* problems for these owners are margin (bakery),
chair-utilization (salon), and distribution-model (vintage), which the orchestrator reads as
Finance/Marketer questions. Same pattern as Copywriter cycle's Stage 1 where 0/5 fired on the pickset
assumed to trigger Copywriter.

### Stage 2 — 2 diverse regression personas

| Persona | Grader | CX fires? | R1 specialist | Agent counts |
|---|---|---|---|---|
| `slate_psychology` | 6/6 ✓ | **yes** | cx | **cx × 1**, operations × 1, realist × 1, finance × 1, panel_rec × 2 |
| `morlock_landscape` | 6/6 ✓ | no | realist | realist × 1, finance × 3, panel_rec × 2 |

**CX fired on slate_psychology** — the one persona in the set where the "moment-of-truth" trigger is
explicit in the opener (therapist practice adding clinicians → handoff of existing clients to new
associates is a classic moment-of-truth). The orchestrator routed CX to **R1** for this persona,
validating the v2 description's moment-of-truth trigger.

### CX turn — reference-quality evidence

slate_psychology R1 CX turn (quoted in full):

> Before we talk about filling those hours, I need to know what happened to the three-week waitlist when
> you brought on the associates.
>
> Did those clients move to the new therapists, or did they stay with you? And if they moved — or if
> some did and some didn't — what determined who went where?
>
> The reason I'm asking is that "empty hours" and "ethics of filling them" might be describing two
> different problems. One is real market demand you haven't reached yet. The other is existing clients
> who need more from you than they're getting, and they're not asking because they don't think asking is
> possible.

This turn hits every v2 discipline:

- **Experience-gap discipline** (moment + feeling): Names the specific moment — *"what happened to the
  three-week waitlist when you brought on the associates"* — and the feeling — *"they're not asking
  because they don't think asking is possible."*
- **Divergence rule** (name the bridge): Owner asked about filling hours; CX named the bridge to the
  real diagnostic (existing-client experience during the transition), with explicit reasoning.
- **Evidence-bound**: Every reference is anchored — the waitlist, the associates, the transition moment
  — all drawn from the owner's opener.
- **One question per turn**: Single diagnostic question tied to a specific gap, not a menu. Asks for
  exactly the information that determines which of two problems this is.
- **No banned phrases** (explicit scan): none of "improve the customer experience," "focus on customer
  satisfaction," "build customer loyalty," "delight your customers," "optimize the journey." Zero hits.
- **Voice discipline** (two to three sentences of framing, plus the diagnostic): under the
  length/structure constraint.

### Cycle-wide summary

- **5/5 bundles grader 6/6.**
- **33 agent turns total, 1 CX turn = 3.0% cycle rate** (1/5 bundle coverage = 20% cycle coverage).
- **0 banned-phrase hits** across all 33 turns (CX-specific + generic smoke-signal list).
- **0 CX R1 over-fires** on business-signal personas (bakery_delivery → Finance, poza_salon → Marketer,
  glory_days_vintage → Marketer, morlock_landscape → Realist are all correct R1 routings; only
  slate_psychology R1 was CX, which is the correct call for moment-of-truth shape).

### Hand-read (Stage 4 — condensed)

Hand-read the one CX turn against reference quality standards:

- **Forwardable?** Yes — a friend of the owner could read it and feel the panel heard a specific thing
  about this practice ("existing clients not asking because they don't think asking is possible" is a
  specific emotional truth, not a category claim).
- **Moment + feeling?** Yes — the moment is the waitlist-to-associate transition; the feeling is the
  silent unmet need of clients who didn't know they could ask for more time with the original therapist.
- **Anti-generic?** Yes — the turn could not be pasted onto another business unchanged. It is
  slate_psychology-specific.
- **Preserved v1 sections active?** Yes — the "two different problems" framing is a lineage of the v1
  "pressure-test assumptions" voice. The v2 rewrite preserved rather than replaced.

### Hidden-assumptions lens (Stage 5)

1. **"CX v2 description tightening preserves fire-rate."**
   - Revealed: AMBIGUOUS. Cycle rate (20% coverage) is above v1's 17% baseline, but the sample is n=5 —
     too small to conclude. The one fire is high-quality and on the right persona, suggesting the
     description is discriminating well. A larger batch would confirm or falsify.
   - Load-bearing for future: If CX fire rate drops in subsequent cycles' incidental observations (e.g.,
     Cycle 4's Legal/Ops/Accountant runs will each have CX-adjacent moments), the description's
     tightening may need a minor widening.

2. **"Partial v2 approach works — preserving working sections + adding discipline structure is additive."**
   - Revealed: CONFIRMED. The preserved v1 "pressure-test assumptions" voice ("two different problems,"
     the diagnostic question form) shows up clearly in the slate_psychology turn. The Experience-gap
     discipline structure (moment + feeling) is also explicitly present. The two layers coexist rather
     than conflicting.
   - Load-bearing for Cycle 4: For Operations + Accountant where v1 voice is also working (catchphrase +
     Finance-distinction respectively), the partial-v2 template transfers cleanly.

3. **"Stage 1 pickset assumption for specialists with natural baselines stays falsifiable."**
   - Revealed: CONFIRMED (again — Copywriter cycle also falsified this). "Retention-shape" personas
     (bakery_delivery, poza_salon, glory_days_vintage) did not pull CX at all; their presenting problems
     are numeric/channel and the orchestrator correctly routed accordingly. CX's real triggers in field
     data were (a) moments-of-truth like the slate_psychology handoff, and (b) supply-side-only
     conversations that have stayed supply-side for 3+ turns. Neither shape is guaranteed by a
     "retention-shape" persona.
   - Load-bearing for Cycle 4: For Legal (the narrowest-firing specialist), authoring a targeted persona
     upfront is the confirmed right move per Cycle 2's lesson. Don't repeat the Stage 1 false-assumption
     pattern.

4. **New surfaced: "Token-conscious validation at n=5 produces publishable signal but weak regression
   coverage."**
   - Revealed: AMBIGUOUS. The cycle has clear positive evidence (one reference-quality CX turn; zero
     banned-phrase regressions across 33 turns) but the regression surface is narrower than Copywriter
     cycle's 87-turn sweep. If a banned-phrase hit existed in a specialist-adjacent turn type not
     covered here (e.g., Marketer turns under Creative's "brand story" pressure in cx-adjacent
     scenarios), this cycle wouldn't catch it.
   - Close path: Accept the trade for this cycle per user intent. In Cycle 4 (light-touch trio), the
     bundled approach will naturally produce 3× the runs at the same per-specialist cost, closing
     regression-coverage across Operations + Legal + Accountant simultaneously.

---

## Decisions and why

### Partial v2, not full

Per plan. CX v1 voice was already landing in field samples. Rewriting sections that were working would
have been regression risk for no quality gain. The **Experience-gap discipline** is the new load-bearing
addition; the v1 "pressure-test assumptions" and "bring in real examples" sections are kept because they
were already doing the work the rewrite would have produced.

### No targeted persona authored

Unlike Copywriter cycle where 0/5 Stage 1 fires forced authoring `copy_primary_synthesis` mid-cycle. Here,
slate_psychology in the Stage 2 set fired CX on R1 with a reference-quality turn, providing the
load-bearing evidence. The pickset assumption ("retention-shape personas will trigger CX") was falsified
but a different persona from the broader pool surfaced the actual trigger shape (moment-of-truth
handoff). Authoring would have been belt-and-suspenders here.

### Token-conscious run count

Per user instruction mid-cycle. 5 runs ≈ 38% of Copywriter cycle's run count. The trade-off is noted in
the hidden-assumptions lens: positive evidence is clean, regression coverage is narrower. Accepted for
this cycle; Cycle 4's bundled structure will re-expand the regression surface.

### No orchestrator prompt edit

Per cycle scope guardrails. The one CX R1 fire (slate_psychology) validates current routing; the 4 non-
fires are each correct routings to other specialists. Over-yield-diag R3+R4 flag stays open. Creative
firing rate 13% flag stays open. Copywriter firing rate 8% flag stays open.

### No token-budgets.ts edit

CX current cap was adequate. slate_psychology CX turn came in well under cap with room to spare.

---

## What did NOT change this cycle

- Orchestrator prompt.
- `lib/agents/token-budgets.ts`.
- Any graph node or state annotation.
- Any other specialist's prompt or case library.
- The grader.
- `lib/knowledge/`.

---

## Open flags going into the next cycle

**Closed this cycle:** none directly.

**Updated this cycle:** none from prior. The falsified Stage 1 pickset assumption (Copywriter cycle flag)
is now confirmed by a second cycle — strengthening the recommendation that rarely-firing specialists
should have targeted personas authored upfront.

**New this cycle:**
- **CX firing rate stability under v2 description tightening.** Cycle n=5 produced 20% bundle coverage
  vs. v1's 17% baseline — within noise. Larger-sample confirmation deferred to Cycle 4 (where CX-adjacent
  moments will naturally appear in Ops/Legal/Accountant runs) or to a later probe. Not blocking.

**Still open from prior cycles:**
- Over-yield-diag R3+R4 (orchestrator-prompt-level close path).
- Creative firing rate 13% (spot-check angle-gap recs in future cycles).
- Copywriter firing rate 8% (spot-check synthesis-phase recs in future cycles).
- Stage 1 pickset assumption (confirmed falsified across two cycles; default upfront authoring for
  rarely-firing specialists in Cycle 4 Legal).
- R4 async observability.
- Ideation's soft-signal threshold.
- Walter falsifiability framing.
- GR#7 behavioral validation gap.
- Role-player verbatim limitation.
- Finance/Realist borderline overlap.

---

## What's next

**Cycle 4 — Operations + Legal + Accountant (light-touch trio).** Final cycle in the specialist-
replication plan. Scope per specialist: case library (10–12 cases) + §7.2 rules (divergence + evidence-
bound) + tightened description_for_orchestrator. **No voice rewrites.** Existing distinctive sections
(Operations catchphrase, Legal urgency calibration, Accountant Finance-distinction) stay intact.

**For Legal specifically:** author a dedicated persona upfront (analogous to `copy_primary_synthesis` for
Copywriter) to avoid re-falsifying the Stage 1 pickset assumption. Candidate: a contractor-or-service
business with a specific legal exposure (waiver enforceability, subcontractor liability, or
regulatory-compliance question) explicitly surfaced in R1.

**Validation structure for Cycle 4:** Bundle runs across the three specialists — each specialist gets
one targeted persona + shared diverse regression runs. Expected ~8 runs total, producing regression
coverage for three specialists simultaneously (roughly Copywriter-cycle coverage at Cycle 3 cost).

---

## Concrete artifacts

| File | Change |
|---|---|
| [scripts/seed-agents.ts](../../scripts/seed-agents.ts) | CX `system_prompt` replaced with v2 (partial — preserved "pressure-test assumptions" + "bring in real examples"; added lived-history opener, voice discipline with banned smoke-signals, Experience-gap discipline, §7.2 rules). `description_for_orchestrator` rewritten to reference pattern. Changelog block added. |
| [lib/agents/cases/cx.json](../../lib/agents/cases/cx.json) | New — 10 cases exhibiting moment-plus-feeling discipline. |
| [BUILD.md](../../BUILD.md) | §7.1 status + CX v2 bullet · §7.3 CX case library bullet · §7.2 rule count updated (6 now; 4 remaining) · judgment-call flag appended. |

All 5 cycle bundles live in `test/results/*_cx-rep/`.

**Seeded:** yes, via `npm run seed`. 11 active agents in DB, CX system_prompt v2 present and verified.

**test:quality gate:** passes — graph (10/10), grader tests (8/8), fixture grades (7/7 pass).
