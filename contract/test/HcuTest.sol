// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {HCULimit} from "@fhevm/host-contracts/contracts/HCULimit.sol";
import {EmptyUUPSProxy} from "@fhevm/host-contracts/contracts/emptyProxy/EmptyUUPSProxy.sol";
import {hcuLimitAdd} from "@fhevm/host-contracts/addresses/FHEVMHostAddresses.sol";
import {FhevmTest} from "forge-fhevm/FhevmTest.sol";

/// @notice HCULimit for tests. A forge test function is a single transaction, so the host contract's per
/// transaction HCU total and its sequential depth cap would keep growing across all the steps of a test,
/// while on a real chain every step is its own transaction. `newTransaction()` starts a fresh accounting window:
/// the total goes back to zero and handle depths are looked up under a new epoch, so a handle produced by an
/// earlier step has depth zero, exactly as in a new transaction. The production limits (20M total, 5M depth)
/// still apply inside one window, so a step that is too heavy still fails.
contract HCULimitMeter is HCULimit {
    // transient slot 0 holds the transaction total (see HCULimit), slot 1 holds the epoch
    function newTransaction() external {
        uint256 epoch;
        assembly {
            epoch := tload(1)
        }
        assembly {
            tstore(1, add(epoch, 1))
            tstore(0, 0)
        }
    }

    /// @notice Total HCU charged in the current window.
    function currentTxHCU() external view returns (uint256 total) {
        assembly {
            total := tload(0)
        }
    }

    /// @notice Sequential depth recorded for a handle in the current window.
    function depthOf(bytes32 handle) external view returns (uint256) {
        return _getHCUForHandle(handle);
    }

    function _slot(bytes32 handle) private view returns (bytes32) {
        uint256 epoch;
        assembly {
            epoch := tload(1)
        }
        return keccak256(abi.encode(epoch, handle));
    }

    function _getHCUForHandle(bytes32 handle) internal view override returns (uint256 depth) {
        bytes32 slot = _slot(handle);
        assembly {
            depth := tload(slot)
        }
    }

    function _setHCUForHandle(bytes32 handle, uint256 depth) internal override {
        bytes32 slot = _slot(handle);
        assembly {
            tstore(slot, depth)
        }
    }
}

/// @notice Base for tests that run many FHE steps: installs the meter and offers `_newTx()`.
abstract contract HcuTest is FhevmTest {
    HCULimitMeter internal meter;

    function setUp() public virtual override {
        super.setUp();
        meter = HCULimitMeter(hcuLimitAdd);
        address impl = address(new HCULimitMeter());
        vm.prank(PROXY_OWNER);
        EmptyUUPSProxy(payable(hcuLimitAdd)).upgradeToAndCall(impl, "");
    }

    /// @dev Call before every simulated transaction.
    function _newTx() internal {
        meter.newTransaction();
    }
}
