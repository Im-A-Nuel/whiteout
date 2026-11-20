import { expect } from "chai";
import { Interface } from "ethers";
import { artifacts } from "hardhat";
import { WHITEOUT_ABI } from "../../frontend/lib/abi";

/**
 * The frontend talks to the contract through a hand-written ABI (frontend/lib/abi.ts). If it drifts from
 * the real contract the app breaks on deploy day, so every fragment must match the compiled ABI exactly.
 */
describe("frontend ABI matches the compiled contract", function () {
  it("every function and event the app uses exists with the same signature", async function () {
    const art = await artifacts.readArtifact("Whiteout");
    const real = new Interface(art.abi);
    const app = new Interface(WHITEOUT_ABI as unknown as string[]);

    for (const f of app.fragments) {
      if (f.type === "function") {
        const fn = f as import("ethers").FunctionFragment;
        const match = real.getFunction(fn.selector);
        expect(match, `function ${fn.format("sighash")} missing in the contract`).to.not.equal(null);
        // same return types too, not only the same selector
        expect(match!.outputs.map((o) => o.format("sighash"))).to.deep.equal(fn.outputs.map((o) => o.format("sighash")), `outputs of ${fn.name}`);
      } else if (f.type === "event") {
        const ev = f as import("ethers").EventFragment;
        const match = real.getEvent(ev.topicHash);
        expect(match, `event ${ev.format("sighash")} missing in the contract`).to.not.equal(null);
      }
    }
  });

  it("the app calls finish with a run id, as the contract expects", async function () {
    const app = new Interface(WHITEOUT_ABI as unknown as string[]);
    expect(app.getFunction("finish")!.inputs.map((i) => i.type)).to.deep.equal(["uint256"]);
  });
});
