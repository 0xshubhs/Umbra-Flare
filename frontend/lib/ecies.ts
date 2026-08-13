"use client";

import { encrypt } from "eciesjs";
import { TEE_PUBLIC_KEY_COMPRESSED } from "./tee";

/// Width every bid is padded to before encryption: 32 bytes, matching the
/// uint256 the amount is conceptually stored as.
const BID_PLAINTEXT_BYTES = 32;

/// Encrypts a bid amount (uint256, base FXRP units) to the TEE's public key,
/// client-side, in the browser — the amount never leaves this function in
/// plaintext. Runs entirely on pure-JS elliptic-curve code (no native
/// bindings), so it works in both the browser and Next.js API routes.
///
/// The amount is zero-padded to a FIXED 32 bytes first, which is load-bearing
/// for privacy, not cosmetic. ECIES ciphertext length tracks plaintext length,
/// and the ciphertext is public on-chain via getBidCiphertext(), so encoding
/// the amount at its natural minimal width would let anyone bucket a rival's
/// bid by magnitude just by measuring the ciphertext — a 1 FXRP bid and a
/// 50,000 FXRP bid produced 100- and 102-byte ciphertexts respectively. Fixed
/// width makes every sealed bid indistinguishable in size.
export function encryptBid(amount: bigint): `0x${string}` {
  const plaintext = Buffer.from(
    amount.toString(16).padStart(BID_PLAINTEXT_BYTES * 2, "0"),
    "hex"
  );
  const ciphertext = encrypt(TEE_PUBLIC_KEY_COMPRESSED, plaintext);
  return `0x${Buffer.from(ciphertext).toString("hex")}`;
}
