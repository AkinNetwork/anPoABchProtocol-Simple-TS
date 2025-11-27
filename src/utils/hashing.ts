// src/utils/hashing.ts
import * as crypto from "crypto";

/**
 * Recursively canonicalize an object:
 * - sort keys lexicographically at every level
 * - preserve array order
 * This mirrors Python's json.dumps(obj, sort_keys=True, separators=(",", ":"))
 */
function canonicalize(value: any): any {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((v) => canonicalize(v));
  }

  const out: any = {};
  const keys = Object.keys(value).sort();
  for (const k of keys) {
    out[k] = canonicalize(value[k]);
  }
  return out;
}

/**
 * Returns a canonical JSON string for hashing.
 */
export function canonicalJson(obj: any): string {
  const canon = canonicalize(obj);
  // No extra spaces, stable field order
  return JSON.stringify(canon);
}

/**
 * SHA-256 over canonical JSON, returning lowercase hex string.
 * This is the AkinHash v0.1 function.
 */
export function hashJson(obj: any): string {
  const s = canonicalJson(obj);
  const hash = crypto.createHash("sha256");
  hash.update(s, "utf8");
  return hash.digest("hex");
}
