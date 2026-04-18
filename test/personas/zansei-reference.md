# Zansei persona reference (tracked — only `test/results/` is gitignored)

This repo is **standalone**. Nothing here depends on a sibling project. The Zansei files we studied have been copied into `test/external-references/zansei/` so every reference in this tree resolves inside the repo, even if the original `ad101-AI-marketing-advisor/` directory is gone.

This file: what we copied, where it lives, and why each piece matters for Phase 7.

```
test/external-references/zansei/
├── prompts/
│   ├── conversation_system.md
│   └── plan_generation.md
├── personas/
│   ├── ai_consultant.json        ← Phase 7 primary falsifiability case
│   ├── restaurant_queens.json
│   ├── plumber_no_website.json
│   ├── therapist_cautious.json
│   ├── lagged_answerer.json      ← Walter variant (adversarial)
│   └── landscaper_idk.json       ← "genuine I don't know" (adversarial)
└── run_test_suite.py
```

All six persona files and the three prompt/harness files are verbatim copies from the Zansei repo at the time of this session. Treat them as reference material, not library code. If the Zansei project updates, this bundle does not auto-sync.

---

## Primary — Phase 7 falsifiability case

### `personas/ai_consultant.json` — the Walter Reid canonical case

Walter Reid, barely anonymized. Business name changed, location real (Greenwich, CT), challenge verbatim: *"nobody really knows about me. Because AI consultancy is so new and EVERYONE thinks they can do it themselves, I find it very difficult to stand out."* Past regretted LinkedIn boost spend of $300–500. Self-aware, INTP, thinks out loud.

This is the exact stimulus that produces *"build thought leadership / clarify positioning / create a content strategy"* from a generic advisor. It is what [BUILD.md Phase 7](../../BUILD.md) is for. Run it as R1 before any Phase 7 subphase and again after each, and diff.

**Why it's the right primary:** the persona doesn't need Legal, doesn't need domain-specific trade knowledge, and has a believable budget with a believable regret. The failure mode shows up cleanly in the advisor prose — no ambiguity about whether "the specialist was wrong" is masked by "the specialist didn't have enough context."

---

## Walter's other call-outs — directly applicable transplants

### `personas/restaurant_queens.json`

Local / geographic specificity. The Queens archetype — neighborhood business in a dense, competitive urban zip. Good for testing whether the Marketer recommends channels a neighborhood restaurant can actually execute, or defaults to "build an Instagram presence" when the real move is Google Business Profile + radius-locked search.

### `personas/plumber_no_website.json`

Trades persona with no web presence. Tests whether advisors route to what is actually missing (listings, GBP, referral structure, reviews) rather than defaulting to "build a website" or "start Instagram." The absence of a site is a **constraint**; treating it as a problem-to-fix-first may itself be the wrong move.

### `personas/therapist_cautious.json`

Licensed profession, compliance awareness, closest analog to **Slate Psychology** in [CLAUDE.md](../../CLAUDE.md). Tests whether Legal Awareness is summoned by **situation** (regulated trade, client-confidentiality implications) rather than by keyword, and whether Marketing knows that specialty-search beats category-search for regulated practices.

---

## Adversarial shapes worth studying

- **`personas/lagged_answerer.json`** — Walter variant who answers one question behind. Tests whether the Orchestrator's routing stays coherent when owner signal is delayed or misaligned with the most recent question.
- **`personas/landscaper_idk.json`** — Genuine "I don't know" owner with no budget number. Tests advisor behavior when defaults are tempting. (This persona drove Zansei's v3 `plan_generation.md` rewrite — a real failure analysis tied to a prompt change.)

The full 21-persona library exists in the Zansei repo if you want to lift more later (prompt_injector, jerk_rusher, pleasantries_first, and 15 others). Only the six above are copied here because they're the ones referenced by name in Phase 7.

---

## Prompt & harness reference

### `prompts/conversation_system.md` — voice structure

Zansei's main advisor voice prompt. Directly transplantable to each specialist in [scripts/seed-agents.ts](../../scripts/seed-agents.ts). Phase 7.1 lifts:

- Identity opener ("You are X, a senior Y with Z years of experience...")
- Tool-voice ban list (`generate`, `output`, `results`, `deliverable`)
- Anti-sycophancy, anti-jargon rules
- Sentence cap ("2–4 sentences max")
- Specificity example ("I noticed your services page lists 12 different offerings but doesn't have pricing" vs "I looked at your website")

### `prompts/plan_generation.md` — generative constraints

Three patterns for Phase 7.2:

- **Divergence rule** (top of the Diagnosis section): *"When your expert knowledge leads to a recommendation the conversation didn't surface, name that divergence explicitly... Show them the bridge between what they said and where you're taking them."*
- **Budget signal hierarchy** (under the Estimate section): STATED > CURRENT > HISTORICAL > INFERRED, with **historical regretted spend = pain evidence, not willingness.**
- **Anti-generic phrase list** (Quality Rules): *"clarify your positioning", "build a thought-leadership engine", "optimize your social media presence", "create a content strategy", "develop a strong brand identity"* — same list [lib/test/grade-deliberation.ts](../../lib/test/grade-deliberation.ts) uses.
- **Versioning discipline**: top-of-file changelog ties each prompt rev to the persona failure that drove it. Adopt for `seed-agents.ts` per-specialist comment blocks.

### `run_test_suite.py` — test harness patterns

Phase 7.5 lifts, not the Python itself but the patterns:

- **Typing delay** answer-length-aware (short <30 chars → MIN, long >150 chars → MAX, linear interp). Default 2–6s. Rationale applies directly: *"without this delay, the test fires questions instantly and research never gets background time."*
- **Response length bands by personality** (lines ~150–162): `terse` 10–30w · `adversarial` 15–40w · `skeptical` 25–60w · `scattered` 40–80w · `verbose` 40–80w · `enthusiastic` 30–60w. Hard ceiling >80w = out of character.
- **Role-player as a separate Claude instance** with no shared context — pattern for the future automated multi-round runner (Rung E in [BUILD.md §6.2](../../BUILD.md#62-conversation-quality-and-testing)).
- **Graders score six things**: anti-generic, structure, word count, business-name mention, channel specificity, stop-section content, voice violations. [lib/test/grade-deliberation.ts](../../lib/test/grade-deliberation.ts) covers most of this territory; worth a diff before adding more tripwires.

---

## Schema adaptation — Zansei → GetIdea

Zansei's persona JSON assumes a 9-question scripted intake flow (`expected_answer_style: { q1_business_identity, q2_primary_challenge, ..., q9_success_definition }`). GetIdea's deliberation is free-form, orchestrated turn-by-turn. The schema needs translation when lifting a persona:

- **Map** `q1_business_identity` → `opener` (what the persona types when the chat starts).
- **Keep** `conversational_behaviors`, `personality`, `backstory`, `budget_range`, `website`, `business_type`, `location` as-is.
- **Add** `response_length_band` (from `run_test_suite.py` lines ~150–162): `terse` 10–30w · `adversarial` 15–40w · `skeptical` 25–60w · `scattered` 40–80w · `verbose` 40–80w · `enthusiastic` 30–60w. Hard ceiling 80w.
- **Add** optional `r3_wrong_claim` — the plausibly-wrong assertion for the friction round (per [BUILD.md §6.2](../../BUILD.md#62-conversation-quality-and-testing) multi-round protocol).
- **Add** optional `r4_contradiction` — what the persona reveals in R4 to test user-truth-beats-search-truth (*"that's not our current site"*, *"we changed that tagline"*, *"I can't travel — budget is lower than I said"*).
- **Drop** `q2_primary_challenge` through `q9_success_definition` as answer scripts — the Orchestrator drives what's asked, not a fixed flow. They're still useful as **character notes** for the role-player prompt.

---

## Provenance

All files copied on this session's date from `/Users/walterreid/Github Games/ad101-AI-marketing-advisor/`. The source repo is unrelated to get-idea-ai's git history. If you ever want to re-sync (e.g., Zansei adds a new persona shape you want to study), re-copy manually — do not wire this as an automated sync.

The `test/` tree is tracked in git (personas, fixtures, registry, external-reference prompts). Only `test/results/` is gitignored per [.gitignore](../../.gitignore). This file ships with the repo.
