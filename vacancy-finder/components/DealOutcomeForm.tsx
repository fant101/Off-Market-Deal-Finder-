"use client";

import { useState } from "react";
import Button from "./ui/Button";
import Input from "./ui/Input";
import { OUTCOME_LABELS } from "@/lib/signals/types";
import type { DealOutcome } from "@/lib/signals/types";

interface DealOutcomeFormProps {
  propertyId: string;
  propertyAddress: string;
  onSubmit: (data: {
    property_id: string;
    outcome_type: DealOutcome["outcome_type"];
    deal_value: number | null;
    close_date: string | null;
    notes: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function DealOutcomeForm({
  propertyId,
  propertyAddress,
  onSubmit,
  onCancel,
}: DealOutcomeFormProps) {
  const [outcomeType, setOutcomeType] = useState<DealOutcome["outcome_type"]>("in_progress");
  const [dealValue, setDealValue] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        property_id: propertyId,
        outcome_type: outcomeType,
        deal_value: dealValue ? Number(dealValue) : null,
        close_date: closeDate || null,
        notes: notes.trim() || null,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-resolute-border p-4 space-y-4">
      <div>
        <h3 className="font-display font-semibold text-resolute-dark-green">
          Record Deal Outcome
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">{propertyAddress}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-resolute-dark-green mb-1">
            Outcome
          </label>
          <select
            value={outcomeType}
            onChange={(e) => setOutcomeType(e.target.value as DealOutcome["outcome_type"])}
            className="w-full px-3 py-2 border border-resolute-border rounded-md text-sm bg-white focus:ring-2 focus:ring-resolute-gold/50 focus:border-resolute-gold"
          >
            {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Deal Value ($)"
          type="number"
          value={dealValue}
          onChange={(e) => setDealValue(e.target.value)}
          placeholder="0"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Close Date"
          type="date"
          value={closeDate}
          onChange={(e) => setCloseDate(e.target.value)}
        />
        <Input
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional details..."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Saving..." : "Save Outcome"}
        </Button>
      </div>
    </form>
  );
}
