// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {Whiteout} from "../Whiteout.sol";

/// @notice Test-only contract: the next `startRun` loads a fixed map instead of rolling one.
contract WhiteoutHarness is Whiteout {
    uint64 private _hazards;
    uint64 private _prizes;

    function setNextMap(uint64 hazards, uint64 prizes) external {
        _hazards = hazards;
        _prizes = prizes;
    }

    function _generateMap() internal override returns (euint64 h, euint64 p) {
        h = FHE.asEuint64(_hazards);
        p = FHE.asEuint64(_prizes);
    }
}
