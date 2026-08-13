// Package types contains types that could be useful to other apps when interacting with this extension.
package types

import (
	"math/big"

	"github.com/ethereum/go-ethereum/accounts/abi"
)

// SubmitBidRequest is the ABI-decoded payload sent via UmbraInstructionSender.sendSubmitBid.
// EncryptedBid is ECIES(bidAmount) over secp256k1, encrypted to this TEE's public key —
// only this extension can decrypt it.
type SubmitBidRequest struct {
	AuctionId    *big.Int `json:"auctionId"`
	EncryptedBid []byte   `json:"encryptedBid"`
}

// SubmitBidResponse acknowledges receipt without revealing anything about the
// bid itself — not even to the caller who submitted it.
type SubmitBidResponse struct {
	Accepted bool `json:"accepted"`
}

// CloseAuctionRequest is the ABI-decoded payload sent via
// UmbraInstructionSender.sendCloseAuction.
type CloseAuctionRequest struct {
	AuctionId *big.Int `json:"auctionId"`
}

// CloseAuctionResponse is the Vickrey (second-price) result: the highest
// bidder, and the second-highest bid amount they'll actually pay. Individual
// bids — including the winner's own true bid — are never included here.
type CloseAuctionResponse struct {
	Winner        string `json:"winner"`        // 0x-address of the highest bidder
	ClearingPrice string `json:"clearingPrice"`  // second-highest bid, decimal string (uint256)
	Signature     string `json:"signature"`      // ECDSA sig over keccak256(chainId, auction, auctionId, winner, clearingPrice)
}

// SubmitBidMessageArg / CloseAuctionMessageArg describe the ABI layout of the
// matching structs in UmbraInstructionSender.sol.
var (
	SubmitBidMessageArg    abi.Argument
	CloseAuctionMessageArg abi.Argument
)

func init() {
	submitBidTy, _ := abi.NewType("tuple", "", []abi.ArgumentMarshaling{
		{Name: "auctionId", Type: "uint256"},
		{Name: "encryptedBid", Type: "bytes"},
	})
	SubmitBidMessageArg = abi.Argument{Type: submitBidTy}

	closeAuctionTy, _ := abi.NewType("tuple", "", []abi.ArgumentMarshaling{
		{Name: "auctionId", Type: "uint256"},
	})
	CloseAuctionMessageArg = abi.Argument{Type: closeAuctionTy}
}

// State holds the extension's observable state, returned by GET /state.
// Deliberately exposes only counts, never bid amounts or bidder identities —
// even the extension's own /state endpoint must not leak sealed data.
type State struct {
	OpenAuctions   int `json:"openAuctions"`
	BidsReceived   int `json:"bidsReceived"`
	AuctionsClosed int `json:"auctionsClosed"`
}
