// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";

/// @title Bitboard helpers for Whiteout
/// @notice Pure board geometry on encrypted 64-bit words. Bit `i` is cell `row * 8 + col`.
/// @dev Shifts on `euint64` discard bits that leave the word. Horizontal shifts can wrap into the
///      neighbouring row, so they are masked with the NOT_FILE constants.
library WhiteoutLib {
    uint8 internal constant MAX_MOVES = 24;

    uint64 internal constant CABIN = 0x1;
    uint64 internal constant SAFE_ZONE = 0x103; // bits 0, 1, 8
    uint64 internal constant NOT_FILE_A = 0xFEFEFEFEFEFEFEFE;
    uint64 internal constant NOT_FILE_H = 0x7F7F7F7F7F7F7F7F;

    uint8 internal constant NORTH = 0;
    uint8 internal constant SOUTH = 1;
    uint8 internal constant WEST = 2;

    function north(euint64 p) internal returns (euint64) {
        return FHE.shr(p, 8);
    }

    function south(euint64 p) internal returns (euint64) {
        return FHE.shl(p, 8);
    }

    function west(euint64 p) internal returns (euint64) {
        return FHE.and(FHE.shr(p, 1), NOT_FILE_H);
    }

    function east(euint64 p) internal returns (euint64) {
        return FHE.and(FHE.shl(p, 1), NOT_FILE_A);
    }

    /// @notice OR of the four orthogonal neighbours of a one-hot position.
    function neighbors(euint64 p) internal returns (euint64) {
        return FHE.or(FHE.or(north(p), south(p)), FHE.or(west(p), east(p)));
    }
}
