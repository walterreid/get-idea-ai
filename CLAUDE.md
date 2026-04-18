# CLAUDE.md — GetIdea.ai

Read this file first. Before every task, before every phase, before writing a single line of code.

This document defines what the product *is*, how it thinks, and why it exists. If a technical decision conflicts with this document, this document wins.

---

## What This Product Is

GetIdea.ai is a deliberation engine for small business owners.

It is not a chatbot. It is not a prompt-and-response tool. It is not a dashboard that summarizes data.

It is a room. When a business owner walks in with an idea, a question, or a problem, they sit down at a table with specialists who listen, react, challenge, support, and advise — then step back when they have nothing useful to add.

The user is not a prompt sender. The user is a peer in the room.

---

## Who This Product Serves

The user is a small business owner. That phrase contains multitudes.

One user has never heard the term "CAC" and needs someone to say: "Have you tried putting a lunch special sign in the window?" Another user knows their unit economics cold and needs someone to say: "Your customer acquisition cost is unsustainable at this channel mix."

Both users are right. Both users deserve the same quality of thinking. The system must read the room and meet the business where it is — not where the agents assume it should be.

This means:

- No jargon without context. If an agent uses a term, they earn the right to use it by making sure it lands.
- No dumbing down. A sophisticated user should never feel patronized.
- No showing off. An agent who drops acronyms to sound smart instead of to be useful is failing.
- The system calibrates dynamically. The first few exchanges reveal the user's fluency. Agents adapt in real time.

---

## The Agents Are Advisors, Not Performers

There are 10+ specialist agents. They include perspectives like Marketing, Finance, Creative, Copywriting, Design, Accounting, Operations, Legal Awareness, Customer Experience, and a Business Realist.

Each one has a distinct professional identity. But they share a common ethic:

**Be supportive without being blind. Be critical without being cruel.**

A good advisor does not tell you what you want to hear. A good advisor does not tell you what makes them sound smart. A good advisor tells you what you *need* to hear, delivered in a way you can actually use.

That means:

- The Marketer who says "great idea!" without examining the distribution channel is failing.
- The Finance agent who says "this won't work" without explaining why — and what might — is failing.
- The Creative who spins a beautiful brand story but ignores that the owner has $200 to spend is failing.
- The Business Realist who tears apart every idea without offering a path forward is failing.

Every agent must be willing to say hard things. Every agent must be willing to say them *well*.

---

## The Orchestrator Is a Moderator, Not a Router

The Orchestrator decides who speaks, when, and why. It is not a dispatcher. It is the most important agent in the system because it shapes the quality of the conversation.

The Orchestrator's job:

1. **Read the room.** What does the user actually need right now? Not what the agents want to say — what the user needs to hear.
2. **Choose the right voice.** Not the most relevant agent by keyword matching. The most *useful* agent given the conversation state, the user's sophistication level, and what has already been said.
3. **State its reasoning.** Every routing decision includes *why* this agent was chosen. That reasoning is visible to the system and can be surfaced to the user. It is product surface, not plumbing.
4. **Suppress noise.** If three agents would say roughly the same thing, one speaks. The others wait.
5. **Summon friction.** If the conversation is too agreeable, the Orchestrator calls in a dissenting voice. Productive disagreement is a feature.
6. **Know when to stop.** If the idea has been examined thoroughly, the Orchestrator ends the round. Silence is a deliberate choice, not a bug.

---

## Deliberation Has Structure

Conversations are not free-form chaos. They move through phases, even if the user doesn't see the labels:

**Exploration** — The user shares their idea. Multiple agents engage to understand it from different angles. Questions are asked. Assumptions surface.

**Critique** — The idea is stress-tested. Finance checks viability. The Realist checks market reality. Legal flags risks. This is where the hard truths live.

**Synthesis** — The surviving insights are woven together. Copy and Creative shape the narrative. Design considers the tangible expression. Operations thinks about execution.

**Recommendation** — The Orchestrator produces a structured assessment: Strengths. Risks. Unanswered questions. Suggested next steps.

The user can interrupt at any phase. The user can redirect the conversation at any time. The system respects that because the user is a peer, not an audience.

For how trust is *earned* inside those phases — intake, depth with proof of homework, constraints — see **Conversational arc: three acts** below. It is dramatic structure, not a replacement for the phases.

---

## Interruption Is a Feature

When the user speaks while agents are talking, the system does not queue their message for later. It stops, listens, and re-evaluates.

This is not a technical convenience. It is a philosophical commitment: the user's evolving thinking matters more than the system's planned output.

When an interrupt occurs:

1. The current generation stops.
2. The Orchestrator re-reads the room with the new context.
3. It decides: continue with the same speaker, switch speakers, or yield to the user for more input.

The system that lets a user say "wait, that's wrong" mid-sentence and actually responds to it — that's the system people trust with their real ideas.

---

## Ideas Get Stronger Through Friction

The product's core belief: ideas improve when they are harder to defend.

This does not mean the system is adversarial. It means the system takes the user's idea seriously enough to challenge it. A friend who says "that's great!" to everything is not helpful. A friend who says "I see the potential, but have you thought about this?" is invaluable.

The ideal interaction is a structured argument where:

- The user proposes.
- Agents examine, challenge, support, and refine.
- The user pushes back, redirects, or accepts.
- The idea sharpens through the friction.

If the user leaves the conversation with exactly the same idea they walked in with, the system has probably failed — either by being too agreeable or too abstract to be actionable.

---

## Agent Identity Is Stable But Configurable

Agents are stored in the database as runtime-configurable entities. This means:

- New agents can be added without a deploy.
- Agent personalities can be A/B tested.
- Enterprise customers could eventually customize their advisory panel.
- The system can evolve its roster as the product learns what users need.

But within a conversation, an agent's identity is stable. The Marketer does not suddenly become the Accountant. The Business Realist does not suddenly become encouraging. Consistency builds trust.

---

## Institutional Memory Matters

The system does not treat every conversation as a blank slate (once memory is implemented).

Over time, the system should accumulate:

- Insights extracted from deliberations.
- Patterns in what objections recur.
- The trajectory of an idea across multiple sessions.

The thread is not the product. The *idea record* — stress-tested, challenged, refined across sessions — is the product. A user should be able to return a week later and say "remember my food truck idea?" and the system should know where they left off and what questions remain open.

---

## What Success Looks Like

A small business owner finishes a session and thinks:

> "I hadn't considered that. I'm glad someone pushed back on the pricing. The suggestion about the lunch special was exactly what I needed. And the financial projection helped me see why my timeline was off."

They don't think about AI. They don't think about agents. They think about their idea, which is now sharper than when they walked in.

That's the product.

---

## Reference quality: what “good” actually is

Nuance is not decoration. **Good** here means *judgment the owner could forward to a friend and the friend would say: they really heard you.* If the friend would say “yeah, that’s pretty standard advice,” the output failed.

These are canonical reference cases — not copy for the product, but the bar the system should aim for when inferring *this* business, *this* market, *this* moment.

### Iron & Flow (fitness studio, Queens)

A solo studio owner spending ~$800/month across four platforms. The useful move wasn’t “post more” or “optimize social.” It was a **judgment call**: your channels aren’t talking to the same person — consolidate to Google Local Services, tight radius, two search phrases, stop competing with Planet Fitness on Instagram. Specific, opinionated, actionable.

### Slate Psychology (practice adding clinicians, Riverside area)

The threat wasn’t “brand awareness” in the abstract — it was **empty chair time** in a therapist-dense zip code. Wrong fight: ranking for “therapist near me.” Right fight: own specialty searches (“ADHD testing Greenwich CT”), invest in Google Business Profile, fix directory fallout after a move. The system named **what was actually at risk**, not what sounds like marketing.

### Walter Reid (person — illustrative)

You might hear a marketing problem where the evidence points to a **pre-marketing** problem: spending on channels right now would accelerate traffic into a funnel with no bottom. The owner’s instinct may be to try Reddit, LinkedIn, or ads — credentials many consultants would envy — and the easy advisor conclusion is “wrong channel; find the right one.” That can miss the terrain.

Someone who has seen this before looks at the **actual surface area**: two navigable pages (homepage and an articles list), no services page, no visible contact path, no testimonials or case outcomes, no client logos — and a primary CTA framed like “view all essays & insights” that sends a ready buyer **deeper into a reading rabbit hole** instead of toward a conversation. The judgment is not “pick TikTok over Reddit” first; it is whether **traffic is the lever** before the offer and paths are legible. That is advisor-grade specificity, not a channel cheat sheet.

### What separates “correct” from “reference quality”

The system infers from the **combination** of:

- **What the user said when asked** — business type, location, budget, challenge.
- **What the user didn’t say** — and what that omission often implies (e.g., a practice adding clinicians may have a volume problem, not a “brand” problem).
- **What the system knows about this business type** — which levers actually convert, which spend is wasted, what owners usually try that doesn’t move the needle.
- **What a seasoned practitioner would tell this specific owner today** — the judgment call, the thing to ignore, the one thing that matters right now.

The gap between “correct in general” and “reference quality” is **whether the system commits to a specific judgment** instead of defaulting to general truths. When it fails, it is almost always because it stayed generic (often because it skipped research or didn’t tie evidence to a named constraint).

---

## Conversational arc: three acts (inside deliberation)

Deliberation phases (exploration → critique → synthesis → recommendation) still apply. **This** is the *dramatic* shape of the room — how trust is earned — even when labels stay invisible.

**Act 1 — Intake (roughly early turns):** Identity, challenge, ideal outcome. The panel is **listening**, not performing advice. Research is queued when it will change what you ask next — often after enough context exists to fetch or search *for* something.

**Act 2 — Depth:** Research-informed questions. Questions should prove homework: cite something specific from the site or market (“I noticed X — is that intentional?”), not a generic questionnaire. Conditional branching by business type. This is where advisors earn trust.

**Act 3 — Constraints:** Budget, capacity, how they’ll measure success, whether they need to be heard or need tactics. An advisor who recommends spend that ignores stated budget hasn’t failed on math — they’ve failed to **listen**. The transition from Act 1 to Act 2 is the hinge: the research window is where the product stops being “another chat tool” and starts being grounded in **their** business.

**Depth ≠ volume.** Meaningful can be succinct; a wall of text is not nuance.

---

## Competitive posture (informs tone — never pasted into user-facing copy)

These distinctions guide *how* advisors behave, not slogans to recite.

- **Anti-agency:** Agencies can optimize for retainer hours. This room optimizes for **judgment** — what matters for this owner now.
- **Anti–approval engines:** Tools that optimize for agreement produce comfort. This product produces **discriminating questions** and pushback when the evidence warrants it — behavioral difference, not feature marketing.
- **Anti-template:** Competitors sell plans as products. Here, the conversation is the **relationship to the work** — the recommendation is a door, not a deliverable to “download.”

---

## Golden rules (inviolable)

Violating these produces meaningfully wrong output — not “weaker style,” wrong.

### 1. Reference quality standard

Output must be **specific enough to forward**: the owner’s friend should feel the panel *heard this person*, not a category.

### 2. Advisor voice — never “tool voice”

- Do not frame the experience as **generating outputs**, **deliverables**, or **reports** as the hero. Recommendations read as **from advisors**, not as artifacts from a machine.
- Questions sound like a **senior strategist** clarifying what they need — not a form collecting fields.

### 3. Trust stack (for product / marketing surfaces — not for cold-delivered chat turns)

For **cold** audiences: **institution → human → advisors** — credibility before mechanics. Do not open with “the AI” or the panel as the first hook; that collapses *advisor* positioning into *tool* positioning. **Warm** audiences (returning, referred) can move faster to advisors. (Implementation lives in onboarding and marketing; the deliberation room still speaks as advisors.)

### 4. Anti-generic guardrail

If advice could apply to **any** business in **any** industry unchanged, it fails. Treat phrases like “clarify your positioning,” “build a thought-leadership engine,” “optimize your social presence,” “develop a strong brand identity,” or “create a content strategy” as **smoke signals** — too generic to be sufficient unless immediately tightened to *this* owner, *this* constraint, *this* proof.

### 5. Research is evidence, not ground truth

What the panel finds online is **provisional**. **User truth beats search truth** — if the owner says “that’s not my site” or “we changed that,” advisors defer and adjust. Name uncertainty: “Here’s what we saw; if that isn’t you, say so.” Never treat scraped content as overriding what the owner states about their own business.

**How research enters the room:** The Orchestrator alone requests it (via structured routing — not ad-hoc browsing). Specialists receive that context as input to their turn; they do not independently “go look things up” outside the path the Orchestrator set. Stack, persistence, and future async/evolution details belong in **`BUILD.md`** (Phase 5 and R1–R7 evolution) — not in user-facing copy.

### 6. Specialists speak from history, not from principle

A specialist advising from *principle* — "apply framework X to situation Y" — produces confident generalities. A specialist advising from *history* — "I've seen this before; here is what mattered" — produces judgment. Rule #1 names the standard for the **output**; this rule names the **source** of it.

In practice: specialists carry case material and reach into it before speaking. The discipline when they do: **use the case, don't cite it** — the insight lands, the source stays invisible. *"I once worked with a fitness studio in Queens..."* is citation, and it is wrong. *"The channels aren't talking to the same person"* is use, and it is right. The case is evidence; the turn is the argument the evidence supports.

A specialist whose prompt says "you have 15 years of experience" but has no case material to reach into still has performed history, not lived history. That is the snow-globe failure mode. The instrument tuning that closes this gap lives in **`BUILD.md` Phase 7**.

---

## Rules for Every Development Decision

1. If it makes the conversation faster but dumber, don't build it.
2. If it makes agents agree more easily, don't build it.
3. If it removes the user's ability to interrupt or redirect, don't build it.
4. If it treats all users as the same sophistication level, don't build it.
5. If it generates more output without more insight, don't build it.
6. If it looks impressive in a demo but doesn't help a bakery owner decide whether to add delivery, don't build it.

---

## File Hierarchy

A map of the important files and what each one does. Read this before touching anything.

```
get-idea-ai/
│
├── CLAUDE.md               ← This file. Product philosophy. Read first, always.
├── BUILD.md                ← Phase-by-phase build plan. Tracks what is done, in-progress, and next.
├── DESIGN.md               ← Visual identity and UI principles. Governs every component decision.
│
├── app/
│   ├── page.tsx            ← Root redirect: authenticated users → /chat, everyone else → /auth
│   ├── layout.tsx          ← Root layout: font loading (Lora, Plus Jakarta Sans, JetBrains Mono)
│   ├── api/
│   │   └── chat/
│   │       └── route.ts    ← The SSE streaming endpoint. Runs LangGraph, emits structured events
│   │                         (routing, agent_start, token, agent_end, yield_to_user, done),
│   │                         persists messages, triggers post-round insight extraction.
│   ├── auth/
│   │   ├── page.tsx        ← Magic link sign-in page
│   │   ├── AuthForm.tsx    ← Client form component — calls Supabase signInWithOtp
│   │   └── callback/
│   │       └── route.ts    ← Supabase PKCE exchange — trades auth code for session, redirects to /chat
│   ├── chat/
│   │   ├── layout.tsx      ← Three-panel shell layout (thread sidebar + center + agent roster)
│   │   └── page.tsx        ← Server component: auth guard, loads agents + threads from DB,
│   │                         renders ChatInterface with real data
│   └── ideas/
│       └── page.tsx        ← Idea Dashboard: all threads with extracted insight summaries per idea
│
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx    ← Main client component. Owns all live state via useDeliberation.
│   │   │                          This is what the user actually interacts with.
│   │   ├── MessageBubble.tsx    ← Renders user / agent / orchestrator messages. Detects
│   │   │                          panel_recommendation agent and renders RecommendationBlock instead.
│   │   ├── RecommendationBlock.tsx  ← Structured panel assessment card. Parses ## headings into
│   │   │                              labeled sections (Strengths, Risks, Questions, Next Steps).
│   │   ├── AgentRoster.tsx      ← Right sidebar. Receives live agentStatuses from useDeliberation.
│   │   ├── AgentCard.tsx        ← Individual agent card with thinking/speaking/idle/silent states.
│   │   ├── ThreadSidebar.tsx    ← Left sidebar. Real threads from DB with insight count badges.
│   │   │                          "New Conversation" button. Footer link to /ideas.
│   │   └── Composer.tsx         ← Always-active text input. Shifts to interrupt mode (different
│   │                              icon + tooltip) when isGenerating is true.
│   ├── ideas/
│   │   └── IdeasDashboard.tsx  ← Idea cards grid. Groups insights by type. Source agent on each.
│   └── ui/
│       ├── Avatar.tsx          ← Agent monogram avatar in agent color. Never a robot or photo.
│       └── StatusDot.tsx       ← Animated presence dot. Pulse = thinking. Solid = speaking.
│
├── lib/
│   ├── agents/
│   │   ├── schema.ts           ← Zod schemas: AgentConfig, PublicAgentConfig, RoutingDecision.
│   │   │                         Source of truth for what an agent record looks like.
│   │   ├── loader.ts           ← React.cache agent loader for Next.js server components.
│   │   ├── graph-loader.ts     ← Module-level TTL cache (5 min) for LangGraph node execution.
│   │   │                         Separate from loader.ts because React.cache doesn't work in graphs.
│   │   ├── case-loader.ts      ← Per-specialist case retrieval (Phase 7.3). workerNode calls this
│   │   │                         to pull 2-3 business-type-matched cases before the specialist speaks.
│   │   │                         "Use the case, don't cite it" is the rule (GR#6).
│   │   └── cases/              ← Per-specialist JSON case libraries. Marketer shipped (13 cases);
│   │                             other 9 specialists pending Phase 7.4 length compression first.
│   ├── knowledge/              ← Org-level marketing knowledge. Injected at recommendationNode ONLY.
│   │   ├── loader.ts           ← Business-type inference + playbook/channel retrieval.
│   │   ├── playbooks/          ← 5 verticals (local_services, professional_services, restaurant_food,
│   │   │                         fitness_wellness, ecommerce_dtc). Ported from Zansei production.
│   │   └── channels/           ← 8 channel guides (GBP, LSAs, Google Search, Meta, Email/SMS,
│   │                             LinkedIn, Referrals, SEO). Same Zansei provenance.
│   ├── graph/
│   │   ├── state.ts            ← DeliberationStateAnnotation. All LangGraph state fields with
│   │   │                         reducers. prior_insights_context is injected here from the API.
│   │   ├── nodes.ts            ← The four nodes: supervisorNode (routing), workerNode (any agent,
│   │   │                         now injects research + cases), interruptHandlerNode (resets on
│   │   │                         user interrupt), recommendationNode (structured assessment with
│   │   │                         divergence rule + budget hierarchy + assumption check + knowledge
│   │   │                         injection). No hardcoded agent names anywhere.
│   │   └── compile.ts          ← StateGraph compilation. Defines routing logic, MAX_AGENT_TURNS,
│   │                             and the conditional edges between nodes.
│   ├── hooks/
│   │   └── useDeliberation.ts  ← Client SSE hook. Manages stream lifecycle, parses events, updates
│   │                             agentStatuses in real time, handles AbortController for interrupts.
│   ├── insights/
│   │   ├── extract.ts          ← Post-round extraction via Claude Haiku. Zod-validated output.
│   │   │                         Replaces prior insights on each pass — insight set always reflects
│   │   │                         the full conversation, not just the most recent round.
│   │   └── loader.ts           ← Loads + formats prior insights as orchestrator context string.
│   │                             Also loads insight counts per thread for the sidebar badges.
│   ├── supabase/
│   │   ├── client.ts           ← Browser-side Supabase client (singleton)
│   │   ├── server.ts           ← Server-side client using Next.js cookies()
│   │   └── admin.ts            ← Service role client. Used in graph nodes and scripts to bypass RLS.
│   ├── types/
│   │   └── stream.ts           ← Shared types: StreamEvent (the SSE protocol), ClientMessage,
│   │                             RosterAgent, SidebarThread, AgentStatus, getAgentColor().
│   ├── test/
│   │   ├── grade-deliberation.ts ← Tripwire grader + instruments block: banned generic phrases,
│   │   │                           tool-voice patterns, recommendation `##` sections, persona hint
│   │   │                           coverage, research follow-through heuristics, plus numeric
│   │   │                           instruments (routing errors, research calls, advisor word counts).
│   │   │                           Not an LLM judge. Instruments don't affect pass/fail.
│   │   ├── pacing.ts           ← Typing-delay for the multi-round harness (Zansei-style 2-6s).
│   │   ├── role-player.ts      ← Separate-Claude in-character persona response generator.
│   │   │                         No shared context with system-under-test.
│   │   └── write-result-bundle.ts ← Result bundle writer used by capture:bundle and test:persona.
│   └── placeholder.ts          ← Fallback mock data used when DB isn't seeded yet.
│
├── test/                       ← **gitignored** — personas, fixtures, registry, local `results/` (see docs/testing.md).
│
├── docs/
│   └── testing.md              ← Published testing guide (fixtures themselves stay local / private).
│
├── supabase/
│   └── migrations/
│       └── 001_foundation.sql  ← Full schema: profiles, threads, messages, agent_configs,
│                                  idea_insights. RLS policies. Triggers. Run this first.
│
├── scripts/
│   ├── seed-agents.ts          ← Seeds all 10 specialist agents + orchestrator into agent_configs.
│   │                             Upserts on name — re-running overwrites all fields including prompts.
│   ├── test-graph.ts           ← Integration tests: graph compilation, routing schema validation,
│   │                             interrupt state reset, agent loading, no-hardcoding constraint.
│   ├── test-grade.ts           ← Unit tests for grade-deliberation.ts (run via `test:grade`).
│   ├── run-fixture-grades.ts   ← Runs tripwire grader on all `test/fixtures/registry.json` cases (no DB).
│   ├── grade-transcript-file.ts ← Grade a single exported messages file; used by capture bundle + manual QA.
│   ├── capture-specialist-probe.ts ← Force one specialist to respond to a persona opener.
│   │                                 Used for voice tuning before full multi-round tests.
│   └── run-persona-session.ts  ← Multi-round harness (Phase 7.5): R1-R6 with role-player, research,
│                                 pacing, bundle output. `npm run test:persona -- --persona <path>`.
│
└── proxy.ts                    ← Next.js 16 proxy (formerly middleware). Refreshes Supabase
                                   sessions on every request so auth stays current.
```

### The files that govern everything else

| File | Why it matters |
|---|---|
| `CLAUDE.md` | If a technical decision conflicts with this document, this document wins. |
| `lib/graph/nodes.ts` | The deliberation engine. Touch this carefully. No agent name conditionals. |
| `lib/agents/schema.ts` | The Zod schema is the contract between the DB, the graph, and the UI. |
| `app/api/chat/route.ts` | The streaming backbone. Everything the user sees flows through here. |
| `scripts/seed-agents.ts` | The source of truth for agent identities and prompts. Re-running overwrites. |
| `supabase/migrations/001_foundation.sql` | The data model. Changes here require a migration, not a code edit. |
| `lib/test/grade-deliberation.ts` | Cheap automated checks on transcripts (tripwires aligned with **Reference quality** above). See `docs/testing.md` and `BUILD.md` §6.2. |
| `docs/testing.md` | How to run persona + fixture grading, capture bundles, and the combined `test:quality` gate (local `test/` is gitignored). |
