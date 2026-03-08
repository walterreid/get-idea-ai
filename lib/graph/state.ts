import { Annotation, MessagesAnnotation } from '@langchain/langgraph'

/**
 * Full state for one deliberation run.
 *
 * Messages use LangGraph's built-in MessagesAnnotation reducer which appends
 * new messages by ID and updates existing ones — no replacement.
 *
 * All other fields use last-write-wins (the returning node sets the new value).
 */
export const DeliberationStateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,

  /** Which agent is currently assigned to speak (null before first routing). */
  current_speaker: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  /** Which agent or "user" the supervisor has selected to speak next. */
  next_speaker: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  /** Current position in the deliberation arc. */
  deliberation_phase: Annotation<
    'exploration' | 'critique' | 'synthesis' | 'recommendation'
  >({
    reducer: (_, next) => next,
    default: () => 'exploration',
  }),

  /**
   * Set to true when the user sends a message while agents are generating.
   * Triggers interruptHandlerNode before the next routing decision.
   */
  human_interrupted: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),

  /** Assessed from the user's language and questions. Starts unknown. */
  user_sophistication: Annotation<
    'novice' | 'intermediate' | 'advanced' | 'unknown'
  >({
    reducer: (_, next) => next,
    default: () => 'unknown',
  }),

  /**
   * Number of consecutive agent turns since the user last spoke.
   * Forced yield to user at MAX_AGENT_TURNS.
   */
  turn_count: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),

  /** Agent names the supervisor has explicitly told to stay silent this turn. */
  suppressed_agents: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  /**
   * The Orchestrator's reasoning for the last routing decision.
   * Surfaced to the client as a contextual annotation — product surface, not a log.
   */
  routing_reason: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),

  /** The Orchestrator's stated objective for the current agent turn. */
  routing_objective: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),

  /**
   * Pre-formatted summary of prior insights extracted from previous deliberation rounds.
   * Injected by the API route from the idea_insights table before the graph runs.
   * The supervisor node prepends this to its context so the orchestrator knows what
   * ground has already been covered and can build forward rather than repeat.
   *
   * Empty string means this is the first session — no prior memory.
   */
  prior_insights_context: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
})

export type DeliberationState = typeof DeliberationStateAnnotation.State
