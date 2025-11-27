"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalJson = canonicalJson;
exports.hashJson = hashJson;
// src/utils/hashing.ts
const crypto = __importStar(require("crypto"));
/**
 * Recursively canonicalize an object:
 * - sort keys lexicographically at every level
 * - preserve array order
 * This mirrors Python's json.dumps(obj, sort_keys=True, separators=(",", ":"))
 */
function canonicalize(value) {
    if (value === null || typeof value !== "object") {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((v) => canonicalize(v));
    }
    const out = {};
    const keys = Object.keys(value).sort();
    for (const k of keys) {
        out[k] = canonicalize(value[k]);
    }
    return out;
}
/**
 * Returns a canonical JSON string for hashing.
 */
function canonicalJson(obj) {
    const canon = canonicalize(obj);
    // No extra spaces, stable field order
    return JSON.stringify(canon);
}
/**
 * SHA-256 over canonical JSON, returning lowercase hex string.
 * This is the AkinHash v0.1 function.
 */
function hashJson(obj) {
    const s = canonicalJson(obj);
    const hash = crypto.createHash("sha256");
    hash.update(s, "utf8");
    return hash.digest("hex");
}
