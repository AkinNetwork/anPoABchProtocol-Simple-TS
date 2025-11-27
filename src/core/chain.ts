        import { hashJson } from "../utils/hashing";

        export type IdentityId = string;

        export interface Signature {
          signer: IdentityId;
          sig: string; // placeholder
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

            const genesis: Block = {
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

          private calcBlockHash(b: Block): string {
            return hashJson({
              index: b.index,
              timestamp: b.timestamp,
              prevHash: b.prevHash,
              validator: b.validator,
              transactions: b.transactions
            });
          }

          addTx(tx: Transaction): { ok: boolean; error?: string } {
            if (tx.chainId !== this.chainId) return { ok: false, error: "wrong chainId" };
            const app = this.apps[tx.app];
            if (!app) return { ok: false, error: "unknown app" };
            const state = this.appStates[app.name];
            const { ok, error } = app.validate(tx, state);
            if (!ok) return { ok, error };
            this.pending.push(tx);
            return { ok: true };
          }

          proposeBlock(validator: IdentityId): { ok: boolean; error?: string } {
            if (!this.validators.includes(validator)) return { ok: false, error: "unauthorized validator" };
            if (!this.pending.length) return { ok: false, error: "no pending transactions" };

            const prev = this.blocks[this.blocks.length - 1];
            const block: Block = {
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
            if (!ok) return { ok, error };
            this.blocks.push(block);

            for (const tx of block.transactions) {
              const app = this.apps[tx.app];
              const state = this.appStates[app.name];
              app.apply(tx, state);
            }
            return { ok: true };
          }

          private validateBlock(block: Block): { ok: boolean; error?: string } {
            if (block.index !== this.blocks.length) return { ok: false, error: "wrong index" };
            if (!this.validators.includes(block.validator)) return { ok: false, error: "unknown validator" };
            const prev = this.blocks[this.blocks.length - 1];
            if (block.prevHash !== prev.blockHash) return { ok: false, error: "prevHash mismatch" };
            if (block.blockHash !== this.calcBlockHash(block)) return { ok: false, error: "blockHash mismatch" };
            return { ok: true };
          }

          isValidChain(): { ok: boolean; error?: string } {
            for (let i = 1; i < this.blocks.length; i++) {
              const cur = this.blocks[i];
              const prev = this.blocks[i - 1];
              if (cur.prevHash !== prev.blockHash) return { ok: false, error: `prevHash mismatch at ${i}` };
              if (cur.blockHash !== this.calcBlockHash(cur)) return { ok: false, error: `hash mismatch at ${i}` };
            }
            return { ok: true };
          }
        }

        export function makeTransaction(
          chainId: string,
          app: string,
          sender: IdentityId,
          payload: any,
          signer: IdentityId
        ): Transaction {
          const txId =
            typeof crypto !== "undefined" && "randomUUID" in crypto
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
        