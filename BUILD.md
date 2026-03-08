# BUILD.md — GetIdea.ai

This is the living build plan. Read CLAUDE.md first. Every technical decision here serves the product philosophy defined there.

Check this file before every task. Update it after every task.

Format: `[ ]` not started · `[x]` complete · `[~]` in progress · `[!]` blocked

---

## PHASE 0 — Foundation

**Goal:** One command starts the full dev environment. Auth works. Database stores conversational state. The UI shell renders with placeholder data.

**Read first:** CLAUDE.md (product philosophy), DESIGN.md (UI principles)

**Status:** IN PROGRESS

### 0.1 Project Initialization

- [x] `npx create-next-app@latest getidea --typescript --tailwind --app`
- [~] Initialize git repo. MANUAL: Create repo at github.com, then `git remote add origin <url> && git push -u origin main`
- [~] Connect to hosting (Vercel or Render). MANUAL: Dashboard, connect GitHub repo, enable auto-deploy on `main`.
- [~] Create Supabase project. MANUAL: app.supabase.com, New Project.
- [ ] Run `supabase init` locally.

**Done when:** `npm run dev` starts clean. `npm run build` produces zero TypeScript errors.

### 0.2 Environment Configuration

- [ ] Create `.env.local` with all keys (values blank except Supabase URL and anon key).
- [ ] Add `.env.local` to `.gitignore`.
- [ ] Create `.env.example` committed to repo with all keys, no values.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=
LANGCHAIN_PROJECT=getidea-orchestrator
```

- [ ] Set environment variables on hosting provider. MANUAL: Hosting Dashboard, Environment settings.

**Done when:** `.env.example` is committed. `git status` shows no secrets.

### 0.3 Dependencies

- [ ] Core DB/Auth: `npm install @supabase/supabase-js @supabase/ssr`
- [ ] Agent Framework: `npm install @langchain/langgraph @langchain/core @langchain/openai @langchain/anthropic`
- [ ] UI and Utilities: `npm install ai react-markdown lucide-react clsx tailwind-merge zod`

**Done when:** `npm run build` succeeds. Zero type errors. Peer dependencies resolved.

### 0.4 Supabase Client Setup

- [ ] `/lib/supabase/client.ts` — Browser client, singleton pattern.
- [ ] `/lib/supabase/server.ts` — Server component client, cookie-based.
- [ ] `/middleware.ts` at project root — Supabase session refresh on every request.

**Done when:** Importing `createClient` from either module does not throw.

### 0.5 Database Schema

- [ ] Create migration `/supabase/migrations/001_foundation.sql`

**Tables:**

`profiles` — extends Supabase auth.users
```
id (uuid, FK to auth.users)
display_name (text)
business_type (text, nullable)
created_at (timestamptz)
```

`threads` — conversation containers
```
id (uuid, PK)
user_id (uuid, FK to profiles)
title (text)
status (text: 'active' | 'archived')
created_at (timestamptz)
updated_at (timestamptz)
```

`messages` — every utterance in a thread
```
id (uuid, PK)
thread_id (uuid, FK to threads)
role (text: 'user' | 'agent' | 'orchestrator' | 'system')
agent_name (text, nullable)
content (text)
metadata (jsonb, nullable) — routing reasons, deliberation phase, etc.
created_at (timestamptz)
```

`agent_configs` — runtime-configurable agent identities (NOT hardcoded)
```
id (uuid, PK)
name (text, unique)
display_name (text)
description_for_orchestrator (text) — how the orchestrator understands this agent's role
system_prompt (text)
model_provider (text: 'openai' | 'anthropic')
model_name (text)
voice_style (text) — terse, warm, analytical, etc.
risk_tolerance (text: 'low' | 'medium' | 'high')
expertise_domains (text[])
status (text: 'active' | 'inactive')
sort_order (int)
created_at (timestamptz)
updated_at (timestamptz)
```

`idea_insights` — institutional memory extracted from deliberations
```
id (uuid, PK)
thread_id (uuid, FK to threads)
insight_type (text: 'strength' | 'risk' | 'question' | 'recommendation' | 'pattern')
source_agent (text)
content (text)
created_at (timestamptz)
```

- [ ] Enable RLS on all tables.
- [ ] Policy: Users can only read/write their own `threads`, `messages`, and `idea_insights`.
- [ ] Policy: `agent_configs` readable by all authenticated users, writable only by admin.

**Done when:** SQL editor confirms users cannot read other users' threads. Agent configs are readable but not writable by normal users.

### 0.6 UI Shell (Placeholder Data)

Refer to DESIGN.md for all visual decisions. This phase uses hardcoded placeholder data only.

- [ ] `/app/chat/layout.tsx` — Three-panel layout. Left: thread history. Center: message feed and composer. Right: active roster.
- [ ] `/components/chat/MessageBubble.tsx` — Renders differently based on `role` and `agent_name`. Each agent has a distinct visual identity. Orchestrator reasoning is rendered as a subtle annotation, not a full message.
- [ ] `/components/chat/Composer.tsx` — Text input with send button. Includes an "interrupt" affordance that appears when agents are actively generating.
- [ ] `/components/chat/AgentRoster.tsx` — Lists all active agents. Each shows a status indicator: idle, thinking, speaking, or silent.
- [ ] `/components/chat/ThreadSidebar.tsx` — List of past threads with titles and timestamps.

**Done when:** The shell renders at `/chat` with placeholder data in all three panels. No API calls. No real agents. Just the shape of the product.

### Phase 0 Complete When:

UI shell renders. Database migrations applied. Auth works. A user can log in and see the empty chat interface. The shape of the deliberation room is visible even with no agents running.

---

## PHASE 1 — Agent Configuration

**Goal:** The 10+ agent personalities exist as database records. The Orchestrator can read them dynamically. No agent identity is hardcoded in application logic.

**Read first:** CLAUDE.md (agent philosophy, "Advisors, Not Performers" section)

**Status:** NOT STARTED

### 1.1 Agent Profile Schema

- [ ] `/lib/agents/schema.ts` — Zod schema for `AgentProfile` matching the `agent_configs` table. Validates name, system_prompt, description_for_orchestrator, model_provider, model_name, voice_style, risk_tolerance, expertise_domains.

- [ ] `/lib/agents/loader.ts` — Function to fetch all active agent configs from Supabase. Caches in memory for the duration of a request. Never reads agent identity from a hardcoded file or constant.

### 1.2 Agent Seed Data

- [ ] Create seed script `/scripts/seed-agents.ts` that populates `agent_configs`.

Each agent profile must include a `description_for_orchestrator` that tells the Orchestrator *when* to call this agent, not just *what* they do. Examples:

**Marketer:** "Bring in when the user has an idea but hasn't thought about how anyone will find out about it. Also useful when other agents are building plans that assume customers will appear. Ranges from 'put a sign in the window' to 'here is your CAC model' depending on the user's sophistication."

**Finance:** "Bring in when money is being discussed without numbers, when timelines lack cost projections, or when enthusiasm is outpacing financial reality. Should quantify, not just opine. For unsophisticated users, translate financial concepts into plain language. For sophisticated users, go deep."

**Creative:** "Bring in when the idea needs a story, a brand angle, or an emotional hook. Also useful as a counterweight when the conversation is too analytical and has lost the human element. Must stay grounded — beautiful ideas that cost $50K to execute for a business with $2K in the bank are not helpful."

**Copywriter:** "Bring in when the idea needs to be expressed in words — taglines, descriptions, pitches, emails, signage. Works closely with Marketer and Creative but focuses on the actual language. Should adapt register to the user's audience, not the user's vocabulary."

**Designer:** "Bring in when the conversation turns to how the idea will look, feel, or be experienced. Covers everything from storefront layout to app UI to packaging. Must think about cost and feasibility, not just aesthetics."

**Accountant:** "Bring in when the discussion involves money mechanics — pricing, margins, taxes, bookkeeping implications, cash flow. Different from Finance: the Accountant cares about where the money goes, not whether the idea makes money. Speak plainly."

**Operations:** "Bring in when the idea has moving parts — supply chain, scheduling, staffing, logistics, systems. The agent who asks 'but who actually does this?' when others are dreaming."

**Legal Awareness:** "Bring in when the idea brushes against permits, regulations, liability, contracts, or intellectual property. This agent does not give legal advice. It flags when the user should talk to a lawyer and explains why."

**Customer Experience:** "Bring in when nobody is thinking about what it feels like to be the customer. Useful for pressure-testing assumptions about what people want vs. what the business wants to sell them."

**Business Realist:** "The anchor. Bring in when other agents are being too optimistic, when the idea has a fundamental flaw nobody is naming, or when the conversation needs grounding. This agent's job is not to kill ideas — it's to make them survive contact with reality. Must always offer a path forward, not just criticism."

- [ ] Verify all agents are seeded with `status: 'active'`.

**Done when:** The database contains 10+ distinct agent profiles. Querying `/lib/agents/loader.ts` returns them all. Zero agent identities are hardcoded in React components or API routes.

### 1.3 Orchestrator Configuration

- [ ] Draft the Orchestrator's system prompt. Store it in `agent_configs` with `name: 'orchestrator'` and `status: 'system'` (not displayed in the roster).

The Orchestrator prompt must instruct it to:

1. Read the full conversation state.
2. Read the dynamic list of available agents and their `description_for_orchestrator` fields.
3. Assess the user's sophistication level from their language and questions.
4. Determine the current deliberation phase (exploration, critique, synthesis, recommendation).
5. Output a structured routing decision:

```json
{
  "next_speaker": "agent_name" | "user",
  "reason": "Why this agent right now, given the conversation state.",
  "objective": "critique" | "expand" | "challenge" | "refine" | "quantify" | "ground" | "summarize",
  "deliberation_phase": "exploration" | "critique" | "synthesis" | "recommendation",
  "suppress": ["agent_names_who_should_stay_silent"],
  "user_sophistication": "novice" | "intermediate" | "advanced"
}
```

6. Follow suppression rules: if two agents would say the same thing, one speaks. If the conversation is too agreeable, summon a dissenting voice. If the idea has been examined thoroughly, yield to the user or produce a recommendation.

- [ ] The Orchestrator prompt includes the instruction: "If no agent should speak, return `next_speaker: 'user'` with a reason. Silence is a valid and often correct decision."

**Done when:** Orchestrator config is in the database. Its prompt references agent descriptions dynamically (by reading them at runtime), not by listing them inline.

### Phase 1 Complete When:

All agent profiles live in the database. The Orchestrator can fetch them, understand their roles, and make routing decisions. The codebase contains zero hardcoded agent names in conditional logic.

---

## PHASE 2 — LangGraph Orchestrator

**Goal:** The state machine that powers the deliberation. The Orchestrator routes messages. Agents respond with their configured personality. The user can interrupt at any point.

**Read first:** CLAUDE.md ("Orchestrator Is a Moderator" and "Interruption Is a Feature" sections)

**Status:** NOT STARTED

### 2.1 Graph State

- [ ] `/lib/graph/state.ts` — Define `DeliberationState` extending LangGraph's message array.

Custom state keys:
```typescript
interface DeliberationState {
  messages: BaseMessage[];
  current_speaker: string | null;
  next_speaker: string | null;
  deliberation_phase: "exploration" | "critique" | "synthesis" | "recommendation";
  human_interrupted: boolean;
  user_sophistication: "novice" | "intermediate" | "advanced" | "unknown";
  turn_count: number;
  suppressed_agents: string[];
}
```

**Done when:** TypeScript compiles the state interface cleanly.

### 2.2 Graph Nodes

- [ ] `/lib/graph/nodes.ts`

**supervisorNode:** Reads the current state. Fetches agent configs from the DB. Passes the conversation history plus the list of available agents to a fast, inexpensive model (Claude 3.5 Haiku or GPT-4o-mini). Parses the routing decision JSON. Updates state with `next_speaker`, `deliberation_phase`, `suppressed_agents`, and `user_sophistication`.

**workerNode (dynamic):** A single function, not 10 different functions. Reads `state.next_speaker`. Pulls that agent's `system_prompt` and `model_provider` from the DB. Constructs the prompt with the conversation history and the agent's configured personality. Calls the appropriate LLM. Appends the response to the message array. Appends a metadata entry with the agent's name and the Orchestrator's stated reason for choosing them.

**interruptHandlerNode:** Activated when `state.human_interrupted === true`. Clears the interrupted generation. Packages the user's new message. Resets the interrupt flag. Routes back to the supervisor for re-evaluation.

**recommendationNode:** Activated when the supervisor determines the conversation has reached the recommendation phase. Produces a structured assessment: Strengths, Risks, Unanswered Questions, Suggested Next Steps. This can be triggered by the supervisor or explicitly requested by the user.

- [ ] No node contains `if (agent === "finance")` or any hardcoded agent name. All behavior is driven by database configs.

**Done when:** All node functions accept and return correct LangGraph state objects. A unit test confirms the supervisor can route to any agent by name.

### 2.3 Graph Compilation and Edge Logic

- [ ] `/lib/graph/compile.ts`

**Edge routing:**
- `START` → `supervisorNode`
- `supervisorNode` → `workerNode` (if `next_speaker` is an agent name)
- `supervisorNode` → `END` (if `next_speaker` is `"user"`)
- `supervisorNode` → `recommendationNode` (if `deliberation_phase` is `"recommendation"`)
- `workerNode` → `supervisorNode` (agent responds, then supervisor decides if another agent should speak or if it's the user's turn)
- At any edge: if `state.human_interrupted === true`, route to `interruptHandlerNode` first.
- `interruptHandlerNode` → `supervisorNode`

**Cycle limits:** The graph must not loop indefinitely. Set a maximum of 6 agent turns before forcing a yield to the user. The supervisor can yield earlier.

- [ ] Graph compiles successfully.
- [ ] Integration test: simulate User → Supervisor → Agent A → Supervisor → Agent B → Supervisor → User. Verify correct routing.
- [ ] Integration test: simulate an interrupt mid-Agent-A. Verify the system stops Agent A, processes the interrupt, and the supervisor re-evaluates.

**Done when:** The graph handles the full deliberation cycle including interrupts. Tests pass.

### Phase 2 Complete When:

The orchestrator can receive a user message, route it through multiple agents in a structured deliberation, handle interrupts, and yield back to the user. All agent behavior is driven by database configs.

---

## PHASE 3 — Streaming and Client Integration

**Goal:** The React frontend connects to the LangGraph backend. Users see who is thinking, what agents say, and can interrupt in real time.

**Read first:** DESIGN.md (streaming UX, agent presence, interrupt affordance)

**Status:** NOT STARTED

### 3.1 API Route

- [ ] `/app/api/chat/route.ts`
- [ ] Instantiate the compiled LangGraph.
- [ ] Accept POST with `{ thread_id, message }`.
- [ ] Authenticate the user via Supabase session.
- [ ] Implement streaming via LangChain's `StreamEvent` API.

Stream must emit structured events, not just text tokens:

```typescript
// Event types the client must handle:
{ type: "routing", agent: "finance", reason: "User mentioned pricing without numbers", phase: "critique" }
{ type: "agent_start", agent: "finance" }
{ type: "token", agent: "finance", content: "Let's" }
{ type: "token", agent: "finance", content: " look" }
{ type: "agent_end", agent: "finance" }
{ type: "routing", agent: "user", reason: "Idea has been examined from financial and market angles. User should respond.", phase: "exploration" }
{ type: "yield_to_user" }
```

- [ ] Persist all messages (user, agent, orchestrator metadata) to the `messages` table.

**Done when:** A POST via test client returns an SSE stream with both routing metadata and text tokens.

### 3.2 Client Stream Handler

- [ ] `/lib/hooks/useDeliberation.ts` — Custom React hook that manages the SSE connection, parses events, and maintains local state for the active conversation.

State managed by the hook:
- `messages[]` — the rendered conversation
- `activeAgent` — which agent is currently speaking (null if none)
- `agentStatuses` — map of agent name to status (idle, thinking, speaking)
- `deliberationPhase` — current phase
- `isGenerating` — whether the system is producing output
- `routingReason` — the Orchestrator's most recent reasoning (for optional display)

### 3.3 Interrupt Mechanism

- [ ] When the user submits a message while `isGenerating === true`, the client fires an `AbortController.abort()` on the active stream.
- [ ] Simultaneously sends the new message to the API with `{ interrupt: true }`.
- [ ] The API sets `state.human_interrupted = true` and lets the graph handle re-routing.
- [ ] The Composer remains active and interactable at all times while agents are generating.

**Done when:** A user can type and send a message while an agent is mid-response. The agent stops. The Orchestrator re-evaluates. The conversation continues naturally.

### 3.4 UI Integration

- [ ] Wire `useDeliberation` hook into `/app/chat/page.tsx`.
- [ ] Agent Roster updates in real time: when a `routing` event arrives, the named agent transitions to "thinking." When `agent_start` fires, it transitions to "speaking." When `agent_end` fires, it returns to "idle."
- [ ] Message feed renders agent responses with the agent's visual identity (color, avatar, name).
- [ ] Orchestrator reasoning is available as an expandable annotation on each agent message, not as a separate message in the feed.

**Done when:** Full end-to-end flow works. User sends message. Roster illuminates. Agents respond with streaming text. User interrupts. System re-routes. Conversation feels like a room, not a queue.

### Phase 3 Complete When:

The product is usable. A real user can describe their business idea and receive a multi-perspective deliberation with visible agent presence, real-time streaming, and interrupt capability.

---

## PHASE 4 — Institutional Memory and Idea Records

**Goal:** The system remembers. Insights are extracted from deliberations. Users can return to ideas across sessions.

**Status:** NOT STARTED

### 4.1 Insight Extraction

- [ ] After a deliberation round completes (supervisor yields to user or produces a recommendation), run an extraction pass.
- [ ] A lightweight LLM call reads the conversation and populates `idea_insights` with structured entries: strengths identified, risks flagged, questions left unanswered, recommendations made.
- [ ] Each insight is tagged with the `source_agent` so the system knows which perspective produced it.

### 4.2 Thread Continuity

- [ ] When a user returns to an existing thread, the system loads prior messages AND prior insights.
- [ ] The Orchestrator's context includes a summary of previous insights so it doesn't re-cover ground already explored.
- [ ] The user can say "remember my food truck idea?" and the system can retrieve the relevant thread and its accumulated insights.

### 4.3 Idea Dashboard (Stretch)

- [ ] A view that shows the user's ideas with their insight summaries — strengths, risks, open questions — at a glance.
- [ ] Not a priority for MVP but the data model supports it from Phase 0.

**Done when:** Insights are extracted and stored after deliberations. Returning to a thread resumes the conversation with context.

---

## PHASE 5 — Polish, Edge Cases, and Production Hardening

**Status:** NOT STARTED

### 5.1 Error Handling

- [ ] Graceful handling of LLM API failures mid-stream. The UI should show "Agent encountered an issue" rather than crashing.
- [ ] Rate limiting on the API route.
- [ ] Token budget management — prevent runaway conversations from exceeding context limits.

### 5.2 Conversation Quality

- [ ] Test with real small business scenarios: bakery adding delivery, freelancer raising prices, food truck choosing a location, SaaS founder validating an idea.
- [ ] Tune agent prompts based on real output. This is iterative and ongoing.
- [ ] Verify the Orchestrator correctly calibrates `user_sophistication` and agents actually adapt their language.

### 5.3 Performance

- [ ] Supervisor routing decisions should complete in under 2 seconds.
- [ ] Agent responses should begin streaming within 3 seconds of routing.
- [ ] The UI must remain responsive during generation.

### 5.4 Deployment

- [ ] Staging environment with seed data.
- [ ] Production deploy checklist: environment variables, RLS verification, CORS, rate limits.
- [ ] LangSmith integration for debugging orchestrator decisions in production.

---

## Principles That Apply to Every Phase

These are not suggestions. They are constraints.

1. **No hardcoded agents.** If you write `if (agentName === "finance")` anywhere in application logic, you have made a mistake. All behavior is driven by database configs.

2. **The Orchestrator's reasoning is product surface.** Treat routing decisions as content, not logs. They tell the user *why* the system is structured the way it is.

3. **Silence is a valid output.** The system must be able to decide that no agent should speak. Build the yield-to-user path first, not last.

4. **Interrupts are not edge cases.** They are the primary mechanism by which users participate as peers. Test them as heavily as the happy path.

5. **Meet the user where they are.** The system must work for someone who has never heard the word "margin" and someone who wants to discuss unit economics. Both deserve the same quality of thinking.

6. **Read CLAUDE.md before starting any phase.** If a technical decision conflicts with the product philosophy, the philosophy wins.
