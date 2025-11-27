"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AkinChain = void 0;
exports.makeTransaction = makeTransaction;
const hashing_1 = require("../utils/hashing");
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
        const genesis = {
            index: 0,
            timestamp: Date.now() / 1000,
            prevHash: "0x0",
            validator: "GENESIS",
            transactions: [],
            blockHash: "",
            validatorSignature: ""
        };
        genesis.blockHash = this.calcBlockHash(genesis);
        this.blocks.push(genesis);
    }
    calcBlockHash(b) {
        return (0, hashing_1.hashJson)({
            index: b.index,
            timestamp: b.timestamp,
            prevHash: b.prevHash,
            validator: b.validator,
            transactions: b.transactions
        });
    }
    addTx(tx) {
        if (tx.chainId !== this.chainId)
            return { ok: false, error: "wrong chainId" };
        const app = this.apps[tx.app];
        if (!app)
            return { ok: false, error: "unknown app" };
        const state = this.appStates[app.name];
        const { ok, error } = app.validate(tx, state);
        if (!ok)
            return { ok, error };
        this.pending.push(tx);
        return { ok: true };
    }
    proposeBlock(validator) {
        if (!this.validators.includes(validator))
            return { ok: false, error: "unauthorized validator" };
        if (!this.pending.length)
            return { ok: false, error: "no pending transactions" };
        const prev = this.blocks[this.blocks.length - 1];
        const block = {
            index: this.blocks.length,
            timestamp: Date.now() / 1000,
            prevHash: prev.blockHash,
            validator,
            transactions: this.pending.slice(),
            blockHash: "",
            validatorSignature: ""
        };
        this.pending = [];
        block.blockHash = this.calcBlockHash(block);
        block.validatorSignature = `sig_by_${validator}`;
        const { ok, error } = this.validateBlock(block);
        if (!ok)
            return { ok, error };
        this.blocks.push(block);
        for (const tx of block.transactions) {
            const app = this.apps[tx.app];
            const state = this.appStates[app.name];
            app.apply(tx, state);
        }
        return { ok: true };
    }
    validateBlock(block) {
        if (block.index !== this.blocks.length)
            return { ok: false, error: "wrong index" };
        if (!this.validators.includes(block.validator))
            return { ok: false, error: "unknown validator" };
        const prev = this.blocks[this.blocks.length - 1];
        if (block.prevHash !== prev.blockHash)
            return { ok: false, error: "prevHash mismatch" };
        if (block.blockHash !== this.calcBlockHash(block))
            return { ok: false, error: "blockHash mismatch" };
        return { ok: true };
    }
    isValidChain() {
        for (let i = 1; i < this.blocks.length; i++) {
            const cur = this.blocks[i];
            const prev = this.blocks[i - 1];
            if (cur.prevHash !== prev.blockHash)
                return { ok: false, error: `prevHash mismatch at ${i}` };
            if (cur.blockHash !== this.calcBlockHash(cur))
                return { ok: false, error: `hash mismatch at ${i}` };
        }
        return { ok: true };
    }
}
exports.AkinChain = AkinChain;
function makeTransaction(chainId, app, sender, payload, signer) {
    const txId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    return {
        txId,
        chainId,
        app,
        sender,
        payload,
        signatures: [{ signer, sig: "dummy" }],
        timestamp: Date.now() / 1000
    };
}
