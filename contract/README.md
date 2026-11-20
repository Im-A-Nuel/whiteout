# Whiteout contracts

Foundry project. FHE tests run on [`forge-fhevm`](https://github.com/zama-ai/forge-fhevm), Zama's in-memory FHEVM host stack for Foundry. Solidity 0.8.27, `@fhevm/solidity` 0.11.1.

```
contracts/
  Whiteout.sol              core game, encrypted state machine
  WhiteoutLib.sol           bitboard helpers (masks, neighbors)
  test/WhiteoutHarness.sol  loads a fixed map instead of rolling one, for deterministic tests
test/
  Ref.sol                   plaintext reference model, the oracle of the differential test
  HcuTest.sol               HCULimit for tests that run many steps (see below)
  WhiteoutBase.sol          shared setup: harness, move helper, state reader
  Whiteout.t.sol            game logic, plus a 256 run differential fuzz against Ref
  Whiteout.security.t.sol   confidentiality (C1 to C7), access control (A1 to A6), finalize with proof
  Whiteout.random.t.sol     map generation with the real random source
  Whiteout.hcu.t.sol        HCU and depth of startRun, move and finish
script/DeployWhiteout.s.sol deploy script
```

## Commands

These run in WSL (`wsl -d Ubuntu-ext`), where Foundry is installed.

```bash
forge soldeer install            # dependencies, once
forge build
forge test                       # all tests
forge test -vv --match-contract WhiteoutHcuTest   # prints the measured HCU
forge test --fuzz-runs 2000      # longer differential fuzz
```

## Deploy to Sepolia

Settings come from `contract/.env` (copy `.env.example`): `SEPOLIA_RPC_URL`, `ETHERSCAN_API_KEY` and the deployer key. Prefer a Foundry keystore (`cast wallet import deployer --interactive` and `--account deployer`) over a key in `.env`.

`forge script` simulates on the local mock and sets the gas limit to its own estimate, which is far too low on the real network (2.47M simulated, 13.2M used). Send the creation with an explicit limit instead:

```bash
set -a; . ./.env; set +a
BC=$(forge inspect contracts/Whiteout.sol:Whiteout bytecode)
cast send --gas-limit 16000000 --rpc-url "$SEPOLIA_RPC_URL" --private-key "$PRIVATE_KEY" --create "$BC"
forge verify-contract <address> contracts/Whiteout.sol:Whiteout --chain sepolia --etherscan-api-key "$ETHERSCAN_API_KEY" --watch
```

Put the address in `frontend/.env.local` as `NEXT_PUBLIC_WHITEOUT_ADDRESS` and in `backend/.env` as `WHITEOUT_ADDRESS`. The scripted full run with the relayer lives in `backend/scripts/smoke-sepolia.ts`.

## Why `HcuTest.sol`

The host contract keeps a per transaction HCU total (cap 20M) and a sequential depth per handle (cap 5M) in transient storage. A forge test function is one transaction, so a test that plays 24 steps would hit the cap although each real step is its own transaction. `HCULimitMeter` adds `newTransaction()`, which resets the total and starts a new epoch for handle depths. The production limits still apply inside one window, so a step that is too heavy still fails. It also exposes `currentTxHCU()` and `depthOf(handle)` for the measurements in `Whiteout.hcu.t.sol`.

## Notes

- `decrypt(...)` in `forge-fhevm` reads state with no ACL check and is for assertions only. Real access is tested with `userDecrypt` and `signUserDecrypt`.
- Handles that are trivial encryptions of the same value are identical. Fixed maps in tests use distinct non-zero words wherever a proof over several handles is built.
- License: BSD-3-Clause-Clear, from the Zama template. Zama's libraries are patented, commercial use needs a license from Zama.
