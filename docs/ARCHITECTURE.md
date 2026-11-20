# Whiteout: Architecture

Items tagged **VERIFY** are API names, behaviors, or numbers that must be confirmed against the template's pinned `@fhevm/solidity` version and the current Zama docs during the Day 1 spike. Do not assume them.

## 1. System overview

```
Browser (Next.js, ethers v6)
  - relayer SDK (client only): encrypt input, user decrypt, public decrypt
  - local state: own position prediction, suspected-pit notes
        |
        |  tx: move(externalEuint8, inputProof)
        v
Whiteout.sol (Sepolia)  --FHE ops-->  Zama host contracts / ACL
        |
        |  coprocessors compute on ciphertext, KMS decrypts on policy
        v
Relayer + Gateway: user decryption (private), public decryption + signatures
```

Three decryption paths, each with a different audience:

| Path | Audience | Used for |
| --- | --- | --- |
| Encrypted input | the contract only | the direction of each step |
| User decryption | one player | own position, alive flag, treasure count, per-step signals |
| Public decryption | everyone | map, path and score, only at Finish |

## 2. Data model

All map and state words are `euint64` bitboards where bit `i` is cell `i = row * 8 + col`.

```solidity
struct Run {
    address player;
    uint8   moves;        // public step counter
    bool    ended;        // Finish called or MAX_MOVES reached
    bool    finalized;    // public decryption verified
    euint64 hazards;      // pit bitboard
    euint64 prizesInitial;// original treasure bitboard, kept for the final reveal and replay
    euint64 prizes;       // live treasure bitboard, shrinks as treasure is taken
    euint64 pos;          // one-hot bitboard of the player
    euint64 path;         // 2 bits per step, packed
    euint8  collected;    // treasure count
    ebool   alive;
    ebool   dangerNear;   // last signal: a pit is adjacent
    ebool   prizeNear;    // last signal: treasure is adjacent
    euint8  score;        // set at Finish
}
```

Constants:

```solidity
uint8  constant MAX_MOVES = 24;
uint64 constant CABIN        = 0x1;                  // bit 0
uint64 constant SAFE_ZONE    = 0x103;                // bits 0, 1, 8
uint64 constant FILE_A       = 0x0101010101010101;   // column 0
uint64 constant FILE_H       = 0x8080808080808080;   // column 7
uint64 constant NOT_FILE_A   = 0xFEFEFEFEFEFEFEFE;
uint64 constant NOT_FILE_H   = 0x7F7F7F7F7F7F7F7F;
```

Path packing: 24 steps x 2 bits = 48 bits, which fits in one `euint64`. One handle covers the whole replay.

## 3. Contract API

| Function | Caller | Effect |
| --- | --- | --- |
| `startRun()` | player | One active run per address. Generates the encrypted map, places the player on the cabin, sets ACL |
| `move(externalEuint8 dir, bytes proof)` | run owner | Applies one step under encryption, refreshes signals, updates ACL |
| `finish(runId)` | run owner, or anyone once `MAX_MOVES` is reached | Ends the run, computes the score, marks map, path and score publicly decryptable |
| `finalize(runId, bytes cleartexts, bytes decryptionProof)` | anyone | Verifies the KMS signatures, stores the revealed result, emits the reveal event |
| `getRun(runId)` | anyone | Public fields only (player, moves, ended, finalized) |
| `getHandles(runId)` | anyone | Returns ciphertext handles. Useless without ACL permission |

After `MAX_MOVES`, `move` reverts and `finish(runId)` can be called by anyone for that run, so abandoned runs can still be finalized.

Events (none leaks a direction or a position):

```solidity
event RunStarted(uint256 indexed runId, address indexed player);
event Moved(uint256 indexed runId, uint8 moveIndex);
event RunEnded(uint256 indexed runId);
event RunFinalized(uint256 indexed runId, address indexed player,
                   uint8 score, uint64 hazards, uint64 prizes, uint64 path);
```

## 4. Encrypted logic

### 4.1 Map generation (`startRun`)

```solidity
function _generateMap() internal virtual returns (euint64 h, euint64 p) {
    // each bit is 1 with probability 1/8
    h = FHE.and(FHE.and(FHE.randEuint64(), FHE.randEuint64()), FHE.randEuint64());
    p = FHE.and(FHE.and(FHE.randEuint64(), FHE.randEuint64()), FHE.randEuint64());
    h = FHE.and(h, ~SAFE_ZONE);               // keep the start safe
    p = FHE.and(p, FHE.not(h));               // no treasure inside pits
    p = FHE.and(p, ~CABIN);                   // no treasure on the cabin
}
```

`_generateMap` is `virtual` so the test harness can override it with fixed maps via trivial encryption. This is what makes the engine deterministic to test. **VERIFY** that the scalar overloads used here (`FHE.and(euint64, uint64)`) exist in the pinned version.

### 4.2 One step (`move`)

Direction encoding: 0 = North, 1 = South, 2 = West, 3 = East.

```solidity
function move(externalEuint8 encDir, bytes calldata proof) external {
    Run storage r = _activeRun(msg.sender);              // checks owner, !ended, moves < MAX_MOVES
    euint8 dir = FHE.and(FHE.fromExternal(encDir, proof), uint8(3));  // force into 0..3

    euint64 p = r.pos;
    euint64 north = FHE.shr(p, 8);
    euint64 south = FHE.shl(p, 8);
    euint64 west  = FHE.and(FHE.shr(p, 1), NOT_FILE_H);
    euint64 east  = FHE.and(FHE.shl(p, 1), NOT_FILE_A);

    euint64 cand = FHE.select(FHE.eq(dir, 0), north,
                   FHE.select(FHE.eq(dir, 1), south,
                   FHE.select(FHE.eq(dir, 2), west, east)));

    ebool   valid  = FHE.ne(cand, uint64(0));           // off the board yields zero
    euint64 moved  = FHE.select(valid, cand, p);        // bump = stay
    euint64 newPos = FHE.select(r.alive, moved, p);     // the dead do not move

    ebool hit        = FHE.ne(FHE.and(newPos, r.hazards), uint64(0));
    ebool aliveNew   = FHE.and(r.alive, FHE.not(hit));
    ebool gotPrize   = FHE.and(aliveNew, FHE.ne(FHE.and(newPos, r.prizes), uint64(0)));

    r.prizes    = FHE.and(r.prizes, FHE.not(newPos));   // consume
    r.collected = FHE.add(r.collected, FHE.asEuint8(gotPrize));
    r.path      = FHE.or(FHE.shl(r.path, 2), FHE.asEuint64(dir));
    r.pos       = newPos;
    r.alive     = aliveNew;

    euint64 nb = _neighbors(newPos);
    r.dangerNear = FHE.ne(FHE.and(nb, r.hazards), uint64(0));
    r.prizeNear  = FHE.ne(FHE.and(nb, r.prizes),  uint64(0));

    r.moves += 1;
    _grantAcl(r);
    emit Moved(runId, r.moves);
}
```

Edge behavior this relies on (**VERIFY** in the mock):

- `shl` and `shr` on `euint64` discard bits shifted out instead of rotating. North from row 0 and South from row 7 then produce zero, which `valid` catches.
- West from column 0 lands on column 7 of the previous row, and East from column 7 lands on column 0 of the next row. The `NOT_FILE_H` and `NOT_FILE_A` masks remove those wrapped bits, producing zero, which `valid` catches.

`_neighbors(pos)` is the OR of the same four shifted-and-masked candidates, computed on the new position.

### 4.3 Finish (`finish`)

```solidity
// implemented as finish(uint256 runId): the id is needed so anyone can finish an abandoned run
function finish() external {
    Run storage r = _runOf(msg.sender);
    require(!r.ended);
    r.ended = true;

    ebool home = FHE.eq(r.pos, CABIN);
    ebool ok   = FHE.and(r.alive, home);
    r.score    = FHE.select(ok, r.collected, FHE.asEuint8(0));

    FHE.allowThis(r.score);
    FHE.makePubliclyDecryptable(r.hazards);
    FHE.makePubliclyDecryptable(r.prizesInitial);
    FHE.makePubliclyDecryptable(r.path);
    FHE.makePubliclyDecryptable(r.score);
    emit RunEnded(runId);
}
```

Reveal detail: the live `prizes` word shrinks as treasure is collected, so it is never revealed. A full replay needs the original treasure map, which is why `prizesInitial` is stored at `startRun` (copy `p` into it right after `_generateMap`) and revealed instead. `startRun` must call `FHE.allowThis` on it and must never `FHE.allow` it to the player.

### 4.4 Finalize (`finalize`)

Follow the public decryption pattern in the current docs: the caller fetches cleartexts and a proof from the relayer for the handle list in a fixed order `[hazards, prizesInitial, path, score]`, then the contract verifies:

```solidity
bytes32[] memory handles = new bytes32[](4);
handles[0] = FHE.toBytes32(r.hazards);
handles[1] = FHE.toBytes32(r.prizesInitial);
handles[2] = FHE.toBytes32(r.path);
handles[3] = FHE.toBytes32(r.score);
FHE.checkSignatures(handles, cleartexts, decryptionProof);
(uint64 h, uint64 pz, uint64 pa, uint8 sc) =
    abi.decode(cleartexts, (uint64, uint64, uint64, uint8));
```

**VERIFY**: exact ABI encoding of `cleartexts`, whether small types like `uint8` are padded to 32 bytes in the decode, and the current signature of `checkSignatures`. Copy the pattern from the docs example rather than from this sketch.

## 5. ACL matrix

| Handle | Contract | Player | Public |
| --- | --- | --- | --- |
| `hazards` | yes | **never** until Finish | after Finish |
| `prizes`, `prizesInitial` | yes | **never** until Finish | after Finish |
| `pos` | yes | yes | no |
| `alive` | yes | yes | no |
| `collected` | yes | yes | no |
| `dangerNear`, `prizeNear` | yes | yes | no |
| `path` | yes | no | after Finish |
| `score` | yes | no | after Finish |

Rules of thumb: every stored handle needs `FHE.allowThis`. A handle given to the player with `FHE.allow(handle, player)` becomes decryptable by that player forever, so never allow `hazards` or `prizes` before Finish. Re-grant on every step, because each FHE operation creates a new handle.

## 6. HCU budget

Per-operation costs come from the HCU table in the Zama docs (devnet figures: 20,000,000 per transaction globally, 5,000,000 for sequential depth). **VERIFY** the Sepolia limits and any per-block metering before locking the design.

Estimated cost of one `move`, from the table (euint64 scalar and, shifts: 34,000; euint64 select: 55,000; euint64 ne scalar: 84,000; euint8 eq scalar: 55,000; ebool and: 25,000):

| Part | HCU |
| --- | --- |
| Direction mask and three `eq` | 196,000 |
| Four shifts and two edge masks | 204,000 |
| Candidate select chain, validity, bump, alive gate | 364,000 |
| Hit test, alive update | 143,000 |
| Treasure test, consume, count | 265,000 |
| Path packing | 66,000 |
| Neighbors of the new position | 306,000 |
| Two signals | 236,000 |
| **Total** | **about 1,775,000** |

Other entry points: `startRun` about 450,000, `finish` about 165,000.

### Measured (forge-fhevm, `forge test -vv --match-contract WhiteoutHcuTest`)

| Entry point | Global HCU | Sequential depth | Estimate above |
| --- | --- | --- | --- |
| `startRun` | 924,191 | 312,063 | about 450,000 |
| `move` | 1,777,129 | 701,034 | about 1,775,000 |
| `finish` | 163,032 | 163,000 | about 165,000 |

The `move` and `finish` estimates were within 1 percent. `startRun` came out at about twice the estimate: the implementation also computes the opening Cold and Glint signals at the cabin and rolls six random words, which the hand estimate did not count. Every number is far below the 20,000,000 per-transaction cap and the 5,000,000 depth cap, so up to 2 queued steps per transaction would fit (3 would be 5.3M global, depth is the number to watch). Gas measured earlier on a local FHEVM node: `startRun` about 971,000, `move` about 948,000. These are mock figures. Sepolia numbers go here after `npm run smoke:sepolia` in `backend/`.

Reading this:

- One step is far below the 20M ceiling, so even 3 queued steps per transaction (about 5.3M) fit the global limit. The depth limit (5M, sequential) is the number to measure, because queued steps are sequentially dependent.
- These are hand estimates from a table. The Day 1 spike must measure real HCU in the mock environment and on Sepolia. If one step turns out close to the depth cap, cut the neighbor computation or the path packing first.

## 7. Frontend flow

Per step:

1. `createEncryptedInput(contract, user).add8(dir).encrypt()` gives `{handles, inputProof}`.
2. Send `move(handles[0], inputProof)`.
3. On receipt, read the handles for `dangerNear`, `prizeNear`, `alive`, `collected`.
4. `userDecrypt` all four in one call, using a cached EIP-712 permit.
5. Update the UI. Local position prediction runs in parallel so the board never waits.

Gotchas:

- Load the relayer SDK **only in the browser** (dynamic import with SSR disabled). It uses WASM and breaks server rendering in Next.js.
- The SDK may need cross-origin isolation headers for threaded WASM. **VERIFY**, and if needed set `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` in `next.config.js`.
- Package versions move quickly. Pin to what the Zama templates pin, and check whether a newer unified SDK package has replaced the relayer SDK before upgrading anything.
- Cache the decrypt permit for the session to avoid a wallet signature on every step.

## 8. Deployment

- Network: Sepolia. Use the template's deploy scripts, then verify on Etherscan.
- Keep a funded demo wallet separate from the deployer.
- Record the contract address in the README and the submission form the moment it is deployed.
- Seed three or four finished runs on Sepolia (one perfect, one death, one timeout) so the leaderboard and replay are populated for judges.

## 9. Threat model and limitations

| Concern | Status |
| --- | --- |
| Player reads the map from chain state | Not possible: no ACL grant for `hazards` or `prizes` before Finish |
| Player cherry-picks a good map by reverting | Not possible: the result is encrypted, so there is nothing to inspect before committing |
| Malicious `dir` input out of range | Masked with `& 3` before use |
| Replaying someone else's input | Encrypted inputs are bound to the contract and sender by the input proof |
| Someone else moves your run | `move` requires `msg.sender == run.player` |
| Timing and gas side channels | Step count and tx timing are public. A bump costs the same as a move because the circuit is branch-free |
| Abandoned runs | `finish(runId)` is callable by anyone after `MAX_MOVES`, so state does not stay locked |
| Zama infrastructure trust | Inherited from the Zama protocol (KMS threshold, coprocessors). Not specific to this app |
| Audit | None. Hackathon code |

## 10. Open questions for the Day 1 spike

Status after the spike (forge-fhevm, the template pins `@fhevm/solidity` 0.11.1):

1. **Resolved.** Every scalar overload used in the sketch compiles on the pinned version.
2. **Measured on the mock, Sepolia pending.** See the table in section 6. Two queued steps stay under the depth cap.
3. **Resolved.** `abi.decode(cleartexts, (uint64, uint64, uint64, uint8))` works on the padded encoding returned by `publicDecrypt`. Caveat: handles that are trivial encryptions of the same value (for example two zero maps) are identical and cannot be proven together. Real maps are random so this only affects the test harness. The tests use distinct non-zero maps for finalize.
4. **Resolved.** 120 random maps in the mock: mean 7.51 pits and 7.32 treasure per map, the safe zone and the no-overlap rules held on every map, no stuck bits (`test/Whiteout.random.t.sol`: mean 7.67 pits and 7.05 treasure on the Foundry run).
5. **Open.** Cross-origin isolation headers for the relayer SDK. The app builds and runs without them locally. Verify on the Vercel deployment.
6. **Open.** User-decrypt latency on Sepolia. Run `npm run smoke:sepolia -- 8` in `backend/`: it prints encrypt, transaction and decrypt time for every step and writes `smoke-sepolia.json`. If one step takes more than about 8 seconds, redesign around queued input (the UI already queues up to 3 inputs).

### Findings worth knowing

- A forge test function is one transaction, so the host contract's per-transaction HCU total and the sequential depth cap would keep growing across the steps of a test. `test/HcuTest.sol` adds a test-only `HCULimitMeter` with `newTransaction()`, which resets the total and starts a new epoch for handle depths, like a real new transaction. The 20M and 5M limits still apply inside one window.
- Two steps in one window cost 3,554,258 global HCU with sequential depth 1,128,034, so two queued steps per transaction fit comfortably. Three would be about 5.3M global.
- `decrypt(...)` in forge-fhevm reads state with no ACL check and is for assertions only. Real access is tested with `userDecrypt` and `signUserDecrypt`.
- The frontend ABI (`frontend/lib/abi.ts`) is checked against the compiled contract by `frontend/lib/abi.test.ts`, which reads the artifact from `forge build`.
- The scripted Sepolia run needs the relayer for encrypted inputs and proofs, so it is a Node script (`backend/scripts/smoke-sepolia.ts`), not a forge script. It has not been run against Sepolia yet.
