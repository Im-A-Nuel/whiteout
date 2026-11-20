// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {HcuTest} from "./HcuTest.sol";
import {euint8, euint64, ebool, externalEuint8} from "encrypted-types/EncryptedTypes.sol";
import {WhiteoutHarness} from "../contracts/test/WhiteoutHarness.sol";
import {Ref} from "./Ref.sol";

/// @notice Shared setup for the Whiteout tests: a harness with fixed maps, a move helper and a state reader.
abstract contract WhiteoutBase is HcuTest {
    uint8 internal constant NORTH = 0;
    uint8 internal constant SOUTH = 1;
    uint8 internal constant WEST = 2;
    uint8 internal constant EAST = 3;

    WhiteoutHarness internal game;
    address internal alice;
    address internal bob;
    uint256 internal alicePk;
    uint256 internal bobPk;

    struct Snap {
        uint8 moves;
        uint64 pos;
        bool alive;
        uint8 collected;
        bool cold;
        bool glint;
        uint64 hazards;
        uint64 prizesInitial;
        uint64 path;
    }

    function setUp() public virtual override {
        super.setUp();
        game = new WhiteoutHarness();
        (alice, alicePk) = makeAddrAndKey("alice");
        (bob, bobPk) = makeAddrAndKey("bob");
    }

    function _start(address player, uint64 hazards, uint64 prizes) internal returns (uint256) {
        game.setNextMap(hazards, prizes);
        _newTx();
        vm.prank(player);
        game.startRun();
        return game.activeRunOf(player);
    }

    function _move(address player, uint8 dir) internal {
        (externalEuint8 enc, bytes memory proof) = encryptUint8(dir, player, address(game));
        _newTx();
        vm.prank(player);
        game.move(enc, proof);
    }

    /// @dev Reads the encrypted state through forge-fhevm's plaintext database. No ACL check, tests only.
    function _snap(uint256 runId) internal returns (Snap memory s) {
        (euint64 pos, ebool alive, euint8 collected, ebool danger, ebool prize, euint64 hz, euint64 pzi, euint64 path,) =
            game.getHandles(runId);
        (, uint8 moves,,) = game.getRun(runId);
        s.moves = moves;
        s.pos = decrypt(pos);
        s.alive = decrypt(alive);
        s.collected = decrypt(collected);
        s.cold = decrypt(danger);
        s.glint = decrypt(prize);
        s.hazards = decrypt(hz);
        s.prizesInitial = decrypt(pzi);
        s.path = decrypt(path);
    }

    function _score(uint256 runId) internal returns (uint8) {
        (,,,,,,,, euint8 score) = game.getHandles(runId);
        return decrypt(score);
    }

    function _assertSame(Snap memory a, Ref.S memory r, string memory ctx) internal pure {
        assertEq(a.moves, r.moves, string.concat(ctx, ": moves"));
        assertEq(a.pos, r.pos, string.concat(ctx, ": pos"));
        assertEq(a.alive, r.alive, string.concat(ctx, ": alive"));
        assertEq(a.collected, r.collected, string.concat(ctx, ": collected"));
        assertEq(a.cold, r.cold, string.concat(ctx, ": cold"));
        assertEq(a.glint, r.glint, string.concat(ctx, ": glint"));
        assertEq(a.path, r.path, string.concat(ctx, ": path"));
    }
}
