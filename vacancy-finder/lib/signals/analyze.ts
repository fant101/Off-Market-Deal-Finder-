/**
 * Master Signal Orchestrator
 *
 * Runs all signal providers in parallel against a property and
 * returns a composite VacancyScore. This is the core intelligence
 * engine of the application.
 */
import type { VacancySignal, VacancyScore } from "./types";
import { computeVacancyScore } from "./scoring";
import { analyzeStreetView } from "./streetview";
import { checkGooglePlaces } from "./places";
import { checkTaxDelinquency } from "./tax";
import { checkSOSEntity } from "./sos";
import { checkPermitGap } from "./permits";
import { checkUSPSVacancy } from "./usps";
import { checkUtilityDisconnect } from "./utilities";
import { checkCodeViolations } from "./violations";
import { checkCourtRecords } from "./courts";
import { checkBroadbandStatus } from "./broadband";
import { checkBusinessLicense } from "./licenses";
import { checkLeaseExpiration } from "./leases";
import { checkJobPostings } from "./jobs";
import { checkNewsMentions } from "./news";

export interface AnalyzePropertyInput {
  address: string;
  city: string;
  state: string;
  zip?: string | null;
  lat?: number | null;
  lng?: number | null;
  ownerName?: string | null;
  // Optional: pre-existing signals (e.g. broker intel) to include
  existingSignals?: VacancySignal[];
  // Optional: only run specific signal types
  signalTypes?: string[];
}

export interface AnalyzePropertyResult {
  score: VacancyScore;
  signals: VacancySignal[];
  duration_ms: number;
  errors: string[];
}

/**
 * Run all (or selected) signal providers against a property.
 * Signals run in parallel with a 30s timeout per signal.
 */
export async function analyzeProperty(
  input: AnalyzePropertyInput
): Promise<AnalyzePropertyResult> {
  const start = Date.now();
  const errors: string[] = [];
  const {
    address,
    city,
    state,
    zip,
    lat,
    lng,
    ownerName,
    existingSignals = [],
    signalTypes,
  } = input;

  // Build the list of signal checks to run
  type SignalCheck = { name: string; fn: () => Promise<VacancySignal | null> };
  const checks: SignalCheck[] = [];

  const shouldRun = (type: string) => !signalTypes || signalTypes.includes(type);

  if (shouldRun("streetview_vision") && lat != null && lng != null) {
    checks.push({
      name: "streetview_vision",
      fn: () => analyzeStreetView(lat, lng, address),
    });
  }

  if (shouldRun("google_places") && lat != null && lng != null) {
    checks.push({
      name: "google_places",
      fn: () => checkGooglePlaces(lat, lng, address),
    });
  }

  if (shouldRun("tax_delinquency")) {
    checks.push({
      name: "tax_delinquency",
      fn: () => checkTaxDelinquency(address, city, state),
    });
  }

  if (shouldRun("sos_entity")) {
    checks.push({
      name: "sos_entity",
      fn: () => checkSOSEntity(address, city, state, ownerName),
    });
  }

  if (shouldRun("permit_gap")) {
    checks.push({
      name: "permit_gap",
      fn: () => checkPermitGap(address, city, state),
    });
  }

  if (shouldRun("usps_vacancy")) {
    checks.push({
      name: "usps_vacancy",
      fn: () => checkUSPSVacancy(address, city, state, zip || null),
    });
  }

  if (shouldRun("utility_disconnect")) {
    checks.push({
      name: "utility_disconnect",
      fn: () => checkUtilityDisconnect(address, city, state),
    });
  }

  if (shouldRun("code_violation")) {
    checks.push({
      name: "code_violation",
      fn: () => checkCodeViolations(address, city, state),
    });
  }

  if (shouldRun("court_record")) {
    checks.push({
      name: "court_record",
      fn: () => checkCourtRecords(address, city, state, ownerName),
    });
  }

  if (shouldRun("broadband_dark")) {
    checks.push({
      name: "broadband_dark",
      fn: () => checkBroadbandStatus(address, city, state, lat, lng),
    });
  }

  if (shouldRun("license_expiry")) {
    checks.push({
      name: "license_expiry",
      fn: () => checkBusinessLicense(address, city, state),
    });
  }

  if (shouldRun("lease_expiration")) {
    checks.push({
      name: "lease_expiration",
      fn: () => checkLeaseExpiration(address, city, state, ownerName),
    });
  }

  if (shouldRun("job_posting")) {
    checks.push({
      name: "job_posting",
      fn: () => checkJobPostings(address, city, state, ownerName),
    });
  }

  if (shouldRun("news_closure")) {
    checks.push({
      name: "news_closure",
      fn: () => checkNewsMentions(address, city, state, ownerName),
    });
  }

  // Run all checks in parallel with individual timeouts
  const SIGNAL_TIMEOUT_MS = 45_000;

  const results = await Promise.allSettled(
    checks.map(async (check) => {
      try {
        const result = await Promise.race([
          check.fn(),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error(`${check.name} timed out`)), SIGNAL_TIMEOUT_MS)
          ),
        ]);
        return { name: check.name, signal: result };
      } catch (err) {
        throw new Error(`${check.name}: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    })
  );

  // Collect successful signals
  const signals: VacancySignal[] = [...existingSignals];

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.signal) {
      signals.push(result.value.signal);
    } else if (result.status === "rejected") {
      errors.push(result.reason?.message || "Unknown signal error");
    }
  }

  // Compute composite score
  const score = computeVacancyScore(signals);

  return {
    score,
    signals,
    duration_ms: Date.now() - start,
    errors,
  };
}

/**
 * Quick analysis: only run the fastest signals (no AI web search).
 * Useful for bulk scanning in watchlists.
 */
export async function quickAnalyzeProperty(
  input: AnalyzePropertyInput
): Promise<AnalyzePropertyResult> {
  return analyzeProperty({
    ...input,
    signalTypes: [
      "streetview_vision",
      "google_places",
      "usps_vacancy",
      "broadband_dark",
    ],
  });
}
