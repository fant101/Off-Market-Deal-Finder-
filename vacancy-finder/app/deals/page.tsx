"use client";

import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Badge from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase/client";
import { OUTCOME_LABELS } from "@/lib/signals/types";

interface DealRecord {
  id: string;
  property_id: string;
  outcome_type: "acquired" | "leased" | "lost" | "no_deal" | "in_progress";
  deal_value: number | null;
  close_date: string | null;
  notes: string | null;
  created_at: string;
  property?: {
    address: string;
    city: string | null;
    state: string | null;
    property_type: string | null;
  };
}

export default function DealsPage() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<DealRecord[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthToken(data.session?.access_token ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthToken(session?.access_token ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchDeals = useCallback(async () => {
    if (!authToken) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/deals", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setDeals(await res.json());
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const successDeals = deals.filter(
    (d) => d.outcome_type === "acquired" || d.outcome_type === "leased"
  );
  const totalValue = successDeals.reduce(
    (sum, d) => sum + (d.deal_value || 0),
    0
  );

  const outcomeColor = (type: string) => {
    switch (type) {
      case "acquired":
      case "leased":
        return "high";
      case "in_progress":
        return "gold";
      case "lost":
      case "no_deal":
        return "low";
      default:
        return "default";
    }
  };

  return (
    <div className="min-h-screen bg-resolute-cream">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="font-display text-2xl font-bold text-resolute-dark-green mb-1">
          Deal Tracker
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Track outcomes to improve vacancy predictions over time
        </p>

        {!authToken ? (
          <div className="text-center py-12 bg-white rounded-lg border border-resolute-border">
            <p className="text-gray-500">Sign in to track deals.</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            {deals.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-white rounded-lg border border-resolute-border p-3 text-center">
                  <p className="text-2xl font-display font-bold text-resolute-dark-green">
                    {deals.length}
                  </p>
                  <p className="text-xs text-gray-500">Total Deals</p>
                </div>
                <div className="bg-white rounded-lg border border-resolute-border p-3 text-center">
                  <p className="text-2xl font-display font-bold text-green-600">
                    {successDeals.length}
                  </p>
                  <p className="text-xs text-gray-500">Closed Won</p>
                </div>
                <div className="bg-white rounded-lg border border-resolute-border p-3 text-center">
                  <p className="text-2xl font-display font-bold text-resolute-gold">
                    {deals.filter((d) => d.outcome_type === "in_progress").length}
                  </p>
                  <p className="text-xs text-gray-500">In Progress</p>
                </div>
                <div className="bg-white rounded-lg border border-resolute-border p-3 text-center">
                  <p className="text-2xl font-display font-bold text-resolute-dark-green">
                    {totalValue > 0
                      ? `$${(totalValue / 1_000_000).toFixed(1)}M`
                      : "$0"}
                  </p>
                  <p className="text-xs text-gray-500">Total Value</p>
                </div>
              </div>
            )}

            {/* Deal list */}
            {loading ? (
              <p className="text-center text-gray-500 py-8">Loading...</p>
            ) : deals.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-resolute-border">
                <p className="text-gray-500 text-sm">No deals recorded yet.</p>
                <p className="text-gray-400 text-xs mt-1">
                  Record deal outcomes from your saved properties to improve
                  vacancy predictions.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="bg-white rounded-lg border border-resolute-border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-resolute-dark-green truncate">
                            {deal.property?.address || "Unknown Address"}
                          </h3>
                          <Badge variant={outcomeColor(deal.outcome_type) as "high" | "medium" | "low" | "gold" | "default"}>
                            {OUTCOME_LABELS[deal.outcome_type]}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {deal.property?.city}, {deal.property?.state}
                          {deal.property?.property_type
                            ? ` | ${deal.property.property_type}`
                            : ""}
                        </p>
                        {deal.notes && (
                          <p className="text-xs text-gray-600 mt-1">
                            {deal.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {deal.deal_value != null && deal.deal_value > 0 && (
                          <p className="text-sm font-semibold text-resolute-dark-green">
                            ${deal.deal_value.toLocaleString()}
                          </p>
                        )}
                        {deal.close_date && (
                          <p className="text-[10px] text-gray-400">
                            Closed{" "}
                            {new Date(deal.close_date).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
