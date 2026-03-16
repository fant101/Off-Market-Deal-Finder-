"use client";

import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import BrokerIntelForm from "@/components/BrokerIntelForm";
import Badge from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase/client";
import { INTEL_TYPE_LABELS } from "@/lib/signals/types";
import type { BrokerIntelEntry } from "@/lib/signals/types";

export default function IntelPage() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [intelEntries, setIntelEntries] = useState<BrokerIntelEntry[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthToken(data.session?.access_token ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthToken(session?.access_token ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchIntel = useCallback(async () => {
    if (!authToken) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/broker-intel", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setIntelEntries(await res.json());
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchIntel();
  }, [fetchIntel]);

  const handleSubmit = async (data: {
    address: string;
    city: string;
    state: string;
    intel_type: BrokerIntelEntry["intel_type"];
    notes: string;
  }) => {
    if (!authToken) return;
    const res = await fetch("/api/broker-intel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      fetchIntel();
    }
  };

  return (
    <div className="min-h-screen bg-resolute-cream">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="font-display text-2xl font-bold text-resolute-dark-green mb-1">
          Broker Intel
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Share what you see on the ground. Your intel improves vacancy detection for everyone.
        </p>

        {!authToken ? (
          <div className="text-center py-12 bg-white rounded-lg border border-resolute-border">
            <p className="text-gray-500">Sign in to submit and view broker intel.</p>
          </div>
        ) : (
          <>
            {/* Submit form */}
            <div className="bg-white rounded-lg border border-resolute-border p-4 mb-6">
              <h2 className="font-display font-semibold text-resolute-dark-green mb-3">
                Report a Vacancy or Lead
              </h2>
              <BrokerIntelForm onSubmit={handleSubmit} />
            </div>

            {/* Recent intel */}
            <h2 className="font-display font-semibold text-resolute-dark-green mb-3">
              Recent Intel ({intelEntries.length})
            </h2>

            {loading ? (
              <p className="text-center text-gray-500 py-8">Loading...</p>
            ) : intelEntries.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-resolute-border">
                <p className="text-gray-500 text-sm">
                  No intel submitted yet. Be the first!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {intelEntries.map((intel) => (
                  <div
                    key={intel.id}
                    className="bg-white rounded-lg border border-resolute-border p-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-resolute-dark-green truncate">
                            {intel.address}
                          </h3>
                          <Badge
                            variant={
                              intel.intel_type === "vacant_confirmed"
                                ? "high"
                                : intel.intel_type === "tenant_leaving"
                                  ? "medium"
                                  : "gold"
                            }
                          >
                            {INTEL_TYPE_LABELS[intel.intel_type]}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500">
                          {intel.city}, {intel.state}
                        </p>
                        {intel.notes && (
                          <p className="text-xs text-gray-600 mt-1">
                            {intel.notes}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(intel.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </p>
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
