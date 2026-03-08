/**
 * Placeholder agent data for Phase 0 UI shell.
 * In Phase 1 these come from the agent_configs table.
 */

export type AgentStatus = 'idle' | 'thinking' | 'speaking' | 'silent'

export interface AgentProfile {
  name: string
  displayName: string
  oneLiner: string
  color: string        // CSS custom property value
  status: AgentStatus
}

export const PLACEHOLDER_AGENTS: AgentProfile[] = [
  {
    name: 'marketer',
    displayName: 'Marketer',
    oneLiner: 'How will anyone find out about it?',
    color: 'var(--agent-marketer)',
    status: 'idle',
  },
  {
    name: 'finance',
    displayName: 'Finance',
    oneLiner: 'Does the math actually work?',
    color: 'var(--agent-finance)',
    status: 'idle',
  },
  {
    name: 'creative',
    displayName: 'Creative',
    oneLiner: "What's the story worth telling?",
    color: 'var(--agent-creative)',
    status: 'idle',
  },
  {
    name: 'copywriter',
    displayName: 'Copywriter',
    oneLiner: 'What are the right words?',
    color: 'var(--agent-copywriter)',
    status: 'idle',
  },
  {
    name: 'designer',
    displayName: 'Designer',
    oneLiner: 'How will it look and feel?',
    color: 'var(--agent-designer)',
    status: 'idle',
  },
  {
    name: 'accountant',
    displayName: 'Accountant',
    oneLiner: 'Where does the money actually go?',
    color: 'var(--agent-accountant)',
    status: 'idle',
  },
  {
    name: 'operations',
    displayName: 'Operations',
    oneLiner: 'But who actually does this?',
    color: 'var(--agent-operations)',
    status: 'idle',
  },
  {
    name: 'legal',
    displayName: 'Legal Awareness',
    oneLiner: "You'll want a lawyer for this part.",
    color: 'var(--agent-legal)',
    status: 'idle',
  },
  {
    name: 'cx',
    displayName: 'Customer Experience',
    oneLiner: 'What does this feel like to the customer?',
    color: 'var(--agent-cx)',
    status: 'idle',
  },
  {
    name: 'realist',
    displayName: 'Business Realist',
    oneLiner: "Let's name the thing no one is naming.",
    color: 'var(--agent-realist)',
    status: 'idle',
  },
]

export type MessageRole = 'user' | 'agent' | 'orchestrator' | 'system'

export interface Message {
  id: string
  role: MessageRole
  agentName?: string
  content: string
  routingReason?: string
  deliberationPhase?: 'exploration' | 'critique' | 'synthesis' | 'recommendation'
  createdAt: Date
}

export const PLACEHOLDER_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'system',
    content: 'A new conversation has started.',
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: '2',
    role: 'user',
    content:
      "I'm thinking about adding a lunch delivery service to my bakery. We already do great foot traffic in the mornings but it falls off after 11. I want to capture more of the lunch crowd without them having to come in.",
    createdAt: new Date(Date.now() - 4 * 60 * 1000),
  },
  {
    id: '3',
    role: 'orchestrator',
    content: '',
    routingReason:
      'Starting with Finance — the idea has an operational cost structure that should be understood before the marketing layer is added.',
    deliberationPhase: 'exploration',
    createdAt: new Date(Date.now() - 3 * 60 * 1000 - 30 * 1000),
  },
  {
    id: '4',
    role: 'agent',
    agentName: 'finance',
    content:
      "Before we get into how to market this, let's make sure the numbers have a pulse. Delivery adds costs that foot traffic doesn't: packaging, a delivery platform cut (typically 15–30% if you use a third party), and the labor to package orders during what is currently a dead window. What are your current margins on baked goods? And do you have any idle labor between 10am and 1pm, or would this require new hours?",
    createdAt: new Date(Date.now() - 3 * 60 * 1000),
  },
  {
    id: '5',
    role: 'orchestrator',
    content: '',
    routingReason:
      'Operations should weigh in on the execution reality before the user responds — kitchen capacity and packaging workflow are the other half of this question.',
    deliberationPhase: 'exploration',
    createdAt: new Date(Date.now() - 2 * 60 * 1000 - 30 * 1000),
  },
  {
    id: '6',
    role: 'agent',
    agentName: 'operations',
    content:
      "One thing to think about before you answer the finance questions: bakeries are usually in full wind-down mode by 11. Your ovens are cooling, your prep staff may be leaving. Delivery orders require a second production window with packaging stations, order management, and potentially a dedicated phone or tablet for the platform. That's a workflow change, not just a marketing decision. Worth knowing if your space and team can absorb it before you commit.",
    createdAt: new Date(Date.now() - 2 * 60 * 1000),
  },
]

export const PLACEHOLDER_THREADS = [
  {
    id: 'thread-1',
    title: 'Bakery lunch delivery idea',
    preview: 'Adding delivery to capture the lunch crowd…',
    updatedAt: new Date(Date.now() - 2 * 60 * 1000),
    active: true,
  },
  {
    id: 'thread-2',
    title: 'Raising freelance rates',
    preview: "I haven't raised my rates in three years…",
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    active: false,
  },
  {
    id: 'thread-3',
    title: 'Food truck location strategy',
    preview: 'Two spots available — downtown vs. the park…',
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    active: false,
  },
]
