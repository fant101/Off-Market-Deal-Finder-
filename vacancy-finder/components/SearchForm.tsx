"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import Button from "./ui/Button";
import Input from "./ui/Input";
import {
  PROPERTY_TYPES,
  STRATEGY_LABELS,
  STRATEGY_DESCRIPTIONS,
  type Strategy,
  type SearchParams,
} from "@/lib/types";

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
}

const ALL_STRATEGIES: Strategy[] = [
  "vacancy_signals",
  "recent_closures",
  "distressed",
  "permit_gaps",
];

const STRATEGY_ICONS: Record<Strategy, string> = {
  vacancy_signals: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  recent_closures: "M6 18L18 6M6 6l12 12",
  distressed: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  permit_gaps: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
};

export default function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [propertyType, setPropertyType] = useState("Any Commercial");
  const [radius, setRadius] = useState(5);
  const [strategies, setStrategies] = useState<Strategy[]>(["vacancy_signals"]);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const initAutocomplete = useCallback(async () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !inputRef.current) return;

    try {
      setOptions({ key: apiKey, v: "weekly" });
      const { Autocomplete } = await importLibrary("places") as google.maps.PlacesLibrary;
      const autocomplete = new Autocomplete(inputRef.current!, {
        types: ["geocode"],
        componentRestrictions: { country: "us" },
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          setLat(place.geometry.location.lat());
          setLng(place.geometry.location.lng());
          setLocation(place.formatted_address || place.name || "");
        }
      });
      autocompleteRef.current = autocomplete;
    } catch {
      // Google Maps not available, continue without autocomplete
    }
  }, []);

  useEffect(() => {
    initAutocomplete();
  }, [initAutocomplete]);

  const toggleStrategy = (s: Strategy) => {
    setStrategies((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) return;

    // Pass lat/lng if available, otherwise the backend will geocode the location text
    onSearch({
      location,
      lat: lat ?? 0,
      lng: lng ?? 0,
      propertyType,
      radius,
      strategies,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-resolute-dark-green mb-1">
          Location
        </label>
        <input
          ref={inputRef}
          type="text"
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            setLat(null);
            setLng(null);
          }}
          placeholder="Address, neighborhood, city, or corridor..."
          className="w-full px-3 py-2.5 bg-white border border-resolute-border rounded-lg text-resolute-dark-green placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-resolute-gold focus:border-resolute-gold transition-colors"
          required
        />
      </div>

      {/* Property Type + Radius row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-resolute-dark-green mb-1">
            Property Type
          </label>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-resolute-border rounded-lg text-resolute-dark-green focus:outline-none focus:ring-2 focus:ring-resolute-gold focus:border-resolute-gold transition-colors"
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-resolute-dark-green mb-1">
            Search Radius: {radius} miles
          </label>
          <input
            type="range"
            min={1}
            max={25}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full h-2 bg-resolute-border rounded-lg appearance-none cursor-pointer accent-resolute-gold"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1 mi</span>
            <span>25 mi</span>
          </div>
        </div>
      </div>

      {/* Search Strategies */}
      <div>
        <label className="block text-sm font-medium text-resolute-dark-green mb-2">
          Search Strategies
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ALL_STRATEGIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleStrategy(s)}
              className={`strategy-card rounded-lg p-3 text-left ${
                strategies.includes(s) ? "active" : ""
              }`}
            >
              <div className="flex items-start gap-2">
                <svg
                  className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    strategies.includes(s)
                      ? "text-resolute-gold"
                      : "text-gray-400"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d={STRATEGY_ICONS[s]}
                  />
                </svg>
                <div>
                  <div className="font-medium text-sm text-resolute-dark-green">
                    {STRATEGY_LABELS[s]}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {STRATEGY_DESCRIPTIONS[s]}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
        {strategies.length === 0 && (
          <p className="text-sm text-red-600 mt-1">
            Select at least one strategy
          </p>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        loading={loading}
        disabled={!location || strategies.length === 0}
      >
        {loading ? "Searching for vacant properties..." : "Find Vacant Properties"}
      </Button>
    </form>
  );
}
