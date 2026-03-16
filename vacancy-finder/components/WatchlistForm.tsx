"use client";

import { useState } from "react";
import Button from "./ui/Button";
import Input from "./ui/Input";
import { PROPERTY_TYPES } from "@/lib/types";

interface WatchlistFormProps {
  onSubmit: (data: {
    name: string;
    location: string;
    radius_miles: number;
    property_type: string | null;
    frequency: "daily" | "weekly" | "biweekly";
  }) => Promise<void>;
  onCancel: () => void;
}

export default function WatchlistForm({ onSubmit, onCancel }: WatchlistFormProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState(5);
  const [propertyType, setPropertyType] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "biweekly">("weekly");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) return;

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        location: location.trim(),
        radius_miles: radius,
        property_type: propertyType || null,
        frequency,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-resolute-border p-4 space-y-4">
      <h3 className="font-display font-semibold text-resolute-dark-green">
        New Watchlist
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Watchlist Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Downtown Denver Industrial"
          required
        />
        <Input
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Denver, CO"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-resolute-dark-green mb-1">
            Radius (miles)
          </label>
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full px-3 py-2 border border-resolute-border rounded-md text-sm bg-white focus:ring-2 focus:ring-resolute-gold/50 focus:border-resolute-gold"
          >
            {[1, 2, 3, 5, 10, 15, 25].map((r) => (
              <option key={r} value={r}>
                {r} mile{r !== 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-resolute-dark-green mb-1">
            Property Type
          </label>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="w-full px-3 py-2 border border-resolute-border rounded-md text-sm bg-white focus:ring-2 focus:ring-resolute-gold/50 focus:border-resolute-gold"
          >
            <option value="">Any Commercial</option>
            {PROPERTY_TYPES.map((pt) => (
              <option key={pt} value={pt}>
                {pt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-resolute-dark-green mb-1">
            Scan Frequency
          </label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as "daily" | "weekly" | "biweekly")}
            className="w-full px-3 py-2 border border-resolute-border rounded-md text-sm bg-white focus:ring-2 focus:ring-resolute-gold/50 focus:border-resolute-gold"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Every 2 weeks</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Creating..." : "Create Watchlist"}
        </Button>
      </div>
    </form>
  );
}
