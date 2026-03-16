"use client";

import { useState } from "react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import type { VacantProperty } from "@/lib/types";

interface OutreachModalProps {
  property: VacantProperty | null;
  isOpen: boolean;
  onClose: () => void;
  authToken: string | null;
}

interface Draft {
  tone: string;
  content: string;
}

const TONE_LABELS: Record<string, { label: string; description: string }> = {
  direct: {
    label: "Direct",
    description: "Confident, gets to the point quickly",
  },
  soft: {
    label: "Relationship",
    description: "Warm, focuses on building connection",
  },
  advisory: {
    label: "Advisory",
    description: "Positions you as an expert who can help",
  },
};

export default function OutreachModal({
  property,
  isOpen,
  onClose,
  authToken,
}: OutreachModalProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTone, setActiveTone] = useState("direct");
  const [copied, setCopied] = useState(false);

  const generateDrafts = async () => {
    if (!property) return;
    setLoading(true);
    setDrafts([]);

    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          property,
          tones: ["direct", "soft", "advisory"],
        }),
      });

      if (!res.ok) throw new Error("Failed to generate");

      const data = await res.json();
      setDrafts(data.drafts || []);
      if (data.drafts?.length > 0) {
        setActiveTone(data.drafts[0].tone);
      }
    } catch (err) {
      console.error("Outreach generation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const activeDraft = drafts.find((d) => d.tone === activeTone);

  const handleCopy = () => {
    if (activeDraft) {
      navigator.clipboard.writeText(activeDraft.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setDrafts([]);
      }}
      title="Draft Owner Outreach"
    >
      {property && (
        <div className="space-y-4">
          {/* Property summary */}
          <div className="bg-resolute-cream rounded-lg p-3">
            <p className="font-medium text-sm">{property.address}</p>
            <p className="text-xs text-gray-500">
              {property.city}, {property.state} | {property.property_type} |{" "}
              {property.estimated_sf || "Unknown SF"}
            </p>
            {property.owner_name && (
              <p className="text-xs text-gray-500 mt-1">
                Owner: {property.owner_name}
              </p>
            )}
          </div>

          {drafts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-3">
                Generate personalized outreach emails in three tones
              </p>
              <Button onClick={generateDrafts} loading={loading}>
                {loading ? "Generating drafts..." : "Generate Outreach Drafts"}
              </Button>
            </div>
          ) : (
            <>
              {/* Tone selector */}
              <div className="flex gap-2">
                {drafts.map((d) => (
                  <button
                    key={d.tone}
                    onClick={() => setActiveTone(d.tone)}
                    className={`flex-1 p-2 rounded-lg text-left transition-colors ${
                      activeTone === d.tone
                        ? "bg-resolute-gold/10 border-2 border-resolute-gold"
                        : "bg-gray-50 border-2 border-transparent hover:border-resolute-border"
                    }`}
                  >
                    <div className="text-sm font-medium">
                      {TONE_LABELS[d.tone]?.label || d.tone}
                    </div>
                    <div className="text-xs text-gray-500">
                      {TONE_LABELS[d.tone]?.description}
                    </div>
                  </button>
                ))}
              </div>

              {/* Draft content */}
              {activeDraft && (
                <div className="bg-white border border-resolute-border rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-body leading-relaxed">
                    {activeDraft.content}
                  </pre>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={generateDrafts} loading={loading}>
                  Regenerate
                </Button>
                <Button onClick={handleCopy}>
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
