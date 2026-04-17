# Deliberation testing (GetIdea.ai)

The entire **`test/`** directory (personas, fixtures, `registry.json`, local `test/results/` bundles) is **gitignored** and not published. Keep your own copy locally or in private storage. This page is the **canonical published** reference for how testing works.

The quality ladder and tiers live in [BUILD.md §6.2](../BUILD.md#62-conversation-quality-and-testing).

## Local layout (create under repo root)

```text
test/
├── fixtures/registry.json          # optional: list of fixture cases
├── fixtures/messages_*.json        # frozen transcripts
├── personas/*.json                 # persona playbooks + grading hints
├── bundle-template/                # optional examples
└── results/                        # generated; gitignored as part of test/
```

## Fixture registry + `test:fixtures` (no DB, no LLM)

With `test/fixtures/registry.json` and matching files, [scripts/run-fixture-grades.ts](../scripts/run-fixture-grades.ts) runs [lib/test/grade-deliberation.ts](../lib/test/grade-deliberation.ts) per case and exits **1** if any `overall_pass` is false.

```bash
npm run test:fixtures
```

Write result bundles under `test/results/` for every registry case:

```bash
npm run test:fixtures:write
```

**Combined local gate** (graph needs seeded Supabase):

```bash
npm run test:quality
```

## Personas (`test/personas/*.json`)

Synthetic owners for human Tier-2 sessions. Typical fields: `persona_id`, `business_name`, `challenge`, `grading_hints`, `test_focus`, `profile`, `expected_answer_style`.

## Result bundle layout (`test/results/`)

| File | Purpose |
|------|---------|
| `conversation_transcript.json` | `{ thread_id, title, exported_at, persona_id, messages }` |
| `messages.json` | Tier-2 capture only: alias of the above |
| `research_data.json` | Research system rows or empty + note |
| `transcript.md` | Human-readable transcript |
| `grades.json` | [lib/test/grade-deliberation.ts](../lib/test/grade-deliberation.ts) output |
| `token_usage.json` | Stub until usage is recorded |
| `timing.json` | Stub until timing is recorded |
| `manifest.json` | Meta, source, pass/fail |
| `full_result.json` | Single combined blob |

Implementation: [lib/test/write-result-bundle.ts](../lib/test/write-result-bundle.ts).

### Commands that write bundles

| Command | When |
|---------|------|
| `npm run test:fixtures:write` | All registry cases |
| `npm run grade:file -- <messages.json> --persona … --write` | One file |
| `npm run capture:bundle -- <thread_uuid> --persona …` | Real thread (needs `.env.local`) |

### Examples

```bash
npm run capture:bundle -- <thread_uuid> --persona test/personas/ai_consultant.json
npm run grade:file -- test/fixtures/messages_ai_consultant_sample.json --persona test/personas/ai_consultant.json --write
```

## Automated grading (tripwires)

Not an LLM judge: banned generic phrases, tool-voice patterns, recommendation `##` sections when present, word-count band, optional business-context hints, research follow-through when research rows exist.

Example **full_result** shape: [full-result.example.json](full-result.example.json).

## Scripts

| npm script | What |
|------------|------|
| `test:fixtures` | Registry cases → grader (no DB) |
| `test:fixtures:write` | Same + writes `test/results/…` per case |
| `test:quality` | `test:graph` + `test:grade` + `test:fixtures` |
| `capture:bundle` | Thread → bundle under `test/results/` |
| `export:thread` | Thread → stdout or `--out` |
| `grade:file` | Grades on stdout; `--write` for a bundle folder |
| `test:grade` | Grader unit tests |
| `test:graph` | Graph + DB checks (needs env + seed) |

**CI note:** Without a populated local `test/` tree, `test:fixtures` has nothing to run. Typical PR CI uses `test:grade` only, or restores fixtures from a private artifact.
