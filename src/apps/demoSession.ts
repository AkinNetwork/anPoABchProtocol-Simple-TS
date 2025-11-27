        import { Transaction, AkinApp } from "../core/chain";

        export class DemoSessionApp implements AkinApp {
          name = "demo_session";

          validate(tx: Transaction, state: any) {
            const payload = tx.payload || {};
            const action = payload.action;

            if (action === "create") {
              if (!payload.serviceId) return { ok: false, error: "serviceId required" };
              if (!Array.isArray(payload.participants)) return { ok: false, error: "participants[] required" };
              if (!Array.isArray(payload.requiredSigners)) return { ok: false, error: "requiredSigners[] required" };
              return { ok: true };
            }

            if (action === "sign") {
              if (!payload.serviceId) return { ok: false, error: "serviceId required" };
              if (!tx.signatures.length) return { ok: false, error: "signature required" };
              return { ok: true };
            }

            return { ok: false, error: `unknown action ${action}` };
          }

          apply(tx: Transaction, state: any): void {
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
                signaturesCollected: Object.fromEntries(
                  payload.requiredSigners.map((p: string) => [p, false])
                ),
                status: "pending"
              };
            } else if (action === "sign") {
              const sess = sessions[id];
              if (!sess) return;
              for (const sig of tx.signatures) {
                if (sig.signer in sess.signaturesCollected) {
                  sess.signaturesCollected[sig.signer] = true;
                }
              }
              if (Object.values(sess.signaturesCollected).every((v: any) => v === true)) {
                sess.status = "completed";
              }
            }
          }
        }
        