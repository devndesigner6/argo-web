// Client-side Sepolia/EVM payment transaction dispatcher.
// Invokes the createMission contract call on our deployed ArgoEscrow.sol.
// Loads ethers from esm.sh at runtime to match the cardano-pay dynamic CDN load pattern.

export const ESCROW_CONTRACT_ADDRESS = "0xBA82d9bDDAEc31747d97d4c59d2D4F0085f5DE1d"; // ArgoEscrow deployed demo address on Sepolia

const ESCROW_ABI = [
  "function createMission(string calldata missionId, string calldata agentId, bytes32 promptHash, bytes calldata encryptedPayload) external payable"
];

const ETHERS_CDNS = [
  "https://esm.sh/ethers@6.13.1",
  "https://cdn.jsdelivr.net/npm/ethers@6.13.1/+esm"
];

let ethersPromise: Promise<any> | null = null;
async function loadEthers(): Promise<any> {
  if (typeof window === "undefined") {
    throw new Error("Ethers can only be loaded in the browser.");
  }
  if (!ethersPromise) {
    ethersPromise = (async () => {
      for (const url of ETHERS_CDNS) {
        try {
          const mod = await import(/* @vite-ignore */ url);
          if (mod) {
            // Support both full modules and default imports depending on ESM loader
            return mod.ethers || mod.BrowserProvider ? mod : (mod.default || mod);
          }
        } catch (e) {
          console.warn(`Failed to load ethers from ${url}:`, e);
        }
      }
      throw new Error("Could not load Ethers from any CDN.");
    })();
  }
  return ethersPromise;
}

export type SepoliaPayParams = {
  missionId: string;
  agentId: string;
  prompt: string;
  encryptedPayload?: string; // hex string or empty
  priceEther: string;
};

export type SepoliaPayResult = {
  txHash: string;
  amountWei: string;
  promptHash: string;
};

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const d = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(d))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function paySepoliaMission(p: SepoliaPayParams): Promise<SepoliaPayResult> {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("No EVM wallet detected. Install MetaMask.");

  const Ethers = await loadEthers();
  // Handle some differences in ESM CDN outputs
  const BrowserProvider = Ethers.BrowserProvider || Ethers.ethers?.BrowserProvider;
  const Contract = Ethers.Contract || Ethers.ethers?.Contract;
  const parseEther = Ethers.parseEther || Ethers.ethers?.parseEther;

  if (!BrowserProvider) {
    throw new Error("Ethers library loaded but BrowserProvider is missing.");
  }

  const provider = new BrowserProvider(eth);
  const signer = await provider.getSigner();

  const contract = new Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);

  // Compute prompt SHA-256 hash
  const pHash = await sha256Hex(p.prompt);
  const promptHashBytes32 = "0x" + pHash;

  // Prepare payload
  const payloadHex = p.encryptedPayload 
    ? (p.encryptedPayload.startsWith("0x") ? p.encryptedPayload : "0x" + p.encryptedPayload)
    : "0x";

  const valueWei = parseEther(p.priceEther);

  const tx = await contract.createMission(
    p.missionId,
    p.agentId,
    promptHashBytes32,
    payloadHex,
    { value: valueWei }
  );

  const receipt = await tx.wait();
  return {
    txHash: receipt.hash || tx.hash,
    amountWei: valueWei.toString(),
    promptHash: promptHashBytes32,
  };
}
