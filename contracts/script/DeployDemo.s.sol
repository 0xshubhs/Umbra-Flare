// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {UmbraAuction} from "../src/UmbraAuction.sol";
import {MockFXRP} from "../src/MockFXRP.sol";

/// @dev Demo deploy for Coston2, using a mintable MockFXRP instead of the real
/// FTestXRP token.
///
/// Why not the real token: FTestXRP (0x0b6A...3dc7) only mints through the
/// FAssets pipeline — an agent, collateral, and a testnet XRP payment on the
/// XRP Ledger. Calling its mint() directly reverts (custom error 0x6d5ab9d3).
/// That makes it impossible for anyone evaluating this app to obtain bidding
/// funds, so the public demo runs on a MockFXRP with the same 6 decimals and
/// an open mint(). `Deploy.s.sol` is the real-FXRP path, unchanged.
///
/// Usage:
///   TRUSTED_TEE_SIGNER=0x... forge script script/DeployDemo.s.sol \
///     --rpc-url coston2 --account default --broadcast
contract DeployDemoScript is Script {
    function run() external returns (UmbraAuction auction, MockFXRP fxrp) {
        address trustedTeeSigner = vm.envAddress("TRUSTED_TEE_SIGNER");

        vm.startBroadcast();

        fxrp = new MockFXRP();
        auction = new UmbraAuction(address(fxrp), trustedTeeSigner);

        // Seed the deployer so the demo is immediately usable, and so anyone
        // can be sent test FXRP without waiting on a faucet.
        fxrp.mint(msg.sender, 1_000_000 * 10 ** 6);

        vm.stopBroadcast();

        console.log("MockFXRP deployed at:  ", address(fxrp));
        console.log("UmbraAuction deployed: ", address(auction));
        console.log("Trusted TEE signer:    ", trustedTeeSigner);
    }
}
