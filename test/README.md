# Deliberation testing (GetIdea.ai)

This folder holds **persona data** and **documentation** for quality-control bundles. The published guide is [docs/testing.md](../docs/testing.md); fast guardrails in code, human + automated **tripwire** grading on real transcripts.

The **quality ladder** (fixture grader → unit grader → graph/DB → real bundles → future runner) is documented in [BUILD.md §6.2](../BUILD.md#62-conversation-quality-and-testing).

## Fixture registry + `test:fixtures` (no DB, no LLM)

[test/fixtures/registry.json](fixtures/registry.json) lists **cases**: each row points at a `messages_*.json` under [test/fixtures/](fixtures/) and a persona id (filename without `.json` under [test/personas/](personas/)). [scripts/run-fixture-grades.ts](../scripts/run-fixture-grades.ts) loads each pair and runs [lib/test/grade-deliberation.ts](../lib/test/grade-deliberation.ts); it **exits 1** if any case has `overall_pass === false`.

```bash
npm run test:fixtures
```

Write the **standard result bundle** (under `test/results/`) for every registry case — same layout as `capture:bundle` and `grade:file --write` (see below):

```bash
npm run test:fixtures:write
# or: npm run test:fixtures -- --write
```

**Combined local gate** (graph + grader units + fixtures — graph needs seeded Supabase; see BUILD §6.2):

```bash
npm run test:quality
```

## Personas (`test/personas/*.json`)

Synthetic owners used when **you** (or a future runner) play the user in `/chat`. Fields are intentionally flexible; the grader uses:

- `persona_id`, `business_name`, `challenge`
- `grading_hints` — optional explicit strings the **advisor text should reflect** for the specificity check (business name, city, product, etc.)
- `test_focus` — one line for humans/automation: what this persona is meant to stress
- `profile`, `expected_answer_style`, `conversational_behaviors` — notes for a human or a future role-player LLM

Included:

| File | Intent |
|------|--------|
| `ai_consultant.json` | Dense B2B services narrative (visibility, differentiation, solo operator) |
| `bakery_delivery.json` | Plain-language local retail decision |
| `stress_rusher.json` | Stress pattern: skip steps, vague answers |
| `opening_greeting.json` | First turn is only a greeting — CX / opening-the-room |
| `vague_thought.json` | Emotional vent; probe vs premature tactics |
| `fluent_operator.json` | Advanced owner (e.g. CAC/LTV); calibration upward |
| `legal_sensitive.json` | Liability/compliance framing; legal-awareness tone |
| `zero_budget.json` | Hard $0 constraint; organic-only realism |

## Result bundle layout (`test/results/` — gitignored)

Every **persona-scored run** can emit a folder for manual tracking. Paths use local time `YYYYMMDD_HHMMSS` and are unique per case.

```text
test/results/{persona_id}_{YYYYMMDD_HHMMSS}_{case_id}/   # fixtures (--write): case_id = registry id
test/results/{persona_id}_{YYYYMMDD_HHMMSS}/             # grade:file --write OR capture:bundle (use --out-dir to override)
```

| File | Purpose |
|------|---------|
| `conversation_transcript.json` | `{ thread_id, title, exported_at, persona_id, messages }` — canonical export |
| `messages.json` | **Tier-2 capture only:** same JSON as `conversation_transcript.json` (alias for older notes) |
| `research_data.json` | System rows with `metadata.type === "research"` (empty array + note if none) |
| `transcript.md` | Human-readable transcript (same content shape as before; not `output.md` unless you rename locally) |
| `grades.json` | Output of [lib/test/grade-deliberation.ts](../lib/test/grade-deliberation.ts) |
| `token_usage.json` | Stub until the API attaches usage — `recorded: false` |
| `timing.json` | Stub until per-round timing exists — `recorded: false` |
| `manifest.json` | Bundle version, source (`fixture` / `file` / `thread`), persona path, pass/fail |
| `full_result.json` | Single blob: meta + conversation + research + grades + stubs (easy to archive) |

**Who writes this folder**

| Command | When |
|---------|------|
| `npm run test:fixtures:write` | All registry cases, one folder per case (shared timestamp batch) |
| `npm run grade:file -- <messages.json> --persona … --write` | One folder; optional `--out-dir` |
| `npm run capture:bundle -- <thread_uuid> --persona …` | Real thread from Supabase |

Implementation: [lib/test/write-result-bundle.ts](../lib/test/write-result-bundle.ts).

### Tier 2: capture from the app

```bash
npm run capture:bundle -- <thread_uuid> --persona test/personas/ai_consultant.json
```

### Transcript only (no bundle on disk)

```bash
npm run export:thread -- <thread_uuid> --format json --out /tmp/messages.json
npm run grade:file -- /tmp/messages.json --persona test/personas/bakery_delivery.json
```

### Smoke (no DB): grade stdout + optional folder

```bash
npm run grade:file -- test/fixtures/messages_ai_consultant_sample.json --persona test/personas/ai_consultant.json
npm run grade:file -- test/fixtures/messages_ai_consultant_sample.json --persona test/personas/ai_consultant.json --write
```

## Automated grading (tripwires)

Not an LLM judge. Checks include: banned generic phrases (from [CLAUDE.md](../CLAUDE.md)), tool-voice patterns, recommendation `##` sections when a recommendation message exists, word-count band, optional **business context** mentions when `grading_hints` / `business_name` are set, and a **research follow-through** heuristic when research system rows exist.

See [docs/full-result.example.json](../docs/full-result.example.json) for the full bundle shape (token usage and timing remain **manual / future runner** for GetIdea).

## Scripts

| npm script | What |
|------------|------|
| `test:fixtures` | All registry cases → tripwire grader; exit 1 on failure (no DB) |
| `test:fixtures:write` | Same + writes `test/results/{persona}_{stamp}_{case}/` per registry row |
| `test:quality` | `test:graph` + `test:grade` + `test:fixtures` |
| `capture:bundle` | Thread → standard bundle folder under `test/results/` |
| `export:thread` | Thread → stdout or `--out` |
| `grade:file` | Grades JSON on stdout; add `--write` to also write a bundle folder |
| `test:grade` | Unit tests for the grader |
| `test:graph` | LangGraph + agents + no-hardcoding checks (needs `.env.local` + seeded DB) |
