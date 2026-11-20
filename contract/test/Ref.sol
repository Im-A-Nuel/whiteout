// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

/// @notice Plaintext reference model of the Whiteout rules, the oracle for the differential tests.
/// The encrypted contract must agree with it on every step. Same bitboard layout: bit i is cell row * 8 + col.
library Ref {
    uint64 internal constant NOT_FILE_A = 0xFEFEFEFEFEFEFEFE;
    uint64 internal constant NOT_FILE_H = 0x7F7F7F7F7F7F7F7F;
    uint64 internal constant SAFE_ZONE = 0x103;
    uint8 internal constant MAX_MOVES = 24;

    struct S {
        uint64 hazards;
        uint64 prizesInitial;
        uint64 prizes;
        uint64 pos;
        uint64 path;
        uint8 collected;
        bool alive;
        bool cold;
        bool glint;
        uint8 moves;
    }

    function neighbors(uint64 p) internal pure returns (uint64) {
        return (p >> 8) | (p << 8) | ((p >> 1) & NOT_FILE_H) | ((p << 1) & NOT_FILE_A);
    }

    function start(uint64 hazards, uint64 prizes) internal pure returns (S memory s) {
        uint64 nb = neighbors(1);
        s = S({
            hazards: hazards,
            prizesInitial: prizes,
            prizes: prizes,
            pos: 1,
            path: 0,
            collected: 0,
            alive: true,
            cold: (nb & hazards) != 0,
            glint: (nb & prizes) != 0,
            moves: 0
        });
    }

    function step(S memory s, uint8 rawDir) internal pure returns (S memory) {
        require(s.moves < MAX_MOVES, "out of steps");
        uint8 dir = rawDir & 3;
        uint64 p = s.pos;
        uint64 cand = dir == 0 ? p >> 8 : dir == 1 ? p << 8 : dir == 2 ? (p >> 1) & NOT_FILE_H : (p << 1) & NOT_FILE_A;
        uint64 moved = cand != 0 ? cand : p;
        uint64 newPos = s.alive ? moved : p;
        bool alive = s.alive && (newPos & s.hazards) == 0;
        bool got = alive && (newPos & s.prizes) != 0;
        uint64 prizes = s.prizes & ~newPos;
        uint64 nb = neighbors(newPos);

        s.pos = newPos;
        s.alive = alive;
        s.prizes = prizes;
        if (got) s.collected += 1;
        s.path = (s.path << 2) | dir;
        s.cold = (nb & s.hazards) != 0;
        s.glint = (nb & prizes) != 0;
        s.moves += 1;
        return s;
    }

    function score(S memory s) internal pure returns (uint8) {
        return s.alive && s.pos == 1 ? s.collected : 0;
    }

    function cell(uint8 row, uint8 col) internal pure returns (uint64) {
        return uint64(1) << (row * 8 + col);
    }

    function popcount(uint64 x) internal pure returns (uint256 n) {
        while (x != 0) {
            x &= x - 1;
            n++;
        }
    }
}
