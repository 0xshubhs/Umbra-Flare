// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6 <0.9;

// Mirrors the real interface from Flare's FCC extension scaffold:
// https://github.com/flare-foundation/fce-extension-scaffold/blob/main/contracts/interfaces/ITeeExtensionRegistry.sol
// TODO: replace with the published flare-smart-contracts-v2 import once available.
interface ITeeExtensionRegistry {
    struct TeeInstructionParams {
        bytes32 opType;
        bytes32 opCommand;
        bytes message;
        address[] cosigners;
        uint64 cosignersThreshold;
        address claimBackAddress;
    }

    function sendInstructions(
        address[] calldata _teeIds,
        TeeInstructionParams calldata _instructionParams
    ) external payable returns (bytes32 _instructionId);

    function nextPublicExtensionId() external view returns (uint256);

    function getTeeExtensionInstructionsSender(uint256 _extensionId)
        external view returns (address);
}
