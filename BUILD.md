# BUILD.md — GetIdea.ai

This is the living build plan. Read CLAUDE.md first. Every technical decision here serves the product philosophy defined there.

Check this file before every task. Update it after every task.

Format: `[ ]` not started · `[x]` complete · `[~]` in progress · `[!]` blocked

---

## PHASE 0 — Foundation

**Goal:** One command starts the full dev environment. Auth works. Database stores conversational state. The UI shell renders with placeholder data.

**Read first:** CLAUDE.md (product philosophy), DESIGN.md (UI principles)

**Status:** COMPLETE

### 0.1 Project Initialization

- [x] `npx create-next-app@latest getidea --typescript --tailwind --app`
- [x] Initialize git repo. MANUAL: Create repo at github.com, then `git remote add origin <url> && git push -u origin main`
- [x] Connect to hosting (Vercel or Render). MANUAL: render.yaml to be created in Phase 5 pre-deploy.
- [x] Create Supabase project. MANUAL: Confirmed — project byylozzduwvhkuabynlr already active.
- [x] Run `supabase init` locally.

**Done when:** `npm run dev` starts clean. `npm run build` produces zero TypeScript errors.

### 0.2 Environment Configuration

- [x] Create `.env.local` with all keys (values blank except Supabase URL and anon key).
- [x] Add `.env.local` to `.gitignore`.
- [x] Create `.env.example` committed to repo with all keys, no values.

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

- [~] Set environment variables on hosting provider. MANUAL: Render Dashboard, Environment settings (do when deploying).

**Done when:** `.env.example` is committed. `git status` shows no secrets.

### 0.3 Dependencies

- [x] Core DB/Auth: `npm install @supabase/supabase-js @supabase/ssr`
- [x] Agent Framework: `npm install @langchain/langgraph @langchain/core @langchain/openai @langchain/anthropic`
- [x] UI and Utilities: `npm install ai react-markdown lucide-react clsx tailwind-merge zod`

**Done when:** `npm run build` succeeds. Zero type errors. Peer dependencies resolved.

### 0.4 Supabase Client Setup

- [x] `/lib/supabase/client.ts` — Browser client, singleton pattern.
- [x] `/lib/supabase/server.ts` — Server component client, cookie-based.
- [x] `/proxy.ts` at project root — Supabase session refresh on every request (Next.js 16 uses `proxy.ts` instead of `middleware.ts`).

**Done when:** Importing `createClient` from either module does not throw.

### 0.5 Database Schema

- [x] Create migration `/supabase/migrations/001_foundation.sql`

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
metadata (jsonb, nullable) — routing reasons, deliberation phase, `message_type` (e.g. `yield_to_user`, `recommendation`), research snapshots, etc.
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

- [x] Enable RLS on all tables.
- [x] Policy: Users can only read/write their own `threads`, `messages`, and `idea_insights`.
- [x] Policy: `agent_configs` readable by all authenticated users, writable only by admin.

**Done when:** SQL editor confirms users cannot read other users' threads. Agent configs are readable but not writable by normal users.

### 0.6 UI Shell (Placeholder Data)

Refer to DESIGN.md for all visual decisions. This phase uses hardcoded placeholder data only.

- [x] `/app/chat/layout.tsx` — Three-panel layout. Left: thread history. Center: message feed and composer. Right: active roster.
- [x] `/components/chat/MessageBubble.tsx` — Renders differently based on `role` and `agent_name`. Each agent has a distinct visual identity. Orchestrator reasoning is rendered as a subtle annotation, not a full message.
- [x] `/components/chat/Composer.tsx` — Text input with send button. Includes an "interrupt" affordance that appears when agents are actively generating.
- [x] `/components/chat/AgentRoster.tsx` — Lists all active agents. Each shows a status indicator: idle, thinking, speaking, or silent.
- [x] `/components/chat/ThreadSidebar.tsx` — List of past threads with titles and timestamps.

**Done when:** The shell renders at `/chat` with placeholder data in all three panels. No API calls. No real agents. Just the shape of the product.

### Phase 0 Complete When:

UI shell renders. Database migrations applied. Auth works. A user can log in and see the empty chat interface. The shape of the deliberation room is visible even with no agents running.

---

## PHASE 1 — Agent Configuration

**Goal:** The 10+ agent personalities exist as database records. The Orchestrator can read them dynamically. No agent identity is hardcoded in application logic.

**Read first:** CLAUDE.md (agent philosophy, "Advisors, Not Performers" section)

**Status:** COMPLETE

### 1.1 Agent Profile Schema

- [x] `/lib/agents/schema.ts` — Zod schema for `AgentProfile` matching the `agent_configs` table. Validates name, system_prompt, description_for_orchestrator, model_provider, model_name, voice_style, risk_tolerance, expertise_domains.

- [x] `/lib/agents/loader.ts` — Function to fetch all active agent configs from Supabase. Caches in memory for the duration of a request (React.cache). Never reads agent identity from a hardcoded file or constant.

### 1.2 Agent Seed Data

- [x] Create seed script `/scripts/seed-agents.ts` that populates `agent_configs`.

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

- [x] Verify all agents are seeded with `status: 'active'`. (10 active agents + orchestrator system record confirmed.)

**Done when:** The database contains 10+ distinct agent profiles. Querying `/lib/agents/loader.ts` returns them all. Zero agent identities are hardcoded in React components or API routes.

### 1.3 Orchestrator Configuration

- [x] Draft the Orchestrator's system prompt. Store it in `agent_configs` with `name: 'orchestrator'` and `status: 'system'` (not displayed in the roster).

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

- [x] The Orchestrator prompt includes the instruction: "If no agent should speak, return `next_speaker: 'user'` with a reason. Silence is a valid and often correct decision."

**Done when:** Orchestrator config is in the database. Its prompt references agent descriptions dynamically (by reading them at runtime), not by listing them inline.

### Phase 1 Complete When:

All agent profiles live in the database. The Orchestrator can fetch them, understand their roles, and make routing decisions. The codebase contains zero hardcoded agent names in conditional logic.

---

## PHASE 2 — LangGraph Orchestrator

**Goal:** The state machine that powers the deliberation. The Orchestrator routes messages. Agents respond with their configured personality. The user can interrupt at any point.

**Read first:** CLAUDE.md ("Orchestrator Is a Moderator" and "Interruption Is a Feature" sections)

**Status:** COMPLETE

### 2.1 Graph State

- [x] `/lib/graph/state.ts` — Define `DeliberationState` extending LangGraph's message array.

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

- [x] `/lib/graph/nodes.ts`

**supervisorNode:** Reads the current state. Fetches agent configs from the DB. Passes the conversation history plus the list of available agents to a fast, inexpensive model (Claude 3.5 Haiku or GPT-4o-mini). Parses the routing decision JSON. Updates state with `next_speaker`, `deliberation_phase`, `suppressed_agents`, and `user_sophistication`.

**workerNode (dynamic):** A single function, not 10 different functions. Reads `state.next_speaker`. Pulls that agent's `system_prompt` and `model_provider` from the DB. Constructs the prompt with the conversation history and the agent's configured personality. Calls the appropriate LLM. Appends the response to the message array. Appends a metadata entry with the agent's name and the Orchestrator's stated reason for choosing them.

**interruptHandlerNode:** Activated when `state.human_interrupted === true`. Clears the interrupted generation. Packages the user's new message. Resets the interrupt flag. Routes back to the supervisor for re-evaluation.

**recommendationNode:** Activated when the supervisor determines the conversation has reached the recommendation phase. Produces a structured assessment: Strengths, Risks, Unanswered Questions, Suggested Next Steps. This can be triggered by the supervisor or explicitly requested by the user.

- [x] No node contains `if (agent === "finance")` or any hardcoded agent name. All behavior is driven by database configs.

**Done when:** All node functions accept and return correct LangGraph state objects. A unit test confirms the supervisor can route to any agent by name.

### 2.3 Graph Compilation and Edge Logic

- [x] `/lib/graph/compile.ts`

**Edge routing:**
- `START` → `supervisorNode`
- `supervisorNode` → `workerNode` (if `next_speaker` is an agent name)
- `supervisorNode` → `END` (if `next_speaker` is `"user"`)
- `supervisorNode` → `recommendationNode` (if `deliberation_phase` is `"recommendation"`)
- `workerNode` → `supervisorNode` (agent responds, then supervisor decides if another agent should speak or if it's the user's turn)
- At any edge: if `state.human_interrupted === true`, route to `interruptHandlerNode` first.
- `interruptHandlerNode` → `supervisorNode`

**Cycle limits:** The graph must not loop indefinitely. Set a maximum of 6 agent turns before forcing a yield to the user. The supervisor can yield earlier.

- [x] Graph compiles successfully.
- [x] Integration test: simulate User → Supervisor → Agent A → Supervisor → Agent B → Supervisor → User. Verify correct routing. (9/9 tests pass via `npm run test:graph`)
- [x] Integration test: simulate an interrupt mid-Agent-A. Verify the system stops Agent A, processes the interrupt, and the supervisor re-evaluates. (interruptHandlerNode test passes)

**Done when:** The graph handles the full deliberation cycle including interrupts. Tests pass.

### Phase 2 Complete When:

The orchestrator can receive a user message, route it through multiple agents in a structured deliberation, handle interrupts, and yield back to the user. All agent behavior is driven by database configs.

---

## PHASE 3 — Streaming and Client Integration

**Goal:** The React frontend connects to the LangGraph backend. Users see who is thinking, what agents say, and can interrupt in real time.

**Read first:** DESIGN.md (streaming UX, agent presence, interrupt affordance)

**Status:** COMPLETE

### 3.1 API Route

- [x] `/app/api/chat/route.ts`
- [x] Instantiate the compiled LangGraph.
- [x] Accept POST with `{ thread_id, message, interrupt? }`.
- [x] Authenticate the user via Supabase session.
- [x] Implement streaming via LangChain's `StreamEvent` API.

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

- [x] Persist all messages (user, agent, orchestrator metadata) to the `messages` table.
- [x] **Yield to user (`yield_to_user`):** When the supervisor routes to `next_speaker: "user"`, the orchestrator’s `reason` is the panel’s direct reply to the owner (centered italic bubble in the feed). That text is **persisted** as `role: 'orchestrator'` with non-empty `content` and `metadata.message_type: 'yield_to_user'` (plus `deliberation_phase`) so **thread reload** matches the live session. Empty-content `orchestrator` rows remain routing-only annotations tied to the following agent message. Graph reload (`dbRowsToLangChain` in `app/api/chat/route.ts`) includes yield rows as `AIMessage`s so the next round’s context matches what the user saw.
- [x] Auto-create threads (with title from first message) if `thread_id` not provided.

**Done when:** A POST via test client returns an SSE stream with both routing metadata and text tokens.

### 3.2 Client Stream Handler

- [x] `/lib/hooks/useDeliberation.ts` — Custom React hook that manages the SSE connection, parses events, and maintains local state for the active conversation.
- [x] `/lib/types/stream.ts` — Shared StreamEvent types + RosterAgent + ClientMessage.

State managed by the hook:
- `messages[]` — the rendered conversation
- `activeAgent` — which agent is currently speaking (null if none)
- `agentStatuses` — map of agent name to status (idle, thinking, speaking)
- `deliberationPhase` — current phase
- `isGenerating` — whether the system is producing output
- `routingReason` — the Orchestrator's most recent reasoning (for optional display)

### 3.3 Interrupt Mechanism

- [x] When the user submits a message while `isGenerating === true`, the client fires an `AbortController.abort()` on the active stream.
- [x] Simultaneously sends the new message to the API with `{ interrupt: true }`.
- [x] The API sets `state.human_interrupted = true` and lets the graph handle re-routing.
- [x] The Composer remains active and interactable at all times while agents are generating.

**Done when:** A user can type and send a message while an agent is mid-response. The agent stops. The Orchestrator re-evaluates. The conversation continues naturally.

### 3.4 UI Integration

- [x] Wire `useDeliberation` hook into `/app/chat/page.tsx` (now a server component for auth check + agent load; `ChatInterface` client component holds live state).
- [x] Agent Roster updates in real time: when a `routing` event arrives, the named agent transitions to "thinking." When `agent_start` fires, it transitions to "speaking." When `agent_end` fires, it returns to "idle."
- [x] Message feed renders agent responses with the agent's visual identity (color, avatar, name).
- [x] Orchestrator reasoning is available as an expandable annotation on each agent message, not as a separate message in the feed.
- [x] When no agent speaks and the supervisor yields, the orchestrator’s `reason` renders as a **direct orchestrator message** (distinct from routing-only rows); it is persisted and reloaded with the thread (see 3.1).
- [x] Auth pages: `/app/auth/page.tsx` (magic link form) + `/app/auth/callback/route.ts` (PKCE exchange).
- [x] Root page redirects to `/chat` if authenticated, `/auth` otherwise.

**Done when:** Full end-to-end flow works. User sends message. Roster illuminates. Agents respond with streaming text. User interrupts. System re-routes. Conversation feels like a room, not a queue.

### Phase 3 Complete When:

The product is usable. A real user can describe their business idea and receive a multi-perspective deliberation with visible agent presence, real-time streaming, and interrupt capability.

---

## PHASE 4 — Institutional Memory and Idea Records

**Goal:** The system remembers. Insights are extracted from deliberations. Users can return to ideas across sessions.

**Status:** COMPLETE

### 4.1 Insight Extraction

- [x] After a deliberation round completes (supervisor yields to user or produces a recommendation), run an extraction pass.
- [x] `lib/insights/extract.ts` — LLM call (Claude 3.5 Haiku) with Zod-validated output. Enforces specificity via minimum content length and conservative extraction rules. Replaces prior insights per thread on each pass so the insight set always reflects the full conversation.
- [x] Each insight is tagged with the `source_agent` so the system knows which perspective produced it.
- [x] Extraction is triggered silently after `done` is emitted — the user gets control back immediately, extraction runs before the stream closes.

### 4.2 Thread Continuity

- [x] `lib/insights/loader.ts` — Loads and formats prior insights as a structured context string for the orchestrator.
- [x] When a user returns to an existing thread, the API route loads prior insights in parallel with conversation history. **Persisted `yield_to_user` orchestrator rows** (Phase 3.1) load with user/agent messages so the feed stays complete after refresh.
- [x] The Orchestrator's context includes a formatted summary of previous insights. The orchestrator is instructed to build forward, not repeat covered ground.
- [x] `prior_insights_context` added to `DeliberationStateAnnotation` — injected into `buildOrchestratorContext` at the top of each supervisor call.
- [x] `ThreadSidebar` loads real threads from the DB with insight count badges. "View all ideas" footer link to `/ideas`.

### 4.3 Idea Dashboard

- [x] `/app/ideas/page.tsx` — Server-rendered dashboard showing all active threads with their insight summaries.
- [x] `components/ideas/IdeasDashboard.tsx` — Cards per idea, grouped by insight type (strengths, risks, open questions, recommendations), source agent attribution visible on each insight.
- [x] `components/chat/RecommendationBlock.tsx` — Structured visual card for panel recommendations in the message feed (parses `## Heading` sections into labeled groups with color-coded accents). Per DESIGN.md: feels like a deliverable, not a generated report.
- [x] `MessageBubble` detects `panel_recommendation` agent and renders `RecommendationBlock` instead of a plain text bubble.

**Done when:** Insights are extracted and stored after deliberations. Returning to a thread resumes the conversation with context.

---

## PHASE 5 — Web Research and URL Intelligence
Goal: The panel can see the outside world. When a user mentions a URL or asks a question that needs current information, the system fetches, reads, and feeds that context into the deliberation — so agents advise based on what actually exists, not just what the user describes.
Read first: CLAUDE.md ("Meet the user where they are" — this extends to meeting their business where it is. If they have a website, the panel should be able to look at it.)

**Phase 5 baseline (shipped):** Synchronous research inside a single POST to `/api/chat`: orchestrator emits `research_needed` → `researchNode` → URL fetch + web search tools → worker. Streaming annotations in the feed; results persisted as `system` messages. Rate caps per thread. **Current providers (R1):** **Jina Reader** (URL → markdown) and **Serper** (web search). Research does **not** run in the background between user keystrokes yet—that is scoped under **R4** below.

Status: COMPLETE (baseline); evolution tracked below.
5.1 Dependencies and API Keys

 [x] Search/read tooling: Serper (`SERPER_API_KEY`) + Jina Reader (`JINA_API_KEY`) — see `.env.example` and evolution row **R1**.
 [x] Legacy note: Tavily + cheerio were superseded; keys/packages removed in favor of Serper + Jina.

Done when: Packages are installed. API keys are configured locally. Imports do not throw.
5.2 Research Tools

 [x] Create /lib/tools/web-research.ts

Two tools, both wrapped as LangChain-compatible tool definitions:
fetchUrl — Takes a URL string. Reads via Jina Reader into clean text/markdown. Returns structured summary (truncated). If the read fails (404, timeout), return a clear error message, not an exception.
webSearch — Takes a query string. Calls Serper’s Google search API. Returns top organic results as structured objects (title, URL, snippet), plus optional answer/overview when present.
Both tools must:

Have clear Zod input schemas so LangChain can describe them to the LLM.
Include sensible timeouts (5 seconds for fetch, 10 seconds for search).
Return structured data, not raw dumps. The agent receiving this context needs it to be digestible, not overwhelming.

Done when: Both tools can be called independently in a test script. fetchUrl("https://example.com") returns structured content. webSearch("small business marketing tools") returns ranked results.
5.3 Graph Integration — The Research Path
Research is NOT a separate agent. It is a capability the orchestrator controls. The orchestrator decides when the panel needs to see something from the outside world.

 [x] Add a researchNode to the graph in /lib/graph/nodes.ts.
 [x] Extend the orchestrator's routing decision schema with a new field:

json{
  "next_speaker": "agent_name" | "user",
  "reason": "...",
  "objective": "...",
  "deliberation_phase": "...",
  "suppress": [],
  "user_sophistication": "...",
  "research_needed": {
    "type": "fetch_url" | "web_search" | null,
    "target": "https://ad101.com" | "competitors to AI ad brief generators" | null,
    "reason": "User mentioned their website. The panel should see it before advising."
  }
}

 [x] When research_needed.type is not null, the graph routes to researchNode BEFORE the selected agent. The research result is appended to state as a system message with role: 'system' and metadata: { type: 'research', research_type: '...', source: '...' }.
 [x] The selected agent then receives the research context in their conversation history and can reference it naturally.
 [x] Update the orchestrator's system prompt to include research awareness:


"You have access to two research capabilities: fetching a specific URL to see its content, and searching the web for current information. Use research_needed when: (1) the user mentions a website or URL — always look at it before advising, (2) the user asks about competitors, market conditions, or trends that need current data, (3) an agent would give materially better advice with real-world context. Do NOT research on every message — only when seeing real data would change the quality of advice."


 [x] Update DeliberationState to include research_needed and research_context fields.

Done when: The graph routes through researchNode when the orchestrator requests it. Research context is available to all subsequent agents in the same round.
5.4 Edge Routing Update

 [x] Update /lib/graph/compile.ts: supervisorNode → researchNode → workerNode
 [x] Research does NOT increment the turn count. It is a sub-step, not a turn.
 [x] If research fails, log and proceed. Research failure never blocks the conversation.

Done when: Full path works: User mentions URL → Supervisor decides research needed → researchNode fetches → Agent responds with that context.
5.5 Streaming Events for Research

 [x] Add new stream event types:

typescript{ type: "research_start", target: "https://ad101.com", research_type: "fetch_url" }
{ type: "research_complete", target: "https://ad101.com", summary: "Ad101 is a free tool..." }
{ type: "research_failed", target: "https://ad101.com", error: "Page could not be loaded" }

 [x] Update /lib/hooks/useDeliberation.ts to handle these events.

5.6 UI Treatment for Research
Research events render as subtle system annotations in the message feed, not full messages. Per DESIGN.md: no loading spinners, no "AI is searching..." with bouncing dots.

 [x] Research annotation format in the feed:


📄 Panel reviewed ad101.com


🔍 Panel searched for "AI ad brief competitors"


 [x] Expandable on click to show a brief summary of what was found.
 [x] No agent illuminates during research. Feed shows subtle italic annotation ("Panel is reviewing...").

Done when: User sees a quiet indicator that research happened. The agent's response clearly reflects the research without the user re-explaining.
5.7 Research Persistence

 [x] Research results stored in messages with role: 'system', agent_name: null.
 [x] metadata JSONB: { type: 'research', research_type, target, success, fetched_at, accumulated_research } (merge-friendly snapshot; see **R2** in evolution table below).
 [x] On thread reload, research annotations load with the conversation (rendered by ResearchAnnotation component).
 [x] Duplicate fetch guard in researchNode — same target never fetched twice per thread.

Done when: Research persists across sessions. Returning to a thread that included research does not trigger redundant fetches.
5.8 Rate Limiting and Cost Controls

 [x] URL fetch: max 3 per thread. Web search: max 2 per thread. Total: max 10 per thread.
 [x] Duplicate target guard in researchNode (checks accumulated research_context).
 [x] Warning logged at 80% of total budget.
 [x] All limits enforced in researchNode — graceful skip when hit, conversation continues.

Done when: Rate limits enforced. Usage logged. System degrades gracefully when limits hit — agents advise without research, not with errors.
Phase 5 Complete When:
A user says "I built a website called ad101.com, can you look at it?" and the panel actually looks at it. The Marketer references real content from the site. The Business Realist points out what's missing. The Designer comments on the layout. The deliberation is grounded in reality, not just the user's description.

---

### Phase 5 evolution — advanced research architecture (phased)

The **R1–R7** table below is the canonical map for this codebase (providers, accumulation, triggers, async, epistemics, events, synthesis). Concepts like batching, deduplicated targets, merge-friendly memory, and “user truth beats search truth” are expressed there and in [CLAUDE.md](CLAUDE.md) — not in a separate strategy file.

**QA:** Research follow-through in transcripts is checked by [lib/test/grade-deliberation.ts](lib/test/grade-deliberation.ts); workflow and bundles are in [docs/testing.md](docs/testing.md).

**Constraint:** No hardcoded agent names in research logic. Orchestrator + `agent_configs` prompts drive behavior.

| Phase | Status | Intent | Primary code / docs |
|-------|--------|--------|----------------------|
| **R1 — Providers** | [x] | **Serper** (web search) and **Jina** (URL reader). Routing contract unchanged: `fetch_url` / `web_search`. Env: `SERPER_API_KEY`, `JINA_API_KEY`. `TAVILY_API_KEY` / `@tavily/core` / `cheerio` removed. | [lib/tools/web-research.ts](lib/tools/web-research.ts), [package.json](package.json), env |
| **R2 — Accumulation model** | [x] | Durable merge-friendly **`accumulated_research`** (observations, provenance, `queries_used`, `primary_url`, flags). Persisted on each system research row in `messages.metadata.accumulated_research`; reloaded into graph `initialState` for the thread. | [lib/graph/state.ts](lib/graph/state.ts), [lib/agents/schema.ts](lib/agents/schema.ts), [app/api/chat/route.ts](app/api/chat/route.ts) |
| **R3 — Triggers and batches** | [ ] | Batch types (entity disambiguation, primary deep-dive, market context, failure analysis, budget feasibility) aligned to **conversation milestones** (CLAUDE three acts), not a timer. May stay one batch per supervisor turn until R4. | [scripts/seed-agents.ts](scripts/seed-agents.ts) orchestrator prompt; optional extended routing JSON |
| **R4 — Async / non-blocking** | [ ] | Background research while the user is idle — **not** a small patch: requires job queue or worker, durable partial results, reconciliation with the next POST. Explicit done-when: user can send the next message without waiting for prior research. | New API / storage surface |
| **R5 — Epistemics** | [x] | **User truth beats search truth.** Orchestrator prompt + injected worker copy when research context is present; [CLAUDE.md](CLAUDE.md) golden rule. Re-seed orchestrator to apply DB prompt: `npm run seed`. | [scripts/seed-agents.ts](scripts/seed-agents.ts), [lib/graph/nodes.ts](lib/graph/nodes.ts), [CLAUDE.md](CLAUDE.md) |
| **R6 — Events** | [ ] | Extend SSE toward batch-level events (`research_started` with batch id, `tool_call`, batch complete). Stay within [DESIGN.md](DESIGN.md): no bouncing dots. | [lib/types/stream.ts](lib/types/stream.ts), [useDeliberation.ts](lib/hooks/useDeliberation.ts), route |
| **R7 — Synthesis hooks** | [ ] | Optional tool-free “strategic brief” before heavy outputs (recommendation), mapping assumption-check / implications from the strategy doc — only if latency and product fit allow. | [lib/graph/nodes.ts](lib/graph/nodes.ts) or post-round pipeline |

**Sync vs async:** Today’s implementation is **sync-in-POST** (research blocks that HTTP request until complete). **R4** is explicitly the phase that introduces true async research; do not conflate Jina’s reader implementation (which may poll internally) with “non-blocking for the user.”

**MANUAL:** Create Serper and Jina accounts; add API keys to `.env.local`. Monitor quotas vs old Tavily limits.

---

## PHASE 6 — Polish, Edge Cases, and Production Hardening
Status: NOT STARTED
6.1 Error Handling

 Graceful handling of LLM API failures mid-stream. The UI should show "Agent encountered an issue" rather than crashing.
 Rate limiting on the API route.
 Token budget management — prevent runaway conversations from exceeding context limits.

### 6.2 Conversation Quality and Testing

**Canonical methodology:** This section (quality ladder + tiers below) and [docs/testing.md](docs/testing.md). **Product bar for output:** [CLAUDE.md](CLAUDE.md) — reference quality, anti-generic guardrails, research as provisional (golden rule #5). **Quick onboarding:** [README.md](README.md) (scripts and local flows) and [docs/testing.md](docs/testing.md) (personas, fixtures, capture/grade commands; the repo’s **`test/`** tree is gitignored — keep fixtures locally).

**MANUAL:** Exploratory advisor runs use real LLM and search APIs — **cap** session length (protocols below); monitor cost.

#### Quality ladder (same strategy, different wiring)

You do **not** need a live `/api/chat` thread or a Zansei-style in-process session harness to **start** executing the testing strategy. Quality checks begin at a layer you choose; higher rungs add realism and cost.

| Rung | What it proves | Needs live chat? | Needs DB? | Commands / artifacts |
|------|----------------|------------------|-----------|----------------------|
| **A — Fixture + persona + grader** | Exported `messages` shape matches [lib/test/grade-deliberation.ts](lib/test/grade-deliberation.ts); persona hints line up; tripwires fire | No | No | `npm run test:fixtures` ([test/fixtures/registry.json](test/fixtures/registry.json)); `npm run grade:file` on a single file |
| **B — Grader unit tests** | Grader rules stable under refactors | No | No | `npm run test:grade` |
| **C — Graph + schema + DB agents** | LangGraph compiles, routing schema, seeded agents, no forbidden patterns in [lib/graph/nodes.ts](lib/graph/nodes.ts) | No | **Yes** (seeded Supabase) | `npm run test:graph` |
| **D — Real thread bundle** | Export path, manifest, grader on **production-like** transcripts | Yes (once) | Yes | `npm run capture:bundle` |
| **E (future) — Multi-turn runner** | Reproducible routing/dialogue; optional `token_usage` / `timing` | Simulated | Optional | See [docs/full-result.example.json](docs/full-result.example.json) |

GetIdea is a **different codebase** from other conversation products that use in-process session objects; both are conversation apps. This repo is intentionally **stronger on A–D than E** — that is **by design**, not an absence of strategy.

**Combined local gate (recommended before merge when you have `.env.local` + seeded DB):**

```bash
npm run test:quality
```

Runs **`test:graph` + `test:grade` + `test:fixtures`** — graph guardrails plus transcript tripwires on **frozen** JSON. No LLM calls.

**CI split (practical):** `test:graph` requires **network + seeded Supabase** — run on PRs that touch graph/agents, or nightly. **`test:grade` + `test:fixtures`** need **no** DB or API keys — safe for default PR CI.

#### Testing tiers (how often / why)

| Tier | What runs | When |
|------|-----------|------|
| **1 — Guardrails** | `npm run test:quality` (or individually: `test:graph`, `test:grade`, `test:fixtures`), plus `npx tsc --noEmit`, `npm run lint` | Every substantive change; no LLM. |
| **2 — Qualitative / exploratory** | Human drives `/chat` with a **fixed stopping protocol** + human rubric; personas in local `test/personas/` (JSON playbooks, not in git); [`npm run capture:bundle`](docs/testing.md) on a real `thread_id` | After prompt/graph changes, before release. |
| **3 — Full persona E2E (future)** | Scripted multi-turn driver + optional token/timing in bundle | Nightly or manual; **CI opt-in** when LLM spend applies. |

**Ladder vs tier:** **Rungs A–B** are **always** cheap transcript/grader checks. **Rung C** is graph/DB (overlaps Tier 1). **Rung D** is Tier 2 sampling. **Rung E** is Tier 3.

#### Review session stopping protocols (testing only)

These define when **you** stop sampling so the panel is not chased for infinite turns. They are **not** the same as **`MAX_AGENT_TURNS`** in [lib/graph/compile.ts](lib/graph/compile.ts) — that value is a **per-round product ceiling** between user messages; review stops are **harness choices**.

| Protocol | Stop when | What you usually see |
|----------|-----------|----------------------|
| **A — One panel beat** | First **`yield_to_user`** after **at least one** agent message in that round | User → optional research → agent(s) → orchestrator direct line to user |
| **B — Bounded depth** | **3 user messages** in the thread, **or** **2** full stream **`done`** cycles (whichever is stricter) | Enough back-and-forth to see calibration and routing shift |
| **C — Closure sample** | First structured **panel recommendation** (recommendation phase / `panel_recommendation`) | Heavier; end-state artifact; use sparingly |

Observable SSE events to align with: [lib/types/stream.ts](lib/types/stream.ts), [app/api/chat/route.ts](app/api/chat/route.ts) — `routing`, `agent_end`, `yield_to_user`, `done`, recommendation flow.

#### Human rubric (~5–10 minutes per sample)

Use after a Tier 2 run (any protocol):

- **Orchestrator:** Routing reason is legible and defensible; sophistication directionally matches the user’s language.
- **Anti-generic:** At least one advisor turn ties advice to **this** user’s stated constraint, not only generic industry tips.
- **Calibration:** Novice vs advanced tone matches the thread (no jargon dump; no condescension).
- **Research (if any):** Later turns do not treat web results as overriding the user; limitations named when relevant.
- **Friction:** The room is not endlessly agreeable — dissent or a hard question appears when the product philosophy calls for it.
- **Stopping:** You ended the sample **on purpose** via protocol A/B/C — not because the system had nothing left to say.

**Scenarios to reuse:** Bakery adding delivery, freelancer raising prices, food truck location, SaaS validation — tune prompts from real output; iterative and ongoing.

#### Future automated tripwires (optional)

Not required for Tier 2: banned boilerplate phrases, minimum user-specific references, “if research ran, later text cites a concrete detail,” etc. — keep checks **cheap and low-noise** (see [lib/test/grade-deliberation.ts](lib/test/grade-deliberation.ts) and [docs/testing.md](docs/testing.md)).

6.3 Performance

 Supervisor routing decisions should complete in under 2 seconds.
 Agent responses should begin streaming within 3 seconds of routing.
 The UI must remain responsive during generation.

6.4 Deployment

 Staging environment with seed data.
 Production deploy checklist: environment variables, RLS verification, CORS, rate limits.
 LangSmith integration for debugging orchestrator decisions in production.


Principles That Apply to Every Phase
These are not suggestions. They are constraints.

No hardcoded agents. If you write if (agentName === "finance") anywhere in application logic, you have made a mistake. All behavior is driven by database configs.

The Orchestrator's reasoning is product surface. Treat routing decisions as content, not logs. They tell the user why the system is structured the way it is.

Silence is a valid output. The system must be able to decide that no agent should speak. Build the yield-to-user path first, not last.

Interrupts are not edge cases. They are the primary mechanism by which users participate as peers. Test them as heavily as the happy path.

Meet the user where they are. The system must work for someone who has never heard the word "margin" and someone who wants to discuss unit economics. Both deserve the same quality of thinking.


Read CLAUDE.md before starting any phase. If a technical decision conflicts with the product philosophy, the philosophy wins.