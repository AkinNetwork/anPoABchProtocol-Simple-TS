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
exports.AkinChain = void 0;
exports.makeTransaction = makeTransaction;
// src/core/chain.ts
const hashing_1 = require("../utils/hashing");
const crypto = __importStar(require("crypto"));
/**
 * Helpers to build canonical snake_case structures for hashing,
 * matching the Python implementation's view.
 */
function canonicalSignature(sig) {
    return {
        signer: sig.signer,
        sig: sig.sig,
    };
}
function canonicalTransaction(tx) {
    return {
        tx_id: tx.txId,
        chain_id: tx.chainId,
        app: tx.app,
        sender: tx.sender,
        payload: tx.payload,
        signatures: tx.signatures.map(canonicalSignature),
        timestamp: tx.timestamp,
    };
}
function canonicalBlock(b) {
    return {
        index: b.index,
        timestamp: b.timestamp,
        prev_hash: b.prevHash,
        validator: b.validator,
        transactions: b.transactions.map(canonicalTransaction),
    };
}
/**
 * AkinChain – core PoA chain implementation in TypeScript.
 */
class AkinChain {
    constructor(chainId, validators, apps) {
        this.blocks = [];
        this.pending = [];
        this.appStates = {};
        this.chainId = chainId;
        this.validators = validators;
        this.apps = {};
        apps.forEach((app) => {
            this.apps[app.name] = app;
            this.appStates[app.name] = {};
        });
        // Genesis block
        const genesis = {
            index: 0,
            timestamp: Date.now() / 1000,
            prevHash: "0x0",
            validator: "GENESIS",
            transactions: [],
            blockHash: "",
            validatorSignature: "",
        };
        genesis.blockHash = this.calcBlockHash(genesis);
        this.blocks.push(genesis);
    }
    calcBlockHash(b) {
        const canon = canonicalBlock(b);
        return (0, hashing_1.hashJson)(canon);
    }
    addTx(tx) {
        if (tx.chainId !== this.chainId) {
            return { ok: false, error: "wrong chainId" };
        }
        const app = this.apps[tx.app];
        if (!app) {
            return { ok: false, error: "unknown app" };
        }
        const state = this.appStates[app.name];
        const { ok, error } = app.validate(tx, state);
        if (!ok)
            return { ok, error };
        // NOTE: no real signature verification in v0.1
        this.pending.push(tx);
        return { ok: true };
    }
    proposeBlock(validator) {
        if (!this.validators.includes(validator)) {
            return { ok: false, error: "unauthorized validator" };
        }
        if (!this.pending.length) {
            return { ok: false, error: "no pending transactions" };
        }
        const prev = this.blocks[this.blocks.length - 1];
        const block = {
            index: this.blocks.length,
            timestamp: Date.now() / 1000,
            prevHash: prev.blockHash,
            validator,
            transactions: this.pending.slice(),
            blockHash: "",
            validatorSignature: "",
        };
        this.pending = [];
        block.blockHash = this.calcBlockHash(block);
        block.validatorSignature = `sig_by_${validator}`; // placeholder
        const { ok, error } = this.validateBlock(block);
        if (!ok) {
            return { ok, error };
        }
        this.blocks.push(block);
        // Apply app-level state transitions
        for (const tx of block.transactions) {
            const app = this.apps[tx.app];
            const state = this.appStates[app.name];
            app.apply(tx, state);
        }
        return { ok: true };
    }
    validateBlock(block) {
        if (block.index !== this.blocks.length) {
            return { ok: false, error: "wrong index" };
        }
        if (!this.validators.includes(block.validator)) {
            return { ok: false, error: "unknown validator" };
        }
        const prev = this.blocks[this.blocks.length - 1];
        if (block.prevHash !== prev.blockHash) {
            return { ok: false, error: "prevHash mismatch" };
        }
        if (block.blockHash !== this.calcBlockHash(block)) {
            return { ok: false, error: "blockHash mismatch" };
        }
        return { ok: true };
    }
    isValidChain() {
        for (let i = 1; i < this.blocks.length; i++) {
            const cur = this.blocks[i];
            const prev = this.blocks[i - 1];
            const recalc = this.calcBlockHash(cur);
            if (cur.prevHash !== prev.blockHash) {
                return { ok: false, error: `prevHash mismatch at index ${i}` };
            }
            if (cur.blockHash !== recalc) {
                return { ok: false, error: `hash mismatch at index ${i}` };
            }
        }
        return { ok: true };
    }
}
exports.AkinChain = AkinChain;
/**
 * Helper to create a transaction with a single signature.
 * For now uses crypto.randomUUID() when available.
 */
function makeTransaction(chainId, app, sender, payload, signer) {
    let txId;
    if (typeof crypto.randomUUID === "function") {
        txId = crypto.randomUUID();
    }
    else {
        txId = Math.random().toString(36).slice(2);
    }
    return {
        txId,
        chainId,
        app,
        sender,
        payload,
        signatures: [{ signer, sig: "dummy" }],
        timestamp: Date.now() / 1000,
    };
}
