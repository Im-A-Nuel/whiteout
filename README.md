# Whiteout

**A blizzard roguelike where the chain can't see you die.**

Whiteout is a fog-of-war survival game on Zama's FHEVM. You walk an 8x8 temple with a hidden map of pits and relics. Your position, your moves, the map and whether you are still alive stay encrypted onchain. The chain only ever learns the step counter, and then the final result, with proof, when the run ends.

Built for the Zama Developer Program Mainnet Season 5, Confidential Gaming. Target network: Sepolia.

> Status: contract, frontend and balance simulator are implemented and tested locally. The contract is deployed and verified on Sepolia, and a scripted run (start, 4 steps, finish, finalize with proof) has completed there. A step takes about 26 s end to end, which the UI has to hide. See `docs/ARCHITECTURE.md`. The browser flow with a real wallet has not been tried yet.

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

HCU (forge-fhevm): one `move` costs about 1.78M (sequential depth 701k), `startRun` about 924k and `finish` about 163k, all far under the 20M per-transaction cap. Gas on Sepolia: `startRun` 3.32M, `move` about 2.40M, `finish` 0.85M, `finalize` 0.49M. Latency on Sepolia from a Node script: about 26 s per step (encrypt 10.6 s, confirmation 8 to 25 s, user decrypt 5 s).

## Deployed contracts (Sepolia)

| Contract | Address |
| --- | --- |
| Whiteout | [`0x0a42721223a0eceAE92fAfE07F800A8Adc780185`](https://sepolia.etherscan.io/address/0x0a42721223a0eceAE92fAfE07F800A8Adc780185#code) |

Demo, video and announcement links: `TODO`.

## Security notes

Unaudited hackathon code. Do not use it with real funds. Known limitations are listed in [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) under "Threat model and limitations".

## License

The contract folder keeps the BSD-3-Clause-Clear license of the Zama template. Zama's libraries are patented and commercial use of Zama technology requires a license from Zama. Add a license for the rest of the repository before submitting.
