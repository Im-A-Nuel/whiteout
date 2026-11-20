# Whiteout

**A blizzard roguelike where the chain can't see you die.**

Whiteout is a fog-of-war survival game on Zama's FHEVM. You walk an 8x8 temple with a hidden map of pits and relics. Your position, your moves, the map and whether you are still alive stay encrypted onchain. The chain only ever learns the step counter, and then the final result, with proof, when the run ends.

Built for the Zama Developer Program Mainnet Season 5, Confidential Gaming. Target network: Sepolia.

> Status: contract, frontend and balance simulator are implemented and tested locally. The contract is not deployed to Sepolia yet, so the addresses and links below are placeholders.

## Repository

| Folder | What is in it |
| --- | --- |
| [`contract/`](./contract) | Solidity contracts and Foundry tests (unit, differential fuzz against a plaintext model, confidentiality, access control, HCU), deploy script |
| [`frontend/`](./frontend) | Next.js app: pixel UI, offline practice mode, `/demo` preview of the chain screens, Sepolia mode |
| [`backend/`](./backend) | Plaintext balance simulator, and the scripted full run on Sepolia (`smoke-sepolia.ts`) |
| [`docs/`](./docs) | Game design, architecture, UI spec and UI kit, test plan, roadmap, demo script |

## Quick start

```bash
# contract tests with Foundry and forge-fhevm (run in WSL)
cd contract && forge soldeer install && forge test

# frontend, then open http://localhost:3000/practice
cd frontend && npm install && npm run dev
```

Deploying to Sepolia and the scripted full run are described in [`docs/README.md`](./docs/README.md#run-locally).

## What is measured so far

On the mock FHEVM: one `move` costs about 1.78M HCU (sequential depth 701k), `startRun` about 924k and `finish` about 163k, all far under the 20M per-transaction cap. Measured gas on a local node is about 948k per step. Sepolia numbers and user-decrypt latency are not measured yet.

## Deployed contracts (Sepolia)

| Contract | Address |
| --- | --- |
| Whiteout | `TODO` |

Demo, video and announcement links: `TODO`.

## Security notes

Unaudited hackathon code. Do not use it with real funds. Known limitations are listed in [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) under "Threat model and limitations".

## License

The contract folder keeps the BSD-3-Clause-Clear license of the Zama template. Zama's libraries are patented and commercial use of Zama technology requires a license from Zama. Add a license for the rest of the repository before submitting.
