// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title UmbraAuction
/// @notice Sealed-bid (Vickrey / second-price) auctions settled in FXRP, with bid
/// amounts kept private via Flare Confidential Compute (FCC).
///
/// PRIVACY MODEL
/// Every bidder escrows the same fixed `bidCap` regardless of their actual bid —
/// so the public escrow transfer leaks nothing. The actual bid amount is
/// ECIES-encrypted client-side to the TEE's public key before submission, so
/// `bidCiphertext` is public calldata/storage but unreadable without the TEE's
/// private key. Only the TEE ever sees plaintext amounts; it holds them in
/// memory, computes the Vickrey winner and second-highest price once the
/// auction closes, and returns just that pair as a signed result — individual
/// losing bids are never disclosed, on-chain or off.
///
/// TRUSTED SIGNER
/// `trustedTeeSigner` is the address settle() requires a valid ECDSA signature
/// from over (chainId, this contract, auctionId, winner, clearingPrice). In
/// production this is the real TEE machine address returned by Flare's
/// TeeMachineRegistry once UmbraInstructionSender's extension is registered
/// (see its NatSpec for why that registration isn't complete in this
/// submission). For this demo, it's a local "TEE simulator" keypair — same
/// verification code path either way; only the trusted identity changes.
contract UmbraAuction is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    IERC20 public immutable fxrp;
    address public trustedTeeSigner;

    enum Status { Active, Closed, Settled }

    struct Auction {
        uint256 id;
        address seller;
        string itemName;
        string itemDescription;
        uint256 bidCap; // FXRP every bidder escrows, independent of their real bid
        uint256 endTime;
        Status status;
        address winner;
        uint256 clearingPrice; // second-highest bid; 0 until settled
        uint256 bidCount;
    }

    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => mapping(address => bytes)) public bidCiphertext;
    mapping(uint256 => mapping(address => bool)) public hasBid;
    mapping(uint256 => address[]) private _bidders;

    uint256 public nextAuctionId = 1;

    event AuctionCreated(uint256 indexed id, address indexed seller, uint256 bidCap, uint256 endTime);
    event BidSubmitted(uint256 indexed id, address indexed bidder);
    event AuctionClosed(uint256 indexed id);
    event AuctionSettled(uint256 indexed id, address indexed winner, uint256 clearingPrice);
    event TrustedTeeSignerUpdated(address indexed signer);

    constructor(address _fxrp, address _trustedTeeSigner) Ownable(msg.sender) {
        require(_fxrp != address(0), "Invalid FXRP address");
        require(_trustedTeeSigner != address(0), "Invalid signer address");
        fxrp = IERC20(_fxrp);
        trustedTeeSigner = _trustedTeeSigner;
    }

    /// @notice Swap the trusted signer — e.g. from the local demo simulator to
    /// the real registered TEE machine address once FCC registration completes.
    function setTrustedTeeSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "Invalid signer address");
        trustedTeeSigner = _signer;
        emit TrustedTeeSignerUpdated(_signer);
    }

    function createAuction(
        string calldata itemName,
        string calldata itemDescription,
        uint256 bidCap,
        uint256 duration
    ) external returns (uint256 auctionId) {
        require(bidCap > 0, "Bid cap must be > 0");
        require(duration > 0, "Duration must be > 0");

        auctionId = nextAuctionId++;
        auctions[auctionId] = Auction({
            id: auctionId,
            seller: msg.sender,
            itemName: itemName,
            itemDescription: itemDescription,
            bidCap: bidCap,
            endTime: block.timestamp + duration,
            status: Status.Active,
            winner: address(0),
            clearingPrice: 0,
            bidCount: 0
        });

        emit AuctionCreated(auctionId, msg.sender, bidCap, block.timestamp + duration);
    }

    /// @notice Escrow `bidCap` FXRP and submit an encrypted bid. `encryptedBid`
    /// must be ECIES-encrypted to the TEE's public key off-chain — this
    /// contract never sees (or needs to see) the plaintext amount.
    function submitBid(uint256 auctionId, bytes calldata encryptedBid) external nonReentrant {
        Auction storage a = auctions[auctionId];
        require(a.status == Status.Active, "Auction not active");
        require(block.timestamp < a.endTime, "Auction ended");
        require(msg.sender != a.seller, "Seller cannot bid");
        require(!hasBid[auctionId][msg.sender], "Already bid");
        require(encryptedBid.length > 0, "Empty ciphertext");

        hasBid[auctionId][msg.sender] = true;
        bidCiphertext[auctionId][msg.sender] = encryptedBid;
        _bidders[auctionId].push(msg.sender);
        a.bidCount++;

        fxrp.safeTransferFrom(msg.sender, address(this), a.bidCap);

        emit BidSubmitted(auctionId, msg.sender);
    }

    /// @notice Anyone can close an auction once its end time has passed.
    function closeAuction(uint256 auctionId) external {
        Auction storage a = auctions[auctionId];
        require(a.status == Status.Active, "Auction not active");
        require(block.timestamp >= a.endTime, "Auction not ended yet");
        a.status = Status.Closed;
        emit AuctionClosed(auctionId);
    }

    /// @notice Settles a closed auction against a TEE-signed (winner, clearingPrice)
    /// result. Winner pays clearingPrice to the seller and is refunded the
    /// difference from their escrow; every other bidder is refunded in full.
    function settle(
        uint256 auctionId,
        address winner,
        uint256 clearingPrice,
        bytes calldata signature
    ) external nonReentrant {
        Auction storage a = auctions[auctionId];
        require(a.status == Status.Closed, "Auction not closed");
        require(hasBid[auctionId][winner], "Winner did not bid");
        require(clearingPrice <= a.bidCap, "Price exceeds bid cap");

        bytes32 digest = keccak256(
            abi.encode(block.chainid, address(this), auctionId, winner, clearingPrice)
        ).toEthSignedMessageHash();
        require(digest.recover(signature) == trustedTeeSigner, "Invalid TEE signature");

        a.status = Status.Settled;
        a.winner = winner;
        a.clearingPrice = clearingPrice;

        fxrp.safeTransfer(a.seller, clearingPrice);
        uint256 winnerRefund = a.bidCap - clearingPrice;
        if (winnerRefund > 0) {
            fxrp.safeTransfer(winner, winnerRefund);
        }

        address[] storage bidders = _bidders[auctionId];
        for (uint256 i = 0; i < bidders.length; i++) {
            if (bidders[i] != winner) {
                fxrp.safeTransfer(bidders[i], a.bidCap);
            }
        }

        emit AuctionSettled(auctionId, winner, clearingPrice);
    }

    // ── Views ───────────────────────────────────────────────────────────────
    function getAuction(uint256 auctionId) external view returns (Auction memory) {
        return auctions[auctionId];
    }

    function getBidders(uint256 auctionId) external view returns (address[] memory) {
        return _bidders[auctionId];
    }

    function getBidCiphertext(uint256 auctionId, address bidder) external view returns (bytes memory) {
        return bidCiphertext[auctionId][bidder];
    }
}
