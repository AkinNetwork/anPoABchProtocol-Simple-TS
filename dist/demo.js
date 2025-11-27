"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chain_1 = require("./core/chain");
const demoSession_1 = require("./apps/demoSession");
function demo() {
    const chainId = "AKIN:CHAIN:DEMO";
    const validators = ["AKIN:VALIDATOR:1"];
    const chain = new chain_1.AkinChain(chainId, validators, [new demoSession_1.DemoSessionApp()]);
    const req = ["AKIN:USER:1", "AKIN:ORG:AT", "AKIN:SYS:PAY"];
    const txCreate = (0, chain_1.makeTransaction)(chainId, "demo_session", "AKIN:USER:1", {
        action: "create",
        serviceId: "SESSION-1",
        participants: req,
        requiredSigners: req
    }, "AKIN:USER:1");
    console.log("add create", chain.addTx(txCreate));
    for (const signer of req.slice(0, 2)) {
        const tx = (0, chain_1.makeTransaction)(chainId, "demo_session", signer, { action: "sign", serviceId: "SESSION-1" }, signer);
        console.log("add sign", signer, chain.addTx(tx));
    }
    console.log("propose block 1", chain.proposeBlock("AKIN:VALIDATOR:1"));
    console.log("state after block 1", JSON.stringify(chain.appStates["demo_session"], null, 2));
    const last = req[2];
    const txLast = (0, chain_1.makeTransaction)(chainId, "demo_session", last, { action: "sign", serviceId: "SESSION-1" }, last);
    console.log("add sign last", chain.addTx(txLast));
    console.log("propose block 2", chain.proposeBlock("AKIN:VALIDATOR:1"));
    console.log("state final", JSON.stringify(chain.appStates["demo_session"], null, 2));
    console.log("chain valid?", chain.isValidChain());
}
demo();
