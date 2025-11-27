# Standardize hashing across Python & TS so they can interoperate 👌

- **Python** uses **SHA-256 over canonical JSON** ✅
- **TypeScript** uses a custom rolling integer hash ❌

So **they cannot agree on the same `block_hash`** for the same data.
We’re going to fix that by:

1. Defining a **canonical hashing spec** (language-agnostic).
2. Confirming Python already matches it.
3. Updating TypeScript code so it matches Python → **interoperable consensus**.

---

## 1️⃣ Akin Hashing Spec v0.1 (canonical)

For any object `obj` we want to hash (block, tx, etc.):

> **hash(obj) = hex(SHA-256(canonical_json(obj)))**

Where:

1. `canonical_json(obj)` is obtained by:

   - Converting to plain JSON structure (no class instances)
   - **Sorting keys lexicographically** at _every_ object level
   - Using:

     - no extra spaces
     - `","` as item separator
     - `":"` as key/value separator

2. Encoding that JSON string as UTF-8 bytes.
3. Running SHA-256 over it.
4. Returning lowercase hex string of 64 chars.

The **canonical structure for hashing a block** is:

```jsonc
{
  "index": 0,
  "timestamp": 1732690000.123,
  "prev_hash": "0x0",
  "validator": "AKIN:VALIDATOR:1",
  "transactions": [
    {
      "tx_id": "...",
      "chain_id": "AKIN:CHAIN:DEMO",
      "app": "demo_session",
      "sender": "AKIN:USER:1",
      "payload": { ... },
      "signatures": [
        { "signer": "AKIN:USER:1", "sig": "dummy" }
      ],
      "timestamp": 1732690000.123
    }
  ]
}
```

**Important:**
👉 This means the **wire / hashing format** uses **snake_case** keys (`tx_id`, `chain_id`, `prev_hash`, …), even if TypeScript uses camelCase in memory.

---

## 2️⃣ Python already matches this 👍

Your Python `hash_json` currently does:

```python
json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()
```

and then `hashlib.sha256(...)`.

That **already matches** the spec:

- keys sorted → ✅
- no spaces → ✅
- UTF-8 → ✅
- SHA-256 → ✅

So: **no change needed in Python**.

---

## 3️⃣ Updating TypeScript to match Python

Right now TS does this (approx):

```ts
// old
export function hashJson(obj: any): string {
  const s = JSON.stringify(obj);
  let h = 0;
  ...
}
```

We will replace it with:

1. A **canonical JSON generator** that sorts keys recursively.
2. A **SHA-256 function** (Node’s `crypto` for now) over that JSON.
3. A helper that builds the **canonical block object** with snake_case keys, so it matches Python.

> I’ll assume Node environment for the demo (your current setup).
> For browsers, you’d wire it to `crypto.subtle.digest` later.

### 3.1 New `typescript/src/utils/hashing.ts`

Replace the entire file with:

```ts
// utils/hashing.ts
import crypto from "crypto";

/**
 * Recursively builds a canonical JSON string with sorted keys.
 * Matches Python's: json.dumps(obj, sort_keys=True, separators=(",", ":"))
 */
function canonicalize(value: any): any {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((v) => canonicalize(v));
  }

  // Plain object: sort keys
  const out: any = {};
  const keys = Object.keys(value).sort();
  for (const k of keys) {
    out[k] = canonicalize(value[k]);
  }
  return out;
}

export function canonicalJson(obj: any): string {
  const canon = canonicalize(obj);
  return JSON.stringify(canon);
}

/**
 * SHA-256 over canonical JSON, returns lowercase hex string.
 */
export function hashJson(obj: any): string {
  const s = canonicalJson(obj);
  const hash = crypto.createHash("sha256");
  hash.update(s, "utf8");
  return hash.digest("hex");
}
```

Now TS has **canonical, SHA-256 hashing** identical in spirit to Python’s.

---

## 3.2 Make TypeScript use the same canonical block structure as Python

In `typescript/src/core/chain.ts`, we need to:

- Import the new `hashJson`.
- Build the **Python-style block dict** for hashing (snake_case keys).
- Optionally also ensure transactions use snake_case when hashed.

### a) Import

At top of `core/chain.ts`:

```ts
import { hashJson } from "../utils/hashing";
```

### b) Add helpers to build canonical objects

Add this somewhere inside `core/chain.ts` (outside the class, near types):

```ts
import type { Block, Transaction } from "./chain"; // or adjust paths if needed

function canonicalSignature(sig: { signer: string; sig: string }) {
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
```

(If TypeScript complains about circular types, you can inline these as methods on the class; concept is the same.)

### c) Replace `calcBlockHash` in `AkinChain`

Find this in `AkinChain`:

```ts
private calcBlockHash(b: Block): string {
  return hashJson({
    index: b.index,
    timestamp: b.timestamp,
    prevHash: b.prevHash,
    validator: b.validator,
    transactions: b.transactions,
  });
}
```

Replace with:

```ts
private calcBlockHash(b: Block): string {
  const canon = canonicalBlock(b);
  return hashJson(canon);
}
```

Now:

- Python calculates `hash_json` over a dict with keys `index, timestamp, prev_hash, validator, transactions[...]` with snake_case fields.
- TypeScript calculates `hashJson` over a **structurally identical object** → same JSON → same SHA-256 → **same block_hash**.

---

## 4️⃣ What this gives you

After these changes:

- A chain built with **Python** and a chain built with **TypeScript** using the **same transactions and blocks** (same field values) will compute the **same `block_hash` values**.
- That’s the core requirement for **multi-language consensus compatibility**.

You still don’t have:

- A network protocol (no nodes talking yet).
- A canonical tx import/export pipeline (they’re local only).

But you now have:

> 🔗 A well-defined, language-agnostic **AkinHash** function
> & consistent **block hashing behavior** across Python and TS.

---

## 5️⃣ Suggested follow-up (optional but powerful)

Now that hashing is standardized, next steps (you can pick later):

- Define a **canonical JSON tx format** for network / file export (so a Python node can send txs to a TS node).
- Add **real signatures** using Ed25519 or secp256k1 on both sides.
- Introduce a thin **HTTP/JSON or gRPC interface** so validators and clients can interoperate.

---

If you’d like, I can next:

- Write a short **“AkinHash v0.1” spec section** you can drop into your protocol docs, or
- Give you a small **Python script + TS script** that both hash the same sample block and print the same hex, so you can sanity-check everything end-to-end.
