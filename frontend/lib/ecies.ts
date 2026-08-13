"use client";

import { encrypt } from "eciesjs";
import { TEE_PUBLIC_KEY_COMPRESSED } from "./tee";

/// Encrypts a bid amount (uint256, base FXRP units) to the TEE's public key,
/// client-side, in the browser — the amount never leaves this function in
/// plaintext. Runs entirely on pure-JS elliptic-curve code (no native
/// bindings), so it works in both the browser and Next.js API routes.
export function encryptBid(amount: bigint): `0x${string}` {
  let hex = amount.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  const plaintext = Buffer.from(hex, "hex");
  const ciphertext = encrypt(TEE_PUBLIC_KEY_COMPRESSED, plaintext);
  return `0x${Buffer.from(ciphertext).toString("hex")}`;
}
