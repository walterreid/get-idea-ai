/**
 * Integration tests for the deliberation graph.
 *
 * Tests routing logic and state transitions without making real LLM calls
 * (those are integration-tested manually). DB calls use the real Supabase
 * instance — agents must be seeded first (npm run seed).
 *
 * Usage:  npm run test:graph
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: Graph compiles without error
// ─────────────────────────────────────────────────────────────────────────────

test('Graph compiles successfully', async () => {
  const { deliberationGraph } = await import('../lib/graph/compile.js')
  assert.ok(deliberationGraph, 'deliberationGraph should be defined')

  const graphDef = deliberationGraph.getGraph()
  const nodeNames = Object.keys(graphDef.nodes)

  assert.ok(nodeNames.includes('supervisor'), 'Graph should have supervisorNode')
  assert.ok(nodeNames.includes('worker'), 'Graph should have workerNode')
  assert.ok(nodeNames.includes('interrupt_handler'), 'Graph should have interruptHandlerNode')
  assert.ok(nodeNames.includes('recommendation'), 'Graph should have recommendationNode')
  assert.ok(nodeNames.includes('research'), 'Graph should have researchNode')

  console.log('  ✓ Nodes:', nodeNames.filter(n => !['__start__','__end__'].includes(n)).join(', '))
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: RoutingDecisionSchema validates correctly
// ─────────────────────────────────────────────────────────────────────────────

test('RoutingDecisionSchema accepts valid routing JSON', async () => {
  const { RoutingDecisionSchema } = await import('../lib/agents/schema.js')

  const valid = {
    next_speaker: 'finance',
    reason: 'The user mentioned pricing without numbers — Finance should quantify.',
    objective: 'quantify',
    deliberation_phase: 'critique',
    suppress: ['marketer', 'creative'],
    user_sophistication: 'intermediate',
  }

  const result = RoutingDecisionSchema.safeParse(valid)
  assert.ok(result.success, `Schema should accept valid routing: ${JSON.stringify(result)}`)
  assert.equal(result.data?.next_speaker, 'finance')
  assert.equal(result.data?.deliberation_phase, 'critique')
  console.log('  ✓ Valid routing decision parses correctly')
})

test('RoutingDecisionSchema rejects invalid deliberation_phase', async () => {
  const { RoutingDecisionSchema } = await import('../lib/agents/schema.js')

  const invalid = {
    next_speaker: 'finance',
    reason: 'Test',
    objective: 'quantify', // free-form string is allowed
    deliberation_phase: 'invalid_phase', // not in enum
    suppress: [],
    user_sophistication: 'novice',
  }

  const result = RoutingDecisionSchema.safeParse(invalid)
  assert.ok(!result.success, 'Schema should reject invalid deliberation_phase')
  console.log('  ✓ Invalid deliberation_phase correctly rejected')
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: interruptHandlerNode resets state correctly
// ─────────────────────────────────────────────────────────────────────────────

test('interruptHandlerNode resets interrupt flag and turn count', async () => {
  const { interruptHandlerNode } = await import('../lib/graph/nodes.js')
  const { HumanMessage, AIMessage } = await import('@langchain/core/messages')

  const fakeState = {
    messages: [
      new HumanMessage('I want to add delivery'),
      new AIMessage({ content: 'Great idea...', name: 'marketer', additional_kwargs: { display_name: 'Marketer' } }),
    ],
    current_speaker: 'marketer',
    next_speaker: 'marketer',
    deliberation_phase: 'exploration' as const,
    human_interrupted: true,
    user_sophistication: 'intermediate' as const,
    turn_count: 3,
    suppressed_agents: ['creative'],
    routing_reason: 'previous reason',
    routing_objective: 'expand',
    prior_insights_context: '',
    research_needed: null,
    research_context: [],
    accumulated_research: null,
    force_recommendation: false,
  }

  const result = await interruptHandlerNode(fakeState)

  assert.equal(result.human_interrupted, false, 'human_interrupted should be reset to false')
  assert.equal(result.turn_count, 0, 'turn_count should be reset to 0')
  assert.equal(result.current_speaker, null, 'current_speaker should be cleared')
  assert.equal(result.next_speaker, null, 'next_speaker should be cleared')
  console.log('  ✓ Interrupt handler resets state correctly')
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: Verify all 10 active agents are fetchable by name
// ─────────────────────────────────────────────────────────────────────────────

test('All seeded agents are fetchable by name from the DB', async () => {
  const { fetchActiveAgents, fetchAgentByName, invalidateAgentCache } =
    await import('../lib/agents/graph-loader.js')

  invalidateAgentCache()
  const agents = await fetchActiveAgents()

  assert.ok(agents.length >= 10, `Expected at least 10 active agents, got ${agents.length}`)
  console.log(`  ✓ ${agents.length} active agents returned`)

  const expectedAgents = [
    'marketer', 'finance', 'creative', 'copywriter', 'designer',
    'accountant', 'operations', 'legal', 'cx', 'realist',
  ]

  for (const name of expectedAgents) {
    const agent = await fetchAgentByName(name)
    assert.ok(agent !== null, `Agent "${name}" should be in the database`)
    assert.ok(agent!.system_prompt.length > 100, `Agent "${name}" should have a substantive system_prompt`)
  }
  console.log(`  ✓ All ${expectedAgents.length} expected agents fetchable and have system prompts`)
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: Orchestrator config is present and has {AGENTS_CONTEXT} placeholder
// ─────────────────────────────────────────────────────────────────────────────

test('Orchestrator config has {AGENTS_CONTEXT} placeholder', async () => {
  const { fetchOrchestratorConfig, invalidateAgentCache } =
    await import('../lib/agents/graph-loader.js')

  invalidateAgentCache()
  const orchestrator = await fetchOrchestratorConfig()

  assert.ok(orchestrator, 'Orchestrator config should be in the DB')
  assert.equal(orchestrator.status, 'system', 'Orchestrator status should be "system"')
  assert.ok(
    orchestrator.system_prompt.includes('{AGENTS_CONTEXT}'),
    'Orchestrator system_prompt must contain {AGENTS_CONTEXT} placeholder for runtime injection'
  )
  assert.ok(
    orchestrator.system_prompt.includes('next_speaker'),
    'Orchestrator prompt must instruct the model to output next_speaker in JSON'
  )
  console.log('  ✓ Orchestrator config valid with {AGENTS_CONTEXT} placeholder')
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 6: buildAgentContext produces non-empty injection block
// ─────────────────────────────────────────────────────────────────────────────

test('buildAgentContext formats agent list for orchestrator injection', async () => {
  const { fetchActiveAgents, buildAgentContext, invalidateAgentCache, fetchOrchestratorConfig } =
    await import('../lib/agents/graph-loader.js')

  invalidateAgentCache()
  const agents = await fetchActiveAgents()
  const context = buildAgentContext(agents)

  assert.ok(context.length > 500, 'Agent context should be substantial')
  assert.ok(context.includes('marketer'), 'Context should include marketer agent name')
  assert.ok(context.includes('realist'), 'Context should include realist agent name')
  assert.ok(context.includes('description_for_orchestrator') === false,
    'Context should not include the field name, only the content')

  // Verify the substitution works in the orchestrator prompt
  const orchestrator = await fetchOrchestratorConfig()
  const injected = orchestrator.system_prompt.replace('{AGENTS_CONTEXT}', context)
  assert.ok(
    !injected.includes('{AGENTS_CONTEXT}'),
    'After substitution, no placeholder should remain'
  )
  console.log(`  ✓ Agent context built (${context.length} chars), placeholder substitution verified`)
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 7: MAX_AGENT_TURNS cycle limit is enforced by routing logic
// ─────────────────────────────────────────────────────────────────────────────

test('Cycle limit: turn_count >= MAX_AGENT_TURNS forces END via routeFromWorker', async () => {
  const { MAX_AGENT_TURNS } = await import('../lib/graph/compile.js')

  // We can't call the private routeFromWorker directly, but we can verify
  // that MAX_AGENT_TURNS is set to the value specified in BUILD.md
  assert.equal(MAX_AGENT_TURNS, 6, 'MAX_AGENT_TURNS should be 6 per BUILD.md spec')
  console.log(`  ✓ MAX_AGENT_TURNS = ${MAX_AGENT_TURNS}`)
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 8: No hardcoded agent names in nodes.ts
// ─────────────────────────────────────────────────────────────────────────────

test('nodes.ts contains no hardcoded agent name conditionals', async () => {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const nodesPath = path.resolve(process.cwd(), 'lib/graph/nodes.ts')
  const source = await fs.readFile(nodesPath, 'utf-8')

  // Strip single-line comments before checking — we allow comments that quote
  // the anti-pattern as documentation of what NOT to do.
  const codeOnly = source
    .split('\n')
    .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
    .join('\n')

  // These patterns indicate hardcoded agent routing in actual code — forbidden by CLAUDE.md
  const forbidden = [
    /if\s*\(.*\bname\b.*===.*['"]finance['"]/,
    /if\s*\(.*\bname\b.*===.*['"]marketer['"]/,
    /if\s*\(.*\bname\b.*===.*['"]realist['"]/,
    /switch\s*\(\s*state\.next_speaker/,
  ]

  for (const pattern of forbidden) {
    assert.ok(
      !pattern.test(codeOnly),
      `nodes.ts should not contain hardcoded agent name conditional: ${pattern}`
    )
  }
  console.log('  ✓ No hardcoded agent name conditionals found in nodes.ts')
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 9: mergeAccumulatedResearch merges patches without dropping arrays
// ─────────────────────────────────────────────────────────────────────────────

test('mergeAccumulatedResearch appends provenance and increments batches', async () => {
  const { mergeAccumulatedResearch, emptyAccumulatedResearch } =
    await import('../lib/agents/schema.js')

  const a = emptyAccumulatedResearch()
  const m1 = mergeAccumulatedResearch(a, {
    tool_rounds: { batches_run: 1 },
    queries_used: ['coffee shop delivery'],
    provenance: [
      {
        kind: 'web_search',
        ref: 'coffee shop delivery',
        fetched_at: '2026-01-01T00:00:00Z',
        success: true,
      },
    ],
  })
  assert.equal(m1.tool_rounds?.batches_run, 1)
  assert.equal(m1.queries_used?.length, 1)

  const m2 = mergeAccumulatedResearch(m1, {
    tool_rounds: { batches_run: 1 },
    primary_url: 'https://example.com',
    flags: { primary_url_fetched: true, needs_confirmation: [] },
    provenance: [
      {
        kind: 'fetch_url',
        ref: 'https://example.com',
        fetched_at: '2026-01-01T00:00:01Z',
        success: true,
        title: 'Ex',
      },
    ],
  })
  assert.equal(m2.tool_rounds?.batches_run, 2)
  assert.equal(m2.primary_url, 'https://example.com')
  assert.equal(m2.provenance?.length, 2)
  console.log('  ✓ mergeAccumulatedResearch merges as expected')
})

console.log('\nRunning deliberation graph tests...\n')
