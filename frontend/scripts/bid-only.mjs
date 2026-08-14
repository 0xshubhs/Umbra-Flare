// Places two encrypted bids on an auction, then stops — used to set up a
// state where the TEE close-auction route has to close the auction itself.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWalletClient, createPublicClient, http, parseUnits, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { encrypt } from "eciesjs";

const AUCTION = "0x9d3ccbE19D1A6e37A9F67868ae7eE8452069d697";
const FXRP = "0x08a25a794639a6cA03b0A7C655B2c36d82fF144a";
const TEE_PUB = "02786b5d5addfcbc034f2dc19e4ea8c9cecd62dcd1b4c4a0de550f549b62f6106b";
const RPC = "https://rpc.ankr.com/flare_coston2";
const ID = BigInt(process.argv[2]);

const coston2 = defineChain({
  id: 114, name: "Coston2",
  nativeCurrency: { decimals: 18, name: "C2FLR", symbol: "C2FLR" },
  rpcUrls: { default: { http: [RPC] } },
});

const ABI = [
  { type: "function", name: "submitBid", inputs: [{ type: "uint256" }, { type: "bytes" }], outputs: [], stateMutability: "nonpayable" },
];
const ERC20 = [
  { type: "function", name: "approve", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "mint", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
];

const pub = createPublicClient({ chain: coston2, transport: http(RPC) });
const send = async (a, req) => {
  const hash = await createWalletClient({ account: a, chain: coston2, transport: http(RPC) }).writeContract(req);
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error("reverted " + hash);
};
const encryptBid = (amt) =>
  `0x${Buffer.from(encrypt(TEE_PUB, Buffer.from(amt.toString(16).padStart(64, "0"), "hex"))).toString("hex")}`;

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".bidders.json");
const [kA, kB] = JSON.parse(fs.readFileSync(file, "utf8"));
const CAP = parseUnits("1000", 6);

for (const [k, amt] of [[kA, parseUnits("600", 6)], [kB, parseUnits("850", 6)]]) {
  const acct = privateKeyToAccount(k);
  await send(acct, { address: FXRP, abi: ERC20, functionName: "mint", args: [acct.address, CAP] });
  await send(acct, { address: FXRP, abi: ERC20, functionName: "approve", args: [AUCTION, CAP] });
  await send(acct, { address: AUCTION, abi: ABI, functionName: "submitBid", args: [ID, encryptBid(amt)] });
  console.log(`${acct.address.slice(0, 10)} bid placed`);
}
console.log("done — auction left OPEN, not closed");
