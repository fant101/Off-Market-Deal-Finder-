"use client";

import { useState } from "react";
import Button from "./ui/Button";
import Input from "./ui/Input";
import { INTEL_TYPE_LABELS } from "@/lib/signals/types";
import type { BrokerIntelEntry } from "@/lib/signals/types";

interface BrokerIntelFormProps {
  onSubmit: (data: {
    address: string;
    city: string;
    state: string;
    intel_type: BrokerIntelEntry["intel_type"];
    notes: string;
    property_id?: string;
  }) => Promise<void>;
  prefill?: {
    address?: string;
    city?: string;
    state?: string;
    property_id?: string;
  };
}

export default function BrokerIntelForm({ onSubmit, prefill }: BrokerIntelFormProps) {
  const [address, setAddress] = useState(prefill?.address || "");
  const [city, setCity] = useState(prefill?.city || "");
  const [state, setState] = useState(prefill?.state || "CO");
  const [intelType, setIntelType] = useState<BrokerIntelEntry["intel_type"]>("vacant_confirmed");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || !city.trim()) return;

    setLoading(true);
    setSuccess(false);
    try {
      await onSubmit({
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        intel_type: intelType,
        notes: notes.trim(),
        property_id: prefill?.property_id,
      });
      setSuccess(true);
      if (!prefill) {
        setAddress("");
        setCity("");
        setNotes("");
      }
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!prefill?.address && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St"
            required
          />
          <Input
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Denver"
            required
          />
          <Input
            label="State"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="CO"
            required
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-resolute-dark-green mb-1">
            Intel Type
          </label>
          <select
            value={intelType}
            onChange={(e) => setIntelType(e.target.value as BrokerIntelEntry["intel_type"])}
            className="w-full px-3 py-2 border border-resolute-border rounded-md text-sm bg-white focus:ring-2 focus:ring-resolute-gold/50 focus:border-resolute-gold"
          >
            {Object.entries(INTEL_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you observe?"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" size="sm" disabled={loading}>
          {loading ? "Submitting..." : "Submit Intel"}
        </Button>
        {success && (
          <span className="text-xs text-green-600 font-medium">
            Intel submitted successfully
          </span>
        )}
      </div>
    </form>
  );
}
