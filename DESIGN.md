# DESIGN.md — GetIdea.ai

Read CLAUDE.md first. This document defines how the product *looks and feels*. Every visual decision must serve the deliberation experience described in CLAUDE.md.

---

## Design Philosophy

GetIdea design serves one argument: **this is your advisor panel, not a tool.**

Every visual and typographic choice exists to create the feeling of walking into a well-appointed office and sitting across from a group of seasoned professionals who have done this a thousand times. Not a SaaS dashboard. Not a chatbot. Not a "generate your advice" button with a loading spinner. More of an invitation into a working group you've already been invited to — warm, confident, unhurried.

The design language was developed on the landing page, which uses a five-beat narrative structure borrowed from editorial persuasion, not feature marketing. It makes an argument: *you've arrived with something* → *what you need* → *the table listens* → *who sits at the table* → *pull up a chair*. That editorial sensibility carries through everything.

### The canonical term: **The Table**

"Bring it to the table" already means bring your real question — that idiomatic gravity carries half the positioning for free. "A seat at the table." "What was said around the table." The phrase implies equals, time, food, an unhurried meal's worth of talk. It fits CLAUDE.md's "unhurried, confident, specific" tone target better than "room" (which implies walls) or "panel" (which implies a hearing).

**Use "The Table" as the primary term** across marketing copy and philosophy. *Advisors* is the functional label when naming the role is necessary. *Panel* is reserved for structured output — "the panel's read," "the panel recommendation" — where we're naming the deliberation's product, not the people. Three registers, three jobs.

### The design bet we're making

Zansei (the design-language inspiration) centers on a single founder (Zan Ng, 30 years of advertising experience) with AI advisors as his distributed voice — one authority expressed through many. GetIdea.ai inverts that: **distributed authority from the start**. Ten specialists with deliberation discipline, none of them singular. The design must make the collective feel trustworthy without ever personifying it. **No founder beat on the landing.** The roster IS the human presence.

This is the harder design to get right. Most AI products cheat by putting a human face behind the AI ("built by X, working with N years of experience"). We don't get that crutch. The copy, the excerpt card, the roster have to carry the weight of "these are seasoned people" without ever pointing at one person.

### The five beats (landing)

A verb-led arrival where The Table is the subject throughout. Each beat is a move around the table.

1. **You arrive.** You've walked in with something. The recognition poem — scattered noise you've already heard.
2. **What you need.** The reframe. You don't need more tactics; you need judgment about which ones to ignore. The offer sits here in the dark band.
3. **The table listens.** Proof. What judgment sounds like in practice (the advisor excerpt card).
4. **Who sits at the table.** The roster. Ten specialists and one host.
5. **Pull up a chair.** The invitation. Your seat's already warm.

### Depth is not a wall of text

Meaningful can be concise; density without insight is noise. Editorial pages breathe. Chat turns breathe. Recommendation blocks breathe. See **Reference quality** and **Conversational arc** in CLAUDE.md for the content-level version of this rule.

---

## The Spatial Philosophy

The landing uses three column widths to create rhetorical rhythm. The contrast between narrow and wide **IS** the argument — a scanner reads the shape before the words.

| Class | Max width | Role | What lives here |
|---|---|---|---|
| `col-poem` (560px, left-anchored) | Whisper | The scattered noise of bad advice. Italic, faint color. Left edge of the page. |
| `col-poem-end` (560px, right-anchored) | Whisper, continuation | The second half of the split poem. Right edge of the page. |
| `col-prose` (620px, centered) | Statement | Comfortable reading. The reframe argument lives here. |
| `col-proof` (820px, centered) | Proof | Room for the advisor excerpt. The advisor voice lives here. |
| `col-question` (820px, centered) | Statement at scale | The big hero question. Room for a 52px serif line. |

**Scanner's eye test:** before any word is read, the shape reads as *scatter → narrow → statement → wider proof → structured → dark call.* The geometry tells the argument.

These classes are global — available in chat too, where they'll translate in Phase 9.3 (orchestrator annotations to `col-poem`, messages to `col-prose`, RecommendationBlock to `col-proof`).

---

## Core Visual Identity

### Tone

Warm professionalism. Think: a well-lit studio with a good table, not a corporate boardroom. Think: a trusted advisor's office with books on the shelf, not a tech startup's open floor plan.

The interface respects the user's time and takes their work seriously.

### Color System — Primary Palette

The palette was built around **one action color** (terracotta) and a warm off-white / warm near-black pair that feels like good paper and ink. Every color serves a specific register.

| Name | Hex | Role | Why |
|---|---|---|---|
| **Warm white** | `#FDFCF9` | Primary page background | Barely distinguishable from cream. The eye registers warmth without identifying a color. |
| **Cream** | `#F8F6F1` | Surface / alternate section background | Paper, not screen. Signals "considered space." |
| **Ink** | `#1C1917` | Dark-band background + primary text color | Near-black with brown warmth. Pure `#000` is aggressive and digital; ink is analog, authoritative. |
| **Ink soft** | `#44403C` | Body reading text | Dark enough for sustained reading, warm enough not to feel like a terms-of-service page. |
| **Ink muted** | `#78716C` | Secondary text, labels | Recedes without disappearing. Overlines, meta-text, supporting info. |
| **Ink faint** | `#A8A29E` | Tertiary text, the "poem" | Almost gone. The noise should feel like it's fading even as you read it. |
| **Terracotta** | `#B45230` | Action color. **The only one.** | Warm, grounded, human. Not tech-blue, not startup-green, not urgency-red. The color of something fired, handmade, real. Appears on CTAs, hover states, and the italic emphasis word in headlines. |
| **Terracotta hover** | `#9A3F22` | Hover/active state | Deeper, not brighter. Confidence, not urgency. |

### Dark band (Stamp + Invitation)

Used exactly twice on the landing: once as the offer (after recognition), once as the closing invitation. Bookends the argument. Same color family inverted, not a new palette.

| Name | Hex | Role |
|---|---|---|
| Stamp BG | `#1C1917` (same as Ink) | Full-bleed dark band background |
| Stamp ink | `#F8F6F1` (same as Cream) | Text on dark |
| Body on dark | `rgba(248, 246, 241, 0.48)` | Muted text on dark sections |
| Strong on dark | `rgba(248, 246, 241, 0.8)` | Emphasized text on dark |
| Fine print on dark | `rgba(248, 246, 241, 0.28)` | The quietest text ("No surprise invoices") |

### Advisor Excerpt card

The most important component on the landing. It shows what the product actually produces.

| Name | Hex | Role |
|---|---|---|
| Excerpt BG | `#F1EDE6` | Slightly darker than cream — a document within a page |
| Excerpt border | `#DDD6CB` | Card border, barely there |
| Highlight | `rgba(180, 82, 48, 0.09)` | Terracotta at 9% opacity on the key insight phrase |

### Agent identity colors

Each advisor has a muted accent color. Earth tones and deep jewel tones, not a rainbow. These appear as the left-border stripe on agent messages, the roster card dot, and the avatar monogram. Never as full background fills.

| Agent | Hex | Why |
|---|---|---|
| Marketer | `#C9943E` | Warm amber — channels, growth, visibility |
| Finance | `#5B7B8A` | Deep steel — numbers, unit economics |
| Creative | `#C9712E` | Burnt orange — the commit-and-exclude voice. **Shifted from `#B85C38` in Phase 9.1** to de-collide with the new terracotta action color. The near-twin hues were visually indistinguishable when a Creative message sat next to a CTA button. |
| Copywriter | `#7A8B6F` | Sage — language, register, words on the page |
| Designer | `#8B6F8A` | Plum — tangible form |
| Accountant | `#6B7B7B` | Slate — mechanics, compliance |
| Operations | `#A07855` | Clay — execution, "who actually does this?" |
| Legal | `#5A5A5A` | Charcoal — urgency-calibrated exposure flagging |
| Customer Experience | `#B07A7A` | Dusty rose — moment-plus-feeling discipline |
| Business Realist | `#5C6B4E` | Deep olive — specific-flaw-not-category |
| Ideation (host) | `#4A7278` | Teal-green — first-minute orientation |

### Color rules

- **One action color.** Terracotta only. Never introduce a second action color.
- **No blue.** Every SaaS product, every "Get Started Free" button, every "AI-powered" tool uses blue. GetIdea.ai is not that.
- **No gradients.** Gradients signal startup aesthetics. This is editorial.
- **Opacity for hierarchy, not new colors.** Dark sections use cream at varying opacities rather than introducing new grays.
- **Agent colors are accents, not fills.** Left border, avatar, small dot. Never a background wash.

---

## Typography

### Font Stack

| Font | Role | Why |
|---|---|---|
| **Newsreader** (Google Fonts, variable optical size) | Headlines, body prose, logo, the "poem," the advisor quote | Designed for reading — not display, not decoration. Says: *this is written to be read carefully.* The italic is particularly good: warm, not fussy. Matters because the advisor's voice uses italics for emphasis, the poem is entirely italic, and the terracotta-italic emphasis word in headlines needs an italic that carries weight. |
| **DM Sans** (Google Fonts) | UI elements, labels, overlines, CTAs, fine print, navigation | Clean, geometric, modern. Handles small sizes and uppercase tracking well. The voice of the infrastructure — supports the editorial voice without competing with it. |
| **JetBrains Mono** (Google Fonts) | Any data/code in chat | Preserved from prior cycle. Used sparingly. |

### Type rules

- **Logo is Newsreader, not DM Sans.** The logo belongs to the editorial voice, not the system voice. The terracotta punctuation after "GetIdea" is a mark, not a decoration.
- **Headlines are Newsreader 400 (regular weight).** Not bold. Authority comes from size and space, not weight. Bold headlines feel like advertising; regular-weight headlines feel like editorial.
- **Italic means something.** Italic is used for: the recognition poem (faint, scattered), the terracotta emphasis word in headlines, single advisor quotes, and the reframing pivot's block quote. Don't use italic for generic emphasis.
- **DM Sans is always small.** 11–15px. It's infrastructure — labels, overlines, CTAs, nav. When DM Sans goes large, the page feels SaaS.
- **Letter-spacing:** Overlines get `2px` tracking and uppercase. Body text gets none. CTAs get `0.01em`. The logo gets `0.02em`. Small numbers that matter.

### Type scale

| Element | Font | Size | Weight | Color |
|---|---|---|---|---|
| Recognition poem | Newsreader italic | `clamp(15px, 1.7vw, 17px)` | 300 | Ink faint |
| Recognition question (h1) | Newsreader | `clamp(32px, 5vw, 52px)` | 400 | Ink |
| Stamp headline | Newsreader | `clamp(28px, 4vw, 44px)` | 400 | Stamp ink |
| Reframing setup (body) | Newsreader | `clamp(16px, 1.9vw, 18px)` | 300 | Ink soft |
| Reframing pivot | Newsreader | `clamp(19px, 2.6vw, 24px)` | 400 | Ink |
| Advisor excerpt body | Newsreader | 15px | 400 | Ink soft |
| Roster advisor name | Newsreader | 18px | 400 | Ink |
| Roster one-liner | Newsreader | 15px | 400 | Ink muted |
| Overlines / labels | DM Sans | 10–11px | 500, uppercase, tracked | Ink faint / muted |
| CTA buttons | DM Sans | 13–15px | 500 | Terracotta or Stamp ink |
| Navigation | DM Sans | 13px | 400–500 | Ink faint → Ink soft on hover |
| Fine print | DM Sans | 12–13px | 400 | Ink faint or dark equivalents |

---

## Component Patterns

### The Advisor Excerpt Card

The most important visual component. It shows what the product produces.

- Background: `#F1EDE6` (excerpt BG — slightly darker than cream, a document within a page)
- Left border: 3px terracotta stripe (the only decorative color use — marks "this is from one of the advisors")
- Label: DM Sans overline, `FROM THE TABLE`
- Business context line: DM Sans 13px, Ink soft, separated by a bottom border from the body
- Body: Newsreader 15px prose. Reads like a letter, not a list.
- Highlight span: Terracotta at 9% opacity on the key insight phrase

### CTA Buttons

- Terracotta background, cream text, 5px border-radius
- Hover: darker terracotta, subtle shadow, `translateY(-1px)`
- **Never rounded-full. Never pill-shaped.** 5px radius — confident, not playful.
- Text: DM Sans 14–15px, weight 500. Short, advisor-voice. Example: `Pull up a chair`. Not `Get Your Free Advisor Review!`

### The Dark Band (Stamp + Invitation)

- Full-bleed Ink background — a threshold, the page changes register
- Same color system inverted (cream text on dark)
- Used exactly twice: offer stamp (after recognition), closing invitation (at the end). Bookends the argument. Never three times.

### Separators

- Thin horizontal rules: `rgba(28, 25, 23, 0.1)` — barely visible
- Reframing separator: 40px wide, 1px, Ink faint. A pause, not a divider.
- Section borders: `1px solid var(--rule)` between major beats

---

## Layout: The Deliberation Room (chat surface)

The landing's editorial DNA carries through to the chat surface, but the chat is not a single-column narrative — it's a persistent three-panel working environment.

### Three-Panel Structure

```
┌──────────┬──────────────────────────────┬──────────┐
│          │                              │          │
│  Thread  │      Message Feed            │  Agent   │
│  History │                              │  Roster  │
│          │                              │          │
│          ├──────────────────────────────┤          │
│          │      Composer                │          │
└──────────┴──────────────────────────────┴──────────┘
```

**Left Sidebar — Thread History (240–280px)**
- List of past conversations, most recent first
- Each thread: title, one-line preview, relative timestamp
- Active thread highlighted with terracotta
- "New Conversation" button at top — prominent, not hidden behind a menu
- Mobile: collapses to hamburger or swipe-to-reveal

**Center Panel — The Conversation**
- The product. Gets the most space.
- Message feed scrolls. New messages appear at the bottom.
- Composer pinned at the bottom of this panel.

**Right Sidebar — Agent Roster (220–260px)**
- The panel that makes this product different from every other AI chat
- Every active agent as a card or row
- Each agent: name, one-line role description, colored indicator, current status
- Mobile: collapses into a floating pill at the bottom-right that expands into a bottom sheet

### Phase 9.3 column-width translation

When the landing's column widths reach the chat surface in Phase 9.3:

- Orchestrator annotations → `col-poem` width, left-anchored (margin-left matches the annotation's relationship to the conversation)
- User + advisor messages → `col-prose` width inside the center panel
- RecommendationBlock → `col-proof` width (wider — it's the document within the conversation)
- Research annotations → `col-poem` width (same register as orchestrator annotations)

Until 9.3 lands, chat uses the existing message widths. The palette is already new (9.1 token swap); the layout rhythm arrives in 9.3.

---

## Message Feed Design

### Message Types and Visual Treatment

**User messages:**
- Right-aligned or full-width with a subtle cream tint background
- No avatar needed — the user knows they are the user
- Clean, simple, confident

**Agent messages:**
- Left-aligned
- Small colored accent (left border, avatar dot, or header bar) in that agent's color
- Agent name displayed above or inline — visible but not louder than the content
- The message body is the star. The agent name is a label.

**Orchestrator annotations:**
- NOT full messages. Contextual annotations.
- Rendered as a small, muted line between messages: *"Finance was brought in because pricing was discussed without numbers."*
- Expandable on click for the full routing reasoning
- Quieter than everything else — smaller text, lighter color, perhaps italic
- User should be able to ignore them entirely or lean into them

**Web research annotations (URL read, search):**
- Same visual register as orchestrator annotations: **quiet**, smaller type, muted color — evidence that the panel did homework, not a second product feature
- Copy is **short and human** (e.g. *reviewed a hostname*, *searched a query*). No "AI is searching…", no pulsing loaders, no bouncing dots. Research is not an agent in the roster; the roster does not light up for it.
- **Expandable** for a bit more detail if the user cares; skippable if they don't
- Must never feel like a separate "tool run" interrupting the room — it is a footnote to the next advisor message

**System messages (phase transitions, recommendations):**
- Centered, full-width, with a subtle horizontal rule or background shift
- *"The conversation has moved into the critique phase."* — rendered as a quiet signpost, not a loud banner

### Recommendation Block

The Orchestrator's structured assessment. Visually distinct.

- Card with clear sections: Strengths, Risks, Unanswered Questions, Suggested Next Steps
- Not a wall of text. Structured but not clinical.
- Uses terracotta subtly
- Feels like a thoughtful summary, not a generated report
- Phase 9.3: rendered at `col-proof` width

**Content-quality patterns the backend applies** (visible in output, set in [lib/graph/nodes.ts](lib/graph/nodes.ts) `recommendationNode`):
- **Divergence rule.** When the Block makes a recommendation the conversation didn't surface directly, it names the bridge. In UI terms: a Block that says *"you thought this was a visibility problem — here's why the panel sees it as a conversion-infrastructure problem instead"* should read as a thought-through pivot, not a non-sequitur.
- **Budget signal hierarchy.** Next Steps that involve spend respect STATED > CURRENT > HISTORICAL > INFERRED order. Regretted past spend is pain evidence, not budget.
- **Evidence binding.** Every recommendation in the Block traces to something the owner said or something research found. No free-floating advice. If you ever render a Block that recommends something the owner didn't mention and research didn't find, that's a backend bug — flag it.

---

## Agent Roster Design (chat)

This sidebar is the social system. It tells the user: "You are not alone at the table."

### Agent Card Anatomy

```
┌─────────────────────────┐
│ ● Marketer              │
│   How will people       │
│   actually find you?    │
│                         │
│   ○ Idle                │
└─────────────────────────┘
```

Each card shows:
- **Color indicator:** a dot or small bar in the agent's color
- **Name:** the agent's display name
- **One-liner:** a very short description of what they care about, in advisor voice. Examples: *"How will people actually find you?"* / *"Does the math hold up when month one is slower?"* / *"But who actually does this?"*
- **Status:** Idle, Thinking, Speaking, or Silent

### Agent States

**Idle:** Default. Agent is available but not active. Muted treatment — name and indicator visible but not prominent.

**Thinking:** Orchestrator has selected this agent but they haven't started generating yet. Indicator pulses gently or shifts to a brighter shade. One-liner could temporarily show *"Considering…"* but keep it subtle. **No spinning loaders. No bouncing dots.** The agent is *thinking*, not *loading*.

**Speaking:** Agent is actively generating. Card fully illuminated — color vivid, name prominent. State lasts while tokens stream.

**Silent:** Agent has been explicitly suppressed by the Orchestrator for this turn. Dimmed more than Idle. Deliberate state — signals that the agent could speak but the Orchestrator decided they shouldn't. Optional hover: *"Sitting this one out"* or similar.

### Transition Animations

Smooth, not instant. 300–400ms ease. The roster should feel alive — like people leaning in and leaning back — not like lights switching on and off.

**Never use:**
- Spinning loaders
- Bouncing dots
- Pulsing rings
- Any animation that says "AI is loading"

**Instead:** gentle opacity shifts, color warmth changes, subtle scale (1.0 → 1.02 on the active agent, not more).

---

## Composer Design

Always visible. Always interactive. Even when agents are speaking.

### Default State

Clean text area with a send button. Placeholder sets the tone.

**Do NOT use:**
- *"Type a message…"*
- *"Ask anything…"*
- *"Chat with AI…"*

**Instead:**
- *"What's on your mind?"*
- *"Describe your idea or ask a question…"*
- *"What are you working on?"*

### During Generation State

When agents are speaking, the composer gains a subtle "interrupt" indicator.

**NOT** a big red "STOP" button. That frames the AI as something that needs to be stopped.

**Instead:** the send button subtly shifts appearance (different icon or gentle color change) to indicate that sending a message will redirect the conversation. Tooltip or micro-label: *"Send to redirect the conversation."*

The user should never feel like they need permission to speak. The composer's active state during generation communicates: *"You can jump in whenever you want."*

### Post-Recommendation State

After a recommendation block is generated, the composer could display a contextual prompt:
- *"What do you want to explore further?"*
- *"Anything the panel missed?"*

This encourages continued deliberation rather than treating the recommendation as a final answer.

---

## Animations and Motion

Motion should feel organic, not mechanical. The interface is a room with people in it, not a machine processing requests.

- **Entrances:** Messages appear with a gentle fade and slight upward drift (8–12px, 200–300ms, ease-out). Not slide-in. Not pop.
- **Fade-up reveal (landing):** `opacity 0 → 1`, `translateY(18px → 0)`, `0.8s ease`. Applied via IntersectionObserver to `.reveal` elements. Only animation pattern.
- **Agent roster transitions:** Smooth state changes. See Agent States above.
- **Phase transitions:** Subtle visual wash or separator. Not a modal. Not a toast. A quiet marker.
- **Streaming text:** Characters appear naturally. **No typewriter effect with a blinking cursor.** Text materializes smoothly, as if being written on good paper.
- **CTA hover:** `translateY(-1px)` + subtle shadow. Lift, not bounce.

### What to Avoid

- Typewriter cursors
- Pulsing "AI thinking" orbs or rings
- Skeleton loaders for message content (streaming handles this)
- Confetti, sparkles, celebration animations
- Any animation that draws attention to the technology rather than the conversation

**Reduced-motion respect:** `html` has `scroll-behavior: smooth` for intra-page anchors but falls back to `auto` under `prefers-reduced-motion: reduce`. All motion obeys the same principle — reduced-motion users get static transitions.

---

## Responsive Design

### Desktop (1200px+)

All three chat panels visible. Center panel takes 50–60% of width. Sidebars take the remainder. Landing uses the col-poem / col-prose / col-proof rhythm at full width.

### Tablet (768–1199px)

Thread sidebar collapses to an icon rail or hidden behind a toggle. Agent roster remains visible but narrower — cards become more compact, showing color dot + name + status (one-liner hidden). Center panel expands. Landing column widths stay; page padding tightens.

### Mobile (<768px)

Full-screen message feed. Thread history via top-left menu or swipe. Agent roster via a floating pill at bottom-right that expands into a bottom sheet. Landing column widths collapse — col-poem and col-poem-end both center-align, become stacked rather than staggered.

The mobile experience must not feel like a downgraded desktop. The deliberation should feel just as alive on a phone — agents are visibly present (via the pill indicator), interrupts work, the conversation flows.

---

## Dark Mode

Support it, but don't default to it. Don't make it look like every other dark-mode AI app.

**Dark mode base:** Not pure black. Warm very dark gray or very dark warm brown. `#1C1B19`, not `#000000`. The room gets dimmer, not colder.

**Dark mode text:** Off-white with warmth. `#E8E6E1`, not `#FFFFFF`.

**Dark mode agent colors:** Same hues, slightly adjusted for contrast on dark backgrounds. Saturation can increase slightly. Roster still feels alive.

**Dark mode accents:** Terracotta may need a slightly lighter variant for accessibility. `#D3693F` is a candidate.

The goal: dark mode should feel like the same table in the evening, not like a different product.

---

## Component Inventory

### Marketing Components (landing)

| Component | Location | Description |
|---|---|---|
| `Recognition` | `/components/marketing/Recognition.tsx` | Beat 1 — split poem with centered question. col-poem + col-question + col-poem-end. |
| `OfferStamp` | `/components/marketing/OfferStamp.tsx` | Beat 2, dark band — the offer + primary CTA. |
| `Reframing` | `/components/marketing/Reframing.tsx` | Beat 2 continuation — prose setup + pivot quote. col-prose. |
| `Proof` | `/components/marketing/Proof.tsx` | Beat 3 — advisor excerpt card with Iron & Flow example. col-proof. |
| `RosterGrid` | `/components/marketing/RosterGrid.tsx` | Beat 4 — "Who sits at the table." 10 advisors + Ideation host footnote. |
| `Invitation` | `/components/marketing/Invitation.tsx` | Beat 5 — dark band closing. Inline AuthForm for anon, `Continue to your room →` for signed-in. |

### Chat Components

| Component | Location | Description |
|---|---|---|
| `ChatLayout` | `/app/chat/layout.tsx` | Three-panel shell. Handles responsive breakpoints. |
| `ThreadSidebar` | `/components/chat/ThreadSidebar.tsx` | Left panel. Thread list with creation, selection, search. |
| `MessageFeed` | `/components/chat/MessageFeed.tsx` | Center panel scroll area. Renders message list. Auto-scrolls on new messages unless user has scrolled up. |
| `MessageBubble` | `/components/chat/MessageBubble.tsx` | Single message. Adapts style based on role and agent_name. |
| `OrchestratorAnnotation` | `/components/chat/OrchestratorAnnotation.tsx` | Subtle inline annotation. Expandable. |
| `RecommendationBlock` | `/components/chat/RecommendationBlock.tsx` | Structured summary card: Strengths, Risks, Questions, Next Steps. |
| `PhaseMarker` | `/components/chat/PhaseMarker.tsx` | Quiet inline indicator when deliberation phase transitions. |
| `Composer` | `/components/chat/Composer.tsx` | Text input, send button, interrupt affordance. Always active. |
| `AgentRoster` | `/components/chat/AgentRoster.tsx` | Right panel. Contains AgentCards. |
| `AgentCard` | `/components/chat/AgentCard.tsx` | Individual agent: name, one-liner, color, status with animated transitions. |
| `MobileRosterPill` | `/components/chat/MobileRosterPill.tsx` | Floating indicator for mobile. Expands to bottom sheet. |

### Shared UI Components

| Component | Description |
|---|---|
| `Avatar` | Agent avatar — abstract shape or monogram in agent color. NOT a robot face. NOT a photo. A warm geometric mark. |
| `StatusDot` | Animated dot showing agent state. Smooth transitions. |
| `ExpandableSection` | For orchestrator annotations and recommendation details. |
| `Separator` | Horizontal rule used between message groups and at phase transitions. |

---

## What This Product Should NEVER Look Like

### The Chatbot

- Single column of alternating gray and white bubbles
- A robot avatar or generic AI icon
- "AI is typing…" with bouncing dots
- No sense of who is speaking or why

### The Dashboard

- Panels full of charts and metrics with a chat widget in the corner
- The conversation shoved into a sidebar
- Analytics taking precedence over the deliberation

### The Generic SaaS

- White background, blue accent, Inter font, rounded rectangles everywhere
- A sidebar with icons that could belong to any product
- Nothing memorable. Nothing warm.

### The AI Demo

- Dark background with glowing gradients
- Neon accents and particle effects
- "Powered by AI" badges
- The technology is the hero instead of the conversation

---

## What This Product SHOULD Feel Like

A well-designed conference room in a studio space. Good lighting. A table that invites you to spread out your work. People around it who are clearly experts but don't make you feel small. Someone managing the conversation so it stays productive. A whiteboard with real ideas on it.

The user opens the app and thinks: *"Let me bring this to the table."*

Not: *"Let me ask the AI."*

That's the design.

---

## Related Documentation

**RecommendationBlock** and the panel assessment flow use the same markdown section contract (`## Strengths`, `## Risks`, and so on) that the graph produces and that automated transcript checks validate. When you change heading labels or structure in the UI, keep **graph output**, **grader expectations** (`lib/test/grade-deliberation.ts`), and **design** aligned. For the full testing ladder and persona workflows, see **`BUILD.md` §6.2** and **`docs/testing.md`**.

**BUILD.md Phase 9** tracks the design-system rollout across landing (9.1), chat visual polish (9.2), column-width translation (9.3), advisor display names (9.4), and takeaway shape (9.5).
