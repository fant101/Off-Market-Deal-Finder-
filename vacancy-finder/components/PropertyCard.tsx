"use client";

import { useState } from "react";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import type { VacantProperty } from "@/lib/types";

interface PropertyCardProps {
  property: VacantProperty;
  onSave: (property: VacantProperty) => void;
  onSkip: (property: VacantProperty) => void;
  onDraftOutreach: (property: VacantProperty) => void;
  isSaved?: boolean;
}

export default function PropertyCard({
  property,
  onSave,
  onSkip,
  onDraftOutreach,
  isSaved = false,
}: PropertyCardProps) {
  const [expanded, setExpanded] = useState(false);

  const streetViewUrl = property.lat && property.lng
    ? `https://maps.googleapis.com/maps/api/streetview?size=400x200&location=${property.lat},${property.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
    : null;

  return (
    <div className="property-card bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Street View */}
      {streetViewUrl && (
        <div className="h-32 bg-gray-100 overflow-hidden">
          <img
            src={streetViewUrl}
            alt={`Street view of ${property.address}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-resolute-dark-green truncate">
              {property.address}
            </h3>
            <p className="text-xs text-gray-500">
              {property.city}, {property.state} {property.zip || ""}
            </p>
          </div>
          <Badge variant={property.confidence}>
            {property.confidence}
          </Badge>
        </div>

        {/* Quick info */}
        <div className="flex flex-wrap gap-2 mt-2">
          {property.property_type && (
            <Badge variant="gold">{property.property_type}</Badge>
          )}
          {property.estimated_sf && (
            <Badge variant="default">{property.estimated_sf}</Badge>
          )}
          {!property.lat && !property.lng && (
            <Badge variant="default">Approximate location</Badge>
          )}
        </div>

        {/* Vacancy signal */}
        <p className="text-sm text-gray-700 mt-2 line-clamp-2">
          {property.vacancy_signal}
        </p>

        {/* Expandable details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-resolute-border space-y-2">
            <div className="text-xs space-y-1">
              <p>
                <span className="font-medium text-resolute-dark-green">Source:</span>{" "}
                <span className="text-gray-600">{property.signal_source}</span>
              </p>
              {property.time_vacant && (
                <p>
                  <span className="font-medium text-resolute-dark-green">Time vacant:</span>{" "}
                  <span className="text-gray-600">{property.time_vacant}</span>
                </p>
              )}
              {property.owner_name && (
                <p>
                  <span className="font-medium text-resolute-dark-green">Owner:</span>{" "}
                  <span className="text-gray-600">
                    {property.owner_name}
                    {property.owner_type ? ` (${property.owner_type})` : ""}
                  </span>
                </p>
              )}
              <p>
                <span className="font-medium text-resolute-dark-green">Strategy:</span>{" "}
                <span className="text-gray-600">{property.strategy}</span>
              </p>
              {property.details && (
                <p className="text-gray-600">{property.details}</p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-resolute-border">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-resolute-gold hover:text-resolute-gold-light transition-colors"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onSkip(property)}
          >
            Skip
          </Button>
          <Button
            size="sm"
            variant={isSaved ? "ghost" : "secondary"}
            onClick={() => onSave(property)}
          >
            {isSaved ? "Saved" : "Save"}
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => onDraftOutreach(property)}
          >
            Draft Outreach
          </Button>
        </div>
      </div>
    </div>
  );
}
