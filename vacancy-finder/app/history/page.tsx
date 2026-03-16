"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Badge from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase/client";
import type { SearchRecord } from "@/lib/types";
import { STRATEGY_LABELS, type Strategy } from "@/lib/types";

export default function HistoryPage() {
  const [searches, setSearches] = useState<SearchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthToken(data.session?.access_token ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthToken(session?.access_token ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authToken) {
      setLoading(false);
      return;
    }

    const fetchSearches = async () => {
      try {
        const res = await fetch("/api/searches", {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSearches(data);
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };

    fetchSearches();
  }, [authToken]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-resolute-cream">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="font-display text-2xl font-bold text-resolute-dark-green mb-1">
          Search History
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Review your past vacancy searches
        </p>

        {!authToken ? (
          <div className="text-center py-12 bg-white rounded-lg border border-resolute-border">
            <p className="text-gray-500">Sign in to view your search history.</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading search history...</p>
          </div>
        ) : searches.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-resolute-border">
            <p className="text-gray-500">No searches yet.</p>
            <Link
              href="/"
              className="text-resolute-gold hover:text-resolute-gold-light text-sm mt-2 inline-block"
            >
              Start your first search
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {searches.map((search) => (
              <div
                key={search.id}
                className="bg-white rounded-lg shadow-sm border border-resolute-border p-4 hover:border-resolute-gold/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-sm text-resolute-dark-green">
                      {search.location_input}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(search.created_at)} | {search.radius_miles}{" "}
                      mile radius
                      {search.property_type
                        ? ` | ${search.property_type}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-display font-bold text-resolute-dark-green">
                      {search.result_count ?? 0}
                    </span>
                    <p className="text-xs text-gray-500">results</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {search.strategies.map((s) => (
                    <Badge key={s} variant="gold">
                      {STRATEGY_LABELS[s as Strategy] || s}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
