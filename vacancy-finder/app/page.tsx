"use client";

import { useState, useCallback, useEffect } from "react";
import Navbar from "@/components/Navbar";
import SearchForm from "@/components/SearchForm";
import ResultsMap from "@/components/ResultsMap";
import ResultsList from "@/components/ResultsList";
import OutreachModal from "@/components/OutreachModal";
import type { VacantProperty, SearchParams, SearchResponse } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VacantProperty[]>([]);
  const [marketNotes, setMarketNotes] = useState("");
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [outreachProperty, setOutreachProperty] = useState<VacantProperty | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [view, setView] = useState<"split" | "map" | "list">("split");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthToken(data.session?.access_token ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthToken(session?.access_token ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSearch = async (params: SearchParams) => {
    setLoading(true);
    setError(null);
    setResults([]);
    setMarketNotes("");

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Search failed");
      }

      const data: SearchResponse = await res.json();
      setResults(data.properties);
      setMarketNotes(data.marketNotes || "");

      if (params.lat && params.lng) {
        setCenter({ lat: params.lat, lng: params.lng });
      } else if (data.properties.length > 0) {
        const first = data.properties.find((p) => p.lat && p.lng);
        if (first) setCenter({ lat: first.lat!, lng: first.lng! });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback(
    async (property: VacantProperty) => {
      if (!authToken) return;

      // For demo/preview, we track by address key
      const key = `${property.address}-${property.city}-${property.state}`.toLowerCase();
      setSavedIds((prev) => new Set(prev).add(key));

      // If we have Supabase and a property_id, save via API
      try {
        await fetch("/api/properties/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ propertyId: property.address }), // Simplified for now
        });
      } catch {
        // Silent fail for save
      }
    },
    [authToken]
  );

  const handleSkip = useCallback(
    (property: VacantProperty) => {
      setResults((prev) => prev.filter((p) => p.address !== property.address));
    },
    []
  );

  const handlePropertySelect = useCallback((property: VacantProperty) => {
    // Scroll to property in list (could be enhanced)
    const el = document.querySelector(
      `[data-address="${property.address}"]`
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div className="min-h-screen bg-resolute-cream">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Search Form */}
        <div className="bg-white rounded-xl shadow-sm border border-resolute-border p-5 mb-6">
          <h1 className="font-display text-2xl font-bold text-resolute-dark-green mb-1">
            Find Vacant Properties
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            Discover off-market commercial vacancies before anyone else
          </p>
          <SearchForm onSearch={handleSearch} loading={loading} />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-resolute-border p-8 mb-6 text-center">
            <div className="search-loading">
              <div className="w-12 h-12 rounded-full bg-resolute-gold/20 mx-auto mb-3 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-resolute-gold animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
              <p className="text-sm text-resolute-dark-green font-medium">
                AI agents are searching for vacant properties...
              </p>
              <p className="text-xs text-gray-500 mt-1">
                This typically takes 30-45 seconds
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && !loading && (
          <>
            {/* View toggle (mobile) */}
            <div className="flex gap-2 mb-4 sm:hidden">
              {(["list", "map"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                    view === v
                      ? "bg-resolute-gold text-resolute-deep-green font-medium"
                      : "bg-white text-gray-600 border border-resolute-border"
                  }`}
                >
                  {v === "list" ? "List" : "Map"}
                </button>
              ))}
            </div>

            {/* Desktop: split view */}
            <div className="hidden sm:grid sm:grid-cols-2 gap-6">
              <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                <ResultsList
                  properties={results}
                  marketNotes={marketNotes}
                  onSave={handleSave}
                  onSkip={handleSkip}
                  onDraftOutreach={setOutreachProperty}
                  savedIds={savedIds}
                />
              </div>
              <div className="sticky top-6 h-[calc(100vh-200px)]">
                <ResultsMap
                  properties={results}
                  center={center}
                  onPropertySelect={handlePropertySelect}
                />
              </div>
            </div>

            {/* Mobile: tabbed view */}
            <div className="sm:hidden">
              {view === "list" ? (
                <ResultsList
                  properties={results}
                  marketNotes={marketNotes}
                  onSave={handleSave}
                  onSkip={handleSkip}
                  onDraftOutreach={setOutreachProperty}
                  savedIds={savedIds}
                />
              ) : (
                <div className="h-[60vh] rounded-lg overflow-hidden">
                  <ResultsMap
                    properties={results}
                    center={center}
                    onPropertySelect={handlePropertySelect}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Outreach Modal */}
      <OutreachModal
        property={outreachProperty}
        isOpen={outreachProperty !== null}
        onClose={() => setOutreachProperty(null)}
        authToken={authToken}
      />
    </div>
  );
}
