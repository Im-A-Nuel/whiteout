// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {Vm} from "forge-std/Vm.sol";
import {FHE} from "@fhevm/solidity/lib/FHE.sol";
import {euint8, euint64, ebool, externalEuint8} from "encrypted-types/EncryptedTypes.sol";
import {Whiteout} from "../contracts/Whiteout.sol";
import {WhiteoutBase} from "./WhiteoutBase.sol";
import {Ref} from "./Ref.sol";

/// @notice Confidentiality (C1 to C7), access control (A1 to A6) and finalize with proof
/// (docs/TEST_PLAN.md sections 4 and 5).
contract WhiteoutSecurityTest is WhiteoutBase {
    function _userDecryptAs(uint256 pk, bytes32 handle) internal returns (uint256) {
        bytes memory sig = signUserDecrypt(pk, address(game));
        return userDecrypt(handle, vm.addr(pk), address(game), sig);
    }

    /// @dev Handles of [hazards, prizesInitial, path, score] in the order finalize verifies them.
    function _finalizeHandles(uint256 id) internal view returns (bytes32[] memory h) {
        (,,,,, euint64 hz, euint64 pzi, euint64 path, euint8 score) = game.getHandles(id);
        h = new bytes32[](4);
        h[0] = euint64.unwrap(hz);
        h[1] = euint64.unwrap(pzi);
        h[2] = euint64.unwrap(path);
        h[3] = euint8.unwrap(score);
    }

    function _proveAndFinalize(uint256 id) internal {
        bytes32[] memory h = _finalizeHandles(id);
        (uint256[] memory clear,) = publicDecrypt(h);
        // the contract decodes (uint64, uint64, uint64, uint8), each padded to a word
        bytes memory enc = abi.encode(uint64(clear[0]), uint64(clear[1]), uint64(clear[2]), uint8(clear[3]));
        game.finalize(id, enc, buildDecryptionProof(h, enc));
    }

    // ---------------------------------------------------------------- confidentiality

    function test_C1_C2_playerCannotUserDecryptHazardsOrPrizesBeforeFinish() public {
        uint256 id = _start(alice, Ref.cell(3, 3), Ref.cell(4, 4));
        _move(alice, EAST);
        (,,,,, euint64 hz, euint64 pzi,,) = game.getHandles(id);
        bytes memory sig = signUserDecrypt(alicePk, address(game));
        vm.expectRevert();
        this.externalUserDecrypt(euint64.unwrap(hz), alice, sig);
        vm.expectRevert();
        this.externalUserDecrypt(euint64.unwrap(pzi), alice, sig);
    }

    /// @dev External wrapper so `vm.expectRevert` sees the revert of the library call.
    function externalUserDecrypt(bytes32 handle, address user, bytes memory sig) external returns (uint256) {
        return userDecrypt(handle, user, address(game), sig);
    }

    function test_C3_anotherAddressCannotDecryptThePlayersPosition() public {
        uint256 id = _start(alice, 0, 0);
        _move(alice, EAST);
        (euint64 pos, ebool alive,,,,,,,) = game.getHandles(id);
        bytes memory sig = signUserDecrypt(bobPk, address(game));
        vm.expectRevert();
        this.externalUserDecrypt(euint64.unwrap(pos), bob, sig);
        vm.expectRevert();
        this.externalUserDecrypt(ebool.unwrap(alive), bob, sig);
    }

    function test_C4_playerDecryptsOwnPositionAlivePackAndSignals() public {
        uint256 id = _start(alice, Ref.cell(1, 1), Ref.cell(0, 2));
        _move(alice, EAST);
        (euint64 pos, ebool alive, euint8 collected, ebool danger, ebool prize,,,,) = game.getHandles(id);
        assertEq(_userDecryptAs(alicePk, euint64.unwrap(pos)), Ref.cell(0, 1));
        assertEq(_userDecryptAs(alicePk, ebool.unwrap(alive)), 1);
        assertEq(_userDecryptAs(alicePk, euint8.unwrap(collected)), 0);
        assertEq(_userDecryptAs(alicePk, ebool.unwrap(danger)), 1);
        assertEq(_userDecryptAs(alicePk, ebool.unwrap(prize)), 1);
    }

    function test_C5_afterFinishMapPathAndScoreArePubliclyDecryptableAndFinalizeVerifies() public {
        uint64 hazards = Ref.cell(3, 3);
        uint64 prizes = Ref.cell(0, 1);
        uint256 id = _start(alice, hazards, prizes);
        _move(alice, EAST);
        _move(alice, WEST);
        vm.prank(alice);
        game.finish(id);

        vm.expectEmit(true, true, false, true, address(game));
        emit Whiteout.RunFinalized(id, alice, 1, hazards, prizes, 14);
        vm.prank(bob); // anyone can finalize
        _proveAndFinalize(id);

        Whiteout.Result memory r = game.getResult(id);
        assertEq(r.score, 1);
        assertEq(r.hazards, hazards);
        assertEq(r.prizes, prizes);
        (,, , bool finalized) = game.getRun(id);
        assertTrue(finalized);
    }

    function test_C6_C7_eventsLeakNoDirectionPositionOrMapAndLookIdenticalAcrossRuns() public {
        bytes32 movedTopic = Whiteout.Moved.selector;

        vm.recordLogs();
        uint256 a = _start(alice, Ref.cell(5, 5), Ref.cell(2, 2));
        _move(alice, EAST);
        _move(alice, EAST);
        _move(alice, EAST);
        _move(alice, SOUTH);
        vm.prank(alice);
        game.finish(a);
        Vm.Log[] memory logsA = vm.getRecordedLogs();

        vm.recordLogs();
        uint256 b = _start(alice, Ref.cell(5, 5), Ref.cell(2, 2));
        _move(alice, SOUTH);
        _move(alice, SOUTH);
        _move(alice, WEST);
        _move(alice, WEST);
        vm.prank(alice);
        game.finish(b);
        Vm.Log[] memory logsB = vm.getRecordedLogs();

        uint256 movesA;
        uint256 movesB;
        for (uint256 i = 0; i < logsA.length; i++) {
            if (logsA[i].emitter != address(game)) continue;
            if (logsA[i].topics[0] == movedTopic) {
                movesA++;
                assertEq(logsA[i].topics.length, 2, "only the run id is indexed");
                assertEq(logsA[i].data.length, 32, "one uint8 word and nothing else");
            }
        }
        for (uint256 i = 0; i < logsB.length; i++) {
            if (logsB[i].emitter != address(game)) continue;
            if (logsB[i].topics[0] == movedTopic) {
                movesB++;
                assertEq(logsB[i].data.length, 32);
            }
        }
        assertEq(movesA, 4);
        assertEq(movesB, 4);
        assertEq(logsA.length > 0, true);
    }

    // ------------------------------------------------------------------ access control

    function test_A1_nonOwnerCannotMove() public {
        _start(alice, 0, 0);
        (externalEuint8 enc, bytes memory proof) = encryptUint8(EAST, bob, address(game));
        vm.expectRevert(Whiteout.NoActiveRun.selector);
        vm.prank(bob);
        game.move(enc, proof);
    }

    function test_A1b_nonOwnerCannotFinishEarly() public {
        uint256 id = _start(alice, 0, 0);
        vm.expectRevert(Whiteout.NotRunOwner.selector);
        vm.prank(bob);
        game.finish(id);
    }

    function test_A2_cannotStartWhileActiveButCanAfterFinish() public {
        uint256 id = _start(alice, 0, 0);
        vm.expectRevert(Whiteout.RunAlreadyActive.selector);
        vm.prank(alice);
        game.startRun();
        vm.prank(alice);
        game.finish(id);
        vm.prank(alice);
        game.startRun();
    }

    function test_A3_moveAfterFinishReverts() public {
        uint256 id = _start(alice, 0, 0);
        vm.prank(alice);
        game.finish(id);
        (externalEuint8 enc, bytes memory proof) = encryptUint8(EAST, alice, address(game));
        vm.expectRevert(Whiteout.NoActiveRun.selector);
        vm.prank(alice);
        game.move(enc, proof);
    }

    function test_A4_tamperedCleartextsAreRejected() public {
        uint256 id = _start(alice, Ref.cell(3, 3), Ref.cell(0, 1));
        _move(alice, EAST);
        vm.prank(alice);
        game.finish(id);
        bytes32[] memory h = _finalizeHandles(id);
        (uint256[] memory clear,) = publicDecrypt(h);
        bytes memory honest = abi.encode(uint64(clear[0]), uint64(clear[1]), uint64(clear[2]), uint8(clear[3]));
        bytes memory proof = buildDecryptionProof(h, honest);
        // same proof, but claim the best possible score
        bytes memory forged = abi.encode(uint64(clear[0]), uint64(clear[1]), uint64(clear[2]), uint8(8));
        vm.expectRevert();
        game.finalize(id, forged, proof);
    }

    function test_A5_finalizeTwiceReverts() public {
        uint256 id = _start(alice, Ref.cell(3, 3), Ref.cell(0, 1));
        _move(alice, EAST);
        vm.prank(alice);
        game.finish(id);
        _proveAndFinalize(id);
        bytes32[] memory h = _finalizeHandles(id);
        (uint256[] memory clear,) = publicDecrypt(h);
        bytes memory enc = abi.encode(uint64(clear[0]), uint64(clear[1]), uint64(clear[2]), uint8(clear[3]));
        bytes memory proof = buildDecryptionProof(h, enc);
        vm.expectRevert(Whiteout.AlreadyFinalized.selector);
        game.finalize(id, enc, proof);
    }

    function test_A6_finalizeBeforeFinishReverts() public {
        uint256 id = _start(alice, 0, 0);
        vm.expectRevert(Whiteout.NotEnded.selector);
        game.finalize(id, "", "");
    }

    function test_unknownRunReverts() public {
        vm.expectRevert(Whiteout.UnknownRun.selector);
        game.finish(99);
    }
}
