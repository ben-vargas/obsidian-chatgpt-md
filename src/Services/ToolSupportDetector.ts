/**
 * Minimal whitelist-based tool support detection
 *
 * Matching rules:
 * - Exact match: "o3" matches "o3"
 * - Date suffix match: "o3" matches "o3-2025-04-16" or "o3-20251101"
 * - Wildcard: "o3*" matches anything starting with "o3"
 */

import { getModelName } from "src/Utilities/ModelFilteringHelper";

/**
 * Check if a model matches any pattern in the whitelist
 */
export function isModelWhitelisted(modelId: string, whitelist: string): boolean {
  if (!whitelist || typeof whitelist !== "string") {
    return false;
  }

  const modelName = getModelName(modelId);
  const patterns = whitelist
    .split(/[,\n]/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  return patterns.some((pattern) => {
    // Wildcard matching
    if (pattern.endsWith("*")) {
      return modelName.startsWith(pattern.slice(0, -1));
    }

    // Exact match
    if (modelName === pattern) {
      return true;
    }

    // Date suffix match: "o3" matches "o3-20251101" or "o3-2025-04-16"
    if (modelName.startsWith(pattern)) {
      const suffix = modelName.slice(pattern.length);
      // Match -YYYYMMDD or -YYYY-MM-DD
      return /^-\d{8}$/.test(suffix) || /^-\d{4}-\d{2}-\d{2}$/.test(suffix);
    }

    return false;
  });
}

/**
 * Get the default whitelist value
 *
 * Generated from live API testing on 2026-02-01
 * Models tested: 503 | Tool support confirmed: 194 (38.6%)
 *
 * Pattern matching rules:
 * - Exact match: "o3" matches "o3"
 * - Date suffix match: "o3" matches "o3-2025-04-16" or "o3-20251101"
 * - Wildcard: "gpt-4*" matches anything starting with "gpt-4"
 *
 * For updates, see: scripts/tool-whitelist/README-WHITELIST-MAINTENANCE.md
 */
