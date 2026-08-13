// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {UmbraAuction} from "../src/UmbraAuction.sol";

/// @dev Deploys UmbraAuction against the real FTestXRP token on Coston2.
/// Usage: TRUSTED_TEE_SIGNER=0x... forge script script/Deploy.s.sol --rpc-url coston2 --broadcast
contract DeployScript is Script {
    // FTestXRP on Coston2 — https://dev.flare.network/fassets/reference
    address constant FXRP_COSTON2 = 0x0b6A3645c240605887a5532109323A3E12273dc7;

    function run() external returns (UmbraAuction auction) {
        address trustedTeeSigner = vm.envAddress("TRUSTED_TEE_SIGNER");

        vm.startBroadcast();

        auction = new UmbraAuction(FXRP_COSTON2, trustedTeeSigner);
        console.log("UmbraAuction deployed at:", address(auction));
        console.log("FXRP token:", FXRP_COSTON2);
        console.log("Trusted TEE signer:", trustedTeeSigner);

        vm.stopBroadcast();
    }
}
