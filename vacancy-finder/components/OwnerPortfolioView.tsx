"use client";

import { useState } from "react";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import type { OwnerPortfolio } from "@/lib/signals/types";

interface OwnerPortfolioViewProps {
  portfolio: OwnerPortfolio;
  onAnalyzeProperty?: (address: string, city: string, state: string) => void;
}

export default function OwnerPortfolioView({
  portfolio,
  onAnalyzeProperty,
}: OwnerPortfolioViewProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-resolute-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold text-resolute-dark-green">
            {portfolio.owner_name}
          </h3>
          {portfolio.owner_entity_id && (
            <p className="text-xs text-gray-400 mt-0.5">
              Entity: {portfolio.owner_entity_id}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <Badge variant="default">
              {portfolio.total_properties} properties
            </Badge>
            {portfolio.flagged_count > 0 && (
              <Badge variant="high">
                {portfolio.flagged_count} flagged
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Property list */}
      <div className="mt-3 pt-3 border-t border-resolute-border">
        <div className="space-y-2">
          {portfolio.properties
            .slice(0, expanded ? undefined : 5)
            .map((prop, i) => (
              <div
                key={`${prop.address}-${i}`}
                className="flex items-center gap-2 text-xs"
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    prop.has_vacancy_signals ? "bg-red-400" : "bg-green-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-resolute-dark-green font-medium truncate block">
                    {prop.address}
                  </span>
                  <span className="text-gray-400">
                    {prop.city}, {prop.state}
                    {prop.property_type ? ` | ${prop.property_type}` : ""}
                    {prop.tax_status && prop.tax_status !== "current"
                      ? ` | Tax: ${prop.tax_status}`
                      : ""}
                  </span>
                </div>
                {onAnalyzeProperty && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      onAnalyzeProperty(prop.address, prop.city, prop.state)
                    }
                  >
                    Analyze
                  </Button>
                )}
              </div>
            ))}
        </div>

        {portfolio.properties.length > 5 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-resolute-gold hover:text-resolute-gold-light mt-2"
          >
            {expanded
              ? "Show less"
              : `Show ${portfolio.properties.length - 5} more`}
          </button>
        )}
      </div>

      <p className="text-[10px] text-gray-400 mt-2">
        Last updated:{" "}
        {new Date(portfolio.last_updated).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </div>
  );
}
