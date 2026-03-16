"use client";

import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import SavedList from "@/components/SavedList";
import OutreachModal from "@/components/OutreachModal";
import { supabase } from "@/lib/supabase/client";
import type { VacantProperty } from "@/lib/types";

interface SavedPropertyResponse {
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

export default function SavedPage() {
  const [savedProperties, setSavedProperties] = useState<SavedPropertyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [outreachProperty, setOutreachProperty] = useState<VacantProperty | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthToken(data.session?.access_token ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthToken(session?.access_token ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchSaved = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/saved", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSavedProperties(data || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (authToken) {
      fetchSaved();
    } else {
      setLoading(false);
    }
  }, [authToken, fetchSaved]);

  const handleUnsave = async (propertyId: string) => {
    if (!authToken) return;
    try {
      const res = await fetch("/api/properties/save", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ propertyId }),
      });
      if (res.ok) {
        setSavedProperties((prev) =>
          prev.filter((p) => p.property_id !== propertyId)
        );
      }
    } catch {
      // Silent fail
    }
  };

  const handleUpdateStatus = async (propertyId: string, status: string) => {
    if (!authToken) return;
    try {
      const res = await fetch("/api/properties/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ propertyId, status }),
      });
      if (res.ok) {
        setSavedProperties((prev) =>
          prev.map((p) =>
            p.property_id === propertyId ? { ...p, status: status as SavedPropertyResponse["status"] } : p
          )
        );
      }
    } catch {
      // Silent fail
    }
  };

  const handleDraftOutreach = (saved: SavedPropertyResponse) => {
    const prop: VacantProperty = {
      id: saved.property.id,
      address: saved.property.address,
      city: saved.property.city || "",
      state: saved.property.state || "",
      zip: saved.property.zip,
      lat: saved.property.lat,
      lng: saved.property.lng,
      property_type: saved.property.property_type || "Unknown",
      estimated_sf: saved.property.estimated_sf,
      vacancy_signal: saved.search_result?.vacancy_signal || "",
      signal_source: "",
      time_vacant: null,
      owner_name: saved.search_result?.owner_name || null,
      owner_type: null,
      confidence: saved.search_result?.confidence || "medium",
      details: "",
      strategy: saved.search_result?.strategy || "",
    };
    setOutreachProperty(prop);
  };

  return (
    <div className="min-h-screen bg-resolute-cream">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="font-display text-2xl font-bold text-resolute-dark-green mb-1">
          Saved Properties
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Track and manage your off-market prospects
        </p>

        {!authToken ? (
          <div className="text-center py-12 bg-white rounded-lg border border-resolute-border">
            <p className="text-gray-500">Sign in to view your saved properties.</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading saved properties...</p>
          </div>
        ) : (
          <SavedList
            properties={savedProperties}
            onUnsave={handleUnsave}
            onUpdateStatus={handleUpdateStatus}
            onDraftOutreach={handleDraftOutreach}
          />
        )}
      </main>

      <OutreachModal
        property={outreachProperty}
        isOpen={outreachProperty !== null}
        onClose={() => setOutreachProperty(null)}
        authToken={authToken}
      />
    </div>
  );
}
