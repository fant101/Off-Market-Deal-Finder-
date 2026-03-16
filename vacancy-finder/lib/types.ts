export interface VacantProperty {
  id?: string;           // Database UUID, set after saving to Supabase
  address: string;
  city: string;
  state: string;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  property_type: string;
  estimated_sf: string | null;
  vacancy_signal: string;
  signal_source: string;
  time_vacant: string | null;
  owner_name: string | null;
  owner_type: string | null;
  confidence: "high" | "medium" | "low";
  details: string;
  strategy: string;
}

export interface SearchParams {
  location: string;
  lat: number;
  lng: number;
  propertyType: string;
  radius: number;
  strategies: Strategy[];
}

export type Strategy =
  | "vacancy_signals"
  | "recent_closures"
  | "distressed"
  | "permit_gaps";

export const STRATEGY_LABELS: Record<Strategy, string> = {
  vacancy_signals: "Vacancy Signals",
  recent_closures: "Recent Closures",
  distressed: "Distressed / Tax Delinquent",
  permit_gaps: "Permit & Utility Gaps",
};

export const STRATEGY_DESCRIPTIONS: Record<Strategy, string> = {
  vacancy_signals:
    "Dark storefronts, no active business listings, permanently closed on Google Maps, no web presence for any tenant",
  recent_closures:
    "Businesses that shut down, relocated, or closed within the past 12 months leaving commercial space empty",
  distressed:
    "Properties with tax liens, code violations, blight designations, absentee or out-of-state owners",
  permit_gaps:
    "Expired building permits, utility disconnects, certificate of occupancy issues, stalled renovations",
};

export const PROPERTY_TYPES = [
  "Any Commercial",
  "Small-Bay Industrial",
  "Office / Office Condo",
  "Retail Strip",
  "Flex / Warehouse",
  "Mixed-Use",
  "Free-Standing Retail",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export interface SearchRecord {
  id: string;
  user_id: string;
  location_input: string;
  location_lat: number | null;
  location_lng: number | null;
  property_type: string | null;
  radius_miles: number;
  strategies: string[];
  result_count: number | null;
  created_at: string;
}

export interface PropertyRecord {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  property_type: string | null;
  estimated_sf: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

export interface SearchResultRecord {
  id: string;
  search_id: string;
  property_id: string;
  vacancy_signal: string | null;
  signal_source: string | null;
  time_vacant: string | null;
  owner_name: string | null;
  owner_type: string | null;
  confidence: "high" | "medium" | "low" | null;
  details: string | null;
  strategy: string | null;
  created_at: string;
  property?: PropertyRecord;
}

export interface SavedPropertyRecord {
  id: string;
  user_id: string;
  property_id: string;
  notes: string | null;
  status: "new" | "contacted" | "in_conversation" | "dead";
  saved_at: string;
  property?: PropertyRecord;
  search_result?: SearchResultRecord | null;
}

export interface OutreachRequest {
  property: VacantProperty;
  tone: "direct" | "soft" | "advisory";
}

export interface SearchResponse {
  searchId: string | null;
  properties: VacantProperty[];
  marketNotes: string;
}
