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

## Rules for Every Development Decision

1. If it makes the conversation faster but dumber, don't build it.
2. If it makes agents agree more easily, don't build it.
3. If it removes the user's ability to interrupt or redirect, don't build it.
4. If it treats all users as the same sophistication level, don't build it.
5. If it generates more output without more insight, don't build it.
6. If it looks impressive in a demo but doesn't help a bakery owner decide whether to add delivery, don't build it.
