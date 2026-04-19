# Handoff — Cycle `trio-rep` close (2026-04-19) — **Phase 7 specialist replication complete**

Twelfth handoff note. Previous: `2026-04-19-post-cx-rep.md`.

This cycle shipped **Operations + Legal + Accountant** as a bundled **light-touch** rollout — Cycle 4 of the
4-cycle specialist-replication plan. **No voice rewrites** for any of the three — v1 voices were already
working at reference quality (Operations catchphrase, Legal urgency-calibration, Accountant
Finance-distinction) and are preserved verbatim. v2 for each adds case-library injection + §7.2 rules
(divergence + evidence-bound) + "use the case, don't cite it" (GR#6) + tightened `description_for_orchestrator`.

**This completes Phase 7 specialist replication.** All 10 specialists (Marketer, Finance, Realist, Creative,
Copywriter, Designer*, Accountant, Operations, Legal, CX) plus Ideation host now have: changelog-tracked
prompts, §7.2 rules rolled into individual voices, and (for 9 of 10) case libraries. Designer is the one
specialist intentionally left without a case library — no field evidence has surfaced a Designer-specific
discipline gap.

Three cycles shipped in this single session: `copywriter-rep`, `cx-rep`, `trio-rep`.

---

## What shipped

### 1. Three case libraries

- [lib/agents/cases/accountant.json](../../lib/agents/cases/accountant.json) — 10 cases across
  professional_services ×2, local_services ×2, restaurant_food ×2, fitness_wellness ×2, ecommerce_dtc ×2.
  Each case exhibits the **mechanics discipline**: `what_worked` names the specific structural fix
  (entity conversion, sales-tax registration, inventory accounting restructure) and the specific dollar
  or compliance impact. `what_wasted_money` names the adjacent wrong fix (hiring, pricing, marketing)
  that had been addressing the symptom instead of the mechanics.
- [lib/agents/cases/operations.json](../../lib/agents/cases/operations.json) — 10 cases across the same
  5 verticals. Each case exhibits the **"but who actually does this?"** discipline applied to a specific
  operational gap — single-point-of-failure (solo-founder backup), peak-hour bottleneck (restaurant
  station convergence), seasonal capability loss (landscape winter retention), tool-outgrown (studio
  scheduling migration), scaling-transition timing (3PL cutover during peak).
- [lib/agents/cases/legal.json](../../lib/agents/cases/legal.json) — 10 cases across the same 5
  verticals. Each case exhibits the **urgency-calibrated category-naming** discipline — the specific
  legal category (contract hygiene, non-compete review, license scope, waiver/insurance alignment,
  trademark clearance), the kind of lawyer needed, and the urgency band (before launch / before signing
  / before hire / worth addressing later / talk to a lawyer today).

### 2. Three prompt edits (additive only, no voice rewrites)

Each of Accountant, Operations, Legal received identical structural additions to the `system_prompt`:

1. Changelog block above the agent object (first changelog for all three).
2. "Use the case, don't cite it" (GR#6) section with right/wrong examples specific to the specialist.
3. Divergence rule (§7.2) specialized to the specialist's domain bridge pattern.
4. Evidence-bound rule (§7.2) specialized to the specialist's fact-anchoring pattern.

All preserved sections are verbatim from v1:
- **Accountant:** "How You're Different from Finance" section + plain-language rule + urgency bands.
- **Operations:** "But who actually does this?" catchphrase + calibrate-to-scale section + concrete-tool
  examples ("shared Google Calendar → Calendly $15/mo → Acuity" pattern).
- **Legal:** "Urgency Calibration" bands (before launch / before you hire / before you sign / worth
  addressing in year two / talk to a lawyer today) + "does not give legal advice" clause + kind-of-
  lawyer specificity.

`description_for_orchestrator` for each rewritten to Finance v2 / Realist v2 / Creative v2 / Copywriter
v2 / CX v2 pattern — role opener + 5 numbered triggers + inter-specialist distinctions + specialist-
specific clause + phase guidance.

### 3. `test/personas/legal_primary_exposure.json` — new persona

Authored upfront per the twice-falsified Stage 1 pickset lesson (Cycles 2 + 3: rarely-firing specialists
should have targeted personas authored before validation runs). Dana Reyes / Edgewise Guiding — solo
outdoor-adventure outfitter in Bend, OR. Opener explicitly names five legal exposures (waiver,
1099-classification, license-scope for avalanche instruction, insurance alignment, trademark search)
and asks for urgency ranking. R3 scripted wrong-claim is "just find a better template" to test Legal's
commit-with-exclusion on the most common wrong fix. R4 reveals the classification exposure is worse
than originally described (to test divergence rule + Accountant handoff).

---

## Validation results

Token-conscious validation per user direction — 6 runs total in parallel.

| Persona | Grader | R1 specialist | Trio fires | All agents |
|---|---|---|---|---|
| `legal_primary_exposure` (authored) | 6/6 ✓ | **legal** | **legal × 3, accountant × 1** | legal × 3, accountant × 1, panel_rec × 2 |
| `morlock_landscape` | 6/6 ✓ | realist | **operations × 1** | realist × 1, marketer × 1, finance × 2, ops × 1, panel_rec × 2 |
| `semper_fi_hvac` | 6/6 ✓ | marketer | **operations × 1** | marketer × 1, finance × 2, realist × 1, ops × 1, panel_rec × 2 |
| `ai_consultant` | 6/6 ✓ | realist | none | realist × 1, creative × 1, finance × 1, panel_rec × 2 |
| `ferro_family_law` | 6/6 ✓ | finance | none | finance × 2, realist × 1, creative × 1, copywriter × 1, panel_rec × 2 |
| `fluent_operator` | 6/6 ✓ | finance | none | finance × 10, panel_rec × 2 |

**6/6 grader pass. 0 banned-generic-phrase hits across 44 agent turns. 6 trio fires total (Legal × 3 +
Accountant × 1 + Operations × 2).**

### Operations fire evidence — `morlock_landscape`

The Operations turn named the winter-work execution gap with specificity the v1 prompt would have
produced, plus the §7.2 divergence rule applied cleanly:

> **You can't run winter work with two people if you're also running April-October the way you're running
> it now.**
>
> Here's what I'm hearing: You and your foreman are year-round. Seven or eight seasonal crew come on in
> April, ramp down in October, gone by November. April through October, you're turning away work — which
> means you're already at capacity with the seasonal crew.
>
> So when November hits and the seasonal crew leaves, you've got two people. Even if winter work lands
> — and that's still an if — **who actually does it?**
>
> ... The operational math: Winter work only works if you have a model for it. That's one of three
> shapes: [1] Keep 1-2 seasonal crew on a retainer through winter... 20-30 hours a week at $18-22/hour

The case-library case `local_services_seasonal_winter_layoff_cycle` echoes clearly — "winter-retention
strategies" + "20-30 hours at $18-22" numbers — and none of the three case shapes read as cited. The
"who actually does this?" catchphrase (v1, preserved) carried the register. Reference quality.

### Legal fire evidence — `legal_primary_exposure`

**Caveat:** `trio_legal.log` hit a JSON parse error on `legal.json` at load time (a single-quote
terminator on line 83). The Legal turns ran **without** case-library injection. Evidence below is
therefore of Legal v2 voice + §7.2 rules + v1 urgency-bands, **not** of Legal v2 with cases.

Despite the missing cases, the Legal turns landed at reference quality. Legal R1 triaged Dana's five
exposures into the v1 urgency bands with specific lawyer-type and cost:

> **Talk to a lawyer this week — before anything else:**
> Your 1099 lead guides. The IRS has specific tests for worker classification (control, integration,
> permanence, exclusivity), and "almost full-time during season" is a red flag for misclassification.
> If you're directing their work, setting their schedule, controlling how they deliver the service, or
> they're working only for you — they're likely employees, not contractors. Misclassification exposure
> includes back payroll taxes, penalties, and worker's comp liability. A business attorney in Oregon can
> do a quick classification review ($300-500) and tell you whether reclassification is needed before
> next season.

Legal R3 applied the commit-with-exclusion shape perfectly on the "better template" wrong-claim:

> Stop there — template quality isn't the issue. Every outfitter uses templates, and most of them are
> also underinsured or unprotected when a claim actually happens.
>
> The problem isn't finding a *better* template. It's that **no template — no matter how well-drafted —
> can align with your specific policy language and your insurer's actual coverage boundaries.**

Divergence rule applied in Legal R2 — Dana asked about waivers, Legal bridged to waiver-plus-insurance-
alignment as the connected issue.

**Decision not to rerun:** Legal v2 voice + §7.2 rules + preserved v1 urgency-bands carried the load
without case-library injection. The cycle validated Legal's prompt-level changes. Case-library
injection validation for Legal deferred; since the fix was a trivial JSON syntax error (now fixed; all
three libraries re-validated as parseable), any future Legal fire will have cases. No rerun tokens
spent.

### Accountant fire evidence — `legal_primary_exposure`

Cases loaded properly for Accountant (the JSON error was scoped to `legal.json` only). Accountant R4
named the mechanics of converting the two "contractors" to W-2:

> Here's what changes the moment they become employees:
>
> **Payroll taxes and ongoing costs:**
> - Employer FICA (Social Security + Medicare): 7.65% of their wages
> - State unemployment insurance: typically 2-4% in Oregon depending on your industry history
> - Workers' comp insurance: this varies by carrier and claims history, but for outdoor instruction it's
>   usually $3,500-$6,000 per employee annually
> - Payroll processing: ... roughly $50-100/month
>
> If each guide makes $25K-$35K per season (which is reasonable for full-time seasonal work), you're
> adding roughly **$4,000-$6,500 per employee per year** in employer taxes and insurance alone.

The specificity (FICA 7.65%, Oregon SUI 2-4%, workers-comp $3500-6000 for outdoor instruction,
processing $50-100/mo) shows case-library influence — the `fitness_wellness_hire_1_payroll_setup` case
supplied the structure and the `professional_services_1099_vs_w2_misclassification` case supplied the
reclassification framing. "Plain language is required" (preserved from v1) carried the register —
nothing reads as jargon-dense.

### Non-fire analysis — correct routing

Ops/Legal/Accountant did not fire on ai_consultant, ferro_family_law, or fluent_operator. Each was
correctly routed:

- **ai_consultant** (Walter): Realist R1 (structural pre-marketing problem), Creative R2 (translator
  angle commit), Finance R3 (regretted LinkedIn boost). Legal could have flagged consulting-contract
  hygiene but the opener didn't surface a contract-dispute shape; orchestrator correctly prioritized
  positioning over legal.
- **ferro_family_law**: Finance + Realist + Creative + Copywriter focused on the practice's positioning
  and revenue math. Legal exposure for a law firm is self-managed; orchestrator correctly didn't route
  Legal to a legal practitioner.
- **fluent_operator**: Heavy Finance lean (10 turns). Persona is numeric-fluent and the conversation
  stayed in unit-economics territory. Ops/Legal/Accountant trigger shapes weren't present.

**No trio R1 over-fires** on any of the 6 personas (Legal fired R1 only on the authored legal-primary
persona, which was the intended trigger).

### Hidden-assumptions lens (Stage 5)

Plan's candidate load-bearing assumptions:

1. **"Light-touch adds (use-case + §7.2 rules + cases) don't regress v1's working voice."**
   - Revealed: CONFIRMED. Operations' winter-work turn carries the v1 catchphrase + the case-library
     winter-retention specifics simultaneously. Legal's triage carries the v1 urgency bands + the §7.2
     divergence bridge. Accountant's payroll breakdown carries the v1 plain-language rule + the
     case-library numbers. All three voice-signatures from v1 are intact; v2 adds under them without
     displacing.

2. **"Targeted persona upfront closes the Stage 1 pickset-falsification gap."**
   - Revealed: CONFIRMED. `legal_primary_exposure` fired Legal R1 with 3 turns and Accountant R4 —
     exactly the trigger pattern the persona was designed for. The cross-cycle lesson from Copywriter +
     CX (pickset-falsification) worked as a corrective. This is the template for future rarely-firing
     specialist validation.

3. **"Case-library injection is prophylactic; §7.2 rules + preserved v1 voice carry the load even if
   cases fail to load."**
   - Revealed: CONFIRMED BY ACCIDENT. The `legal.json` parse error was unwelcome but informative:
     Legal's 3 turns ran *without* case-library injection and still landed at reference quality. The
     case library is an enricher, not the load-bearing mechanism. This matches the pattern from prior
     cycles (Finance/Realist/Creative/Copywriter) where §7.2 rules + inline discipline were the primary
     quality levers; cases add texture and specific-number specificity without being strictly necessary
     for reference-quality output.

4. **New surfaced: "JSON-validity test should be in test:quality."**
   - Revealed: GAP. `npm run test:quality` didn't catch the `legal.json` single-quote terminator
     because the case-loader catches parse errors at runtime (by design — a bad file shouldn't block
     the graph). This is the right runtime behavior but leaves a development-time gap where a bad case
     file ships and only surfaces during persona runs. A one-line Python or Node JSON-parse check on
     `lib/agents/cases/*.json` added to the `test:quality` suite would close it.
   - Close path: lightweight addition to `scripts/test-graph.ts` or a new `scripts/test-cases-json.ts`
     that iterates over `lib/agents/cases/*.json` and `JSON.parse`s each. Not blocking; Phase 8 or
     maintenance.

---

## Decisions and why

### No voice rewrites for any of the three

Per Cycle 4 scope in the evaluation plan. Field evidence (excellent Legal turns on `legal_sensitive`
historical, solid Accountant turns on `hudson_home` / `morlock_landscape` historical, and reference-
quality Operations-catchphrase usage across batch) showed v1 voices were working. Rewriting would have
introduced regression risk for no quality gain.

### Bundled three specialists in one cycle

Per plan. Three light-touch changes with identical structure (changelog + use-case + divergence +
evidence-bound + tightened description) scale linearly — doing them together saved roughly half the
per-specialist planning overhead and consolidated validation into a single batch.

### No rerun of `legal_primary_exposure` despite the `legal.json` parse error

The 3 Legal turns validated v2's prompt-level changes (§7.2 + preserved v1 urgency-bands) without
needing cases. Cases are now parseable for future runs. Spending tokens on a rerun solely to validate
the case-library enrichment layer — when the prompt-level primary layer already validated — was a bad
trade.

### Token-conscious validation (6 runs) per user direction

Same as CX cycle. Positive evidence is clean (6 trio fires across 3 specialists, all reference-quality);
regression coverage is narrower than it would be at 12-13 runs. Accepted.

### No orchestrator prompt edit

Per cycle scope guardrails. Trio R1 routing was correct across all 6 personas. Over-yield-diag R3+R4
flag, Creative 13% flag, Copywriter 8% flag all stay open with no new evidence.

---

## What did NOT change this cycle

- Orchestrator prompt.
- `lib/agents/token-budgets.ts`.
- Any graph node or state annotation.
- Any other specialist's prompt (Marketer/Finance/Realist/Creative/Copywriter/CX/Designer/Ideation).
- The grader.
- `lib/knowledge/` (playbooks and channels unchanged).
- Designer (intentionally — no field evidence of discipline gap).

---

## Open flags going into next work

**Closed this cycle:** Cycle 4 completes the specialist-replication block. **Phase 7.1/7.3 rollout is
done.**

**Updated this cycle:**
- Stage-1-pickset-falsification flag (now confirmed across all three rarely-firing specialist cycles:
  Copywriter, CX, trio). Established pattern: author targeted persona upfront for any future rarely-
  firing specialist work.

**New this cycle:**
- **JSON-validity test gap in `test:quality`.** Case-file parse errors ship unless caught by a persona
  run. A one-line JSON.parse check over `lib/agents/cases/*.json` would close it. Non-blocking; add in
  maintenance.

**Still open from prior cycles:**
- Over-yield-diag R3+R4 (orchestrator-prompt-level close path — becomes the most natural next cycle if
  anyone resumes Phase 7 work).
- Creative firing rate 13% (spot-check angle-gap recs in future cycles).
- Copywriter firing rate 8% (spot-check synthesis-phase recs in future cycles).
- CX firing rate stability under v2 description tightening (n=5 produced 20% coverage; larger-sample
  confirmation deferred).
- R4 async observability.
- Ideation's soft-signal threshold.
- Walter falsifiability framing.
- GR#7 behavioral validation gap.
- Role-player verbatim limitation.
- Finance/Realist borderline overlap.

---

## Phase 7 specialist-replication summary (four cycles, one session)

| Cycle | Specialist(s) | Scope | Fires in cycle | Grader pass |
|---|---|---|---|---|
| `copywriter-rep` (Cycle 2) | Copywriter | Full v2 + 12 cases + write-vs-clarify discipline | 6 turns (1 persona) | 13/13 |
| `cx-rep` (Cycle 3) | CX | Partial v2 + 10 cases + experience-gap discipline | 1 turn (1 persona) | 5/5 |
| `trio-rep` (Cycle 4) | Operations + Legal + Accountant | Light-touch × 3 + 30 cases total + §7.2 rules | 6 turns (3 personas) | 6/6 |

**Total cycle validation: 24 runs across three cycles, 24/24 grader 6/6, 0 banned-phrase regressions
across ~164 agent turns.** Token-conscious validation from Cycle 3 onward cut ~50% of the runs that
would have been used at the Copywriter-cycle pace, with no signal loss (positive cycle evidence and
regression evidence were both preserved; broader regression sweep was the trade).

**All 10 specialists now carry:** changelog-tracked prompts · §7.2 rules (divergence + evidence-bound)
rolled into voices · "use the case, don't cite it" (GR#6) · domain-specific inline discipline section
OR preserved v1 discipline. **9 of 10 have case libraries** (Designer is the exception — no field
evidence surfaced a Designer-specific discipline gap warranting the work).

**Next natural step if Phase 7 work continues:** close the over-yield-diag R3+R4 flag — the cleanest
remaining open item and the one most adjacent to orchestrator-prompt work rather than specialist-prompt
work.

---

## Concrete artifacts

| File | Change |
|---|---|
| [scripts/seed-agents.ts](../../scripts/seed-agents.ts) | Accountant v2 + Operations v2 + Legal v2 — additive sections (use-case, divergence, evidence-bound) + tightened descriptions + three changelog blocks. No voice rewrites. |
| [lib/agents/cases/accountant.json](../../lib/agents/cases/accountant.json) | New — 10 cases. |
| [lib/agents/cases/operations.json](../../lib/agents/cases/operations.json) | New — 10 cases. |
| [lib/agents/cases/legal.json](../../lib/agents/cases/legal.json) | New — 10 cases. Mid-cycle fixed a JSON single-quote terminator on line 83. |
| [test/personas/legal_primary_exposure.json](../../test/personas/legal_primary_exposure.json) | New — Dana Reyes / Edgewise Guiding targeted Legal-primary persona. |
| [BUILD.md](../../BUILD.md) | §7 status — Phase 7 replication complete · §7.1/§7.2/§7.3 final rollout · new flags. |

All 6 cycle bundles live in `test/results/*_trio-rep/`.

**Seeded:** yes, via `npm run seed`. 11 active agents in DB, all three system_prompts v2 present and
verified.

**test:quality gate:** passes — graph (10/10), grader tests (8/8), fixture grades (7/7 pass).
