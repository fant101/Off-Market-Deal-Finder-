// ── Signal Types ──
// Every data source produces a VacancySignal.  The scoring engine
// aggregates them into a composite VacancyScore.

export type SignalType =
  | "streetview_vision"    // #1  Claude Vision analysis of Street View
  | "google_places"        // #2  Google Places business_status
  | "tax_delinquency"      // #3  County tax delinquency records
  | "sos_entity"           // #4  Secretary of State dissolved entities
  | "permit_gap"           // #5  No building permits in 2+ years
  | "usps_vacancy"         // #9  USPS address vacancy flag
  | "utility_disconnect"   // #10 Utility shutoff / low usage
  | "code_violation"       // #11 Code enforcement violations
  | "court_record"         // #12 Eviction / foreclosure filings
  | "broadband_dark"       // #13 FCC broadband disconnection
  | "license_expiry"       // #14 Business license expired / not renewed
  | "lease_expiration"     // #15 Lease term ending with no renewal signals
  | "job_posting"          // #16 Company stopped posting jobs / posting at new address
  | "news_closure"         // #17 News/press mentions of closure or relocation
  | "broker_intel"         // #18 Broker-contributed ground truth
  | "ai_web_search";       // Original AI web search signal

export interface VacancySignal {
  type: SignalType;
  source: string;           // Human-readable source name
  description: string;      // What was found
  score: number;            // 0–100 individual signal strength
  raw_data?: unknown;       // Original API/scrape response for audit
  detected_at: string;      // ISO timestamp
  evidence_url?: string;    // Link to source if available
}

export interface VacancyScore {
  composite_score: number;              // 0–100 weighted total
  confidence: "high" | "medium" | "low";
  signal_count: number;
  signals: VacancySignal[];
  breakdown: SignalBreakdownItem[];     // Per-category scores for UI
  predicted_vacant: boolean;
  reasoning: string;                    // AI-generated summary of all evidence
}

export interface SignalBreakdownItem {
  type: SignalType;
  label: string;
  score: number;
  weight: number;
  weighted_score: number;
  found: boolean;
  description: string;
}

// ── Signal Weights ──
// Default weights for composite scoring.  Learned weights override these
// once deal outcome data accumulates (Feature #20).
export const DEFAULT_SIGNAL_WEIGHTS: Record<SignalType, number> = {
  streetview_vision:  0.18,
  google_places:      0.14,
  tax_delinquency:    0.14,
  sos_entity:         0.10,
  permit_gap:         0.08,
  usps_vacancy:       0.08,
  utility_disconnect: 0.06,
  code_violation:     0.06,
  court_record:       0.04,
  broadband_dark:     0.02,
  license_expiry:     0.04,
  lease_expiration:   0.02,
  job_posting:        0.01,
  news_closure:       0.01,
  broker_intel:       0.02,
  ai_web_search:      0.00,  // Folded into other signals when used standalone
};

export const SIGNAL_LABELS: Record<SignalType, string> = {
  streetview_vision:  "Street View AI Analysis",
  google_places:      "Google Places Status",
  tax_delinquency:    "Tax Delinquency",
  sos_entity:         "Business Entity Status",
  permit_gap:         "Building Permit Gap",
  usps_vacancy:       "USPS Vacancy Flag",
  utility_disconnect: "Utility Disconnect",
  code_violation:     "Code Violations",
  court_record:       "Court Records",
  broadband_dark:     "Broadband Status",
  license_expiry:     "Business License",
  lease_expiration:   "Lease Expiration",
  job_posting:        "Job Posting Signals",
  news_closure:       "News / Press",
  broker_intel:       "Broker Intel",
  ai_web_search:      "AI Web Research",
};

// ── Watchlist Types ──
export interface WatchlistEntry {
  id: string;
  user_id: string;
  name: string;
  location: string;
  location_lat: number | null;
  location_lng: number | null;
  radius_miles: number;
  property_type: string | null;
  frequency: "daily" | "weekly" | "biweekly";
  active: boolean;
  last_run_at: string | null;
  created_at: string;
}

export interface WatchlistAlert {
  id: string;
  watchlist_id: string;
  property_id: string;
  alert_type: "new_vacancy" | "new_signal" | "score_change";
  title: string;
  description: string;
  read: boolean;
  created_at: string;
  property?: {
    address: string;
    city: string | null;
    state: string | null;
  };
}

// ── Broker Intel Types ──
export interface BrokerIntelEntry {
  id: string;
  user_id: string;
  property_id: string | null;
  address: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
  intel_type: "vacant_confirmed" | "for_sale_rumor" | "tenant_leaving" | "construction_stalled" | "other";
  notes: string;
  created_at: string;
}

export const INTEL_TYPE_LABELS: Record<BrokerIntelEntry["intel_type"], string> = {
  vacant_confirmed: "Confirmed Vacant",
  for_sale_rumor: "For Sale Rumor",
  tenant_leaving: "Tenant Leaving",
  construction_stalled: "Construction Stalled",
  other: "Other",
};

// ── Deal Outcome Types ──
export interface DealOutcome {
  id: string;
  user_id: string;
  property_id: string;
  outcome_type: "acquired" | "leased" | "lost" | "no_deal" | "in_progress";
  deal_value: number | null;
  close_date: string | null;
  signals_at_discovery: VacancySignal[];
  notes: string | null;
  created_at: string;
}

export const OUTCOME_LABELS: Record<DealOutcome["outcome_type"], string> = {
  acquired: "Acquired",
  leased: "Leased",
  lost: "Lost to Competitor",
  no_deal: "No Deal",
  in_progress: "In Progress",
};

// ── Owner Portfolio Types ──
export interface OwnerPortfolio {
  owner_name: string;
  owner_entity_id: string | null;
  properties: OwnerProperty[];
  total_properties: number;
  flagged_count: number;       // Properties with vacancy signals
  last_updated: string;
}

export interface OwnerProperty {
  address: string;
  city: string;
  state: string;
  property_type: string | null;
  has_vacancy_signals: boolean;
  tax_status: string | null;
  latest_signal_score: number | null;
}

// ── Historical Scan Types ──
export interface HistoricalScan {
  id: string;
  property_id: string;
  scan_date: string;
  composite_score: number;
  signal_count: number;
  signals_summary: string;
}
