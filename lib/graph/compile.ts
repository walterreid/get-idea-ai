import { StateGraph, START, END } from '@langchain/langgraph'
import { DeliberationStateAnnotation, type DeliberationState } from './state'
import {
  supervisorNode,
  workerNode,
  interruptHandlerNode,
  recommendationNode,
  researchNode,
} from './nodes'

/**
 * Maximum consecutive agent turns before the graph forces a yield to the user.
 * The supervisor can yield earlier — this is a hard ceiling, not a target.
 */
export const MAX_AGENT_TURNS = 6

// ─────────────────────────────────────────────────────────────────────────────
// Routing functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Conditional routing after supervisorNode.
 *
 * Priority order:
 * 1. Human interrupted → interruptHandler (clears flag, re-evaluates)
 * 2. Phase = recommendation → recommendationNode
 * 3. next_speaker = "user" or null → END (yield to user)
 * 4. research_needed is set → researchNode (runs before the worker)
 * 5. next_speaker = known agent name → worker
 */
function routeFromSupervisor(state: DeliberationState): string {
  if (state.human_interrupted) {
    return 'interrupt_handler'
  }

  if (state.deliberation_phase === 'recommendation') {
    return 'recommendation'
  }

  if (!state.next_speaker || state.next_speaker === 'user') {
    return END
  }

  // Research runs as a sub-step before the agent speaks — doesn't increment turn_count.
  // R4: when the orchestrator marks research as async, skip the inline node; the
  // chat route dispatches the tool call after the response closes (via
  // lib/research/scheduler.ts). The specialist answers this turn without the
  // fetched context; results land in accumulated_research for the NEXT round.
  if (state.research_needed && state.research_needed.async !== true) {
    return 'research'
  }

  return 'worker'
}

/**
 * Conditional routing after workerNode.
 *
 * After an agent speaks:
 * 1. Human interrupted → interruptHandler
 * 2. Turn limit reached → END (force yield to user)
 * 3. Otherwise → supervisor (decides if another agent should speak or if it's the user's turn)
 */
function routeFromWorker(state: DeliberationState): string {
  if (state.human_interrupted) {
    return 'interrupt_handler'
  }

  if (state.turn_count >= MAX_AGENT_TURNS) {
    return END
  }

  return 'supervisor'
}

// ─────────────────────────────────────────────────────────────────────────────
// Graph compilation
// ─────────────────────────────────────────────────────────────────────────────

function buildGraph() {
  return new StateGraph(DeliberationStateAnnotation)
    .addNode('supervisor', supervisorNode)
    .addNode('worker', workerNode)
    .addNode('interrupt_handler', interruptHandlerNode)
    .addNode('recommendation', recommendationNode)
    .addNode('research', researchNode)
    .addEdge(START, 'supervisor')
    .addConditionalEdges('supervisor', routeFromSupervisor, {
      interrupt_handler: 'interrupt_handler',
      recommendation: 'recommendation',
      research: 'research',
      worker: 'worker',
      [END]: END,
    })
    .addConditionalEdges('worker', routeFromWorker, {
      interrupt_handler: 'interrupt_handler',
      supervisor: 'supervisor',
      [END]: END,
    })
    .addEdge('interrupt_handler', 'supervisor')
    .addEdge('recommendation', END)
    // Research always proceeds to the worker — it is a sub-step, not a turn
    .addEdge('research', 'worker')
    .compile()
}

/**
 * The compiled deliberation graph.
 *
 * Stateless between API calls — each invocation receives the full conversation
 * history as initial state. Messages are persisted to Supabase in Phase 3;
 * the graph itself does not hold state across requests.
 */
export const deliberationGraph = buildGraph()

export type DeliberationGraph = typeof deliberationGraph
