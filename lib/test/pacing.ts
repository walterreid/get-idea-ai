/**
 * Typing-delay pacing for the multi-round persona harness.
 *
 * Adapted from the Zansei run_test_suite.py pattern (see
 * test/personas/zansei-reference.md). The delay models a human reading the
 * panel's latest message and composing a reply — short responses get a short
 * delay, long responses get a longer one, linearly interpolated between.
 *
 * Why this exists:
 *   - GetIdea's research is sync-in-POST (runs inside the chat POST). The
 *     `done` event wait is the real pacing gate. This delay is hedge margin on
 *     top of that — enough time for the orchestrator to update state, the
 *     feed to render, and accumulated research to settle.
 *   - §6.2 hard-fail check: "Pacing (sync-in-POST research)".
 *
 * Defaults are conservative (2s–6s). Override per run via --pace-min/--pace-max.
 */

export interface PacingConfig {
  /** Minimum delay in ms (applied to very short panel responses). */
  min_ms: number
  /** Maximum delay in ms (applied to very long panel responses). */
  max_ms: number
  /** Character count at/below which we use min_ms. */
  short_threshold_chars: number
  /** Character count at/above which we use max_ms. */
  long_threshold_chars: number
}

export const DEFAULT_PACING: PacingConfig = {
  min_ms: 2000,
  max_ms: 6000,
  short_threshold_chars: 30,
  long_threshold_chars: 150,
}

/**
 * Compute typing delay in ms based on the length of the panel's most recent
 * message the role-player would be "reading" before replying.
 *
 * Linear interpolation between min_ms (at short_threshold_chars or fewer) and
 * max_ms (at long_threshold_chars or more). Always returns a finite integer.
 */
export function computeTypingDelay(
  panelResponseChars: number,
  cfg: PacingConfig = DEFAULT_PACING
): number {
  const { min_ms, max_ms, short_threshold_chars, long_threshold_chars } = cfg

  if (panelResponseChars <= short_threshold_chars) return Math.round(min_ms)
  if (panelResponseChars >= long_threshold_chars) return Math.round(max_ms)

  const span = long_threshold_chars - short_threshold_chars
  const progress = (panelResponseChars - short_threshold_chars) / span
  return Math.round(min_ms + progress * (max_ms - min_ms))
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
