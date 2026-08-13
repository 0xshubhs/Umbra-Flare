// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6 <0.9;

// Mirrors the real interface from Flare's FCC extension scaffold:
// https://github.com/flare-foundation/fce-extension-scaffold/blob/main/contracts/interfaces/ITeeMachineRegistry.sol
interface ITeeMachineRegistry {
    function getRandomTeeIds(uint256 _extensionId, uint256 _count)
        external view returns (address[] memory);
}
