# DESIGN.md — GetIdea.ai

Read CLAUDE.md first. This document defines how the product *looks and feels*. Every visual decision must serve the deliberation experience described in CLAUDE.md.

---

## Design Philosophy

This product is a room where people sit with advisors and work through their ideas. The interface must feel like that room — not like a chatbot, not like a dashboard, not like a generic SaaS app.

The biggest trap in AI product design is making it look like an AI product. Glowing gradients. Pulsing orbs. Dark mode with neon accents. Robot avatars. "AI is thinking..." loaders. These signals tell the user: "You are talking to a machine." That is the opposite of what we want.

The user should feel like they are in a working session with smart people who care about their business. The interface should feel **warm, professional, grounded, and alive** — the way a good meeting room feels when the right people are in it.

### One argument: advisors, not a tool

Every layout and typographic choice should reinforce a single claim: **these are your advisors**, not a generator, not a dashboard, not a “get your plan” button with a loading spinner. The feeling target is walking into a **well-appointed office** and sitting across from people who have done this many times — unhurried, confident, specific.

Borrow sensibility from **editorial persuasion**, not feature marketing: the narrative can run drowning in generic tips (or starved for guidance) → what you need is *judgment* → here is what that judgment looks like in practice → here is who is in the room with you → are you ready to continue? That story may live on marketing surfaces; the **chat** should still feel like a **letter from an advisor**, not a generated report. Intake should feel like a first conversation that earns the next exchange — not a data-collection step.

**Depth is not a wall of text.** Meaningful can be concise; density without insight is noise. See **Reference quality** and **Conversational arc** in `CLAUDE.md`.

---

## Core Visual Identity

### Tone

Warm professionalism. Think: a well-lit studio with a good table, not a corporate boardroom. Think: a trusted advisor's office with books on the shelf, not a tech startup's open floor plan.

The interface should feel like it has been designed by someone who respects the user's time and takes their work seriously.

### Color System

Do not use:
- Purple-to-blue gradients (the universal "AI product" signal)
- Pure black backgrounds (feels like a terminal, not a room)
- Neon accents (screams "tech demo")
- Monochrome gray palettes (feels lifeless)

Instead, build from:

**Base:** A warm off-white or very light warm gray. The kind of white that feels like good paper, not like a screen. Think `#FAF9F7` not `#FFFFFF`.

**Text:** A warm near-black. Not pure `#000000`. Something like `#2C2C2C` or `#1A1A1A` that has enough warmth to feel intentional.

**Primary accent:** A grounded, confident color. Deep teal, warm navy, forest green, or burnt umber — something that says "professional" without saying "corporate." Choose one. Commit to it. Use it sparingly for key actions and active states.

**Agent colors:** Each agent gets a distinct but harmonious accent color. These should be muted, not bright. Think earth tones and deep jewel tones, not a rainbow. The colors differentiate agents without screaming for attention.

Example palette direction (adapt, don't copy):
- Marketer: warm amber `#C9943E`
- Finance: deep steel `#5B7B8A`
- Creative: terracotta `#B85C38`
- Copywriter: sage `#7A8B6F`
- Designer: plum `#8B6F8A`
- Accountant: slate `#6B7B7B`
- Operations: clay `#A07855`
- Legal: charcoal `#5A5A5A`
- Customer Experience: dusty rose `#B07A7A`
- Business Realist: deep olive `#5C6B4E`

These colors appear as subtle accents on message bubbles, roster indicators, and avatars — never as full background fills.

### Typography

Do not use Inter, Roboto, Arial, or system fonts. These are invisible. The typography should have character.

**Heading / Display:** A serif or semi-serif with personality. Something that says "editorial" or "considered." Examples to explore: Fraunces, Lora, Newsreader, Literata, Source Serif, or DM Serif Display. Pick one that feels like it belongs in a well-designed business magazine.

**Body / UI:** A humanist sans-serif with warmth. Not geometric, not grotesque. Something readable and friendly. Examples: Nunito Sans, Plus Jakarta Sans, Outfit, General Sans, or Atkinson Hyperlegible (which also has excellent accessibility). The body font should be invisible in the best sense — easy to read, never distracting.

**Monospace (for any data/code):** JetBrains Mono or IBM Plex Mono. Used sparingly.

Font sizes should feel comfortable, not cramped. Body text at 15-16px. Agent messages slightly larger than system annotations.

### Spacing and Density

The chat feed should breathe. Messages should not be stacked edge-to-edge like a messaging app. There should be enough vertical space between messages that the user can visually parse the conversation as a series of contributions, not a wall of text.

The left and right sidebars should feel contained and organized. The center panel owns the majority of the screen.

---

## Layout: The Deliberation Room

### Three-Panel Structure

```
┌──────────┬──────────────────────────────┬──────────┐
│          │                              │          │
│  Thread  │      Message Feed            │  Agent   │
│  History │                              │  Roster  │
│          │                              │          │
│          │                              │          │
│          │                              │          │
│          │                              │          │
│          ├──────────────────────────────┤          │
│          │      Composer                │          │
└──────────┴──────────────────────────────┴──────────┘
```

**Left Sidebar — Thread History (240-280px)**
- List of past conversations, most recent first.
- Each thread shows: title (auto-generated or user-set), a one-line preview, and a relative timestamp.
- Active thread is highlighted with the primary accent.
- "New Conversation" button at the top. Clear. Prominent. Not hidden behind a menu.
- On mobile: this collapses into a hamburger or swipe-to-reveal.

**Center Panel — The Conversation**
- This is the product. It gets the most space.
- The message feed scrolls. New messages appear at the bottom.
- The composer sits pinned at the bottom of this panel.

**Right Sidebar — Agent Roster (220-260px)**
- The panel that makes this product different from every other AI chat.
- Shows every active agent as a card or row.
- Each agent shows: name, a one-line role description, a colored indicator, and their current status.
- On mobile: this collapses into a floating pill or bottom sheet that can be expanded.

---

## Message Feed Design

### Message Types and Visual Treatment

**User messages:**
- Aligned right or full-width with a distinct but subtle background (very light warm tint).
- No avatar needed. The user knows they are the user.
- Clean, simple, confident.

**Agent messages:**
- Aligned left.
- Each agent message has a small colored accent (left border, avatar dot, or header bar) in that agent's color.
- Agent name is displayed above or inline with the message. It should be visible but not louder than the content.
- The message body is the star. The agent name is a label.

**Orchestrator annotations:**
- These are NOT full messages in the feed. They are contextual annotations.
- Rendered as a small, muted line between messages: "Finance was brought in because pricing was discussed without numbers."
- Expandable on click for the full routing reasoning.
- Visually quieter than everything else. Use smaller text, lighter color, perhaps italic.
- The user should be able to ignore these entirely or lean into them. Their choice.

**Web research annotations (URL read, search):**
- Same visual register as orchestrator annotations: **quiet**, smaller type, muted color — evidence that the panel did homework, not a second product feature.
- Copy is **short and human** (e.g. reviewed a hostname, searched a query). No “AI is searching…”, no pulsing loaders, no bouncing dots. Research is not an agent in the roster; the roster does not light up for it.
- **Expandable** for a bit more detail if the user cares; skippable if they don’t.
- Must never feel like a separate “tool run” interrupting the room — it is a footnote to the next advisor message.

**System messages (phase transitions, recommendations):**
- Centered, full-width, with a subtle horizontal rule or background shift.
- "The conversation has moved into the critique phase." — rendered as a quiet signpost, not a loud banner.

### Recommendation Block

When the Orchestrator produces a final recommendation, it should be visually distinct:
- A card or panel with clear sections: Strengths, Risks, Unanswered Questions, Suggested Next Steps.
- Not a wall of text. Structured but not clinical.
- Uses the primary accent color subtly.
- This is the "deliverable" of the deliberation. It should feel like a thoughtful summary, not a generated report.

**Content-quality patterns the backend applies** (visible in output, set in [lib/graph/nodes.ts](lib/graph/nodes.ts) `recommendationNode`):
- **Divergence rule.** When the Block makes a recommendation the conversation didn't surface directly, it names the bridge. The owner never sees a recommendation they didn't see coming. In UI terms: a Block that says *"you thought this was a visibility problem — here's why the panel sees it as a conversion-infrastructure problem instead"* should read as a thought-through pivot, not a non-sequitur.
- **Budget signal hierarchy.** Next Steps that involve spend respect STATED > CURRENT > HISTORICAL > INFERRED order. Regretted past spend is pain evidence, not budget. UI should feel trustworthy because the spend recommendations track what the owner actually has, not what an advisor wishes they had.
- **Evidence binding.** Every recommendation in the Block traces to something the owner said or something found in research. No free-floating advice. UI designers: if you ever render a Block that recommends something the owner didn't mention and research didn't find, that's a backend bug — flag it.

---

## Agent Roster Design

This sidebar is the social system. It tells the user: "You are not alone in this room."

### Agent Card Anatomy

```
┌─────────────────────────┐
│ ● Marketer              │
│   "How will people      │
│    find out about it?"  │
│                         │
│   ○ Idle                │
└─────────────────────────┘
```

Each card shows:
- **Color indicator:** A dot or small bar in the agent's color.
- **Name:** The agent's display name.
- **One-liner:** A very short description of what they care about. Not their full role — just enough for the user to understand the perspective. Examples: "The numbers person." "Thinks about what the customer actually experiences." "Asks if you can afford it."
- **Status:** Idle, Thinking, Speaking, or Silent.

### Agent States and Transitions

**Idle:** Default state. The agent is available but not active. Muted visual treatment — the name and indicator are visible but not prominent.

**Thinking:** The Orchestrator has selected this agent but they haven't started generating yet. The color indicator pulses gently or shifts to a brighter shade. The one-liner could temporarily show "Considering..." — but keep it subtle. No spinning loaders. No bouncing dots. The agent is *thinking*, not *loading*.

**Speaking:** The agent is actively generating text. The card is fully illuminated — color is vivid, name is prominent. This state lasts while tokens are streaming.

**Silent:** The agent has been explicitly suppressed by the Orchestrator for this turn. Visually dimmed more than Idle. This is a deliberate state — it signals that the agent could speak but the Orchestrator decided they shouldn't. Optional: on hover, show "Sitting this one out" or similar.

### Transition Animations

Transitions between states should be smooth, not instant. A 300-400ms ease. The roster should feel alive — like people leaning in and leaning back — not like lights switching on and off.

Never use:
- Spinning loaders
- Bouncing dots
- Pulsing rings
- Any animation that says "AI is loading"

Instead: gentle opacity shifts, color warmth changes, subtle scale adjustments (1.0 to 1.02 on the active agent, not more).

---

## Composer Design

The composer is always visible. It is always interactive. Even when agents are speaking.

### Default State

A clean text area with a send button. Placeholder text that sets the tone:

Do NOT use:
- "Type a message..."
- "Ask anything..."
- "Chat with AI..."

Instead, something that frames the interaction as a working session:
- "What's on your mind?"
- "Describe your idea or ask a question..."
- "What are you working on?"

The placeholder should rotate occasionally or adapt to context.

### During Generation State

When agents are actively speaking, the composer gains an additional affordance: a subtle "interrupt" indicator.

This is NOT a big red "STOP" button. That frames the AI as something that needs to be stopped.

Instead: the send button subtly shifts appearance (perhaps a different icon or a gentle color change) to indicate that sending a message right now will redirect the conversation. A tooltip or micro-label: "Send to redirect the conversation."

The user should never feel like they need permission to speak. The composer's active state during generation communicates: "You can jump in whenever you want."

### Post-Recommendation State

After a recommendation block is generated, the composer could display a contextual prompt:
- "What do you want to explore further?"
- "Anything the panel missed?"

This encourages continued deliberation rather than treating the recommendation as a final answer.

---

## Animations and Motion

### Principles

Motion should feel organic, not mechanical. The interface is a room with people in it, not a machine processing requests.

- **Entrances:** Messages should appear with a gentle fade and slight upward drift (8-12px, 200-300ms, ease-out). Not a slide-in from the side. Not a pop.
- **Agent roster transitions:** Smooth state changes. See Agent States above.
- **Phase transitions:** When the deliberation phase shifts, a subtle visual wash or separator appears in the feed. Not a modal. Not a toast. A quiet marker.
- **Streaming text:** Characters or words appear naturally. No typewriter effect with a blinking cursor — that's a chatbot trope. Text should materialize smoothly, as if being written on good paper.

### What to Avoid

- Typewriter cursors
- Pulsing "AI thinking" orbs or rings
- Skeleton loaders for message content (the streaming handles this)
- Confetti, sparkles, or celebration animations
- Any animation that draws attention to the technology rather than the conversation

---

## Responsive Design

### Desktop (1200px+)

All three panels visible. Center panel takes 50-60% of width. Sidebars take the remainder.

### Tablet (768-1199px)

Thread sidebar collapses to an icon rail or is hidden behind a toggle. Agent roster remains visible but narrower — cards become more compact, showing only the color dot, name, and status (one-liner hidden). Center panel expands.

### Mobile (<768px)

Full-screen message feed. Thread history accessible via a top-left menu or swipe gesture. Agent roster accessible via a floating pill at the bottom-right that expands into a bottom sheet.

The mobile experience must not feel like a downgraded desktop. The deliberation should feel just as alive on a phone — agents are still visibly present (via the pill indicator showing how many are active), interrupts still work, and the conversation still flows.

---

## Dark Mode

Support it, but don't default to it. And don't make it look like every other dark-mode AI app.

**Dark mode base:** Not pure black. A warm very dark gray or very dark warm brown. Think `#1C1B19` not `#000000`. The room gets dimmer, not colder.

**Dark mode text:** Off-white with warmth. `#E8E6E1` not `#FFFFFF`.

**Dark mode agent colors:** Same hues, slightly adjusted for contrast on dark backgrounds. Saturation can increase slightly. The roster should still feel alive.

**Dark mode accents:** The primary accent may need a lighter variant for accessibility.

The goal: dark mode should feel like the same room in the evening, not like a different product.

---

## Component Inventory

These are the components that need to be built. Each one should be a self-contained, well-documented React component.

### Core Components

| Component | Location | Description |
|---|---|---|
| `ChatLayout` | `/app/chat/layout.tsx` | Three-panel shell. Handles responsive breakpoints. |
| `ThreadSidebar` | `/components/chat/ThreadSidebar.tsx` | Left panel. Thread list with creation, selection, search. |
| `MessageFeed` | `/components/chat/MessageFeed.tsx` | Center panel scroll area. Renders message list. Auto-scrolls on new messages unless user has scrolled up. |
| `MessageBubble` | `/components/chat/MessageBubble.tsx` | Single message. Adapts style based on role and agent_name. |
| `OrchestratorAnnotation` | `/components/chat/OrchestratorAnnotation.tsx` | Subtle inline annotation showing routing reasoning. Expandable. |
| `RecommendationBlock` | `/components/chat/RecommendationBlock.tsx` | Structured summary card: Strengths, Risks, Questions, Next Steps. |
| `PhaseMarker` | `/components/chat/PhaseMarker.tsx` | Quiet inline indicator when the deliberation phase transitions. |
| `Composer` | `/components/chat/Composer.tsx` | Text input, send button, interrupt affordance. Always active. |
| `AgentRoster` | `/components/chat/AgentRoster.tsx` | Right panel. Contains AgentCards. |
| `AgentCard` | `/components/chat/AgentCard.tsx` | Individual agent: name, one-liner, color, status with animated transitions. |
| `MobileRosterPill` | `/components/chat/MobileRosterPill.tsx` | Floating indicator for mobile. Expands to bottom sheet. |

### Shared UI Components

| Component | Description |
|---|---|
| `Avatar` | Agent avatar — abstract shape or monogram in agent color. NOT a robot face. NOT a photo of a stock person. A warm geometric mark. |
| `StatusDot` | Animated dot showing agent state. Smooth transitions. |
| `ExpandableSection` | For orchestrator annotations and recommendation details. |
| `Separator` | Horizontal rule used between message groups and at phase transitions. |

---

## What This Product Should NEVER Look Like

### The Chatbot

- Single column of alternating gray and white bubbles.
- A robot avatar or generic AI icon.
- "AI is typing..." with bouncing dots.
- No sense of who is speaking or why.

### The Dashboard

- Panels full of charts and metrics with a chat widget in the corner.
- The conversation shoved into a sidebar.
- Analytics taking precedence over the deliberation.

### The Generic SaaS

- White background, blue accent, Inter font, rounded rectangles everywhere.
- A sidebar with icons that could belong to any product.
- Nothing memorable. Nothing warm.

### The AI Demo

- Dark background with glowing gradients.
- Neon accents and particle effects.
- "Powered by AI" badges.
- The technology is the hero instead of the conversation.

---

## What This Product SHOULD Feel Like

A well-designed conference room in a studio space. Good lighting. A table that invites you to spread out your work. People around it who are clearly experts but don't make you feel small. Someone managing the conversation so it stays productive. A whiteboard with real ideas on it.

The user opens the app and thinks: "Let me bring this to the room."

Not: "Let me ask the AI."

That's the design.

---

## Related documentation

**RecommendationBlock** and the panel assessment flow use the same markdown section contract (`## Strengths`, `## Risks`, and so on) that the graph produces and that automated transcript checks validate. When you change heading labels or structure in the UI, keep **graph output**, **grader expectations** (`lib/test/grade-deliberation.ts`), and **design** aligned. For the full testing ladder and persona workflows, see **`BUILD.md` §6.2** and **`docs/testing.md`**.
