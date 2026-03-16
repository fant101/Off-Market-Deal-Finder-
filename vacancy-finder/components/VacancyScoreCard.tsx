"use client";

import type { VacancyScore } from "@/lib/signals/types";
import { SIGNAL_LABELS } from "@/lib/signals/types";
import Badge from "./ui/Badge";

interface VacancyScoreCardProps {
  score: VacancyScore;
  compact?: boolean;
}

export default function VacancyScoreCard({
  score,
  compact = false,
}: VacancyScoreCardProps) {
  const scoreColor =
    score.composite_score >= 65
      ? "text-red-600"
      : score.composite_score >= 35
        ? "text-amber-600"
        : "text-green-600";

  const ringColor =
    score.composite_score >= 65
      ? "stroke-red-500"
      : score.composite_score >= 35
        ? "stroke-amber-500"
        : "stroke-green-500";

  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score.composite_score / 100) * circumference;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative w-10 h-10">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              className="text-gray-200"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              className={ringColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <span
            className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${scoreColor}`}
          >
            {score.composite_score}
          </span>
        </div>
        <div>
          <p className="text-xs font-medium text-resolute-dark-green">
            Vacancy Score
          </p>
          <p className="text-xs text-gray-500">
            {score.signal_count} signal{score.signal_count !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-resolute-border p-4">
      <div className="flex items-center gap-4">
        {/* Score ring */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              className="text-gray-200"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              className={ringColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-lg font-bold ${scoreColor}`}>
              {score.composite_score}
            </span>
            <span className="text-[10px] text-gray-400">/100</span>
          </div>
        </div>

        {/* Summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm text-resolute-dark-green">
              Vacancy Score
            </h3>
            <Badge variant={score.confidence}>{score.confidence}</Badge>
            {score.predicted_vacant && (
              <Badge variant="high">Likely Vacant</Badge>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {score.signal_count} signal{score.signal_count !== 1 ? "s" : ""}{" "}
            analyzed from{" "}
            {new Set(score.signals.map((s) => s.type)).size} source
            {new Set(score.signals.map((s) => s.type)).size !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Signal breakdown */}
      <div className="mt-4 space-y-2">
        {score.breakdown
          .filter((b) => b.found)
          .map((item) => (
            <div key={item.type} className="flex items-center gap-2">
              <div className="w-24 text-xs text-gray-500 truncate">
                {item.label}
              </div>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    item.score >= 65
                      ? "bg-red-400"
                      : item.score >= 35
                        ? "bg-amber-400"
                        : "bg-green-400"
                  }`}
                  style={{ width: `${item.score}%` }}
                />
              </div>
              <span className="text-xs font-medium w-8 text-right">
                {item.score}
              </span>
            </div>
          ))}
      </div>

      {/* Top signals list */}
      {score.signals.length > 0 && (
        <div className="mt-3 pt-3 border-t border-resolute-border">
          <p className="text-xs font-medium text-resolute-dark-green mb-2">
            Key Evidence
          </p>
          <div className="space-y-1.5">
            {score.signals
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map((signal, i) => (
                <div key={`${signal.type}-${i}`} className="flex gap-2 text-xs">
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      signal.score >= 65
                        ? "bg-red-400"
                        : signal.score >= 35
                          ? "bg-amber-400"
                          : "bg-green-400"
                    }`}
                  />
                  <div>
                    <span className="font-medium text-resolute-dark-green">
                      {SIGNAL_LABELS[signal.type]}:
                    </span>{" "}
                    <span className="text-gray-600">{signal.description}</span>
                    {signal.evidence_url && (
                      <a
                        href={signal.evidence_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-resolute-gold hover:underline"
                      >
                        [source]
                      </a>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
