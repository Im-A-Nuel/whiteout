// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {euint8, euint64, ebool, externalEuint8} from "encrypted-types/EncryptedTypes.sol";
import {Whiteout} from "../contracts/Whiteout.sol";
import {WhiteoutBase} from "./WhiteoutBase.sol";
import {Ref} from "./Ref.sol";

/// @notice HCU budget of the three entry points (docs/TEST_PLAN.md section 7). Each one runs in its own
/// accounting window, like a real transaction. The measured numbers are printed with `forge test -vv`.
contract WhiteoutHcuTest is WhiteoutBase {
    uint256 internal constant MOVE_BUDGET = 3_000_000; // start of the project budget, cap is 20M
    uint256 internal constant DEPTH_CAP = 5_000_000;

    function _maxDepthOfStepOutputs(uint256 id) internal view returns (uint256 max) {
        (euint64 pos, ebool alive, euint8 collected, ebool danger, ebool prize,,, euint64 path,) = game.getHandles(id);
        bytes32[5] memory hs = [
            euint64.unwrap(pos),
            ebool.unwrap(alive),
            euint8.unwrap(collected),
            ebool.unwrap(danger),
            ebool.unwrap(prize)
        ];
        for (uint256 i = 0; i < hs.length; i++) {
            uint256 d = meter.depthOf(hs[i]);
            if (d > max) max = d;
        }
        uint256 dp = meter.depthOf(euint64.unwrap(path));
        if (dp > max) max = dp;
    }

    function test_hcuOfStartMoveAndFinish() public {
        // startRun with the real random source
        Whiteout real = new Whiteout();
        _newTx();
        vm.prank(alice);
        real.startRun();
        uint256 startHcu = meter.currentTxHCU();

        // one move on a fixed map
        uint256 id = _start(alice, Ref.cell(5, 5), Ref.cell(2, 2));
        (externalEuint8 enc, bytes memory proof) = encryptUint8(EAST, alice, address(game));
        _newTx();
        vm.prank(alice);
        game.move(enc, proof);
        uint256 moveHcu = meter.currentTxHCU();
        uint256 moveDepth = _maxDepthOfStepOutputs(id);

        _newTx();
        vm.prank(alice);
        game.finish(id);
        uint256 finishHcu = meter.currentTxHCU();

        emit log_named_uint("startRun global HCU", startHcu);
        emit log_named_uint("move global HCU", moveHcu);
        emit log_named_uint("move sequential depth", moveDepth);
        emit log_named_uint("finish global HCU", finishHcu);

        assertLt(moveHcu, MOVE_BUDGET, "move over budget");
        assertLt(moveDepth, DEPTH_CAP, "move over the depth cap");
        assertLt(startHcu, MOVE_BUDGET, "startRun over budget");
        assertLt(finishHcu, MOVE_BUDGET, "finish over budget");
    }

    /// @dev Two steps in one transaction would be a possible optimisation. Documents that the global limit allows
    /// it and records the depth, which is the number to watch.
    function test_twoStepsInOneWindowStayUnderTheGlobalCap() public {
        uint256 id = _start(alice, Ref.cell(5, 5), Ref.cell(2, 2));
        (externalEuint8 e1, bytes memory p1) = encryptUint8(EAST, alice, address(game));
        (externalEuint8 e2, bytes memory p2) = encryptUint8(WEST, alice, address(game));
        _newTx();
        vm.prank(alice);
        game.move(e1, p1);
        vm.prank(alice);
        game.move(e2, p2);
        emit log_named_uint("two steps global HCU", meter.currentTxHCU());
        emit log_named_uint("two steps sequential depth", _maxDepthOfStepOutputs(id));
        assertLt(meter.currentTxHCU(), 20_000_000);
    }
}
