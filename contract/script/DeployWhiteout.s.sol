// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {Whiteout} from "../contracts/Whiteout.sol";

/// @notice Deploys Whiteout. The signer comes from the command line, never from this file:
///   forge script script/DeployWhiteout.s.sol --rpc-url sepolia --account deployer --broadcast --verify
/// Create the keystore once with `cast wallet import deployer --interactive`.
contract DeployWhiteout is Script {
    function run() external returns (Whiteout game) {
        vm.startBroadcast();
        game = new Whiteout();
        vm.stopBroadcast();
        console.log("Whiteout deployed at:", address(game));
    }
}
