// Package config contains configuration values and defaults used by the extension.
package config

import (
	"os"
	"strconv"
	"time"
)

const (
	Version = "0.1.0"

	// Must match UmbraInstructionSender.sol's bytes32 constants exactly —
	// Solidity stores them as bytes32("..."), Go compares hashed strings via
	// teeutils.ToHash(...). A mismatch here is the most common cause of
	// "unsupported op type"/"unsupported op command" responses.
	OPTypeAuction         = "AUCTION"
	OPCommandSubmitBid    = "SUBMIT_BID"
	OPCommandCloseAuction = "CLOSE_AUCTION"

	TimeoutShutdown = 5 * time.Second
)

// Defaults.
var (
	ExtensionPort   = 8080
	SignPort        = 9090
	TypesServerPort = 8100
)

// Environment variables override defaults.
func init() {
	ep := os.Getenv("EXTENSION_PORT")
	sp := os.Getenv("SIGN_PORT")
	tp := os.Getenv("TYPES_SERVER_PORT")
	if ep != "" {
		if v, err := strconv.Atoi(ep); err == nil {
			ExtensionPort = v
		}
	}
	if sp != "" {
		if v, err := strconv.Atoi(sp); err == nil {
			SignPort = v
		}
	}
	if tp != "" {
		if v, err := strconv.Atoi(tp); err == nil {
			TypesServerPort = v
		}
	}
}
