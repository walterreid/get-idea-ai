"""
Zansei automated test suite.

Runs synthetic SMB personas through the full conversation pipeline using a
separate Claude "role-player" call to simulate the business owner. Grades
the resulting plan against quality checks.

Usage:
    python run_test_suite.py --persona all
    python run_test_suite.py --persona restaurant_queens
    python run_test_suite.py --persona restaurant_queens --persona fitness_skeptic
"""

import argparse
import json
import logging
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add project root to path
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv

load_dotenv(".env.local", override=True)
load_dotenv(".env", override=True)

import anthropic

from conversation import ConversationSession
from plan_generator import generate_plan

logger = logging.getLogger("zansei.test")

PERSONAS_DIR = Path(__file__).parent / "test" / "personas"
RESULTS_DIR = Path(__file__).parent / "test" / "results"
ROLE_PLAYER_MODEL = "claude-sonnet-4-6"

# Simulated human typing delay (seconds).
# In production, the user reads the question and types a response — that's
# the window where background research runs. Without this delay, the test
# fires questions instantly and research batches never get background time.
#
# The delay is answer-length-aware:
#   - Short answers (<30 chars, "I don't know"): MIN_TYPING_DELAY
#   - Medium answers (30-150 chars): linear interpolation
#   - Long answers (>150 chars): MAX_TYPING_DELAY
#
# These are configurable via --typing-delay (seconds, e.g. "3-12")
DEFAULT_MIN_TYPING_DELAY = 2.0
DEFAULT_MAX_TYPING_DELAY = 6.0


def _simulate_typing_delay(answer: str, min_delay: float, max_delay: float):
    """Sleep to simulate human reading + typing time.

    Returns the actual delay used (for logging).
    """
    answer_len = len(answer)
    if answer_len < 30:
        delay = min_delay
    elif answer_len > 150:
        delay = max_delay
    else:
        # Linear interpolation between min and max
        ratio = (answer_len - 30) / 120.0
        delay = min_delay + ratio * (max_delay - min_delay)

    time.sleep(delay)
    return round(delay, 1)


# ---------------------------------------------------------------------------
# Role-player: generates answers as the SMB owner
# ---------------------------------------------------------------------------

def _build_role_player_prompt(persona: Dict[str, Any]) -> str:
    """Build a system prompt for the role-player Claude call.

    The role-player simulates the SMB owner answering Zansei's questions.
    It uses the persona's backstory, personality, and conversational_behaviors
    as character direction — NOT the expected_answer_style verbatim.
    """
    parts = [
        f"You are role-playing as {persona.get('business_name', 'a business owner')} "
        f"for a test of an AI marketing advisor called Zansei.",
        "",
        "## Your Character",
        f"**Name/Business:** {persona['business_name']}",
        f"**Location:** {persona['location']}",
        f"**Business type:** {persona['business_type']}",
        f"**Website:** {persona.get('website') or 'None — you do not have a website'}",
        f"**Challenge:** {persona['challenge']}",
        f"**Budget range:** {persona['budget_range']}",
        f"**Team:** {persona['team_size']}",
        f"**Personality:** {persona['personality']}",
        f"**Backstory:** {persona['backstory']}",
        "",
    ]

    behaviors = persona.get("conversational_behaviors", [])
    if behaviors:
        parts.append("## How You Behave in Conversation")
        parts.append("These are CRITICAL — they define how you respond, not just what you say:")
        for b in behaviors:
            parts.append(f"- {b}")
        parts.append("")

    # Include answer style as GUIDANCE, not script
    parts.append("## Answer Guidance")
    parts.append(
        "The following are example answers that capture the right tone, content, "
        "and level of detail for each question topic. Use them as CHARACTER NOTES — "
        "match the spirit, personality, and information density, but respond naturally "
        "to whatever Zansei actually asks. Do NOT copy them verbatim. Zansei's questions "
        "may be rephrased, reference specific research findings, or adapt based on your "
        "previous answers."
    )
    parts.append("")

    q_labels = {
        "q1_business_identity": "Business identity (who you are, what you do, where)",
        "q2_primary_challenge": "Primary challenge (what you want to change)",
        "q3_ideal_customer": "Ideal customer (who you want more of)",
        "q4_website_observation": "Website / online presence questions",
        "q5_failed_attempts": "Past marketing attempts that didn't work",
        "q6_channel_economics": "How customers find you / channel economics",
        "q7_budget_or_retention": "Budget / spending instinct",
        "q8_execution_capacity": "Team and time available for marketing",
        "q9_success_definition": "What success looks like in 90 days",
    }

    for q_key, label in q_labels.items():
        answer = persona.get("expected_answer_style", {}).get(q_key, "")
        if answer:
            parts.append(f"**{label}:**")
            parts.append(f'"{answer}"')
            parts.append("")

    parts.append("## Rules")
    parts.append("- Stay in character at all times.")
    parts.append("- Respond ONLY as the business owner. No meta-commentary.")
    parts.append("- Match the personality and conversational behaviors above.")
    parts.append("")
    parts.append("## CRITICAL: Answer Length")
    parts.append("Real business owners type SHORT answers into a chat. They are busy people, "
                 "not essayists. Your answers must feel like a real person typing on their phone "
                 "or laptop — not a prepared statement.")
    parts.append("- **terse**: 1-2 sentences. 10-30 words. Often fragments.")
    parts.append("- **adversarial**: 1-3 sentences. 15-40 words. Blunt, clipped.")
    parts.append("- **skeptical**: 2-4 sentences. 25-60 words. Direct but questioning.")
    parts.append("- **scattered**: 3-5 sentences. 40-80 words. Goes on one tangent, not five.")
    parts.append("- **verbose**: 3-5 sentences. 40-80 words. More detail than others, "
                 "but still a person typing — not a monologue.")
    parts.append("- **enthusiastic**: 2-4 sentences. 30-60 words. Eager but brief.")
    parts.append("If your answer exceeds 80 words, you are OUT OF CHARACTER. "
                 "Cut it. Real owners don't write paragraphs in a chat window.")
    parts.append("")
    parts.append("## Personality-Specific Behaviors")
    parts.append("- If your personality is 'adversarial', push back and challenge Zansei.")
    parts.append("- If your personality is 'scattered', go on one tangent and sometimes "
                 "forget to answer the actual question.")
    parts.append("- If a question touches on something you'd say 'I don't know' to, "
                 "actually say 'I don't know' — don't invent data you wouldn't have.")
    parts.append("- Never break character to explain what you're doing.")

    return "\n".join(parts)


def _generate_role_player_answer(
    client: anthropic.Anthropic,
    system_prompt: str,
    zansei_question: str,
    conversation_history: List[Dict[str, str]],
) -> tuple[str, Dict[str, int]]:
    """Generate a role-player answer to Zansei's question.

    Uses a completely separate Claude call — no shared context with Zansei.

    Returns:
        Tuple of (answer_text, token_usage_dict)
    """
    messages = []

    # Build conversation history for the role-player
    for entry in conversation_history:
        # Zansei's question
        messages.append({
            "role": "user",
            "content": f"[Zansei asks]: {entry['question']}",
        })
        # Owner's previous answer
        messages.append({
            "role": "assistant",
            "content": entry["answer"],
        })

    # Current question
    messages.append({
        "role": "user",
        "content": f"[Zansei asks]: {zansei_question}",
    })

    response = client.messages.create(
        model=ROLE_PLAYER_MODEL,
        max_tokens=512,
        system=system_prompt,
        messages=messages,
    )

    answer = response.content[0].text.strip()
    tokens = {
        "input": response.usage.input_tokens,
        "output": response.usage.output_tokens,
    }

    return answer, tokens


# ---------------------------------------------------------------------------
# Quality grading
# ---------------------------------------------------------------------------

BANNED_PHRASES = [
    "clarify your positioning",
    "build a thought-leadership engine",
    "optimize your social media presence",
    "create a content strategy",
    "develop a strong brand identity",
]

PLAN_SECTIONS = [
    "The Diagnosis",
    "The Channels",
    "What to Stop",
    "The 90-Day Calendar",
    "The Estimate",
]


def grade_plan(plan_text: str, persona: Dict[str, Any]) -> Dict[str, Any]:
    """Grade a generated plan against quality checks.

    Returns a dict with pass/fail for each check and an overall grade.
    """
    plan_lower = plan_text.lower()
    word_count = len(plan_text.split())

    # 1. Anti-generic guardrail
    banned_found = [p for p in BANNED_PHRASES if p.lower() in plan_lower]
    anti_generic_pass = len(banned_found) == 0

    # 2. Five-section structure
    sections_found = []
    sections_missing = []
    for section in PLAN_SECTIONS:
        # Match section header flexibly: "## The Diagnosis", "## The Channels: What to Do", etc.
        # Also handle "90-Day Calendar" without "The"
        escaped = re.escape(section)
        # Allow optional "The " prefix and any suffix after the section name
        pattern = rf"##\s*(?:The\s+)?{escaped}"
        if re.search(pattern, plan_text, re.IGNORECASE):
            sections_found.append(section)
        else:
            sections_missing.append(section)
    structure_pass = len(sections_missing) == 0

    # 3. Word count target (1200-2400, hard fail over 2400)
    # v3 prompt raised ceiling from 2100 to 2400 for divergence bridging
    word_count_pass = word_count <= 2400
    word_count_ideal = 1200 <= word_count <= 2000

    # 4. Specificity check — does it mention the actual business name?
    business_name = persona.get("business_name", "")
    mentions_business = business_name.lower() in plan_lower if business_name else True

    # 5. Channel specificity — look for named channels (not just "social media")
    generic_channel_phrases = [
        "social media presence",
        "consider social media",
        "leverage social media",
        "digital marketing strategy",
    ]
    generic_channels_found = [p for p in generic_channel_phrases if p in plan_lower]
    channel_specificity_pass = len(generic_channels_found) == 0

    # 6. "Stop doing" check — does the What to Stop section have content?
    stop_section_match = re.search(
        r"##\s*What to Stop(.*?)(?=##|\Z)", plan_text, re.DOTALL | re.IGNORECASE
    )
    has_stop_content = bool(
        stop_section_match and len(stop_section_match.group(1).strip()) > 50
    )

    # 7. Voice check — no forbidden tool-voice words in opening
    # Only flag words when used in tool-voice patterns, not natural advisor language.
    # "generates DMs" is fine. "generate your plan" is not.
    # "search results" is fine. "here are your results" is not.
    first_200_chars = plan_text[:200].lower()
    voice_violations = []
    # Always-forbidden words (no natural advisor use)
    for w in ["output", "deliverable"]:
        if w in first_200_chars:
            voice_violations.append(w)
    # "generate" — only flag tool-voice patterns
    generate_tool_patterns = ["generate your", "generate a ", "generate the", "we generate", "i generate"]
    if any(p in first_200_chars for p in generate_tool_patterns):
        voice_violations.append("generate (tool-voice)")
    # "results" — only flag tool-voice patterns
    results_tool_patterns = ["your results", "the results show", "these results", "here are"]
    if any(p in first_200_chars for p in results_tool_patterns):
        voice_violations.append("results (tool-voice)")
    voice_pass = len(voice_violations) == 0

    # Overall
    all_checks = [
        anti_generic_pass,
        structure_pass,
        word_count_pass,
        channel_specificity_pass,
        has_stop_content,
        voice_pass,
    ]
    passed = sum(all_checks)
    total = len(all_checks)

    return {
        "anti_generic": {
            "pass": anti_generic_pass,
            "banned_phrases_found": banned_found,
        },
        "structure": {
            "pass": structure_pass,
            "sections_found": sections_found,
            "sections_missing": sections_missing,
        },
        "word_count": {
            "pass": word_count_pass,
            "ideal": word_count_ideal,
            "count": word_count,
        },
        "mentions_business": mentions_business,
        "channel_specificity": {
            "pass": channel_specificity_pass,
            "generic_phrases_found": generic_channels_found,
        },
        "has_stop_content": has_stop_content,
        "voice": {
            "pass": voice_pass,
            "violations": voice_violations,
        },
        "checks_passed": passed,
        "checks_total": total,
        "overall_pass": passed == total,
    }


# ---------------------------------------------------------------------------
# Single persona test run
# ---------------------------------------------------------------------------

def run_persona(
    persona: Dict[str, Any],
    min_typing_delay: float = DEFAULT_MIN_TYPING_DELAY,
    max_typing_delay: float = DEFAULT_MAX_TYPING_DELAY,
) -> Dict[str, Any]:
    """Run a single persona through the full pipeline.

    1. Create a ConversationSession
    2. For each of 9 questions: get Zansei's question, generate role-player answer
    3. Simulate typing delay (research runs in background during this time)
    4. Generate the plan
    5. Grade the plan

    Returns a result dict with transcript, plan, grades, timing, tokens.
    """
    persona_id = persona["persona_id"]
    logger.info("=" * 60)
    logger.info("Starting persona: %s (%s)", persona_id, persona["business_name"])
    logger.info("=" * 60)

    start_time = time.time()
    role_player_tokens = {"input": 0, "output": 0}

    # Separate Claude client for role-player (no shared state with Zansei)
    rp_client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    rp_system_prompt = _build_role_player_prompt(persona)

    # Create Zansei conversation session with Q0 data (name + website)
    initial_inputs = {"business_name": persona["business_name"]}
    if persona.get("website"):
        initial_inputs["website_url"] = persona["website"]
    session = ConversationSession(initial_inputs=initial_inputs)
    conversation_transcript = []

    # Drive the 9-question conversation
    # Research runs in background throughout — no blocking after Q3
    question = session.get_next_question()

    for q_num in range(1, 10):
        if question is None or question == "":
            logger.warning("Zansei returned no question at Q%d — stopping early", q_num)
            break

        logger.info("[Q%d] Zansei: %s", q_num, question[:100])

        # Role-player generates answer
        answer, rp_tokens = _generate_role_player_answer(
            rp_client, rp_system_prompt, question, conversation_transcript
        )
        role_player_tokens["input"] += rp_tokens["input"]
        role_player_tokens["output"] += rp_tokens["output"]

        logger.info("[Q%d] Owner: %s", q_num, answer[:100])

        # Record in transcript
        conversation_transcript.append({
            "question_number": q_num,
            "question": question,
            "answer": answer,
            "timestamp": time.time(),
        })

        # Submit to Zansei and get next question
        # Research batches fire in background as appropriate
        question = session.submit_answer(answer)

        # Simulate human reading + typing time.
        # This is when background research actually runs in production.
        # Without this delay, research batches get no background time.
        if question is not None:  # More questions coming — simulate the wait
            delay = _simulate_typing_delay(answer, min_typing_delay, max_typing_delay)
            research_status = (
                f"batch {session.research.batch_count + 1} running"
                if session.research.in_flight
                else f"{session.research.batch_count} batches done"
            )
            logger.info(
                "[Q%d] Simulating %.1fs typing delay (answer: %d chars). Research: %s",
                q_num, delay, len(answer), research_status,
            )

        if question is None:
            logger.info("Conversation complete after Q%d.", q_num)
            break

    # Wait for any in-flight research before plan generation
    if session.research.in_flight:
        logger.info("Waiting for in-flight research to complete...")
        session.research.wait_for_completion(timeout=30)

    logger.info(
        "Research summary: %d batches, %d total tool rounds, %d observations",
        session.research.batch_count,
        session.research.total_tool_rounds_used,
        len(session.research.accumulated.get("website_observations", [])),
    )

    # Generate the plan (with playbook + channel file injection if available)
    logger.info("Generating plan for %s...", persona_id)
    plan_start = time.time()

    try:
        summary = session.get_conversation_summary()

        # Inject vertical playbook + channel files (Phase 7A/7B)
        try:
            from persistence.supabase import (
                get_channel_files_for_vertical,
                get_default_tenant_id,
                get_knowledge_files_by_category,
                match_playbook_category,
            )
            tenant_id = get_default_tenant_id()
            if tenant_id:
                inferred = session.inferred_data or {}
                category = match_playbook_category(
                    business_type=inferred.get("business_type", ""),
                    business_type_category=inferred.get("business_type_category", ""),
                )
                if category:
                    playbooks = get_knowledge_files_by_category(tenant_id, category)
                    if playbooks:
                        summary["playbook_content"] = playbooks[0]["content"]
                        summary["playbook_title"] = playbooks[0]["title"]
                        logger.info("Injecting playbook: %s", playbooks[0]["title"])

                    channel_files = get_channel_files_for_vertical(tenant_id, category)
                    if channel_files:
                        summary["channel_files"] = channel_files
                        logger.info(
                            "Injecting %d channel file(s): %s",
                            len(channel_files),
                            ", ".join(cf["category"] for cf in channel_files),
                        )
        except Exception as e:
            logger.warning("Knowledge file injection failed (non-blocking): %s", e)

        plan_result = generate_plan(summary)
        plan_markdown = plan_result["plan_markdown"]
        plan_tokens = plan_result["token_usage"]
        plan_elapsed = plan_result["elapsed_seconds"]
    except Exception as e:
        logger.error("Plan generation failed for %s: %s", persona_id, e)
        plan_markdown = f"[PLAN GENERATION FAILED: {e}]"
        plan_tokens = {"input": 0, "output": 0}
        plan_elapsed = time.time() - plan_start

    total_elapsed = time.time() - start_time

    # Grade the plan
    grades = grade_plan(plan_markdown, persona)

    # Compile token usage: conversation + research + plan generation
    zansei_tokens = session.token_usage
    research_tokens = session.research.token_usage

    result = {
        "persona_id": persona_id,
        "business_name": persona["business_name"],
        "business_type": persona["business_type"],
        "personality": persona["personality"],
        "conversation_transcript": conversation_transcript,
        "questions_completed": len(conversation_transcript),
        "research_results": session.research.accumulated,
        "research_batches": session.research.batches,
        "research_batch_count": session.research.batch_count,
        "research_total_tool_rounds": session.research.total_tool_rounds_used,
        "inferred_data": session.inferred_data,
        "plan_markdown": plan_markdown,
        "grades": grades,
        "token_usage": {
            "zansei_conversation": zansei_tokens,
            "zansei_research": research_tokens,
            "role_player": role_player_tokens,
            "plan_generation": plan_tokens,
            "total": {
                "input": zansei_tokens["input"] + research_tokens["input"] + role_player_tokens["input"] + plan_tokens["input"],
                "output": zansei_tokens["output"] + research_tokens["output"] + role_player_tokens["output"] + plan_tokens["output"],
            },
        },
        "timing": {
            "total_seconds": round(total_elapsed, 1),
            "plan_generation_seconds": plan_elapsed,
        },
        "timestamp": datetime.now().isoformat(),
    }

    status = "PASS" if grades["overall_pass"] else "FAIL"
    logger.info(
        "%s: %s (%d/%d checks, %d words, %.0fs)",
        persona_id, status,
        grades["checks_passed"], grades["checks_total"],
        grades["word_count"]["count"], total_elapsed,
    )

    return result


# ---------------------------------------------------------------------------
# Results saving
# ---------------------------------------------------------------------------

def save_to_supabase(result: Dict[str, Any]) -> Optional[str]:
    """Save test plan to Supabase. Returns share_slug or None on failure."""
    try:
        from persistence.supabase import get_default_tenant_id, save_plan

        tenant_id = get_default_tenant_id()
        if not tenant_id:
            logger.warning("Supabase not configured — skipping DB save")
            return None

        grades = result["grades"]
        # Map automated pass/fail to A/B/C grade for PM review
        if grades["overall_pass"] and grades["checks_passed"] >= 6:
            quality = "A"
        elif grades["overall_pass"]:
            quality = "B"
        else:
            quality = "C"

        saved = save_plan(
            tenant_id,
            mode="test",
            status="complete",
            business_inputs={
                "business_name": result["business_name"],
                "business_type": result["business_type"],
                "location": result.get("inferred_data", {}).get("location", ""),
                "persona_id": result["persona_id"],
                "personality": result["personality"],
            },
            research_data={
                **(result.get("research_results") or {}),
                "_batches": result.get("research_batches", []),
            },
            conversation_transcript=result.get("conversation_transcript"),
            plan_content_md=result["plan_markdown"],
            plan_metadata={
                "word_count": grades["word_count"]["count"],
                "quality_grade": quality,
                "checks_passed": grades["checks_passed"],
                "checks_total": grades["checks_total"],
            },
            ai_provider="claude",
            ai_model="claude-sonnet-4-6",
            token_usage=result.get("token_usage", {}).get("total"),
        )
        if saved:
            slug = saved.get("share_slug", "")
            logger.info("Plan saved to Supabase: %s (grade: %s)", slug, quality)
            return slug
    except Exception as e:
        logger.error("Supabase save failed (non-blocking): %s", e)
    return None


def save_results(result: Dict[str, Any]) -> Path:
    """Save test results to disk.

    Creates test/results/{persona_id}_{timestamp}/ with:
    - conversation_transcript.json
    - research_data.json
    - plan.md
    - token_usage.json
    - grades.json
    - full_result.json
    """
    persona_id = result["persona_id"]
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    result_dir = RESULTS_DIR / f"{persona_id}_{ts}"
    result_dir.mkdir(parents=True, exist_ok=True)

    # Conversation transcript
    with open(result_dir / "conversation_transcript.json", "w") as f:
        json.dump(result["conversation_transcript"], f, indent=2)

    # Research data
    with open(result_dir / "research_data.json", "w") as f:
        json.dump(result.get("research_results") or {}, f, indent=2)

    # Plan
    with open(result_dir / "plan.md", "w") as f:
        f.write(result["plan_markdown"])

    # Token usage and timing
    with open(result_dir / "token_usage.json", "w") as f:
        json.dump({
            "token_usage": result["token_usage"],
            "timing": result["timing"],
        }, f, indent=2)

    # Grades
    with open(result_dir / "grades.json", "w") as f:
        json.dump(result["grades"], f, indent=2)

    # Full result (everything)
    with open(result_dir / "full_result.json", "w") as f:
        json.dump(result, f, indent=2, default=str)

    logger.info("Results saved to %s", result_dir)
    return result_dir


# ---------------------------------------------------------------------------
# Summary report
# ---------------------------------------------------------------------------

def print_summary(results: List[Dict[str, Any]], total_elapsed: float):
    """Print a summary report of all test runs."""
    print("\n" + "=" * 70)
    print("ZANSEI TEST SUITE — SUMMARY REPORT")
    print("=" * 70)
    print(f"Ran {len(results)} personas in {total_elapsed:.0f}s "
          f"({total_elapsed / 60:.1f} min)")
    print()

    # Per-persona results
    print(f"{'Persona':<25} {'Type':<18} {'Status':<6} "
          f"{'Checks':<8} {'Words':<7} {'Time':<6}")
    print("-" * 70)

    passed = 0
    failed = 0
    for r in results:
        g = r["grades"]
        status = "PASS" if g["overall_pass"] else "FAIL"
        if g["overall_pass"]:
            passed += 1
        else:
            failed += 1

        print(
            f"{r['persona_id']:<25} "
            f"{r['personality']:<18} "
            f"{status:<6} "
            f"{g['checks_passed']}/{g['checks_total']:<5} "
            f"{g['word_count']['count']:<7} "
            f"{r['timing']['total_seconds']:<6.0f}s"
        )

    print("-" * 70)
    print(f"Passed: {passed}/{len(results)}  |  Failed: {failed}/{len(results)}")
    print()

    # Shareable plan URLs (if saved to Supabase)
    slugs = [(r["persona_id"], r.get("share_slug")) for r in results if r.get("share_slug")]
    if slugs:
        print("SHAREABLE PLAN URLs (for PM review):")
        for pid, slug in slugs:
            print(f"  {pid}: /plan/shared/{slug}")
        print()

    # Failure details
    failures = [r for r in results if not r["grades"]["overall_pass"]]
    if failures:
        print("FAILURE DETAILS:")
        print("-" * 70)
        for r in failures:
            g = r["grades"]
            print(f"\n  {r['persona_id']}:")
            if not g["anti_generic"]["pass"]:
                print(f"    Anti-generic FAIL: {g['anti_generic']['banned_phrases_found']}")
            if not g["structure"]["pass"]:
                print(f"    Structure FAIL — missing: {g['structure']['sections_missing']}")
            if not g["word_count"]["pass"]:
                print(f"    Word count FAIL: {g['word_count']['count']} words (max 2100)")
            if not g["channel_specificity"]["pass"]:
                print(f"    Channel specificity FAIL: {g['channel_specificity']['generic_phrases_found']}")
            if not g["has_stop_content"]:
                print("    'What to Stop' section empty or too short")
            if not g["voice"]["pass"]:
                print(f"    Voice FAIL: {g['voice']['violations']}")
        print()

    # Token usage summary
    total_input = sum(r["token_usage"]["total"]["input"] for r in results)
    total_output = sum(r["token_usage"]["total"]["output"] for r in results)
    total_tokens = total_input + total_output
    # Rough cost estimate for claude-sonnet: ~$3/M input, ~$15/M output
    est_cost = (total_input * 3 + total_output * 15) / 1_000_000
    print(f"TOKEN USAGE: {total_input:,} input + {total_output:,} output = {total_tokens:,} total")
    print(f"ESTIMATED COST: ~${est_cost:.2f} (Sonnet pricing)")
    print("=" * 70)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def load_personas(names: List[str]) -> List[Dict[str, Any]]:
    """Load persona JSON files by name or 'all'."""
    if "all" in names:
        files = sorted(PERSONAS_DIR.glob("*.json"))
    else:
        files = []
        for name in names:
            # Accept with or without .json
            fname = name if name.endswith(".json") else f"{name}.json"
            path = PERSONAS_DIR / fname
            if not path.exists():
                print(f"Persona not found: {path}")
                sys.exit(1)
            files.append(path)

    personas = []
    for f in files:
        with open(f) as fh:
            personas.append(json.load(fh))

    return personas


def main():
    parser = argparse.ArgumentParser(description="Zansei automated test suite")
    parser.add_argument(
        "--persona",
        action="append",
        required=True,
        help="Persona name (e.g. 'restaurant_queens') or 'all'. Can be repeated.",
    )
    parser.add_argument(
        "--skip-save",
        action="store_true",
        help="Skip saving results to disk (useful for quick runs).",
    )
    parser.add_argument(
        "--typing-delay",
        type=str,
        default=None,
        help=(
            "Simulated human typing delay in seconds, as 'min-max' (e.g. '3-10'). "
            "Short answers use min, long answers use max. "
            f"Default: {DEFAULT_MIN_TYPING_DELAY}-{DEFAULT_MAX_TYPING_DELAY}. "
            "Set '0-0' to disable (not recommended — research won't get background time)."
        ),
    )
    args = parser.parse_args()

    # Parse typing delay
    min_typing_delay = DEFAULT_MIN_TYPING_DELAY
    max_typing_delay = DEFAULT_MAX_TYPING_DELAY
    if args.typing_delay:
        parts = args.typing_delay.split("-")
        if len(parts) == 2:
            min_typing_delay = float(parts[0])
            max_typing_delay = float(parts[1])
        elif len(parts) == 1:
            min_typing_delay = float(parts[0])
            max_typing_delay = float(parts[0])
        else:
            print(f"Invalid --typing-delay format: {args.typing_delay}. Use 'min-max' e.g. '3-10'.")
            sys.exit(1)

    # Check API key
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY is not set. Cannot run test suite.")
        sys.exit(1)

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    personas = load_personas(args.persona)
    print(f"\nLoaded {len(personas)} persona(s): {[p['persona_id'] for p in personas]}")
    print(f"Typing delay: {min_typing_delay}-{max_typing_delay}s\n")

    results = []
    suite_start = time.time()

    for persona in personas:
        try:
            result = run_persona(
                persona,
                min_typing_delay=min_typing_delay,
                max_typing_delay=max_typing_delay,
            )
            # Save to Supabase (non-blocking)
            slug = save_to_supabase(result)
            if slug:
                result["share_slug"] = slug

            results.append(result)

            if not args.skip_save:
                save_results(result)

        except Exception as e:
            logger.error("FATAL: Persona %s crashed: %s", persona["persona_id"], e, exc_info=True)
            results.append({
                "persona_id": persona["persona_id"],
                "business_name": persona["business_name"],
                "business_type": persona["business_type"],
                "personality": persona["personality"],
                "conversation_transcript": [],
                "questions_completed": 0,
                "research_results": None,
                "inferred_data": {},
                "plan_markdown": f"[CRASHED: {e}]",
                "grades": {
                    "anti_generic": {"pass": False, "banned_phrases_found": []},
                    "structure": {"pass": False, "sections_found": [], "sections_missing": PLAN_SECTIONS},
                    "word_count": {"pass": False, "ideal": False, "count": 0},
                    "mentions_business": False,
                    "channel_specificity": {"pass": False, "generic_phrases_found": []},
                    "has_stop_content": False,
                    "voice": {"pass": False, "violations": []},
                    "checks_passed": 0,
                    "checks_total": 6,
                    "overall_pass": False,
                },
                "token_usage": {
                    "zansei": {"input": 0, "output": 0},
                    "role_player": {"input": 0, "output": 0},
                    "plan_generation": {"input": 0, "output": 0},
                    "total": {"input": 0, "output": 0},
                },
                "timing": {"total_seconds": 0, "plan_generation_seconds": 0},
                "timestamp": datetime.now().isoformat(),
            })

    suite_elapsed = time.time() - suite_start
    print_summary(results, suite_elapsed)

    # Exit with non-zero if any failures
    any_failed = any(not r["grades"]["overall_pass"] for r in results)
    sys.exit(1 if any_failed else 0)


if __name__ == "__main__":
    main()
