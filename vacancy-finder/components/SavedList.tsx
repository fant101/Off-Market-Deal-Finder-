"use client";

import { useState } from "react";
import Badge from "./ui/Badge";
import Button from "./ui/Button";

interface SavedProperty {
  id: string;
  property_id: string;
  notes: string | null;
  status: "new" | "contacted" | "in_conversation" | "dead";
  saved_at: string;
  property: {
    id: string;
    address: string;
    city: string | null;
    state: string | null;
    zip: string | null;
    lat: number | null;
    lng: number | null;
    property_type: string | null;
    estimated_sf: string | null;
  };
  search_result: {
    vacancy_signal: string | null;
    confidence: "high" | "medium" | "low" | null;
    strategy: string | null;
    owner_name: string | null;
  } | null;
}

interface SavedListProps {
  properties: SavedProperty[];
  onUnsave: (propertyId: string) => void;
  onUpdateStatus: (propertyId: string, status: string) => void;
  onDraftOutreach: (property: SavedProperty) => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-700" },
  contacted: { label: "Contacted", color: "bg-amber-100 text-amber-700" },
  in_conversation: {
    label: "In Conversation",
    color: "bg-green-100 text-green-700",
  },
  dead: { label: "Dead", color: "bg-gray-100 text-gray-500" },
};

export default function SavedList({
  properties,
  onUnsave,
  onUpdateStatus,
  onDraftOutreach,
}: SavedListProps) {
  const [filter, setFilter] = useState<string>("all");

  const filtered =
    filter === "all"
      ? properties
      : properties.filter((p) => p.status === filter);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["all", "new", "contacted", "in_conversation", "dead"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              filter === s
                ? "bg-resolute-gold text-resolute-deep-green font-medium"
                : "bg-white text-gray-600 border border-resolute-border hover:border-resolute-gold"
            }`}
          >
            {s === "all"
              ? `All (${properties.length})`
              : `${STATUS_LABELS[s]?.label || s} (${properties.filter((p) => p.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-resolute-border">
          <p className="text-gray-500">No saved properties yet.</p>
          <p className="text-gray-400 text-sm mt-1">
            Search for vacant properties and save the ones you want to pursue.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((saved) => (
            <div
              key={saved.id}
              className="property-card bg-white rounded-lg shadow-sm p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-resolute-dark-green">
                    {saved.property.address}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {saved.property.city}, {saved.property.state}{" "}
                    {saved.property.zip || ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {saved.search_result?.confidence && (
                    <Badge variant={saved.search_result.confidence}>
                      {saved.search_result.confidence}
                    </Badge>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[saved.status]?.color || ""}`}
                  >
                    {STATUS_LABELS[saved.status]?.label || saved.status}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                {saved.property.property_type && (
                  <Badge variant="gold">{saved.property.property_type}</Badge>
                )}
                {saved.property.estimated_sf && (
                  <Badge variant="default">{saved.property.estimated_sf}</Badge>
                )}
              </div>

              {saved.search_result?.vacancy_signal && (
                <p className="text-sm text-gray-600 mt-2">
                  {saved.search_result.vacancy_signal}
                </p>
              )}

              {/* Status update + actions */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-resolute-border">
                <select
                  value={saved.status}
                  onChange={(e) =>
                    onUpdateStatus(saved.property_id, e.target.value)
                  }
                  className="text-xs border border-resolute-border rounded px-2 py-1 bg-white"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="in_conversation">In Conversation</option>
                  <option value="dead">Dead</option>
                </select>
                <div className="flex-1" />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onUnsave(saved.property_id)}
                >
                  Remove
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onDraftOutreach(saved)}
                >
                  Draft Outreach
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
