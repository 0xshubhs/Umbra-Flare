"use client";

import { RainbowKitProvider, connectorsForWallets, darkTheme } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet, walletConnectWallet, rainbowWallet, injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { WagmiProvider, createConfig, http } from "wagmi";
import { flareTestnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";
import { RPC_URL } from "../lib/contracts";

// Curated wallet list — deliberately excludes RainbowKit's default Coinbase
// Wallet connector, whose @base-org/account -> @coinbase/cdp-sdk dependency
// chain has broken optional @x402/* imports that fail the Next.js build.
const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, rainbowWallet, walletConnectWallet, injectedWallet],
    },
  ],
  { appName: "Umbra", projectId: "umbra-flare-demo" }
);

// RPC_URL (lib/contracts.ts NETWORK switch) points this at anvil forking
// Coston2 for local dev, or the real Coston2 RPC once deployed for real.
const config = createConfig({
  chains: [flareTestnet],
  connectors,
  transports: { [flareTestnet.id]: http(RPC_URL) },
  ssr: true,
});

const queryClient = new QueryClient();

const rainbowTheme = darkTheme({
  accentColor: "#FD5299",
  accentColorForeground: "#0a0a0c",
  borderRadius: "none",
  fontStack: "system",
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowTheme} initialChain={flareTestnet}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
