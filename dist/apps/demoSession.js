"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoSessionApp = void 0;
class DemoSessionApp {
    constructor() {
        this.name = "demo_session";
    }
    validate(tx, state) {
        const payload = tx.payload || {};
        const action = payload.action;
        if (action === "create") {
            if (!payload.serviceId)
                return { ok: false, error: "serviceId required" };
            if (!Array.isArray(payload.participants))
                return { ok: false, error: "participants[] required" };
            if (!Array.isArray(payload.requiredSigners))
                return { ok: false, error: "requiredSigners[] required" };
            return { ok: true };
        }
        if (action === "sign") {
            if (!payload.serviceId)
                return { ok: false, error: "serviceId required" };
            if (!tx.signatures.length)
                return { ok: false, error: "signature required" };
            return { ok: true };
        }
        return { ok: false, error: `unknown action ${action}` };
    }
    apply(tx, state) {
        const payload = tx.payload;
        const action = payload.action;
        state.sessions = state.sessions || {};
        const sessions = state.sessions;
        const id = payload.serviceId;
        if (action === "create") {
            sessions[id] = {
                serviceId: id,
                participants: payload.participants,
                requiredSigners: payload.requiredSigners,
                signaturesCollected: Object.fromEntries(payload.requiredSigners.map((p) => [p, false])),
                status: "pending"
            };
        }
        else if (action === "sign") {
            const sess = sessions[id];
            if (!sess)
                return;
            for (const sig of tx.signatures) {
                if (sig.signer in sess.signaturesCollected) {
                    sess.signaturesCollected[sig.signer] = true;
                }
            }
            if (Object.values(sess.signaturesCollected).every((v) => v === true)) {
                sess.status = "completed";
            }
        }
    }
}
exports.DemoSessionApp = DemoSessionApp;
