// @coinbase/cdp-sdk (pulled in transitively by RainbowKit's default wagmi
// connector set, via the Coinbase/Base Account connector) statically and
// dynamically imports optional @x402/* peer packages that aren't installed
// and aren't needed here — this app never uses that connector. Turbopack
// still needs those import paths to resolve at build time, so this creates
// harmless empty stub packages at the exact unresolved paths. Runs via
// `postinstall` since node_modules is gitignored and gets wiped by every
// `npm install`.
const fs = require("node:fs");
const path = require("node:path");

const STUBS = [
  "@x402/core/client.js",
  "@x402/core/index.js",
  "@x402/evm/index.js",
  "@x402/evm/exact/client.js",
  "@x402/evm/upto/client.js",
  "@x402/svm/index.js",
  "@x402/svm/exact/client.js",
];

for (const rel of STUBS) {
  const full = path.join(__dirname, "..", "node_modules", rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, "module.exports = {};\n");
}

console.log(`stub-x402: wrote ${STUBS.length} stub module(s) under node_modules/@x402`);
