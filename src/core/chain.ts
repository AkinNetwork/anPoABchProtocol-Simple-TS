// src/core/chain.ts
import { hashJson } from "../utils/hashing";
import * as crypto from "crypto";

export type IdentityId = string;

export interface Signature {
  signer: IdentityId;
  sig: string; // placeholder; real crypto later
}

export interface Transaction {
  txId: string;
  chainId: string;
  app: string;
  sender: IdentityId;
  payload: any;
  signatures: Signature[];
  timestamp: number;
}

export interface Block {
  index: number;
  timestamp: number;
  prevHash: string;
  validator: IdentityId;
  transactions: Transaction[];
  blockHash: string;
  validatorSignature: string;
}

export interface AkinApp {
  name: string;
  validate(tx: Transaction, state: any): { ok: boolean; error?: string };
  apply(tx: Transaction, state: any): void;
}

/**
 * Helpers to build canonical snake_case structures for hashing,
 * matching the Python implementation's view.
 */
function canonicalSignature(sig: Signature) {
  return {
    signer: sig.signer,
    sig: sig.sig,
  };
}

function canonicalTransaction(tx: Transaction) {
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

function canonicalBlock(b: Block) {
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
export class AkinChain {
  chainId: string;
  validators: IdentityId[];
  blocks: Block[] = [];
  pending: Transaction[] = [];
  apps: Record<string, AkinApp>;
  appStates: Record<string, any> = {};

  constructor(chainId: string, validators: IdentityId[], apps: AkinApp[]) {
    this.chainId = chainId;
    this.validators = validators;
    this.apps = {};

    apps.forEach((app) => {
      this.apps[app.name] = app;
      this.appStates[app.name] = {};
    });

    // Genesis block
    const genesis: Block = {
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

  private calcBlockHash(b: Block): string {
    const canon = canonicalBlock(b);
    return hashJson(canon);
  }

  addTx(tx: Transaction): { ok: boolean; error?: string } {
    if (tx.chainId !== this.chainId) {
      return { ok: false, error: "wrong chainId" };
    }

    const app = this.apps[tx.app];
    if (!app) {
      return { ok: false, error: "unknown app" };
    }

    const state = this.appStates[app.name];
    const { ok, error } = app.validate(tx, state);
    if (!ok) return { ok, error };

    // NOTE: no real signature verification in v0.1
    this.pending.push(tx);
    return { ok: true };
  }

  proposeBlock(validator: IdentityId): { ok: boolean; error?: string } {
    if (!this.validators.includes(validator)) {
      return { ok: false, error: "unauthorized validator" };
    }
    if (!this.pending.length) {
      return { ok: false, error: "no pending transactions" };
    }

    const prev = this.blocks[this.blocks.length - 1];
    const block: Block = {
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

  private validateBlock(block: Block): { ok: boolean; error?: string } {
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

  isValidChain(): { ok: boolean; error?: string } {
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

/**
 * Helper to create a transaction with a single signature.
 * For now uses crypto.randomUUID() when available.
 */
export function makeTransaction(
  chainId: string,
  app: string,
  sender: IdentityId,
  payload: any,
  signer: IdentityId
): Transaction {
  let txId: string;
  if (typeof (crypto as any).randomUUID === "function") {
    txId = (crypto as any).randomUUID();
  } else {
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
