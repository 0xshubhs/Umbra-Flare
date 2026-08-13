package types

// RegisterDecoders registers all type decoders for this extension, so
// Flare's FCC tooling and types server can decode AUCTION payloads.
//
// Mirrors the pattern in fce-extension-scaffold/pkg/types/register.go — the
// concrete `decoder.Registry` type lives in that scaffold repo, so this is
// left as a template rather than importing a package that doesn't exist
// outside it.
//
//	func RegisterDecoders(r *decoder.Registry) {
//		r.Register(
//			decoder.RegistryKey{OPType: "AUCTION", OPCommand: "SUBMIT_BID", Kind: decoder.KindMessage},
//			decoder.NewABIDecoder[SubmitBidRequest](SubmitBidMessageArg),
//		)
//		r.Register(
//			decoder.RegistryKey{OPType: "AUCTION", OPCommand: "SUBMIT_BID", Kind: decoder.KindResult},
//			decoder.NewJSONDecoder[SubmitBidResponse](),
//		)
//		r.Register(
//			decoder.RegistryKey{OPType: "AUCTION", OPCommand: "CLOSE_AUCTION", Kind: decoder.KindMessage},
//			decoder.NewABIDecoder[CloseAuctionRequest](CloseAuctionMessageArg),
//		)
//		r.Register(
//			decoder.RegistryKey{OPType: "AUCTION", OPCommand: "CLOSE_AUCTION", Kind: decoder.KindResult},
//			decoder.NewJSONDecoder[CloseAuctionResponse](),
//		)
//	}
