// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {euint64} from "encrypted-types/EncryptedTypes.sol";
import {Whiteout} from "../contracts/Whiteout.sol";
import {HcuTest} from "./HcuTest.sol";
import {Ref} from "./Ref.sol";

/// @notice Map generation with the real random source (docs/TEST_PLAN.md section 6), not the fixed-map harness.
contract WhiteoutRandomTest is HcuTest {
    Whiteout internal game;
    address internal alice;

    function setUp() public override {
        super.setUp();
        game = new Whiteout();
        alice = makeAddr("alice");
    }

    function test_mapsKeepTheSafeZoneNeverOverlapAndAverageAboutEightPits() public {
        uint256 maps = 120;
        uint256 pits;
        uint256 prizes;
        uint256[64] memory density;

        for (uint256 i = 0; i < maps; i++) {
            _newTx();
            vm.prank(alice);
            game.startRun();
            uint256 id = game.activeRunOf(alice);
            (,,,,, euint64 hzH, euint64 pzH,,) = game.getHandles(id);
            uint64 hz = decrypt(hzH);
            uint64 pz = decrypt(pzH);

            assertEq(hz & Ref.SAFE_ZONE, 0, "pit in the safe zone");
            assertEq(pz & hz, 0, "treasure on a pit");
            assertEq(pz & 1, 0, "treasure on the cabin");

            pits += Ref.popcount(hz);
            prizes += Ref.popcount(pz);
            for (uint256 b = 0; b < 64; b++) {
                if ((hz >> b) & 1 == 1) density[b]++;
            }
            _newTx();
            vm.prank(alice);
            game.finish(id);
        }

        // 61 eligible cells at p = 1/8 gives a mean near 7.6
        uint256 meanPitsX100 = (pits * 100) / maps;
        emit log_named_uint("mean pits x100", meanPitsX100);
        emit log_named_uint("mean treasure x100", (prizes * 100) / maps);
        assertGt(meanPitsX100, 600);
        assertLt(meanPitsX100, 920);

        uint256 neverPit;
        for (uint256 b = 0; b < 64; b++) {
            if (b == 0 || b == 1 || b == 8) continue;
            assertLt(density[b], maps / 2, "bit stuck high");
            if (density[b] == 0) neverPit++;
        }
        assertLt(neverPit, 4, "bits that never became a pit");
    }
}
