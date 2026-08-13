// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {UmbraAuction} from "../src/UmbraAuction.sol";
import {MockFXRP} from "../src/MockFXRP.sol";

contract UmbraAuctionTest is Test {
    UmbraAuction public auction;
    MockFXRP public fxrp;

    uint256 public teeSignerKey = 0xA11CE;
    address public teeSigner;

    address public seller = address(0xA1);
    address public bidder1 = address(0xB1);
    address public bidder2 = address(0xB2);
    address public bidder3 = address(0xB3);

    uint256 constant BID_CAP = 1000 * 1e6; // 1000 FXRP

    function setUp() public {
        teeSigner = vm.addr(teeSignerKey);

        fxrp = new MockFXRP();
        auction = new UmbraAuction(address(fxrp), teeSigner);

        address[3] memory bidders = [bidder1, bidder2, bidder3];
        for (uint256 i = 0; i < bidders.length; i++) {
            fxrp.mint(bidders[i], 10_000 * 1e6);
            vm.prank(bidders[i]);
            fxrp.approve(address(auction), type(uint256).max);
        }
    }

    function _sign(uint256 auctionId, address winner, uint256 clearingPrice) internal view returns (bytes memory) {
        bytes32 digest = keccak256(abi.encode(block.chainid, address(auction), auctionId, winner, clearingPrice));
        bytes32 ethSigned = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(teeSignerKey, ethSigned);
        return abi.encodePacked(r, s, v);
    }

    function _createAuction() internal returns (uint256 id) {
        vm.prank(seller);
        id = auction.createAuction("Vintage Watch", "1960s automatic", BID_CAP, 1 days);
    }

    function test_CreateAuction() public {
        uint256 id = _createAuction();
        UmbraAuction.Auction memory a = auction.getAuction(id);
        assertEq(a.seller, seller);
        assertEq(a.bidCap, BID_CAP);
        assertEq(uint256(a.status), uint256(UmbraAuction.Status.Active));
    }

    function test_SubmitBid_escrowsFixedCapRegardlessOfRealBid() public {
        uint256 id = _createAuction();

        vm.prank(bidder1);
        auction.submitBid(id, hex"aabbcc"); // opaque ciphertext — contract never sees the plaintext amount

        assertEq(fxrp.balanceOf(address(auction)), BID_CAP);
        assertEq(fxrp.balanceOf(bidder1), 10_000 * 1e6 - BID_CAP);
        assertTrue(auction.hasBid(id, bidder1));
        assertEq(auction.getBidCiphertext(id, bidder1), hex"aabbcc");
    }

    function test_SubmitBid_revertsForSellerAndDuplicateAndAfterEnd() public {
        uint256 id = _createAuction();

        vm.prank(seller);
        vm.expectRevert("Seller cannot bid");
        auction.submitBid(id, hex"aa");

        vm.prank(bidder1);
        auction.submitBid(id, hex"aa");

        vm.prank(bidder1);
        vm.expectRevert("Already bid");
        auction.submitBid(id, hex"bb");

        vm.warp(block.timestamp + 2 days);
        vm.prank(bidder2);
        vm.expectRevert("Auction ended");
        auction.submitBid(id, hex"cc");
    }

    function test_FullVickreyFlow_winnerPaysSecondPrice() public {
        uint256 id = _createAuction();

        // Real (private) bids: 800, 650, 300 FXRP. Only ciphertext hits the chain.
        vm.prank(bidder1);
        auction.submitBid(id, hex"01"); // stands in for ECIES(800e6)
        vm.prank(bidder2);
        auction.submitBid(id, hex"02"); // stands in for ECIES(650e6)
        vm.prank(bidder3);
        auction.submitBid(id, hex"03"); // stands in for ECIES(300e6)

        vm.warp(block.timestamp + 2 days);
        auction.closeAuction(id);

        // TEE would compute this off the plaintext bids it alone decrypted:
        // winner = bidder1 (highest, 800), clearingPrice = 650 (second-highest)
        uint256 clearingPrice = 650 * 1e6;
        bytes memory sig = _sign(id, bidder1, clearingPrice);

        uint256 sellerBefore = fxrp.balanceOf(seller);
        uint256 bidder1Before = fxrp.balanceOf(bidder1);
        uint256 bidder2Before = fxrp.balanceOf(bidder2);
        uint256 bidder3Before = fxrp.balanceOf(bidder3);

        auction.settle(id, bidder1, clearingPrice, sig);

        assertEq(fxrp.balanceOf(seller), sellerBefore + clearingPrice);
        assertEq(fxrp.balanceOf(bidder1), bidder1Before + (BID_CAP - clearingPrice)); // winner refunded the difference
        assertEq(fxrp.balanceOf(bidder2), bidder2Before + BID_CAP); // losers refunded in full
        assertEq(fxrp.balanceOf(bidder3), bidder3Before + BID_CAP);
        assertEq(fxrp.balanceOf(address(auction)), 0);

        UmbraAuction.Auction memory a = auction.getAuction(id);
        assertEq(uint256(a.status), uint256(UmbraAuction.Status.Settled));
        assertEq(a.winner, bidder1);
        assertEq(a.clearingPrice, clearingPrice);
    }

    function test_Settle_revertsOnInvalidSignature() public {
        uint256 id = _createAuction();
        vm.prank(bidder1);
        auction.submitBid(id, hex"01");
        vm.warp(block.timestamp + 2 days);
        auction.closeAuction(id);

        uint256 wrongKey = 0xBAD;
        bytes32 digest = keccak256(abi.encode(block.chainid, address(auction), id, bidder1, 500 * 1e6));
        bytes32 ethSigned = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, ethSigned);

        vm.expectRevert("Invalid TEE signature");
        auction.settle(id, bidder1, 500 * 1e6, abi.encodePacked(r, s, v));
    }

    function test_Settle_revertsIfNotClosedOrAlreadySettled() public {
        uint256 id = _createAuction();
        vm.prank(bidder1);
        auction.submitBid(id, hex"01");

        bytes memory sig = _sign(id, bidder1, 500 * 1e6);
        vm.expectRevert("Auction not closed");
        auction.settle(id, bidder1, 500 * 1e6, sig);

        vm.warp(block.timestamp + 2 days);
        auction.closeAuction(id);
        auction.settle(id, bidder1, 500 * 1e6, sig);

        vm.expectRevert("Auction not closed");
        auction.settle(id, bidder1, 500 * 1e6, sig);
    }

    function test_CloseAuction_revertsBeforeEndTime() public {
        uint256 id = _createAuction();
        vm.expectRevert("Auction not ended yet");
        auction.closeAuction(id);
    }

    function test_OnlyOwnerCanUpdateTrustedSigner() public {
        address newSigner = address(0xCAFE);
        vm.prank(bidder1);
        vm.expectRevert();
        auction.setTrustedTeeSigner(newSigner);

        auction.setTrustedTeeSigner(newSigner); // called by test contract, the owner
        assertEq(auction.trustedTeeSigner(), newSigner);
    }
}
