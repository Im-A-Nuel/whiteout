// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint8, euint64, ebool, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {WhiteoutLib} from "./WhiteoutLib.sol";

/// @title Whiteout
/// @notice A fog-of-war roguelike on an 8x8 board where position, moves, map and death stay encrypted.
/// @dev Public state is limited to owner, step counter and lifecycle flags. See docs/ARCHITECTURE.md.
contract Whiteout is ZamaEthereumConfig {
    struct Run {
        address player;
        uint8 moves;
        bool ended;
        bool finalized;
        euint64 hazards;
        euint64 prizesInitial;
        euint64 prizes;
        euint64 pos;
        euint64 path;
        euint8 collected;
        ebool alive;
        ebool dangerNear;
        ebool prizeNear;
        euint8 score;
    }

    /// @notice Result written by `finalize` once the KMS proof is verified.
    struct Result {
        uint8 score;
        uint64 hazards;
        uint64 prizes;
        uint64 path;
    }

    uint8 public constant MAX_MOVES = WhiteoutLib.MAX_MOVES;

    uint256 public runCount;
    mapping(uint256 runId => Run) private _runs;
    mapping(uint256 runId => Result) private _results;
    /// @dev runId of the player's current unfinished run, 0 when none (run ids start at 1).
    mapping(address player => uint256 runId) public activeRunOf;

    event RunStarted(uint256 indexed runId, address indexed player);
    event Moved(uint256 indexed runId, uint8 moveIndex);
    event RunEnded(uint256 indexed runId);
    event RunFinalized(
        uint256 indexed runId,
        address indexed player,
        uint8 score,
        uint64 hazards,
        uint64 prizes,
        uint64 path
    );

    error RunAlreadyActive();
    error NoActiveRun();
    error NotRunOwner();
    error RunOver();
    error OutOfSteps();
    error UnknownRun();
    error NotEnded();
    error AlreadyFinalized();

    // ---------------------------------------------------------------- start

    /// @notice Starts a run: rolls an encrypted map and puts the player on the cabin.
    function startRun() external returns (uint256 runId) {
        if (activeRunOf[msg.sender] != 0) revert RunAlreadyActive();

        runId = ++runCount;
        activeRunOf[msg.sender] = runId;

        Run storage r = _runs[runId];
        r.player = msg.sender;

        (euint64 h, euint64 p) = _generateMap();
        r.hazards = h;
        r.prizesInitial = p;
        r.prizes = p;
        r.pos = FHE.asEuint64(WhiteoutLib.CABIN);
        r.path = FHE.asEuint64(uint64(0));
        r.collected = FHE.asEuint8(uint8(0));
        r.alive = FHE.asEbool(true);
        (r.dangerNear, r.prizeNear) = _signals(r.pos, h, p);

        // Hazards and treasure are never granted to the player before Finish.
        FHE.allowThis(r.hazards);
        FHE.allowThis(r.prizesInitial);
        FHE.allowThis(r.prizes);
        FHE.allowThis(r.path);
        _grantPlayerState(r);

        emit RunStarted(runId, msg.sender);
    }

    // ----------------------------------------------------------------- move

    /// @notice Applies one step under encryption. Walls bump, the dead do not move.
    /// @param encDir Encrypted direction: 0 north, 1 south, 2 west, 3 east (masked with 3).
    function move(externalEuint8 encDir, bytes calldata proof) external {
        uint256 runId = activeRunOf[msg.sender];
        if (runId == 0) revert NoActiveRun();
        Run storage r = _runs[runId];
        if (r.ended) revert RunOver();
        if (r.moves >= WhiteoutLib.MAX_MOVES) revert OutOfSteps();

        euint8 dir = FHE.and(FHE.fromExternal(encDir, proof), uint8(3));

        euint64 p = r.pos;
        euint64 cand = FHE.select(
            FHE.eq(dir, WhiteoutLib.NORTH),
            WhiteoutLib.north(p),
            FHE.select(
                FHE.eq(dir, WhiteoutLib.SOUTH),
                WhiteoutLib.south(p),
                FHE.select(FHE.eq(dir, WhiteoutLib.WEST), WhiteoutLib.west(p), WhiteoutLib.east(p))
            )
        );

        // Off the board yields zero, which is a bump: stay in place. The dead never move.
        euint64 moved = FHE.select(FHE.ne(cand, uint64(0)), cand, p);
        euint64 newPos = FHE.select(r.alive, moved, p);

        ebool hit = FHE.ne(FHE.and(newPos, r.hazards), uint64(0));
        ebool aliveNew = FHE.and(r.alive, FHE.not(hit));
        ebool gotPrize = FHE.and(aliveNew, FHE.ne(FHE.and(newPos, r.prizes), uint64(0)));

        euint64 prizesNew = FHE.and(r.prizes, FHE.not(newPos));
        r.prizes = prizesNew;
        r.collected = FHE.add(r.collected, FHE.asEuint8(gotPrize));
        r.path = FHE.or(FHE.shl(r.path, 2), FHE.asEuint64(dir));
        r.pos = newPos;
        r.alive = aliveNew;
        (r.dangerNear, r.prizeNear) = _signals(newPos, r.hazards, prizesNew);

        r.moves += 1;

        FHE.allowThis(r.prizes);
        FHE.allowThis(r.path);
        _grantPlayerState(r);

        emit Moved(runId, r.moves);
    }

    // --------------------------------------------------------------- finish

    /// @notice Ends the run, scores it and opens map, path and score for public decryption.
    /// @dev Only the owner may finish early. Once the step limit is reached anyone may finish it.
    function finish(uint256 runId) external {
        Run storage r = _runs[runId];
        if (r.player == address(0)) revert UnknownRun();
        if (r.ended) revert RunOver();
        if (msg.sender != r.player && r.moves < WhiteoutLib.MAX_MOVES) revert NotRunOwner();

        r.ended = true;
        if (activeRunOf[r.player] == runId) activeRunOf[r.player] = 0;

        ebool home = FHE.eq(r.pos, uint64(WhiteoutLib.CABIN));
        ebool ok = FHE.and(r.alive, home);
        r.score = FHE.select(ok, r.collected, FHE.asEuint8(uint8(0)));
        FHE.allowThis(r.score);

        FHE.makePubliclyDecryptable(r.hazards);
        FHE.makePubliclyDecryptable(r.prizesInitial);
        FHE.makePubliclyDecryptable(r.path);
        FHE.makePubliclyDecryptable(r.score);

        emit RunEnded(runId);
    }

    /// @notice Verifies the KMS proof over [hazards, prizesInitial, path, score] and stores the result.
    function finalize(uint256 runId, bytes calldata cleartexts, bytes calldata decryptionProof) external {
        Run storage r = _runs[runId];
        if (r.player == address(0)) revert UnknownRun();
        if (!r.ended) revert NotEnded();
        if (r.finalized) revert AlreadyFinalized();

        bytes32[] memory handles = new bytes32[](4);
        handles[0] = FHE.toBytes32(r.hazards);
        handles[1] = FHE.toBytes32(r.prizesInitial);
        handles[2] = FHE.toBytes32(r.path);
        handles[3] = FHE.toBytes32(r.score);
        FHE.checkSignatures(handles, cleartexts, decryptionProof);

        (uint64 h, uint64 pz, uint64 pa, uint8 sc) = abi.decode(cleartexts, (uint64, uint64, uint64, uint8));

        r.finalized = true;
        _results[runId] = Result({score: sc, hazards: h, prizes: pz, path: pa});

        emit RunFinalized(runId, r.player, sc, h, pz, pa);
    }

    // ----------------------------------------------------------------- views

    /// @notice Public fields only.
    function getRun(
        uint256 runId
    ) external view returns (address player, uint8 moves, bool ended, bool finalized) {
        Run storage r = _runs[runId];
        return (r.player, r.moves, r.ended, r.finalized);
    }

    /// @notice Revealed result of a finalized run.
    function getResult(uint256 runId) external view returns (Result memory) {
        return _results[runId];
    }

    /// @notice Ciphertext handles of a run. Useless without ACL permission.
    function getHandles(
        uint256 runId
    )
        external
        view
        returns (
            euint64 pos,
            ebool alive,
            euint8 collected,
            ebool dangerNear,
            ebool prizeNear,
            euint64 hazards,
            euint64 prizesInitial,
            euint64 path,
            euint8 score
        )
    {
        Run storage r = _runs[runId];
        return (r.pos, r.alive, r.collected, r.dangerNear, r.prizeNear, r.hazards, r.prizesInitial, r.path, r.score);
    }

    // -------------------------------------------------------------- internals

    /// @dev Each bit is 1 with probability 1/8 (AND of three uniform words). Virtual so tests can fix the map.
    function _generateMap() internal virtual returns (euint64 h, euint64 p) {
        h = FHE.and(FHE.and(FHE.randEuint64(), FHE.randEuint64()), FHE.randEuint64());
        p = FHE.and(FHE.and(FHE.randEuint64(), FHE.randEuint64()), FHE.randEuint64());
        h = FHE.and(h, ~WhiteoutLib.SAFE_ZONE);
        p = FHE.and(p, FHE.not(h));
        p = FHE.and(p, ~WhiteoutLib.CABIN);
    }

    function _signals(euint64 p, euint64 hazards, euint64 prizes) internal returns (ebool danger, ebool prize) {
        euint64 nb = WhiteoutLib.neighbors(p);
        danger = FHE.ne(FHE.and(nb, hazards), uint64(0));
        prize = FHE.ne(FHE.and(nb, prizes), uint64(0));
    }

    /// @dev Handles change on every FHE operation, so the grants are repeated after each step.
    function _grantPlayerState(Run storage r) internal {
        address player = r.player;
        FHE.allowThis(r.pos);
        FHE.allowThis(r.alive);
        FHE.allowThis(r.collected);
        FHE.allowThis(r.dangerNear);
        FHE.allowThis(r.prizeNear);
        FHE.allow(r.pos, player);
        FHE.allow(r.alive, player);
        FHE.allow(r.collected, player);
        FHE.allow(r.dangerNear, player);
        FHE.allow(r.prizeNear, player);
    }
}
