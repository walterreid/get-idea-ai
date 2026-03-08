# GetIdea.ai

A deliberation engine for small business owners.

Not a chatbot. Not a prompt-and-response tool. A room where a business owner brings an idea and sits down with a panel of specialist advisors — Marketing, Finance, Creative, Operations, Legal, and more — who examine it from every angle, challenge assumptions, and produce a structured assessment.

The panel is powered by LangGraph. The deliberation is real.

---

## What it does

- A user describes their business idea or challenge in plain language
- The **Orchestrator** (a supervisor LangGraph node) reads the conversation and routes to the most useful specialist
- Each **advisor agent** responds from their specific domain — Finance checks viability, the Realist says what needs to be said, the Marketer examines distribution
- The user can **interrupt at any point** to redirect; the system re-evaluates
- After each deliberation round, insights are **extracted and stored** — strengths, risks, open questions, recommendations — attributed to the agent who surfaced them
- Returning to a thread, the Orchestrator is briefed on what was already covered and builds forward rather than repeating

The product is the **idea record**: the accumulated, attributable findings from multiple deliberation sessions on a single idea.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| AI orchestration | LangGraph (`@langchain/langgraph`) |
| LLM providers | Anthropic (Claude 3.5 Haiku, Claude 3.5 Sonnet) + OpenAI (GPT-4o) |
| Database + Auth | Supabase (PostgreSQL, Row Level Security, magic link auth) |
| Streaming | Server-Sent Events (SSE) via `ReadableStream` in Next.js API route |
| Styling | Tailwind CSS v4, custom CSS variables, Google Fonts (Lora, Plus Jakarta Sans) |

---

## Project structure

```
get-idea-ai/
├── app/
│   ├── api/chat/route.ts        # SSE streaming endpoint — runs LangGraph, emits structured events
│   ├── auth/                    # Magic link sign-in + Supabase PKCE callback
│   ├── chat/                    # Main deliberation interface (server component + client ChatInterface)
│   ├── ideas/                   # Idea Dashboard — all threads with extracted insight summaries
│   └── layout.tsx               # Root layout with font loading
│
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx    # Client component — owns all live state via useDeliberation hook
│   │   ├── MessageBubble.tsx    # Renders user / agent / orchestrator / recommendation messages
│   │   ├── RecommendationBlock.tsx  # Structured panel assessment card (Strengths, Risks, Questions, Next Steps)
│   │   ├── AgentRoster.tsx      # Right sidebar — live agent status from hook
│   │   ├── AgentCard.tsx        # Individual agent with animated thinking/speaking/idle states
│   │   ├── ThreadSidebar.tsx    # Left sidebar — real threads from DB with insight count badges
│   │   └── Composer.tsx         # Always-active input; shifts to interrupt mode during generation
│   └── ideas/
│       └── IdeasDashboard.tsx   # Grid of idea cards with grouped insights per thread
│
├── lib/
│   ├── agents/
│   │   ├── schema.ts            # Zod schemas: AgentConfig, PublicAgentConfig, RoutingDecision
│   │   ├── loader.ts            # React.cache-based agent loader (for Next.js server components)
│   │   └── graph-loader.ts      # Module-level TTL cache for LangGraph node execution
│   ├── graph/
│   │   ├── state.ts             # DeliberationStateAnnotation — all LangGraph state fields
│   │   ├── nodes.ts             # supervisorNode, workerNode, interruptHandlerNode, recommendationNode
│   │   └── compile.ts           # StateGraph compilation with routing logic and MAX_AGENT_TURNS
│   ├── hooks/
│   │   └── useDeliberation.ts   # Client hook — SSE stream management, interrupt, local state
│   ├── insights/
│   │   ├── extract.ts           # Post-round insight extraction via Haiku — Zod-validated, specific
│   │   └── loader.ts            # Load + format prior insights for orchestrator context injection
│   ├── supabase/
│   │   ├── client.ts            # Browser-side Supabase client
│   │   ├── server.ts            # Server-side client (uses cookies)
│   │   └── admin.ts             # Service role client for graph nodes and scripts
│   └── types/
│       └── stream.ts            # Shared StreamEvent types, ClientMessage, RosterAgent, SidebarThread
│
├── supabase/
│   └── migrations/
│       └── 001_foundation.sql   # Full schema: profiles, threads, messages, agent_configs, idea_insights
│
├── scripts/
│   ├── seed-agents.ts           # Seeds all 10 specialist agents + orchestrator into agent_configs
│   └── test-graph.ts            # Integration tests for graph compilation, routing, and constraints
│
├── proxy.ts                     # Next.js 16 proxy (formerly middleware) — refreshes Supabase sessions
├── CLAUDE.md                    # Product philosophy — read before any development decision
├── BUILD.md                     # Phase-by-phase build plan with completion status
└── DESIGN.md                    # UI/UX principles — visual identity, component inventory, animations
```

---

## Running locally

### 1. Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is fine)
- An [Anthropic](https://console.anthropic.com) API key
- An [OpenAI](https://platform.openai.com) API key

### 2. Clone and install

```bash
git clone https://github.com/your-username/get-idea-ai.git
cd get-idea-ai
npm install
```

### 3. Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

Open `.env.local` and set:

```env
# Supabase — from your project's Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LLM providers
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Optional — LangSmith tracing
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=ls__...
LANGCHAIN_PROJECT=getidea-orchestrator
```

> **Never commit `.env.local`.** It is already in `.gitignore`.

### 4. Set up the database

In your Supabase project, open the **SQL Editor** and run the contents of:

```
supabase/migrations/001_foundation.sql
```

This creates all tables (`profiles`, `threads`, `messages`, `agent_configs`, `idea_insights`), the RLS policies, and the triggers.

### 5. Seed the agent panel

This populates the `agent_configs` table with all 10 specialist agents and the orchestrator:

```bash
npm run seed
```

You should see confirmation for each agent inserted. The seed script is idempotent — safe to re-run.

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/auth` where you can sign in with a magic link.

> During local development, magic link emails are delivered to your Supabase project's **Auth > Logs**. Paste the link directly into your browser — you do not need an email provider configured locally.

### 7. Verify the graph (optional)

Run the integration test suite to confirm LangGraph compilation, agent loading, and architectural constraints:

```bash
npm run test:graph
```

All 9 tests should pass.

---

## How the deliberation works

```
User message
     │
     ▼
supervisorNode  ─── reads conversation + prior insights ──► routing decision (JSON)
     │                                                        (next_speaker, phase, reason, suppress[])
     ▼
routeFromSupervisor
     ├── "user"         ──► yield_to_user event ──► stream ends
     ├── "recommendation" ──► recommendationNode ──► structured assessment
     └── <agent name>   ──► workerNode
                                  │
                                  ▼
                         agent's LLM call (Anthropic or OpenAI, from DB config)
                                  │
                                  ▼
                         token stream ──► client via SSE ──► MessageBubble
                                  │
                                  ▼
                         back to supervisorNode (next turn)
```

The orchestrator's routing decision — which agent, why, and with what objective — is surfaced to the user as a collapsible annotation on each message. It is product surface, not a log.

---

## Key architectural constraints

These are enforced throughout the codebase and reflected in the Cursor rules (`.cursor/rules/`):

1. **No hardcoded agent names in application logic.** `if (agent === "finance")` never appears. All agent behavior is driven by `agent_configs` rows fetched at runtime.

2. **Agent identity is DB-configurable.** New agents can be added without a deploy. The orchestrator's system prompt is stored in the database and has a `{AGENTS_CONTEXT}` placeholder that is replaced at runtime with the live agent roster.

3. **Interrupts are first-class.** The Composer is always interactive. When the user sends a message while agents are generating, `AbortController` stops the stream, and the new message is sent with `{ interrupt: true }`, causing the graph to re-evaluate from a fresh supervisor pass.

4. **Insights replace on each extraction.** Post-round insight extraction reads the full conversation and replaces prior insights. This ensures the insight set reflects the current depth of the deliberation, not early shallow observations.

---

## Available scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Production build (TypeScript + Turbopack) |
| `npm run seed` | Seed agent configs into Supabase |
| `npm run test:graph` | Run LangGraph integration tests |

---

## Key documents

| File | Purpose |
|---|---|
| `CLAUDE.md` | Product philosophy. Read before any development decision. If a technical decision conflicts with this document, this document wins. |
| `BUILD.md` | Phase-by-phase build plan. Tracks what is complete, in-progress, and pending. |
| `DESIGN.md` | Visual identity and UI principles. What this product must never look like, and what it should feel like. |
