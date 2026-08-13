// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import { ITeeExtensionRegistry } from "./interfaces/ITeeExtensionRegistry.sol";
import { ITeeMachineRegistry } from "./interfaces/ITeeMachineRegistry.sol";

/// @title UmbraInstructionSender
/// @notice On-chain entry point for sending sealed-bid auction instructions to a
/// registered Flare Confidential Compute (FCC) TEE extension. Structured to exactly
/// match Flare's HelloWorldInstructionSender scaffold pattern (see
/// https://github.com/flare-foundation/fce-extension-scaffold), with an AUCTION
/// op type in place of GREETING.
///
/// NOT wired into the live demo: sendInstructions() requires a TEE machine
/// actually registered against this contract's extension ID (via pre-build.sh /
/// post-build.sh), which in turn requires Flare's Coston2 indexer database
/// credentials (obtained by contacting Flare support) plus a public tunnel and
/// governance keys — infrastructure this submission doesn't have access to.
/// The interactive demo instead settles via UmbraAuction's trustedTeeSigner path
/// (see its NatSpec). This contract is the real production entry point, ready to
/// register once that infrastructure access exists.
contract UmbraInstructionSender {
    /// @notice Operation type for sealed-bid auction actions.
    // forge-lint: disable-next-line(unsafe-typecast)
    bytes32 public constant OP_TYPE_AUCTION = bytes32("AUCTION");
    /// @notice Command to submit an encrypted bid.
    // forge-lint: disable-next-line(unsafe-typecast)
    bytes32 public constant OP_COMMAND_SUBMIT_BID = bytes32("SUBMIT_BID");
    /// @notice Command to close an auction and compute the Vickrey winner.
    // forge-lint: disable-next-line(unsafe-typecast)
    bytes32 public constant OP_COMMAND_CLOSE_AUCTION = bytes32("CLOSE_AUCTION");

    ITeeExtensionRegistry public immutable TEE_EXTENSION_REGISTRY;
    ITeeMachineRegistry public immutable TEE_MACHINE_REGISTRY;

    uint256 private constant FIRST_PUBLIC_EXTENSION_ID = 0x10000;
    uint256 private _extensionId;

    /// @notice Payload for a SUBMIT_BID instruction.
    struct SubmitBidMessage {
        uint256 auctionId;
        bytes encryptedBid; // bid amount, ECIES-encrypted to the TEE machine's public key
    }

    /// @notice Payload for a CLOSE_AUCTION instruction.
    struct CloseAuctionMessage {
        uint256 auctionId;
    }

    constructor(
        ITeeExtensionRegistry _teeExtensionRegistry,
        ITeeMachineRegistry _teeMachineRegistry
    ) {
        require(address(_teeExtensionRegistry) != address(0), "TeeExtensionRegistry cannot be zero address");
        require(address(_teeMachineRegistry) != address(0), "TeeMachineRegistry cannot be zero address");
        require(address(_teeExtensionRegistry).code.length > 0, "TeeExtensionRegistry has no code");
        require(address(_teeMachineRegistry).code.length > 0, "TeeMachineRegistry has no code");
        TEE_EXTENSION_REGISTRY = _teeExtensionRegistry;
        TEE_MACHINE_REGISTRY = _teeMachineRegistry;
    }

    /// @notice Finds and sets this contract's extension id. Can only be set once.
    function setExtensionId() external {
        require(_extensionId == 0, "Extension ID already set.");
        uint256 c = TEE_EXTENSION_REGISTRY.nextPublicExtensionId();
        for (uint256 i = FIRST_PUBLIC_EXTENSION_ID; i < c; ++i) {
            if (TEE_EXTENSION_REGISTRY.getTeeExtensionInstructionsSender(i) == address(this)) {
                _extensionId = i;
                return;
            }
        }
        revert("Extension ID not found.");
    }

    /// @notice Sends a SUBMIT_BID instruction: the TEE decrypts `_encryptedBid`
    /// internally and holds it privately until the auction closes.
    function sendSubmitBid(uint256 _auctionId, bytes calldata _encryptedBid) external payable {
        address[] memory teeIds = TEE_MACHINE_REGISTRY.getRandomTeeIds(_getExtensionId(), 1);
        address[] memory cosigners = new address[](0);
        ITeeExtensionRegistry.TeeInstructionParams memory params = ITeeExtensionRegistry.TeeInstructionParams({
            opType: OP_TYPE_AUCTION,
            opCommand: OP_COMMAND_SUBMIT_BID,
            message: abi.encode(SubmitBidMessage({ auctionId: _auctionId, encryptedBid: _encryptedBid })),
            cosigners: cosigners,
            cosignersThreshold: 0,
            claimBackAddress: msg.sender
        });
        TEE_EXTENSION_REGISTRY.sendInstructions{value: msg.value}(teeIds, params);
    }

    /// @notice Sends a CLOSE_AUCTION instruction: the TEE computes the Vickrey
    /// winner (highest bidder, second-highest price) over its privately held
    /// bids and returns a signed result for UmbraAuction.settle() to verify.
    function sendCloseAuction(uint256 _auctionId) external payable {
        address[] memory teeIds = TEE_MACHINE_REGISTRY.getRandomTeeIds(_getExtensionId(), 1);
        address[] memory cosigners = new address[](0);
        ITeeExtensionRegistry.TeeInstructionParams memory params = ITeeExtensionRegistry.TeeInstructionParams({
            opType: OP_TYPE_AUCTION,
            opCommand: OP_COMMAND_CLOSE_AUCTION,
            message: abi.encode(CloseAuctionMessage({ auctionId: _auctionId })),
            cosigners: cosigners,
            cosignersThreshold: 0,
            claimBackAddress: msg.sender
        });
        TEE_EXTENSION_REGISTRY.sendInstructions{value: msg.value}(teeIds, params);
    }

    function _getExtensionId() internal view returns (uint256) {
        require(_extensionId != 0, "Extension ID is not set.");
        return _extensionId;
    }
}
