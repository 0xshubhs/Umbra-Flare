// Package extension implements the AUCTION extension: it decrypts sealed
// bids inside the TEE, holds them in memory only, and on close computes a
// Vickrey (second-price) result signed for on-chain settlement.
package extension

import (
	"bytes"
	"crypto/ecdsa"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"sync"

	ecies "github.com/ecies/go/v2"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"

	"umbra-extension/internal/config"
	"umbra-extension/pkg/types"

	teetypes "github.com/flare-foundation/tee-node/pkg/types"
	teeutils "github.com/flare-foundation/tee-node/pkg/utils"
)

type bidRecord struct {
	bidder address
	amount *big.Int
}
type address = common.Address

type Extension struct {
	mu     sync.RWMutex
	Server *http.Server

	// teeKey is this machine's boot-generated identity key. In production
	// it's provided by the tee-node runtime (see go-flare-common's TEE
	// identity package); the exact accessor wasn't confirmed against the
	// live SDK for this submission, so it's injected here for now.
	teeKey *ecdsa.PrivateKey

	bids           map[string][]bidRecord // auctionId.String() -> bids received, plaintext, in-memory only
	bidderSeen     map[string]map[address]bool
	closedAuctions map[string]bool

	bidsReceived   int
	auctionsClosed int
}

func New(extensionPort, signPort int, teeKey *ecdsa.PrivateKey) *Extension {
	e := &Extension{
		teeKey:         teeKey,
		bids:           make(map[string][]bidRecord),
		bidderSeen:     make(map[string]map[address]bool),
		closedAuctions: make(map[string]bool),
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /state", e.stateHandler)
	mux.HandleFunc("POST /action", e.actionHandler)
	e.Server = &http.Server{Addr: fmt.Sprintf(":%d", extensionPort), Handler: mux}
	return e
}

func (e *Extension) stateHandler(w http.ResponseWriter, r *http.Request) {
	e.mu.RLock()
	state := types.State{
		OpenAuctions:   len(e.bids) - len(e.closedAuctions),
		BidsReceived:   e.bidsReceived,
		AuctionsClosed: e.auctionsClosed,
	}
	e.mu.RUnlock()

	if err := json.NewEncoder(w).Encode(state); err != nil {
		http.Error(w, fmt.Sprintf("sending response: %v", err), http.StatusInternalServerError)
	}
}

func (e *Extension) processAction(action teetypes.Action) (int, []byte) {
	dataFixed, err := parseFixed(action.Data.Message)
	if err != nil {
		return http.StatusBadRequest, []byte(fmt.Sprintf("decoding fixed data: %v", err))
	}

	switch {
	case dataFixed.OPType == teeutils.ToHash(config.OPTypeAuction):
		return e.processAuction(action, dataFixed)
	default:
		return http.StatusNotImplemented, []byte(fmt.Sprintf(
			"unsupported op type: received %s, expected %s (%s)",
			dataFixed.OPType.Hex(), teeutils.ToHash(config.OPTypeAuction).Hex(), config.OPTypeAuction,
		))
	}
}

func (e *Extension) processAuction(action teetypes.Action, df *dataFixed) (int, []byte) {
	switch {
	case df.OPCommand == teeutils.ToHash(config.OPCommandSubmitBid):
		return e.processSubmitBid(action, df)
	case df.OPCommand == teeutils.ToHash(config.OPCommandCloseAuction):
		return e.processCloseAuction(action, df)
	default:
		return http.StatusNotImplemented, []byte(fmt.Sprintf(
			"unsupported op command: received %s, expected one of [%s (%s), %s (%s)]",
			df.OPCommand.Hex(),
			teeutils.ToHash(config.OPCommandSubmitBid).Hex(), config.OPCommandSubmitBid,
			teeutils.ToHash(config.OPCommandCloseAuction).Hex(), config.OPCommandCloseAuction,
		))
	}
}

// processSubmitBid decrypts the bid with this TEE's private key and stores
// only the plaintext amount, in memory, keyed by auction — never logged,
// never echoed back in the response, never written to persistent storage.
func (e *Extension) processSubmitBid(action teetypes.Action, df *dataFixed) http2Result {
	var req types.SubmitBidRequest
	if err := abi.Arguments{types.SubmitBidMessageArg}.UnpackIntoInterface(&req, df.OriginalMessage); err != nil {
		return errResult(fmt.Errorf("decoding SUBMIT_BID payload: %w", err))
	}

	// The submitting address travels through the on-chain claimBackAddress
	// field of TeeInstructionParams (see UmbraInstructionSender.sol); the
	// exact accessor on `action` for that field wasn't confirmed against the
	// live SDK, so it's referenced here as action.Data.ClaimBackAddress.
	bidder := action.Data.ClaimBackAddress

	plaintext, err := ecies.Decrypt(ecies.NewPrivateKeyFromBytes(crypto.FromECDSA(e.teeKey)), req.EncryptedBid)
	if err != nil {
		return errResult(fmt.Errorf("decrypting bid: %w", err))
	}
	amount := new(big.Int).SetBytes(plaintext)

	key := req.AuctionId.String()

	e.mu.Lock()
	if e.closedAuctions[key] {
		e.mu.Unlock()
		return errResult(fmt.Errorf("auction %s already closed", key))
	}
	if e.bidderSeen[key] == nil {
		e.bidderSeen[key] = make(map[address]bool)
	}
	if e.bidderSeen[key][bidder] {
		e.mu.Unlock()
		return errResult(fmt.Errorf("bidder already submitted a bid for auction %s", key))
	}
	e.bidderSeen[key][bidder] = true
	e.bids[key] = append(e.bids[key], bidRecord{bidder: bidder, amount: amount})
	e.bidsReceived++
	e.mu.Unlock()

	resp := types.SubmitBidResponse{Accepted: true}
	data, _ := json.Marshal(resp)
	return http2Result{status: 1, data: data}
}

// processCloseAuction computes the Vickrey winner (highest bidder, pays the
// second-highest bid) over the bids held privately for this auction, and
// signs the result. Individual bid amounts — including losing bids and the
// winner's true bid — never leave this function.
func (e *Extension) processCloseAuction(action teetypes.Action, df *dataFixed) http2Result {
	var req types.CloseAuctionRequest
	if err := abi.Arguments{types.CloseAuctionMessageArg}.UnpackIntoInterface(&req, df.OriginalMessage); err != nil {
		return errResult(fmt.Errorf("decoding CLOSE_AUCTION payload: %w", err))
	}
	key := req.AuctionId.String()

	e.mu.Lock()
	records := e.bids[key]
	e.closedAuctions[key] = true
	e.auctionsClosed++
	e.mu.Unlock()

	if len(records) == 0 {
		return errResult(fmt.Errorf("no bids for auction %s", key))
	}

	var winner bidRecord
	var second *big.Int = big.NewInt(0)
	for _, r := range records {
		if r.amount.Cmp(winner.amount) > 0 {
			if winner.amount != nil {
				second = winner.amount
			}
			winner = r
		} else if second == nil || r.amount.Cmp(second) > 0 {
			second = r.amount
		}
	}
	if len(records) == 1 {
		second = big.NewInt(0) // sole bidder clears at their reserve, not their bid
	}

	// Must match UmbraAuction.settle's digest exactly: keccak256(abi.encode(
	//   chainId, auctionContract, auctionId, winner, clearingPrice
	// )) as an EIP-191 personal-sign message.
	digest := signDigest(action.ChainID, action.TargetContract, req.AuctionId, winner.bidder, second)
	sig, err := crypto.Sign(digest, e.teeKey)
	if err != nil {
		return errResult(fmt.Errorf("signing result: %w", err))
	}
	sig[64] += 27 // Ethereum's v is 27/28, not 0/1

	resp := types.CloseAuctionResponse{
		Winner:        winner.bidder.Hex(),
		ClearingPrice: second.String(),
		Signature:     "0x" + common.Bytes2Hex(sig),
	}
	data, _ := json.Marshal(resp)
	return http2Result{status: 1, data: data}
}

func signDigest(chainID *big.Int, contract address, auctionId *big.Int, winner address, clearingPrice *big.Int) []byte {
	packed, _ := abi.Arguments{
		{Type: mustType("uint256")}, {Type: mustType("address")}, {Type: mustType("uint256")},
		{Type: mustType("address")}, {Type: mustType("uint256")},
	}.Pack(chainID, contract, auctionId, winner, clearingPrice)
	inner := crypto.Keccak256(packed)
	prefixed := append([]byte(fmt.Sprintf("\x19Ethereum Signed Message:\n%d", len(inner))), inner...)
	return crypto.Keccak256(prefixed)
}

func mustType(t string) abi.Type {
	ty, _ := abi.NewType(t, "", nil)
	return ty
}

// --- Small local shims for the tee-node SDK types referenced above but not
// directly re-exported in the docs excerpt this was written against; keep
// these aligned with github.com/flare-foundation/go-flare-common/pkg/tee/instruction
// when building against the real scaffold. ---

type dataFixed struct {
	OPType          common.Hash
	OPCommand       common.Hash
	OriginalMessage []byte
}

func parseFixed(message []byte) (*dataFixed, error) {
	// Placeholder for processorutils.Parse[instruction.DataFixed] from the
	// real scaffold — decodes the fixed OPType/OPCommand header Flare's
	// relay layer prepends to every instruction message.
	return nil, fmt.Errorf("parseFixed: wire this to processorutils.Parse[instruction.DataFixed] " +
		"from github.com/flare-foundation/go-flare-common when building against the real scaffold")
}

type http2Result struct {
	status int
	data   []byte
}

func errResult(err error) http2Result {
	return http2Result{status: 0, data: []byte(err.Error())}
}

func (e *Extension) actionHandler(w http.ResponseWriter, r *http.Request) {
	var action teetypes.Action
	if err := json.NewDecoder(r.Body).Decode(&action); err != nil {
		http.Error(w, fmt.Sprintf("decoding action: %v", err), http.StatusBadRequest)
		return
	}
	status, data := e.processAction(action)
	w.WriteHeader(statusToHTTP(status))
	_, _ = w.Write(bytes.TrimSpace(data))
}

func statusToHTTP(status int) int {
	if status == 0 {
		return http.StatusUnprocessableEntity
	}
	return http.StatusOK
}
