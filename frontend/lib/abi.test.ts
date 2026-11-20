import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Interface, type EventFragment, type FunctionFragment } from "ethers";
import { describe, expect, it } from "vitest";
import { WHITEOUT_ABI } from "./abi";

/**
 * The app talks to the contract through a hand-written ABI (lib/abi.ts). If it drifts from the real contract
 * the app breaks on deploy day, so every fragment must match the compiled ABI. The artifact comes from
 * `forge build` in contract/. When it has not been built, the check is skipped and says so.
 */
const artifactPath = fileURLToPath(new URL("../../contract/out/Whiteout.sol/Whiteout.json", import.meta.url));
const built = existsSync(artifactPath);

describe.skipIf(!built)("frontend ABI matches the compiled contract (run forge build in contract/ first)", () => {
  const real = built ? new Interface(JSON.parse(readFileSync(artifactPath, "utf8")).abi) : null;
  const app = new Interface(WHITEOUT_ABI as unknown as string[]);

  it("every function and event the app uses exists with the same signature", () => {
    for (const f of app.fragments) {
      if (f.type === "function") {
        const fn = f as FunctionFragment;
        const match = real!.getFunction(fn.selector);
        expect(match, `function ${fn.format("sighash")} is missing in the contract`).not.toBeNull();
        expect(match!.outputs.map((o) => o.format("sighash"))).toEqual(fn.outputs.map((o) => o.format("sighash")));
      } else if (f.type === "event") {
        const ev = f as EventFragment;
        expect(real!.getEvent(ev.topicHash), `event ${ev.format("sighash")} is missing in the contract`).not.toBeNull();
      }
    }
  });

  it("finish takes a run id", () => {
    expect(app.getFunction("finish")!.inputs.map((i) => i.type)).toEqual(["uint256"]);
  });
});

describe("abi.ts", () => {
  it("lists the functions the app calls", () => {
    const names = new Interface(WHITEOUT_ABI as unknown as string[]).fragments.filter((f) => f.type === "function").map((f) => (f as FunctionFragment).name);
    for (const n of ["startRun", "move", "finish", "finalize", "getHandles", "getResult"]) expect(names).toContain(n);
  });
});
