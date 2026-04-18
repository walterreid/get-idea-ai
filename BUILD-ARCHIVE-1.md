# BUILD-ARCHIVE-1.md — GetIdea.ai

Historical build record for phases shipped up to and including Phase 7.7 (2026-04-18, commit `a38d2ba`).

This file preserves the **full original descriptions** — goals, task breakdowns, subphase evidence, design notes, judgment calls — for every phase marked complete or SHIPPED at the time of the archive split. The living plan in [BUILD.md](BUILD.md) points here for anyone who needs to understand *why* a thing was designed a given way.

**Why an archive:** `BUILD.md` had grown dense enough that the open items were hard to find. The split keeps the living plan scannable while losing nothing historical.

Format (same as BUILD.md): `[ ]` not started · `[x]` complete · `[~]` in progress · `[!]` blocked

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
- [x] **Yield to user (`yield_to_user`):** When the supervisor routes to `next_speaker: "user"`, the orchestrator's `reason` is the panel's direct reply to the owner (centered italic bubble in the feed). That text is **persisted** as `role: 'orchestrator'` with non-empty `content` and `metadata.message_type: 'yield_to_user'` (plus `deliberation_phase`) so **thread reload** matches the live session. Empty-content `orchestrator` rows remain routing-only annotations tied to the following agent message. Graph reload (`dbRowsToLangChain` in `app/api/chat/route.ts`) includes yield rows as `AIMessage`s so the next round's context matches what the user saw.
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
- [x] When no agent speaks and the supervisor yields, the orchestrator's `reason` renders as a **direct orchestrator message** (distinct from routing-only rows); it is persisted and reloaded with the thread (see 3.1).
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

## PHASE 5 — Web Research and URL Intelligence (baseline)

**Goal:** The panel can see the outside world. When a user mentions a URL or asks a question that needs current information, the system fetches, reads, and feeds that context into the deliberation — so agents advise based on what actually exists, not just what the user describes.

**Read first:** CLAUDE.md ("Meet the user where they are" — this extends to meeting their business where it is. If they have a website, the panel should be able to look at it.)

**Phase 5 baseline (shipped):** Synchronous research inside a single POST to `/api/chat`: orchestrator emits `research_needed` → `researchNode` → URL fetch + web search tools → worker. Streaming annotations in the feed; results persisted as `system` messages. Rate caps per thread. **Current providers (R1):** **Jina Reader** (URL → markdown) and **Serper** (web search). Research does **not** run in the background between user keystrokes yet—that is scoped under **R4**.

**Status:** COMPLETE (baseline). Evolution R1, R2, R4, R5 shipped; R3 in progress, R6/R7 not started — see the living [BUILD.md](BUILD.md) for those rows.

### 5.1 Dependencies and API Keys

- [x] Search/read tooling: Serper (`SERPER_API_KEY`) + Jina Reader (`JINA_API_KEY`) — see `.env.example` and evolution row **R1**.
- [x] Legacy note: Tavily + cheerio were superseded; keys/packages removed in favor of Serper + Jina.

**Done when:** Packages are installed. API keys are configured locally. Imports do not throw.

### 5.2 Research Tools

- [x] Create `/lib/tools/web-research.ts`

Two tools, both wrapped as LangChain-compatible tool definitions:

- `fetchUrl` — Takes a URL string. Reads via Jina Reader into clean text/markdown. Returns structured summary (truncated). If the read fails (404, timeout), return a clear error message, not an exception.
- `webSearch` — Takes a query string. Calls Serper's Google search API. Returns top organic results as structured objects (title, URL, snippet), plus optional answer/overview when present.

Both tools must:

- Have clear Zod input schemas so LangChain can describe them to the LLM.
- Include sensible timeouts (5 seconds for fetch, 10 seconds for search).
- Return structured data, not raw dumps. The agent receiving this context needs it to be digestible, not overwhelming.

**Done when:** Both tools can be called independently in a test script. `fetchUrl("https://example.com")` returns structured content. `webSearch("small business marketing tools")` returns ranked results.

### 5.3 Graph Integration — The Research Path

Research is NOT a separate agent. It is a capability the orchestrator controls. The orchestrator decides when the panel needs to see something from the outside world.

- [x] Add a `researchNode` to the graph in `/lib/graph/nodes.ts`.
- [x] Extend the orchestrator's routing decision schema with a new field:

```json
{
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
```

- [x] When `research_needed.type` is not null, the graph routes to `researchNode` BEFORE the selected agent. The research result is appended to state as a system message with `role: 'system'` and `metadata: { type: 'research', research_type: '...', source: '...' }`.
- [x] The selected agent then receives the research context in their conversation history and can reference it naturally.
- [x] Update the orchestrator's system prompt to include research awareness:

> "You have access to two research capabilities: fetching a specific URL to see its content, and searching the web for current information. Use `research_needed` when: (1) the user mentions a website or URL — always look at it before advising, (2) the user asks about competitors, market conditions, or trends that need current data, (3) an agent would give materially better advice with real-world context. Do NOT research on every message — only when seeing real data would change the quality of advice."

- [x] Update `DeliberationState` to include `research_needed` and `research_context` fields.

**Done when:** The graph routes through `researchNode` when the orchestrator requests it. Research context is available to all subsequent agents in the same round.

### 5.4 Edge Routing Update

- [x] Update `/lib/graph/compile.ts`: `supervisorNode` → `researchNode` → `workerNode`
- [x] Research does NOT increment the turn count. It is a sub-step, not a turn.
- [x] If research fails, log and proceed. Research failure never blocks the conversation.

**Done when:** Full path works: User mentions URL → Supervisor decides research needed → `researchNode` fetches → Agent responds with that context.

### 5.5 Streaming Events for Research

- [x] Add new stream event types:

```typescript
{ type: "research_start", target: "https://ad101.com", research_type: "fetch_url" }
{ type: "research_complete", target: "https://ad101.com", summary: "Ad101 is a free tool..." }
{ type: "research_failed", target: "https://ad101.com", error: "Page could not be loaded" }
```

- [x] Update `/lib/hooks/useDeliberation.ts` to handle these events.

### 5.6 UI Treatment for Research

Research events render as subtle system annotations in the message feed, not full messages. Per DESIGN.md: no loading spinners, no "AI is searching..." with bouncing dots.

- [x] Research annotation format in the feed:

> 📄 Panel reviewed ad101.com
>
> 🔍 Panel searched for "AI ad brief competitors"

- [x] Expandable on click to show a brief summary of what was found.
- [x] No agent illuminates during research. Feed shows subtle italic annotation ("Panel is reviewing...").

**Done when:** User sees a quiet indicator that research happened. The agent's response clearly reflects the research without the user re-explaining.

### 5.7 Research Persistence

- [x] Research results stored in `messages` with `role: 'system'`, `agent_name: null`.
- [x] `metadata` JSONB: `{ type: 'research', research_type, target, success, fetched_at, accumulated_research }` (merge-friendly snapshot; see **R2** in the evolution table).
- [x] On thread reload, research annotations load with the conversation (rendered by `ResearchAnnotation` component).
- [x] Duplicate fetch guard in `researchNode` — same target never fetched twice per thread.

**Done when:** Research persists across sessions. Returning to a thread that included research does not trigger redundant fetches.

### 5.8 Rate Limiting and Cost Controls

- [x] URL fetch: max 3 per thread. Web search: max 2 per thread. Total: max 10 per thread.
- [x] Duplicate target guard in `researchNode` (checks accumulated `research_context`).
- [x] Warning logged at 80% of total budget.
- [x] All limits enforced in `researchNode` — graceful skip when hit, conversation continues.

**Done when:** Rate limits enforced. Usage logged. System degrades gracefully when limits hit — agents advise without research, not with errors.

### Phase 5 Complete When:

A user says "I built a website called ad101.com, can you look at it?" and the panel actually looks at it. The Marketer references real content from the site. The Business Realist points out what's missing. The Designer comments on the layout. The deliberation is grounded in reality, not just the user's description.

### Phase 5 evolution — shipped rows (R1, R2, R4, R5)

Full evolution table lives in [BUILD.md](BUILD.md). Rows below are the ones that shipped before the archive split.

- **R1 — Providers.** Serper (web search) and Jina (URL reader). Routing contract unchanged: `fetch_url` / `web_search`. Env: `SERPER_API_KEY`, `JINA_API_KEY`. `TAVILY_API_KEY` / `@tavily/core` / `cheerio` removed. Files: [lib/tools/web-research.ts](lib/tools/web-research.ts), [package.json](package.json), env.
- **R2 — Accumulation model.** Durable merge-friendly `accumulated_research` (observations, provenance, `queries_used`, `primary_url`, flags). Persisted on each system research row in `messages.metadata.accumulated_research`; reloaded into graph `initialState` for the thread. Files: [lib/graph/state.ts](lib/graph/state.ts), [lib/agents/schema.ts](lib/agents/schema.ts), [app/api/chat/route.ts](app/api/chat/route.ts).
- **R4 — Async / non-blocking.** Background research while the user is idle. Orchestrator marks requests with `async: true` in `research_needed`; the graph edge skips the inline `researchNode` and the chat route dispatches via [lib/research/scheduler.ts](lib/research/scheduler.ts) using Next.js `after()` (falls back to `unstable_after` / `void` promise). Results persist as `role: 'system'` research messages with the same metadata shape sync path produces; next POST's `dbRowsToLangChain` + `latestAccumulatedResearchFromRows` picks them up with no reload-path changes. Harness `--research-mode sync|async|off` flag makes the timing shift observable in the ledger. Files: [lib/research/scheduler.ts](lib/research/scheduler.ts), [lib/graph/compile.ts](lib/graph/compile.ts), [app/api/chat/route.ts](app/api/chat/route.ts), [lib/agents/schema.ts](lib/agents/schema.ts).
- **R5 — Epistemics.** *User truth beats search truth.* Orchestrator prompt + injected worker copy when research context is present; [CLAUDE.md](CLAUDE.md) golden rule #5. Re-seed orchestrator to apply DB prompt: `npm run seed`. Files: [scripts/seed-agents.ts](scripts/seed-agents.ts), [lib/graph/nodes.ts](lib/graph/nodes.ts), [CLAUDE.md](CLAUDE.md).

**Sync vs async:** Today's implementation is **sync-in-POST** (research blocks that HTTP request until complete). **R4** is explicitly the phase that introduces true async research; do not conflate Jina's reader implementation (which may poll internally) with "non-blocking for the user."

### R4 implementation plan (as shipped)

**Reference:** Zansei's `research_orchestrator.py` and `conversation.py` (local copies under `relevant-zansei-materials/`, gitignored — **do NOT import from or execute that code directly**; port the patterns to TypeScript). Walter's estimate: ~20-30 min of work if GetIdea's state-persistence model holds (it did — `accumulated_research` already had the reducer needed).

**Key patterns lifted from Zansei (conceptual, not textual):**

1. **ResearchOrchestrator class** with `in_flight` flag + lock. One batch at a time. MAX 4 batches, 4 rounds per batch, 12 total tool rounds. (In-flight lock **not yet** ported to GetIdea — acceptable at current volume; prerequisite for R3.)
2. **Trigger logic keyed to conversation milestones** (post-Q2, post-Q3, post-Q5, post-Q7+), not every turn. GetIdea equivalent: user-message count + orchestrator signal.
3. **Accumulation model** — each batch merges into a running `accumulated_research` object. Implemented in [lib/graph/state.ts](lib/graph/state.ts) and [lib/agents/schema.ts](lib/agents/schema.ts) (`mergeAccumulatedResearch`).
4. **Strategic brief synthesis** — the "comfortable conclusion vs stronger conclusion" reflection. Ported into `recommendationNode`'s system prompt.
5. **Graceful completion wait** — `wait_for_completion(timeout=15s)` before plan generation. GetIdea equivalent: if the orchestrator moves to recommendation and research is mid-flight, block briefly (2-5s) before invoking `recommendationNode`.

**Architectural decision: how async fires in Next.js**

Three candidates were considered, ordered by simplicity:

| Option | Durability | Cost to add | Best when |
|---|---|---|---|
| **A. Next.js `after()` / `unstable_after()`** | Dies on Node restart or Vercel timeout (~5 min on Pro) | Near zero — one import, one wrapper | Research typically returns in 2-15s; Vercel's `after()` budget is plenty |
| **B. pg-boss on Supabase** | Fully durable across deploys and restarts | Medium — one more dependency + schema changes | If we see research calls frequently lost or exceeding 5 min |
| **C. Upstash QStash** | Fully durable; serverless-native | Medium — new vendor, API keys | If we outgrow pg-boss or want zero ops |

**Decision: Option A.** Zansei's threads die on Python process restart too; same durability shape. If inadequate, promote to B in a follow-up.

**Concrete file-level plan (as executed):**

1. **`lib/research/scheduler.ts`** (~80 LOC). `scheduleResearch(threadId, req, ctx): void`. Uses `unstable_after()` from `next/server` inside the API route to defer execution past response close. Calls `fetchUrl` or `webSearch` (already in [lib/tools/web-research.ts](lib/tools/web-research.ts)). On completion, writes to the thread's `messages` table: `role: 'system'`, `metadata.type: 'research'`, `metadata.accumulated_research: <merged>`. Same shape the sync path produces today. Rate limits re-use the 3 fetch / 2 search / 10 total per-thread caps from `researchNode`.
2. **`app/api/chat/route.ts`** (modify, ~15 LOC). After the SSE stream closes, inspect `state.research_needed` from the final state. If set AND the orchestrator marked it as `"async": true`, call `scheduleAsyncResearch` instead of running it inline. Default behavior for existing prompts: still sync (backward compatible).
3. **`scripts/seed-agents.ts`** (orchestrator prompt update). Added to the existing "When to fire research" section: *"If the user has completed at least 2 turns AND the research is non-blocking for this specialist's response, set `async: true` in the `research_needed` object. The research will fire in the background and be available to specialists in the NEXT round."* Existing `research_needed` schema in `lib/agents/schema.ts` extended with optional `async: boolean` field (defaults false to preserve sync behavior).
4. **Thread reload path** ([app/api/chat/route.ts](app/api/chat/route.ts)'s `dbRowsToLangChain`) — already loads `accumulated_research` from the thread's system messages. No change needed — research that lands async is picked up on the next POST automatically.
5. **Harness integration** ([scripts/run-persona-session.ts](scripts/run-persona-session.ts)). Added `--research-mode sync|async|off` flag. Default sync (current behavior). In async mode: between rounds, wait for background research to complete before sending next user turn. Test affordance to make async behavior observable in the ledger.

**Done when (as defined for R4):**

- A 6-round Walter harness run with `--research-mode async` shows: research kicked off in R2, NOT yet visible to R2's specialist, ledger records a `research_async_scheduled` event, R3's specialist has `accumulated_research` populated with the R2 research result.
- Production `/chat` path: a user sends "I run walterreid.com" in R2, receives the R2 specialist response WITHOUT waiting for the URL fetch, sends R3 a moment later, and R3's specialist response references what was fetched.
- Zero regression on existing sync research path (R4 is additive, not replacement).

**Not in scope for R4 (and still not in scope):**

- Real-time push of research completion to the UI (would need WebSocket or polling; deferred).
- Partial research results (if the orchestrator wants a multi-batch deep-dive, each batch fires as its own async job).
- Cross-thread research sharing (each thread's research stays thread-scoped).

**Judgment-call flag carried forward from R4 ship (2026-04-18):** validation of the async path end-to-end in a real persona transcript was not achieved — the orchestrator was conservative on both personas tested and didn't emit `async: true`. The scheduler was proven correct by direct smoke test against Serper. A future cycle should add either (a) a persona that reliably triggers research (volunteers URL + asks research-gated question) or (b) an orchestrator-prompt bias flip to make async the default for enrichment fetches.

---

## PHASE 6.2 — Conversation Quality and Testing

This section is the canonical methodology for the testing ladder, tiers, review protocols, and human rubric. Links and repo paths match the state at the time of the archive split (2026-04-18).

**Canonical methodology:** This section (quality ladder + tiers below) and [docs/testing.md](docs/testing.md). **Product bar for output:** [CLAUDE.md](CLAUDE.md) — reference quality, anti-generic guardrails, research as provisional (golden rule #5). **Quick onboarding:** [README.md](README.md) (scripts and local flows) and [docs/testing.md](docs/testing.md) (personas, fixtures, capture/grade commands; the repo's `test/` tree **has local-only pieces** — see `.gitignore`).

**MANUAL:** Exploratory advisor runs use real LLM and search APIs — **cap** session length (protocols below); monitor cost.

### Quality ladder (same strategy, different wiring)

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

### Testing tiers (how often / why)

| Tier | What runs | When |
|------|-----------|------|
| **1 — Guardrails** | `npm run test:quality` (or individually: `test:graph`, `test:grade`, `test:fixtures`), plus `npx tsc --noEmit`, `npm run lint` | Every substantive change; no LLM. |
| **2 — Qualitative / exploratory** | Human drives `/chat` with a **fixed stopping protocol** + human rubric; personas in local `test/personas/` (JSON playbooks); [`npm run capture:bundle`](docs/testing.md) on a real `thread_id` | After prompt/graph changes, before release. |
| **3 — Full persona E2E (future)** | Scripted multi-turn driver + optional token/timing in bundle | Nightly or manual; **CI opt-in** when LLM spend applies. |

**Ladder vs tier:** **Rungs A–B** are **always** cheap transcript/grader checks. **Rung C** is graph/DB (overlaps Tier 1). **Rung D** is Tier 2 sampling. **Rung E** is Tier 3.

### Review session stopping protocols (testing only)

These define when **you** stop sampling so the panel is not chased for infinite turns. They are **not** the same as **`MAX_AGENT_TURNS`** in [lib/graph/compile.ts](lib/graph/compile.ts) — that value is a **per-round product ceiling** between user messages; review stops are **harness choices**.

| Protocol | Stop when | What you usually see |
|----------|-----------|----------------------|
| **A — One panel beat** | First **`yield_to_user`** after **at least one** agent message in that round | User → optional research → agent(s) → orchestrator direct line to user |
| **B — Bounded depth** | **3 user messages** in the thread, **or** **2** full stream **`done`** cycles (whichever is stricter) | Enough back-and-forth to see calibration and routing shift |
| **C — Closure sample** | First structured **panel recommendation** (recommendation phase / `panel_recommendation`) | Heavier; end-state artifact; use sparingly |

Observable SSE events to align with: [lib/types/stream.ts](lib/types/stream.ts), [app/api/chat/route.ts](app/api/chat/route.ts) — `routing`, `agent_end`, `yield_to_user`, `done`, recommendation flow.

### Human rubric (~5–10 minutes per sample)

Use after a Tier 2 run (any protocol):

- **Orchestrator:** Routing reason is legible and defensible; sophistication directionally matches the user's language.
- **Anti-generic:** At least one advisor turn ties advice to **this** user's stated constraint, not only generic industry tips.
- **Calibration:** Novice vs advanced tone matches the thread (no jargon dump; no condescension).
- **Research (if any):** Later turns do not treat web results as overriding the user; limitations named when relevant.
- **Friction:** The room is not endlessly agreeable — dissent or a hard question appears when the product philosophy calls for it.
- **Stopping:** You ended the sample **on purpose** via protocol A/B/C — not because the system had nothing left to say.

**Scenarios to reuse:** Bakery adding delivery, freelancer raising prices, food truck location, SaaS validation — tune prompts from real output; iterative and ongoing. For nuanced coverage also rotate: **vague vent** (no URL, no numbers), **zero budget** (solo, $0/mo), **sophisticated but wrong diagnosis** (fluent jargon, misidentified problem), **legal-adjacent** (regulated trade not named), **URL trap** (shares a URL, later disowns it).

### Multi-round persona protocol (Tier 2, nuanced)

Happy-path scenarios test the best lane. Use a **nuanced persona** (from the list above) at least once per release to stress calibration, friction, and research epistemics. **Default presumption: the panel is failing until it proves otherwise.** Advisor prose that "feels acceptable" is the most common failure mode — polished tone without specific judgment is genericness wearing a tie. Grade against the golden rules, not vibes.

**Persona probe map:**

- **Vague vent** → Act 1 discipline and GR#4 (anti-generic).
- **Zero budget** → listening to Act 3 constraints; an advisor who recommends spend has failed to listen.
- **Sophisticated but wrong diagnosis** → calibration without flattery; does anyone correct the diagnosis, or does the room validate fluent jargon?
- **Legal-adjacent** → whether Legal Awareness is summoned by situation, not keyword.
- **URL trap** → GR#5. After the user disowns research in a later round, does the panel defer?

**Pacing (sync-in-POST research):** research runs inside the chat POST. Before sending the next round, wait for the SSE `done` event, a fully rendered final bubble, and (if expected) the orchestrator `yield_to_user` bubble. Research annotations add 5–20s latency. Respect Phase 5.8 caps (3 URL / 2 search / 10 total per thread). Log per round: send → first_token, send → done, research calls, yield_to_user fired.

**Round structure (4 minimum):** R1 intake (vague opener, no extras) · R2 depth (answer one question + URL or named constraint) · R3 **friction stress** (plausibly-wrong assertion the panel should push back on) · R4 **user-truth / constraint reveal** (contradict research or invalidate prior advice) · R5 optional closure (request recommendation; check `## Strengths` / `## Risks` / `## Questions` / `## Next Steps` sections tie to *this* persona).

**Hard-fail checks (one strike = document, two strikes across rounds = early stop):**

- Advice could be pasted into any other thread unchanged → GR#1, GR#4.
- Uncontextualized smoke-signal phrases ("clarify positioning", "content strategy", "thought leadership", "optimize social", "build a strong brand") → GR#4.
- Research cited as ground truth after the user contradicts it in R4 → GR#5.
- Tool voice ("I'll generate", "your deliverable", "the report will show") → GR#2.
- All agents agree with the R3 wrong claim; no dissent summoned → CLAUDE.md "Friction".
- Hallucinated specifics about the business not traceable to research or user turns → reference-quality failure.

**Calibration reviewer discipline:** a turn that sounds like something a decent consultant *could* say is not a pass. The bar is **specific enough to forward to a friend**. If you catch yourself scoring Pass because the advisor sounded professional, re-read the turn and ask: what did it commit to that a generic template wouldn't? If the answer is nothing, it is a Fail.

**Stopping:** end at R4 (or R5). Early-stop on two repeated hard-fail checks — exit and document. Do not chase the panel for more turns.

**Artifacts per session** (local `test/results/<date>_<persona>/`, gitignored): exact opener, `npm run capture:bundle` output, pacing table, hard-fail scorecard with one-line evidence (quote ≤15 words), one-sentence verdict from {*reference quality*, *correct but generic*, *failed calibration*, *hallucinated*, *tool voice*, *no friction*, *ignored user truth*}. Triangulate by running `npm run grade:file` on the exported messages and comparing human verdict vs tripwire `overall_pass` — disagreement is the signal worth acting on.

### Future automated tripwires (optional)

Not required for Tier 2: banned boilerplate phrases, minimum user-specific references, "if research ran, later text cites a concrete detail," etc. — keep checks **cheap and low-noise** (see [lib/test/grade-deliberation.ts](lib/test/grade-deliberation.ts) and [docs/testing.md](docs/testing.md)).

---

## PHASE 7.1 — Specialist voice rewrite (Marketer shipped)

Lift the voice-discipline structure from the ad101/Zansei `conversation_system.md` prompt. Apply per specialist in [scripts/seed-agents.ts](scripts/seed-agents.ts):

- Identity opener: *"You are the [role] on a small business advisory panel. You have [years] of watching [specific failure modes this specialist has seen]."* Not a job description — a history.
- Explicit tool-voice ban list: `generate`, `output`, `results`, `deliverable`. Specialists talk **to** the owner, not **about** deliverables.
- Anti-sycophancy: no "Great question," no "That's really helpful."
- Anti-jargon: no acronyms or frameworks unless the conversation has earned them.
- Sentence cap: 2–3 sentences default. Earn any fourth.
- **Versioning:** block comment above each specialist tracking prompt versions + the evidence that drove each revision (*"v2 (YYYY-MM-DD): Tightened specificity. Driven by ai_consultant persona — advisor produced 'thought-leadership engine' on R2."*).

- [x] **Marketer v2/v3 shipped** (2026-04-17 / 2026-04-18). Marketer prompt rewritten with lived-in stance, voice discipline section, banned-phrase inline list, and "use the case, don't cite it" rule (v3). Changelog block added above the Marketer object in [scripts/seed-agents.ts](scripts/seed-agents.ts).

**What 7.1 actually proved (different from original hypothesis):**

- Voice-rewrite alone does NOT reliably move specificity — the Marketer v2 was within length variance of v1 on Walter (the Marketer's sessions ran long regardless of prompt).
- The load-bearing change is **cases** (7.3), not voice discipline.
- However, v3's voice cleanup is still the right substrate to attach cases to — the identity opener + voice bans + "use the case" rule form a cohesive per-turn contract the specialist can satisfy.
- Orchestrator serialization fix (name-emission) was necessary during 7.1. The Orchestrator was emitting `"business_realist"` (snake-cased display name) when the seeded name is `"realist"`. Fixed with explicit enumeration guidance in the orchestrator prompt. Zero unknown-agent yields across 12 post-fix runs.

**Done when (original):** primary persona shows advisor turns averaging ≤3 sentences with zero banned phrases.

**Actual Marketer v3 state (2026-04-18):** 0 banned phrases consistently across all 12 batch runs. Turn length averages 139–343 words (far above 3 sentences). Length problem was real and systemic — addressed by Phase 7.4 (token-budgets.ts), not by further Marketer-prompt work. Post-7.4 spot-checks showed 21–46% reduction.

---

## PHASE 7.3 — Hand-curated case library + vertical knowledge files (Marketer layer)

**Status at ship:** SHIPPED (2026-04-18). Architecture pivoted from original single-layer spec based on review of the Zansei production stack (local reference copy at `relevant-zansei-materials/`). Now runs two layers:

**Layer A — Per-specialist cases** (`lib/agents/cases/*.json`):

- Per-specialist JSON, 10–20 short cases each, indexed by `business_type_category`.
- Case shape: `{ id, business_type_category, challenge_pattern, observation, what_worked, what_wasted_money, one_line_lesson }`.
- Retrieved by [lib/agents/case-loader.ts](lib/agents/case-loader.ts) — returns 2–3 best matches by business-type category (fills with cross-category if fewer than top-N match).
- Injected by `workerNode` into the specialist's user-prompt block (after research, before conversation history).
- Rule: **"Use the case, don't cite it."** Added to Marketer v3 prompt explicitly. The insight lands; the source stays invisible.
- **Currently shipped:** Marketer only (13 cases, [lib/agents/cases/marketer.json](lib/agents/cases/marketer.json)). Other 9 specialists were pending Phase 7.4 resolution — **unblocked 2026-04-18** and are the next coherent work block.

**Layer B — Vertical playbooks + channel guides** (`lib/knowledge/`):

- 5 playbooks: local_services, professional_services, restaurant_food, fitness_wellness, ecommerce_dtc.
- 8 channel guides: google_business_profile, google_local_services_ads, google_search_ads, meta_ads, email_sms, linkedin, referral_programs, seo_fundamentals.
- Ported from Zansei's production knowledge base (2026-04-18). Light GetIdea-ification, no attribution (both are the same owner's projects).
- Retrieved by [lib/knowledge/loader.ts](lib/knowledge/loader.ts) — returns 1 playbook + 3 channel guides matched to inferred business type.
- Injected ONLY at `recommendationNode` — not at every specialist turn (key architectural decision: matches Zansei's "background expertise, used at synthesis, not at conversation" pattern). Prevents token bloat and specialist voice drift.

**Recommendation node enrichment (integrated 7.2 patterns):**

- **Divergence rule** — recommendation must name the bridge when expert knowledge leads past what the conversation surfaced.
- **Budget signal hierarchy** — STATED > CURRENT > HISTORICAL > INFERRED. HISTORICAL regretted spend is pain evidence, NOT willingness to spend again.
- **Assumption check** — before writing the recommendation, private Q&A: what's the comfortable conclusion? what's the stronger one? what assumption makes the comfortable version feel safe? Recommendation addresses the stronger conclusion.
- **Evidence rule** — every recommendation traces to something the owner said OR something from research. Playbook and channel knowledge enrich, not originate.

**Falsifiability result (Marketer-only, 3 personas, 2026-04-18):**

- Case lands when business-type match is tight: ✓ Ella (`boutique_retail_social_to_shopify_gap`), ✓ Steve (`plumber_angi_price_shopper_trap`).
- Case is less visible when match is loose: Walter (`professional_services` generally, no exact AI-consultant case — added `undefined_category_before_distribution` as category-level case to improve fit).
- **Recommendation node had not yet fired in any test session at 7.3 ship** — orchestrator was reluctant to transition to recommendation phase even with explicit prompt guidance. Resolved in Phase 7.6 via `force_recommendation` flag.

- [x] Create `lib/agents/cases/` layout + JSON schema.
- [x] Seed Marketer case library (13 cases). Other 9 specialists deferred (unblocked in 7.4).
- [x] Create `lib/knowledge/playbooks/` and `lib/knowledge/channels/`.
- [x] Build `lib/knowledge/loader.ts` and `lib/agents/case-loader.ts`.
- [x] Extend worker path to retrieve cases by `business_type_category` and inject.
- [x] Extend recommendation node to inject playbooks + channels + divergence/budget/assumption-check/evidence rules.
- [x] Add "use the case, don't cite it" rule to Marketer v3 prompt.

**Done when (original):** primary persona run produces at least one specialist turn whose specificity clearly comes from a case without naming the source.

**Actual state (2026-04-18):** ✓ for Ella, ✓ for Steve, ○ for Walter (case-match too loose; added category-level case but Walter's archetype still gets specialist turns that reason from principles rather than a specific case pattern). 2/3 pass is a "qualified pass," not a clean one — replication to other 9 specialists held pending 7.4.

---

## PHASE 7.4 — Length compression as consequence

**Status at ship:** SHIPPED (2026-04-18). Elevated from post-7.3 subphase to immediate-next based on batch evidence: 11/12 personas exceeded the 150-word per-turn ceiling, avg turn 139w–343w, max observed 622w (civic_helpers). Voice-discipline rules in the Marketer v3 prompt ("two to three sentences default") did not constrain length at temperature 0.7.

With cases carrying specificity, prose can shrink structurally. Brevity stopped being an aspiration and became a budget.

**What shipped (commit 8955276):** per-specialist token budgets live in [lib/agents/token-budgets.ts](lib/agents/token-budgets.ts) as a static config lookup (not an `agent_configs` column — documented as future migration path to avoid a DB migration for this phase). `workerNode` reads `getMaxTokensFor(agentConfig.name)` and passes it to `buildLLMClient`. The "no hardcoded agent names in logic" rule still holds — this is config lookup by name, same pattern as `lib/agents/cases/*.json`.

**Per-specialist caps (final):**

- Marketer, Copywriter, Designer, CX: **200 tokens** (~150 words)
- Creative: **220 tokens**
- Accountant, Operations, Legal: **280 tokens**
- Finance: **320 tokens**
- Realist: **350 tokens**
- Default (unknown agent): **260 tokens**

- [x] Add `max_tokens` via `lib/agents/token-budgets.ts` config module (deferred DB column to a later migration).
- [x] `buildLLMClient` honors optional `maxTokens` parameter.
- [x] `workerNode` passes per-specialist `max_tokens` at invocation.
- [x] Orchestrator's model left untouched — its default budget is appropriate for routing JSON.
- [x] Re-seed (no DB change — budgets live in code), run spot-check validation, confirmed length drop.

**Spot-check results (from commit 8955276 body, 2026-04-18):** 21–46% reduction in advisor-turn word counts across spot-checked personas. No truncated-mid-sentence failures observed.

**Done when (original):** advisor turn word counts visibly drop in the ledger across at least 3 post-7.4 persona runs; no new failure modes. Average advisor turn drops below 150 words on terse personas; below 220 on verbose personas. **Met on spot-checks.** Full batch re-validation folds into the Phase 7.1/7.3 specialist replication cycle since those changes will also affect advisor-turn shape.

---

## PHASE 7.5 — Test harness upgrades

**Status at ship:** SHIPPED 2026-04-17 (pulled forward ahead of 7.1–7.4). The harness was built first because specialist changes weren't measurable without it.

- [x] **Typing delay** between user rounds in the multi-round protocol: answer-length-aware linear interpolation, default 2–6s. Implemented in [lib/test/pacing.ts](lib/test/pacing.ts).
- [x] **Response length bands by personality** in persona files: `terse` 10–30w, `adversarial` 15–40w, `skeptical` 25–60w, `scattered` 40–80w, `verbose` 40–80w, `enthusiastic` 30–60w. Hard ceiling 80 words. Extended all 18 personas with this field.
- [x] **Role-player as a separate Claude instance** with no shared context. Implemented in [lib/test/role-player.ts](lib/test/role-player.ts) — uses its own Anthropic client, receives only persona JSON + panel's last turns + round objective.
- [x] **Multi-round harness** at [scripts/run-persona-session.ts](scripts/run-persona-session.ts). Runs R1 intake → R2 depth → R3 friction (scripted `r3_wrong_claim`) → R4 user-truth (scripted `r4_contradiction`) → R5 closure → R6 specificity-forcing followup. Bypasses `/api/chat` — calls compiled graph directly; no HTTP, no auth, no DB writes.
- [x] **Cross-run ledger** at `test/results/_ledger.jsonl`. One line per `test:persona` run with persona, rounds, research calls, grader outcome, advisor length stats. Greppable across sessions.
- [x] `npm run test:persona` wired into package.json.
- [x] 18-persona overlap pool established (11 Zansei-ported with real websites + 2 no-website-path + opening_greeting CX test + 4 GetIdea-native still available but de-prioritized).
- [x] Grader extended with `instruments` block — routing/research/advisor-turn numeric observations separate from pass/fail.
- [x] **Batch validation across 12 personas** completed 2026-04-18: 11/12 overall pass, zero spectacular breakage, zero unknown-agent yields, zero parse errors. Single failure was `steve_scillieri` on `research_followthrough` (research fired but specialist didn't cite — addressed by 7.6 follow-through rule).

---

## PHASE 7.6 — Recommendation force, research follow-through, R4 async research

**Status at ship:** SHIPPED 2026-04-18 (commit `5b53b2c`). Three items shipped as one coherent cycle because they all touched graph-entry state management + research plumbing.

- [x] **Recommendation force (Option B — state flag).** Added `force_recommendation: boolean` to `DeliberationStateAnnotation`. At the top of `supervisorNode`, if the flag is true the function short-circuits (no routing LLM call) and emits `{ deliberation_phase: 'recommendation', next_speaker: 'user', force_recommendation: false }`. The existing edge in [compile.ts](lib/graph/compile.ts) `routeFromSupervisor` then routes to `recommendationNode`. Production `/chat` never sets the flag. The harness sets it in R5 closure rounds via `buildNextRoundState` — verified on ai_consultant + steve_scillieri 5-round runs (both produced `metadata.message_type === 'recommendation'` messages).
- [x] **Research follow-through rule.** Extended `WORKER_RESEARCH_EPISTEMICS` in [lib/graph/nodes.ts](lib/graph/nodes.ts): *"If research context is present, your turn must reference something specific from it OR explicitly hedge that what was found may not be current. Silence about research that ran is a signal to the owner that you didn't do your homework."* Applies whenever `state.research_context.length > 0`. Closed steve_scillieri's single batch-run failure.
- [x] **R4 async research.** New [lib/research/scheduler.ts](lib/research/scheduler.ts) with `executeResearchTool` (framework-agnostic core) + `scheduleAsyncResearch` (Next.js `after()`-wrapped, DB persist via `supabaseAdmin`). Optional `async: boolean` added to `RoutingDecisionSchema.research_needed`. Router edge skips inline `researchNode` when `async === true`; the specialist answers this turn without the context; result lands as a `role: 'system'` research message matching the sync path's metadata shape for the next round. Harness gained `--research-mode sync|async|off` flag.

**Design principle surfaced this cycle (applies going forward): sync and async research both have legitimate use cases.** Sync is correct when the user just shared a URL and is asking about what's on it, or for the first entity-disambiguation fetch in a thread — the specialist cannot answer meaningfully without it. Async is correct for enrichment fetches, competitor scans, secondary URL reads, anything that *adds* depth without *gating* the specialist's next turn. The orchestrator prompt currently defaults to sync when unsure (conservative — correctness over speed); a future cycle will flip that bias once there is more evidence on how often async is chosen correctly.

**Judgment-call flag (carried forward to living BUILD.md):** validation of the async path end-to-end in a real persona transcript was not achieved in the R4 session — the orchestrator was conservative on both personas tested and didn't emit `async: true`. The scheduler was proven correct by direct smoke test against Serper. A future cycle should add either (a) a persona that reliably triggers research (volunteers URL + asks research-gated question) or (b) an orchestrator-prompt bias flip to make async the default for enrichment fetches.

### Phase 7 open issues resolved in 7.6

- **Recommendation node routing: force-state is overwritten by supervisorNode.** ✅ **Resolved 2026-04-18 (R4 session).** Shipped Option B — added optional `force_recommendation: boolean` field to `DeliberationStateAnnotation` in [lib/graph/state.ts](lib/graph/state.ts). At the top of `supervisorNode`, if the flag is true the function short-circuits without invoking its routing LLM and emits `{ deliberation_phase: 'recommendation', next_speaker: 'user', force_recommendation: false }`. The existing edge in [lib/graph/compile.ts](lib/graph/compile.ts) then routes straight into `recommendationNode`. Production `/chat` never sets the flag — only the persona harness sets it in R5 closure rounds ([scripts/run-persona-session.ts](scripts/run-persona-session.ts) `buildNextRoundState`). Verified on `ai_consultant` and `steve_scillieri` 5-round runs: both produced a `metadata.message_type === 'recommendation'` message in their closure rounds.
- **Length compression** — ✅ shipped 2026-04-18 via Phase 7.4.
- **Research follow-through** — ✅ **Resolved 2026-04-18 (R4 session).** Extended `WORKER_RESEARCH_EPISTEMICS` in [lib/graph/nodes.ts](lib/graph/nodes.ts) with the follow-through rule. Applies whenever `state.research_context.length > 0`. `test:fixtures` — including the `research_followthrough` fixture — passes 7/7.

---

## PHASE 7.7 — Ideation — the host voice for contentless openers

**Status at ship:** SHIPPED 2026-04-18 (commit `a38d2ba`).

**Why this exists.** Before this phase the orchestrator prompt routed all greetings (*"Hi"*, *"Hello"*) to Customer Experience. CX was chosen because its voice is the warmest available, but CX is optimized for users who already have customers — its opener question is about a *recent customer interaction*, which misses for pre-business users and for users who are still deciding what they came to discuss.

Ideation replaces CX as the cold-open default. Its role is **orientation, not advising** — welcome the user, offer a choice of paths (*"building something, a problem you're working through, or an idea you're thinking about?"*), ask for a name, and step back for a specialist once the user names a direction. CX stays available for its real role (customer-focused discussion, demand-side assumptions).

**What shipped:**

- [x] New `ideation` specialist record in [scripts/seed-agents.ts](scripts/seed-agents.ts) with host-voice prompt — one or two sentences, no meta-verbs ("let's brainstorm"), no advising, explicit handoff behavior after one turn.
- [x] Orchestrator prompt's "Opening the Room" section rewritten — routes to `ideation` **only when** the opener has no business type, no specific challenge, and no named intent. Any signal ("I run a bakery", "I'm setting up a new business") skips Ideation and goes to the specialist who fits best. Explicit *"do not route to Ideation twice in a row"* rule.
- [x] Ideation added to [lib/types/stream.ts](lib/types/stream.ts) `AGENT_COLOR_MAP`, [app/globals.css](app/globals.css) as `--agent-ideation: #4A7278` (deep warm teal, host-like), and [lib/agents/token-budgets.ts](lib/agents/token-budgets.ts) with a tight 140-token cap (one or two sentences is the whole job).
- [x] New persona [test/personas/ideation_cold_open.json](test/personas/ideation_cold_open.json) — "Jonathan" greets on R1, volunteers a new CT business on R2. Tests the route-to-ideation-then-hand-off flow.
- [x] `test-graph.ts` expected-agents list updated to include `ideation`; active-agent assertion lifted from ≥10 to ≥11.
- [x] CLAUDE.md and README.md hierarchy blocks updated to note the Ideation host separately from the 10 specialists.

**Design principle surfaced this cycle (carried forward):** Ideation is deliberately **not** a peer specialist — it's a host role. CLAUDE.md §"The Agents Are Advisors, Not Performers" still says "10+ specialist agents" because Ideation is not one. The distinction matters: a specialist gives perspective on the business; a host orients the conversation. Conflating them would over-structure the room. Future cycles should preserve this distinction — if a new role needs a different register (e.g., a closing host after the recommendation), model it as a host role too, not as another specialist.

**Judgment-call flag (carried forward to living BUILD.md):** the orchestrator's soft-signal threshold between "route to Ideation" and "route to a specialist" is currently prompt-level guidance, not a code check. This is intentional — keeping the orchestrator's judgment intact is a Phase 7 rule (see Routing is the Art memory). But the soft threshold needs observation across real user openers. A future phase should check the ledger for how often Ideation fires on turn 1, how often it fires on turn 2+ (which would be a bug — handoff is not working), and whether any specialist is getting wrongly skipped because Ideation picked up an opener with actual signal. If any of those patterns appear, the orchestrator prompt gets a tightening edit — not a hardcoded rule.

**Validation approach (as run at ship):**

- Cold-open fidelity: `npm run test:persona -- --persona test/personas/ideation_cold_open.json --rounds 3` — R1 should route to `ideation`, R2 should route to a specialist (not back to ideation), grader `overall_pass`.
- Regression: no existing persona should now route to Ideation — their openers all carry business signal. `test:fixtures` stays green (fixtures are static).
- Integration: `test:graph` updated for the 11-active-agent count.

**Future-phase follow-ups (not blocking 7.7's ship):**

- Observation phase (after 2–3 weeks of live use, or after the specialist-replication cycle): audit ledger for Ideation-firing patterns per the judgment-call flag above.
- If field evidence shows Ideation is too timid (skipped when it should fire) or too aggressive (fires when a specialist would be better), tighten the orchestrator prompt — not the Ideation prompt itself.
- Consider a parallel *closing host* role if Panel Recommendation feels too abrupt as an ending — deferred until there's user evidence either way.
