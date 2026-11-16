# Whiteout: Test Plan

Goal: prove the encrypted engine behaves exactly like a plaintext reference model, and prove the confidentiality properties actually hold.

## 1. Strategy

1. **Plaintext reference model** (`test/reference.ts`): a pure TypeScript implementation of the same rules on `bigint` bitboards. It is the oracle.
2. **Deterministic harness** (`contracts/test/WhiteoutHarness.sol`): overrides `_generateMap()` to load fixed maps with trivial encryption, so tests do not depend on randomness.
3. **Differential tests**: run the same move sequences through the contract (mock FHEVM) and the reference model, decrypt contract state in the test, and compare step by step.
4. **Property and confidentiality tests**: ACL, ownership, edge behavior.
5. **Sepolia smoke test**: a scripted full run on the real network.

Run fast tests with `npx hardhat test` (mock FHEVM). Run the Sepolia smoke test with the template's Sepolia test command.

## 2. Unit tests: game logic

| # | Case | Expectation |
| --- | --- | --- |
| 1 | Start on a fixed map | Position is the cabin, alive is true, collected is 0, moves is 0 |
| 2 | Move East into an empty cell | Position moves by one bit, alive stays true |
| 3 | Bump North from row 0 | Position unchanged, step counted |
| 4 | Bump South from row 7 | Position unchanged, step counted |
| 5 | Bump West from column 0 | Position unchanged, no wraparound to column 7 |
| 6 | Bump East from column 7 | Position unchanged, no wraparound to column 0 |
| 7 | Walk into a pit | Alive becomes false |
| 8 | Move after death | Position does not change, collected does not change |
| 9 | Step onto treasure | Collected increments, treasure bit is cleared |
| 10 | Return to a collected cell | Collected does not increment twice |
| 11 | Cold signal | True when a pit is orthogonally adjacent, false when only diagonal |
| 12 | Glint signal | True when treasure is orthogonally adjacent, false otherwise |
| 13 | Direction value above 3 | Behaves as `dir & 3`, never corrupts state |
| 14 | Finish at cabin, alive | Score equals collected |
| 15 | Finish away from cabin, alive | Score is 0 |
| 16 | Finish at cabin, dead | Score is 0 |
| 17 | Auto-end at step 24 | `move` reverts after the limit, anyone can finish the run |
| 18 | Packed path | Decrypted path decodes to the exact input sequence |
| 19 | Safe zone | Over many generated maps, bits 0, 1 and 8 are never pits |
| 20 | No overlap | Over many generated maps, treasure never shares a cell with a pit or the cabin |

## 3. Differential test

For each of 200 random seeds:

1. Pick a random fixed map and a random sequence of 24 directions.
2. Run both the reference model and the contract.
3. After every step, compare position, alive, collected, Cold and Glint.
4. After the last step, compare the final score.

Any mismatch fails the suite and prints the seed, the map and the move list.

## 4. Confidentiality tests

| # | Case | Expectation |
| --- | --- | --- |
| C1 | Player tries to user-decrypt `hazards` before Finish | Fails (no ACL) |
| C2 | Player tries to user-decrypt `prizes` before Finish | Fails |
| C3 | Another address tries to decrypt the player's `pos` | Fails |
| C4 | Player decrypts own `pos`, `alive`, `collected`, signals | Succeeds |
| C5 | After Finish, public decryption of hazards, treasure, path, score | Succeeds |
| C6 | Event log for a full run | Contains no direction, no position, no map bits |
| C7 | Two runs with different directions | Transaction shapes and event payloads are indistinguishable except the encrypted input bytes |

## 5. Access control and robustness

| # | Case | Expectation |
| --- | --- | --- |
| A1 | Non-owner calls `move` | Reverts |
| A2 | `startRun` while a run is active | Reverts |
| A3 | `move` after Finish | Reverts |
| A4 | `finalize` with a tampered proof | Reverts |
| A5 | `finalize` called twice | Second call reverts |
| A6 | `finalize` before Finish | Reverts |

## 6. Randomness sanity (mock)

Generate 500 maps in the mock environment, decrypt hazards through a test-only path, and check:

- Mean pit count is close to 8.
- No map has pits in the safe zone.
- Bit density is roughly uniform across the 64 positions (no stuck bits).

If density is off, the AND-of-three construction or the assumed `randEuint64` uniformity is wrong, and the design needs adjusting before building anything else.

## 7. HCU checks

- Measure HCU for `startRun`, `move` and `finish` and record the numbers in `ARCHITECTURE.md`.
- Test that two queued steps (if implemented) stay under the depth limit.
- Fail the suite if one `move` exceeds a configured budget (start with 3,000,000) so regressions are caught.

## 8. Balance simulator (plaintext, not part of CI)

`sim/` runs the reference model with simple agents:

- Random walker.
- Greedy agent that follows Glint and avoids Cold.
- A deduction agent that tracks safe and suspected cells.

Outputs: score distribution, death rate, treasure per map. Used to tune pit density, treasure density and step count. Target for the deduction agent: mean score 2 to 4, death rate 40 to 60 percent. These are hypotheses to be checked, not requirements.

## 9. Sepolia smoke test (manual and scripted)

1. Deploy, verify on Etherscan.
2. Script a run: start, 10 moves, return to cabin, finish, finalize.
3. Record the transaction hashes for the README.
4. Time each step end to end (transaction plus user decrypt) and record the numbers.
5. Repeat from a second wallet to confirm nothing depends on the deployer.

## 10. Definition of done for testing

- All unit, differential and confidentiality tests pass in the mock.
- One full run completes on Sepolia, including finalize.
- Coverage is reported in the README (a rough number is fine).
- Known gaps are listed honestly in `ARCHITECTURE.md`.
