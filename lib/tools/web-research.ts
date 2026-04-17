/**
 * lib/tools/web-research.ts
 *
 * Two research tools the orchestrator invokes before routing to a specialist:
 *
 *   fetchUrl   — Jina Reader: URL → clean reading-optimized text.
 *   webSearch  — Serper: Google search API → top organic results.
 *
 * Both:
 *   - Fail gracefully (structured errors, never throw to callers)
 *   - Use hard timeouts
 *   - Return digestible structure for LLM injection
 *
 * Env: JINA_API_KEY, SERPER_API_KEY (see .env.example)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

export interface FetchUrlResult {
  type: 'fetch_url'
  url: string
  success: boolean
  title?: string
  description?: string
  /** Clean text (Reader output), truncated */
  content?: string
  error?: string
  fetched_at: string
}

export interface WebSearchResult {
  type: 'web_search'
  query: string
  success: boolean
  results?: Array<{
    title: string
    url: string
    snippet: string
    score?: number
  }>
  /** Extracted answer box / AI overview when Serper returns it */
  answer?: string
  error?: string
  fetched_at: string
}

export type ResearchResult = FetchUrlResult | WebSearchResult

// ─────────────────────────────────────────────────────────────────────────────
// Jina Reader — fetchUrl
// ─────────────────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 25000
const MAX_CONTENT_CHARS = 12000

/**
 * Reads a public URL via Jina Reader (r.jina.ai) and returns clean text.
 * https://jina.ai/reader
 */
export async function fetchUrl(url: string): Promise<FetchUrlResult> {
  const fetched_at = new Date().toISOString()
  const apiKey = process.env.JINA_API_KEY

  let normalizedUrl: string
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    normalizedUrl = parsed.href
  } catch {
    return { type: 'fetch_url', url, success: false, error: 'Invalid URL format.', fetched_at }
  }

  if (!apiKey?.trim()) {
    return {
      type: 'fetch_url',
      url: normalizedUrl,
      success: false,
      error: 'JINA_API_KEY is not configured.',
      fetched_at,
    }
  }

  const readerUrl = `https://r.jina.ai/${normalizedUrl}`

  try {
    const response = await fetch(readerUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'text/plain',
        'X-Return-Format': 'markdown',
      },
    })

    if (!response.ok) {
      return {
        type: 'fetch_url',
        url: normalizedUrl,
        success: false,
        error: `Reader returned HTTP ${response.status}.`,
        fetched_at,
      }
    }

    const text = await response.text()
    const content = text.trim().slice(0, MAX_CONTENT_CHARS)

    // First line is often the title in Reader markdown
    const firstLine = content.split('\n')[0]?.replace(/^#\s*/, '').trim() ?? ''

    return {
      type: 'fetch_url',
      url: normalizedUrl,
      success: true,
      title: firstLine || undefined,
      content: content || '(No text returned)',
      fetched_at,
    }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === 'TimeoutError' || err.name === 'AbortError'
          ? 'Page read timed out.'
          : err.message
        : 'Unknown fetch error.'

    return { type: 'fetch_url', url: normalizedUrl, success: false, error: message, fetched_at }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Serper — webSearch
// ─────────────────────────────────────────────────────────────────────────────

const SEARCH_TIMEOUT_MS = 15000
const MAX_SEARCH_RESULTS = 5

interface SerperOrganic {
  title?: string
  link?: string
  snippet?: string
}

interface SerperResponse {
  organic?: SerperOrganic[]
  answerBox?: { answer?: string; title?: string }
  knowledgeGraph?: { title?: string; description?: string }
}

/**
 * Web search via Serper (google.serper.dev).
 * https://serper.dev
 */
export async function webSearch(query: string): Promise<WebSearchResult> {
  const fetched_at = new Date().toISOString()
  const apiKey = process.env.SERPER_API_KEY

  if (!apiKey?.trim()) {
    return {
      type: 'web_search',
      query,
      success: false,
      error: 'SERPER_API_KEY is not configured.',
      fetched_at,
    }
  }

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: MAX_SEARCH_RESULTS,
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      return {
        type: 'web_search',
        query,
        success: false,
        error: `Serper HTTP ${response.status}: ${errText.slice(0, 200)}`,
        fetched_at,
      }
    }

    const data = (await response.json()) as SerperResponse
    const organic = data.organic ?? []

    const results = organic.slice(0, MAX_SEARCH_RESULTS).map((r, i) => ({
      title: r.title ?? '',
      url: r.link ?? '',
      snippet: r.snippet ?? '',
      score: 1 - i * 0.05,
    }))

    let answer: string | undefined
    if (data.answerBox?.answer) {
      answer = data.answerBox.answer
    } else if (data.knowledgeGraph?.description) {
      answer = [data.knowledgeGraph.title, data.knowledgeGraph.description].filter(Boolean).join(' — ')
    }

    return {
      type: 'web_search',
      query,
      success: true,
      results,
      answer,
      fetched_at,
    }
  } catch (err) {
    return {
      type: 'web_search',
      query,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown search error.',
      fetched_at,
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Format for LLM consumption
// ─────────────────────────────────────────────────────────────────────────────

export function formatResearchForContext(result: ResearchResult): string {
  if (!result.success) {
    const target = result.type === 'fetch_url' ? result.url : result.query
    return `[Research failed — ${result.type === 'fetch_url' ? result.url : `"${result.query}"`}: ${result.error}]`
  }

  if (result.type === 'fetch_url') {
    const lines: string[] = [
      `[Web page (via Reader): ${result.url}]`,
      result.title ? `Title/heading: ${result.title}` : '',
      '',
      result.content ?? '(No text content)',
    ]
    return lines.filter(Boolean).join('\n')
  }

  const lines: string[] = [`[Web search: "${result.query}"]`]
  if (result.answer) lines.push(`Answer overview: ${result.answer}`, '')
  for (const r of result.results ?? []) {
    lines.push(`• ${r.title}`, `  ${r.url}`, `  ${r.snippet}`, '')
  }
  return lines.join('\n').trim()
}
