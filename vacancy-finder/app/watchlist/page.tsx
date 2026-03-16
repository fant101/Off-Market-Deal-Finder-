"use client";

import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import WatchlistForm from "@/components/WatchlistForm";
import AlertsList from "@/components/AlertsList";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabase/client";
import type { WatchlistEntry, WatchlistAlert } from "@/lib/signals/types";

export default function WatchlistPage() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchlists, setWatchlists] = useState<(WatchlistEntry & { unread_alerts: number })[]>([]);
  const [alerts, setAlerts] = useState<WatchlistAlert[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"watchlists" | "alerts">("watchlists");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthToken(data.session?.access_token ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthToken(session?.access_token ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchWatchlists = useCallback(async () => {
    if (!authToken) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/watchlist", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setWatchlists(await res.json());
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  const fetchAlerts = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch("/api/watchlist/alerts", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setAlerts(await res.json());
      }
    } catch {
      // Silent
    }
  }, [authToken]);

  useEffect(() => {
    fetchWatchlists();
    fetchAlerts();
  }, [fetchWatchlists, fetchAlerts]);

  const handleCreate = async (data: {
    name: string;
    location: string;
    radius_miles: number;
    property_type: string | null;
    frequency: "daily" | "weekly" | "biweekly";
  }) => {
    if (!authToken) return;
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setShowForm(false);
      fetchWatchlists();
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    if (!authToken) return;
    await fetch("/api/watchlist", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ id, active }),
    });
    fetchWatchlists();
  };

  const handleDelete = async (id: string) => {
    if (!authToken) return;
    await fetch(`/api/watchlist?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    fetchWatchlists();
  };

  const handleMarkRead = async (alertIds: string[]) => {
    if (!authToken) return;
    await fetch("/api/watchlist/alerts", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ alert_ids: alertIds }),
    });
    fetchAlerts();
  };

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="min-h-screen bg-resolute-cream">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-resolute-dark-green">
              Watchlists
            </h1>
            <p className="text-sm text-gray-500">
              Monitor areas for new vacancies automatically
            </p>
          </div>
          {authToken && (
            <Button variant="primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "New Watchlist"}
            </Button>
          )}
        </div>

        {!authToken ? (
          <div className="text-center py-12 bg-white rounded-lg border border-resolute-border">
            <p className="text-gray-500">Sign in to create watchlists.</p>
          </div>
        ) : (
          <>
            {showForm && (
              <div className="mb-6">
                <WatchlistForm
                  onSubmit={handleCreate}
                  onCancel={() => setShowForm(false)}
                />
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-4 mb-4 border-b border-resolute-border">
              <button
                onClick={() => setActiveTab("watchlists")}
                className={`pb-2 text-sm font-medium transition-colors ${
                  activeTab === "watchlists"
                    ? "text-resolute-gold border-b-2 border-resolute-gold"
                    : "text-gray-500 hover:text-resolute-dark-green"
                }`}
              >
                Watchlists ({watchlists.length})
              </button>
              <button
                onClick={() => setActiveTab("alerts")}
                className={`pb-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === "alerts"
                    ? "text-resolute-gold border-b-2 border-resolute-gold"
                    : "text-gray-500 hover:text-resolute-dark-green"
                }`}
              >
                Alerts
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {activeTab === "watchlists" && (
              <>
                {loading ? (
                  <p className="text-center text-gray-500 py-8">Loading...</p>
                ) : watchlists.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg border border-resolute-border">
                    <p className="text-gray-500 text-sm">No watchlists yet.</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Create one to start monitoring areas for new vacancies.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {watchlists.map((w) => (
                      <div
                        key={w.id}
                        className="bg-white rounded-lg border border-resolute-border p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm text-resolute-dark-green">
                                {w.name}
                              </h3>
                              <Badge variant={w.active ? "gold" : "default"}>
                                {w.active ? "Active" : "Paused"}
                              </Badge>
                              {w.unread_alerts > 0 && (
                                <Badge variant="high">
                                  {w.unread_alerts} new
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {w.location} | {w.radius_miles}mi radius |{" "}
                              {w.frequency} scans
                              {w.property_type ? ` | ${w.property_type}` : ""}
                            </p>
                            {w.last_run_at && (
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                Last scanned:{" "}
                                {new Date(w.last_run_at).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                  }
                                )}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggle(w.id, !w.active)}
                            >
                              {w.active ? "Pause" : "Resume"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(w.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === "alerts" && (
              <AlertsList alerts={alerts} onMarkRead={handleMarkRead} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
