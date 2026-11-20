// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {externalEuint8} from "encrypted-types/EncryptedTypes.sol";
import {Whiteout} from "../contracts/Whiteout.sol";
import {WhiteoutBase} from "./WhiteoutBase.sol";
import {Ref} from "./Ref.sol";

/// @notice Game logic against the plaintext reference (docs/TEST_PLAN.md sections 2 and 3).
contract WhiteoutEngineTest is WhiteoutBase {
    function test_01_startsOnTheCabin() public {
        uint256 id = _start(alice, Ref.cell(3, 3), Ref.cell(5, 5));
        Snap memory s = _snap(id);
        assertEq(s.pos, 1);
        assertTrue(s.alive);
        assertEq(s.collected, 0);
        assertEq(s.moves, 0);
        assertEq(s.hazards, Ref.cell(3, 3));
        assertEq(s.prizesInitial, Ref.cell(5, 5));
    }

    function test_02_movesEastIntoAnEmptyCell() public {
        uint256 id = _start(alice, Ref.cell(3, 3), 0);
        _move(alice, EAST);
        Snap memory s = _snap(id);
        assertEq(s.pos, Ref.cell(0, 1));
        assertTrue(s.alive);
    }

    function test_03_to_06_bumpsKeepPositionAndSpendTheStep() public {
        uint256 id = _start(alice, 0, 0);
        _move(alice, NORTH);
        _move(alice, WEST);
        Snap memory s = _snap(id);
        assertEq(s.pos, 1);
        assertEq(s.moves, 2);

        for (uint256 i = 0; i < 7; i++) _move(alice, SOUTH);
        assertEq(_snap(id).pos, Ref.cell(7, 0));
        _move(alice, SOUTH); // bump south
        assertEq(_snap(id).pos, Ref.cell(7, 0));
        _move(alice, WEST); // bump west, no wrap to column 7 of the row above
        assertEq(_snap(id).pos, Ref.cell(7, 0));

        for (uint256 i = 0; i < 7; i++) _move(alice, EAST);
        assertEq(_snap(id).pos, Ref.cell(7, 7));
        _move(alice, EAST); // bump east, no wrap to column 0 of the next row
        assertEq(_snap(id).pos, Ref.cell(7, 7));
    }

    function test_07_08_pitKillsAndTheDeadDoNotMoveOrCollect() public {
        uint256 id = _start(alice, Ref.cell(0, 2), Ref.cell(0, 3));
        _move(alice, EAST);
        _move(alice, EAST); // into the pit
        Snap memory s = _snap(id);
        assertFalse(s.alive);
        uint64 deathPos = s.pos;
        _move(alice, EAST);
        _move(alice, EAST);
        s = _snap(id);
        assertEq(s.pos, deathPos);
        assertEq(s.collected, 0);
        assertEq(s.moves, 4);
    }

    function test_09_10_treasureIsCollectedOnce() public {
        uint256 id = _start(alice, 0, Ref.cell(0, 2));
        _move(alice, EAST);
        _move(alice, EAST);
        assertEq(_snap(id).collected, 1);
        _move(alice, WEST);
        _move(alice, EAST);
        assertEq(_snap(id).collected, 1);
    }

    function test_11_coldIsOrthogonalOnly() public {
        uint256 id = _start(alice, Ref.cell(1, 1), 0);
        assertFalse(_snap(id).cold); // diagonal to the cabin
        _move(alice, EAST);
        assertTrue(_snap(id).cold); // directly above the pit
        _move(alice, EAST);
        assertFalse(_snap(id).cold); // diagonal again
    }

    function test_12_glintIsOrthogonalOnly() public {
        uint256 id = _start(alice, 0, Ref.cell(1, 1));
        _move(alice, EAST);
        assertTrue(_snap(id).glint);
        _move(alice, EAST);
        assertFalse(_snap(id).glint);
    }

    function test_13_directionAboveThreeIsMaskedWithThree() public {
        uint256 id = _start(alice, 0, 0);
        _move(alice, 4 + EAST); // 7 & 3 == 3, east
        assertEq(_snap(id).pos, Ref.cell(0, 1));
    }

    function test_14_finishAtCabinAliveScoresCollected() public {
        uint256 id = _start(alice, 0, Ref.cell(0, 1));
        _move(alice, EAST);
        _move(alice, WEST);
        vm.prank(alice);
        game.finish(id);
        assertEq(_score(id), 1);
    }

    function test_15_finishAwayFromCabinScoresZero() public {
        uint256 id = _start(alice, 0, Ref.cell(0, 1));
        _move(alice, EAST);
        vm.prank(alice);
        game.finish(id);
        assertEq(_score(id), 0);
    }

    function test_16_deadAtCabinScoresZero() public {
        uint256 id = _start(alice, Ref.cell(0, 2), Ref.cell(0, 1));
        _move(alice, EAST); // treasure
        _move(alice, EAST); // pit
        _move(alice, WEST); // dead, stays
        assertFalse(_snap(id).alive);
        vm.prank(alice);
        game.finish(id);
        assertEq(_score(id), 0);
    }

    function test_17_revertsAfterTheStepLimitAndAnyoneCanFinish() public {
        uint256 id = _start(alice, 0, 0);
        for (uint256 i = 0; i < Ref.MAX_MOVES; i++) _move(alice, i % 2 == 0 ? EAST : WEST);

        (externalEuint8 enc, bytes memory proof) = encryptUint8(EAST, alice, address(game));
        vm.expectRevert(Whiteout.OutOfSteps.selector);
        vm.prank(alice);
        game.move(enc, proof);

        vm.expectEmit(true, false, false, false, address(game));
        emit Whiteout.RunEnded(id);
        vm.prank(bob);
        game.finish(id);
    }

    function test_18_packedPathDecodesToTheInputSequence() public {
        uint256 id = _start(alice, 0, 0);
        uint8[8] memory dirs = [EAST, SOUTH, SOUTH, WEST, NORTH, EAST, EAST, SOUTH];
        for (uint256 i = 0; i < dirs.length; i++) _move(alice, dirs[i]);
        Snap memory s = _snap(id);
        for (uint256 i = 0; i < dirs.length; i++) {
            uint256 shift = 2 * (dirs.length - 1 - i);
            assertEq(uint8((s.path >> shift) & 3), dirs[i], "path step");
        }
    }

    /// @dev Differential test: random map, random 24 step walk, compare every step with the plaintext model.
    function testFuzz_matchesTheReferenceModel(uint256 seed) public {
        uint64 hazards = _density(seed, 1) & ~Ref.SAFE_ZONE;
        uint64 prizes = _density(seed, 2) & ~hazards & ~uint64(1);
        uint256 id = _start(alice, hazards, prizes);

        Ref.S memory ref = Ref.start(hazards, prizes);
        _assertSame(_snap(id), ref, "start");

        bytes32 dirs = keccak256(abi.encode(seed, "dirs"));
        for (uint256 i = 0; i < Ref.MAX_MOVES; i++) {
            uint8 d = uint8(uint256(dirs) >> (i * 8)) & 3;
            _move(alice, d);
            ref = Ref.step(ref, d);
            _assertSame(_snap(id), ref, string.concat("step ", vm.toString(i)));
        }

        vm.prank(alice);
        game.finish(id);
        assertEq(_score(id), Ref.score(ref), "score");
    }

    /// @dev Each bit is 1 with probability 1/8: AND of three pseudo random words, like the contract.
    function _density(uint256 seed, uint256 salt) internal pure returns (uint64) {
        uint64 a = uint64(uint256(keccak256(abi.encode(seed, salt, 0))));
        uint64 b = uint64(uint256(keccak256(abi.encode(seed, salt, 1))));
        uint64 c = uint64(uint256(keccak256(abi.encode(seed, salt, 2))));
        return a & b & c;
    }
}
