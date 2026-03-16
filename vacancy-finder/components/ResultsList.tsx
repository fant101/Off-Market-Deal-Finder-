"use client";

import { useState } from "react";
import PropertyCard from "./PropertyCard";
import Badge from "./ui/Badge";
import type { VacantProperty } from "@/lib/types";

interface ResultsListProps {
  properties: VacantProperty[];
  marketNotes: string;
  onSave: (property: VacantProperty) => void;
  onSkip: (property: VacantProperty) => void;
  onDraftOutreach: (property: VacantProperty) => void;
  savedIds: Set<string>;
}

type SortField = "confidence" | "address" | "property_type";

export default function ResultsList({
  properties,
  marketNotes,
  onSave,
  onSkip,
  onDraftOutreach,
  savedIds,
}: ResultsListProps) {
  const [sortBy, setSortBy] = useState<SortField>("confidence");

  const confRank = { high: 3, medium: 2, low: 1 };

  const sorted = [...properties].sort((a, b) => {
    if (sortBy === "confidence") {
      return confRank[b.confidence] - confRank[a.confidence];
    }
    if (sortBy === "address") return a.address.localeCompare(b.address);
    if (sortBy === "property_type")
      return a.property_type.localeCompare(b.property_type);
    return 0;
  });

  const highCount = properties.filter((p) => p.confidence === "high").length;
  const medCount = properties.filter((p) => p.confidence === "medium").length;
  const lowCount = properties.filter((p) => p.confidence === "low").length;

  const strategies = new Set(
    properties.flatMap((p) => p.strategy.split(", "))
  );

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-white rounded-lg p-4 border border-resolute-border">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-display font-semibold text-resolute-dark-green">
            {properties.length} properties found
          </span>
          <div className="flex gap-2">
            {highCount > 0 && (
              <Badge variant="high">{highCount} high confidence</Badge>
            )}
            {medCount > 0 && (
              <Badge variant="medium">{medCount} medium</Badge>
            )}
            {lowCount > 0 && <Badge variant="low">{lowCount} low</Badge>}
          </div>
          <div className="flex gap-1 ml-auto">
            {Array.from(strategies).map((s) => (
              <Badge key={s} variant="gold">
                {s}
              </Badge>
            ))}
          </div>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-resolute-border">
          <span className="text-xs text-gray-500">Sort by:</span>
          {(["confidence", "address", "property_type"] as SortField[]).map(
            (field) => (
              <button
                key={field}
                onClick={() => setSortBy(field)}
                className={`text-xs px-2 py-1 rounded ${
                  sortBy === field
                    ? "bg-resolute-gold/10 text-resolute-gold font-medium"
                    : "text-gray-500 hover:text-resolute-dark-green"
                }`}
              >
                {field === "property_type"
                  ? "Type"
                  : field.charAt(0).toUpperCase() + field.slice(1)}
              </button>
            )
          )}
        </div>
      </div>

      {/* Market notes */}
      {marketNotes && (
        <div className="bg-resolute-dark-green/5 rounded-lg p-4 border-l-4 border-resolute-gold">
          <h3 className="text-sm font-semibold text-resolute-dark-green mb-1">
            Market Notes
          </h3>
          <p className="text-sm text-gray-700">{marketNotes}</p>
        </div>
      )}

      {/* Property cards */}
      <div className="space-y-3">
        {sorted.map((prop, i) => (
          <PropertyCard
            key={prop.id || `${prop.address}-${prop.city}-${prop.state}`}
            property={prop}
            onSave={onSave}
            onSkip={onSkip}
            onDraftOutreach={onDraftOutreach}
            isSaved={savedIds.has(
              `${prop.address}-${prop.city}-${prop.state}`.toLowerCase()
            )}
          />
        ))}
      </div>

      {properties.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-resolute-border">
          <p className="text-gray-500 text-sm">No properties found.</p>
          <p className="text-gray-400 text-xs mt-1">
            Try a broader search area, different property type, or more
            strategies.
          </p>
        </div>
      )}
    </div>
  );
}
