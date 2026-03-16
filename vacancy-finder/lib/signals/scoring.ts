import type { VacancySignal, VacancyScore, SignalBreakdownItem, SignalType } from "./types";
import { DEFAULT_SIGNAL_WEIGHTS, SIGNAL_LABELS } from "./types";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient } from "../anthropic";

/**
 * Multi-Signal Vacancy Scoring Engine (Feature #6)
 *
 * Aggregates signals from all data sources into a weighted composite score.
 * Supports learned weight overrides from deal outcome data (Feature #20).
 */
export function computeVacancyScore(
  signals: VacancySignal[],
  weightOverrides?: Partial<Record<SignalType, number>>
): VacancyScore {
  const weights = { ...DEFAULT_SIGNAL_WEIGHTS, ...weightOverrides };

  // Normalize weights so they sum to 1
  const activeTypes = new Set(signals.map((s) => s.type));
  let weightSum = 0;
  for (const t of activeTypes) {
    weightSum += weights[t] || 0;
  }
  // If no signals matched any weighted type, avoid division by zero
  if (weightSum === 0) weightSum = 1;

  const breakdown: SignalBreakdownItem[] = [];
  let compositeScore = 0;

  // Build breakdown for every signal type
  const signalTypeKeys = Object.keys(SIGNAL_LABELS) as SignalType[];
  for (const type of signalTypeKeys) {
    const matching = signals.filter((s) => s.type === type);
    const found = matching.length > 0;
    // Average the scores if multiple signals of same type
    const avgScore = found
      ? matching.reduce((sum, s) => sum + s.score, 0) / matching.length
      : 0;

    const rawWeight = weights[type] || 0;
    // Re-normalize weight relative to signals we actually have
    const normalizedWeight = activeTypes.size > 0 ? rawWeight / weightSum : 0;
    const weightedScore = avgScore * normalizedWeight;

    compositeScore += weightedScore;

    breakdown.push({
      type,
      label: SIGNAL_LABELS[type],
      score: Math.round(avgScore),
      weight: rawWeight,
      weighted_score: Math.round(weightedScore * 100) / 100,
      found,
      description: found
        ? matching.map((s) => s.description).join("; ")
        : "No data",
    });
  }

  compositeScore = Math.round(Math.min(100, Math.max(0, compositeScore)));

  // Multi-signal bonus: finding signals from 3+ different sources boosts confidence
  const uniqueSourceTypes = activeTypes.size;
  if (uniqueSourceTypes >= 4) {
    compositeScore = Math.min(100, compositeScore + 10);
  } else if (uniqueSourceTypes >= 3) {
    compositeScore = Math.min(100, compositeScore + 5);
  }

  const confidence: "high" | "medium" | "low" =
    compositeScore >= 65 ? "high" : compositeScore >= 35 ? "medium" : "low";

  return {
    composite_score: compositeScore,
    confidence,
    signal_count: signals.length,
    signals,
    breakdown: breakdown.sort((a, b) => b.weighted_score - a.weighted_score),
    predicted_vacant: compositeScore >= 45,
    reasoning: buildReasoning(signals, compositeScore, confidence),
  };
}

function buildReasoning(
  signals: VacancySignal[],
  score: number,
  confidence: "high" | "medium" | "low"
): string {
  if (signals.length === 0) return "No vacancy signals detected.";

  const parts: string[] = [];
  const byType = new Map<string, VacancySignal[]>();
  for (const s of signals) {
    const arr = byType.get(s.type) || [];
    arr.push(s);
    byType.set(s.type, arr);
  }

  for (const [type, sigs] of byType) {
    const label = SIGNAL_LABELS[type as SignalType] || type;
    parts.push(`${label}: ${sigs.map((s) => s.description).join("; ")}`);
  }

  return `Vacancy score: ${score}/100 (${confidence} confidence) based on ${signals.length} signal(s) from ${byType.size} source(s). ${parts.join(". ")}.`;
}

/**
 * Generate an AI summary of all signals for a property (uses Claude).
 * Returns a human-readable narrative the broker can use.
 */
export async function generateSignalSummary(
  address: string,
  signals: VacancySignal[],
  score: VacancyScore
): Promise<string> {
  const anthropic = getAnthropicClient();

  const signalDescriptions = signals
    .map((s) => `- [${SIGNAL_LABELS[s.type]}] ${s.description} (score: ${s.score}/100)`)
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system:
      "You are a commercial real estate analyst. Summarize vacancy evidence for a broker in 2-3 concise sentences. Be factual and specific. Do not hedge excessively.",
    messages: [
      {
        role: "user",
        content: `Property: ${address}\nComposite vacancy score: ${score.composite_score}/100\nSignals found:\n${signalDescriptions}\n\nSummarize the vacancy evidence for a CRE broker.`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join(" ");

  return text || score.reasoning;
}
